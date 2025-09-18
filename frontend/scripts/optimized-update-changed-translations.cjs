#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const TranslationService = require('./translation-service.cjs');
const SecurityUtils = require('./security-utils.cjs');

class OptimizedIncrementalUpdater {
  constructor() {
    this.security = new SecurityUtils();
    this.localesDir = this.security.validateFilePath(path.join('public', 'locales'));
    this.translationService = new TranslationService();
  }

  getSupportedLanguages() {
    try {
      // Read supported languages from i18n config
      const i18nFile = this.security.validateFilePath(path.join('src', 'i18n', 'index.ts'));
      const i18nContent = this.security.safeReadFile(i18nFile);
      
      const supportedLngsMatch = i18nContent.match(/supportedLngs: \[(.*?)\]/s);
      if (supportedLngsMatch) {
        const languages = supportedLngsMatch[1]
          .split(',')
          .map(l => l.trim().replace(/['\"]/g, ''))
          .filter(l => {
            if (l.length === 0 || l === 'en') return false;
            try {
              this.security.validateLanguageCode(l);
              return true;
            } catch (error) {
              console.warn(`⚠️  Invalid language code in config: ${l}`);
              return false;
            }
          });
        
        return languages.sort();
      }
      
      // Fallback to existing directories
      if (!this.security.safeFileExists(this.localesDir)) {
        return [];
      }
      
      return this.security.safeReadDirectory(this.localesDir)
        .filter(dir => {
          if (dir === 'en') return false;
          try {
            const dirPath = path.join(this.localesDir, dir);
            const isDirectory = fs.statSync(dirPath).isDirectory();
            if (isDirectory) {
              this.security.validateLanguageCode(dir);
              return true;
            }
            return false;
          } catch (error) {
            console.warn(`⚠️  Skipping invalid language directory: ${dir}`);
            return false;
          }
        })
        .sort();
    } catch (error) {
      console.error('Error reading supported languages:', error.message);
      return [];
    }
  }

  getLanguageInfo(languageCode) {
    try {
      // Validate language code first
      const validatedLangCode = this.security.validateLanguageCode(languageCode);
      
      // Read from I18nContext to get the display names
      const contextFile = this.security.validateFilePath(path.join('src', 'contexts', 'I18nContext.tsx'));
      const contextContent = this.security.safeReadFile(contextFile);
      
      // Extract language information using safer regex
      const langRegex = new RegExp(`\\{\\s*code:\\s*'${validatedLangCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\s*,\\s*name:\\s*'([^']+)'\\s*,\\s*nativeName:\\s*'([^']+)'\\s*\\}`, 'i');
      const match = contextContent.match(langRegex);
      
      if (match) {
        return {
          name: match[1].slice(0, 100), // Limit length for security
          nativeName: match[2].slice(0, 100)
        };
      }
      
      // Fallback if not found in context
      return {
        name: validatedLangCode.toUpperCase(),
        nativeName: validatedLangCode.toUpperCase()
      };
    } catch (error) {
      console.error(`Error getting language info for ${languageCode}:`, error.message);
      return {
        name: 'UNKNOWN',
        nativeName: 'UNKNOWN'
      };
    }
  }

  getChangedEnglishFiles() {
    try {
      // Get all modified and added files in the English locales directory
      const cwd = process.cwd();
      const localesPath = cwd.endsWith('/frontend') 
        ? 'public/locales/en/' 
        : 'frontend/public/locales/en/';
      
      // Validate the locales path for security
      let validatedLocalesPath;
      try {
        validatedLocalesPath = this.security.validateFilePath(localesPath);
      } catch (error) {
        console.error('Invalid locales path for git status:', error.message);
        return [];
      }
      
      // Use a safer approach to shell command execution
      const safeLocalesPath = localesPath.replace(/[;&|`$()]/g, ''); // Remove shell metacharacters
      const statusOutput = execSync(`git status --porcelain "${safeLocalesPath}"`, { 
        encoding: 'utf8',
        timeout: 30000 // 30 second timeout
      });
      
      const changedFiles = [];
      
      statusOutput.split('\n').forEach(line => {
        if (line.trim()) {
          const status = line.substring(0, 2);
          const filePath = line.substring(3);
          
          // Validate the file path for security
          try {
            // Check if it's a JSON file in the English locale directory
            if (filePath.includes('public/locales/en/') && filePath.endsWith('.json')) {
              const fileName = path.basename(filePath);
              this.security.validateLocaleFileName(fileName);
              
              // Handle different git status codes
              // M = modified, A = added, D = deleted, R = renamed, ?? = untracked
              if (status.includes('M') || status.includes('A') || status.includes('?')) {
                changedFiles.push({ path: filePath, status: status.trim() });
              }
            }
          } catch (error) {
            console.warn(`⚠️  Skipping invalid file path: ${filePath}`);
          }
        }
      });
      
      return changedFiles;
    } catch (error) {
      console.error('Error getting git status:', error.message);
      return [];
    }
  }

  /**
   * Get the HEAD (previous) version of a file from git
   */
  getPreviousFileVersion(filePath) {
    try {
      const safeFilePath = filePath.replace(/[;&|`$()]/g, ''); // Remove shell metacharacters
      const headContent = execSync(`git show HEAD:"${safeFilePath}"`, { 
        encoding: 'utf8',
        timeout: 15000 // 15 second timeout
      });
      
      return JSON.parse(headContent);
    } catch (error) {
      // File might be new (not in HEAD) or there might be no commits yet
      console.log(`ℹ️  Could not get previous version of ${filePath} (likely new file)`);
      return {};
    }
  }

  /**
   * Deep compare two objects to find added and removed keys
   */
  compareObjects(previous, current, keyPath = '') {
    const added = {};
    const removed = {};
    
    // Find added keys in current
    for (const [key, value] of Object.entries(current)) {
      const currentKeyPath = keyPath ? `${keyPath}.${key}` : key;
      
      if (!(key in previous)) {
        // Key is entirely new
        this.setNestedKey(added, currentKeyPath, value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value) &&
                 typeof previous[key] === 'object' && previous[key] !== null && !Array.isArray(previous[key])) {
        // Both are objects, recursively compare
        const { added: nestedAdded, removed: nestedRemoved } = this.compareObjects(previous[key], value, currentKeyPath);
        this.mergeNestedKeys(added, nestedAdded);
        this.mergeNestedKeys(removed, nestedRemoved);
      } else if (previous[key] !== value) {
        // Value changed
        this.setNestedKey(added, currentKeyPath, value);
      }
    }
    
    // Find removed keys (in previous but not in current)
    for (const [key, value] of Object.entries(previous)) {
      const currentKeyPath = keyPath ? `${keyPath}.${key}` : key;
      
      if (!(key in current)) {
        // Key was removed
        this.setNestedKey(removed, currentKeyPath, value);
      }
    }
    
    return { added, removed };
  }

  /**
   * Merge nested key structures
   */
  mergeNestedKeys(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        if (!(key in target)) {
          target[key] = {};
        }
        this.mergeNestedKeys(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  /**
   * Set a nested key using dot notation
   */
  setNestedKey(obj, keyPath, value) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Remove nested keys from an object
   */
  removeNestedKeys(obj, keysToRemove) {
    const result = JSON.parse(JSON.stringify(obj)); // Deep clone
    
    for (const keyPath of Object.keys(keysToRemove)) {
      this.deleteNestedKey(result, keyPath);
    }
    
    return result;
  }

  /**
   * Delete a nested key using dot notation
   */
  deleteNestedKey(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        return; // Path doesn't exist
      }
      current = current[key];
    }
    
    delete current[keys[keys.length - 1]];
    
    // Clean up empty parent objects
    this.cleanupEmptyObjects(obj, keyPath);
  }

  /**
   * Remove empty objects from the path upward
   */
  cleanupEmptyObjects(obj, keyPath) {
    const keys = keyPath.split('.');
    
    for (let i = keys.length - 2; i >= 0; i--) {
      const parentPath = keys.slice(0, i + 1);
      const parentObj = this.getNestedValue(obj, parentPath.join('.'));
      
      if (parentObj && typeof parentObj === 'object' && Object.keys(parentObj).length === 0) {
        this.deleteNestedKey(obj, parentPath.join('.'));
      } else {
        break; // Stop if parent is not empty
      }
    }
  }

  /**
   * Get nested value using dot notation
   */
  getNestedValue(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  extractKeysFromFile(filePath) {
    try {
      // Validate the file path for security
      const validatedPath = this.security.validateFilePath(filePath);
      
      if (!this.security.safeFileExists(validatedPath)) {
        return {};
      }
      
      const content = this.security.safeReadFile(validatedPath);
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error.message);
      return {};
    }
  }

  /**
   * Analyze changes in English files and return only what needs to be translated
   */
  analyzeChanges() {
    const changedFiles = this.getChangedEnglishFiles();
    const changes = {};
    
    if (changedFiles.length === 0) {
      console.log('ℹ️  No uncommitted changes detected in English locale files.');
      return {};
    }
    
    console.log(`📝 Analyzing ${changedFiles.length} changed English locale files:`);
    
    for (const { path: filePath, status } of changedFiles) {
      console.log(`\n🔍 Analyzing: ${status} ${filePath}`);
      
      // Fix path construction - if we're in frontend dir and path starts with frontend/, remove the prefix
      let adjustedPath = filePath;
      if (process.cwd().endsWith('/frontend') && filePath.startsWith('frontend/')) {
        adjustedPath = filePath.replace('frontend/', '');
      }
      
      // Validate and resolve the path securely
      let fullPath;
      try {
        fullPath = this.security.validateFilePath(adjustedPath);
      } catch (error) {
        console.warn(`⚠️  Invalid path ${adjustedPath}: ${error.message}`);
        continue;
      }
      
      if (status === '??' || status === 'A') {
        // New untracked/added file - include all keys
        console.log(`   📄 New file detected, translating all keys`);
        const keys = this.extractKeysFromFile(fullPath);
        if (Object.keys(keys).length > 0) {
          changes[filePath] = {
            added: keys,
            removed: {},
            addedCount: this.countKeys(keys),
            removedCount: 0
          };
        }
      } else if (status === 'M') {
        // Modified file - analyze the differences
        console.log(`   📄 Modified file detected, analyzing differences...`);
        
        const currentContent = this.extractKeysFromFile(fullPath);
        const previousContent = this.getPreviousFileVersion(filePath);
        
        const { added, removed } = this.compareObjects(previousContent, currentContent);
        
        const addedCount = this.countKeys(added);
        const removedCount = this.countKeys(removed);
        
        console.log(`   ➕ Added: ${addedCount} keys`);
        console.log(`   ➖ Removed: ${removedCount} keys`);
        
        if (addedCount > 0 || removedCount > 0) {
          changes[filePath] = {
            added,
            removed,
            addedCount,
            removedCount
          };
        }
      }
    }
    
    return changes;
  }

  convertFilePathToNamespace(filePath) {
    // Convert file paths to namespace format expected by translation service
    // e.g., "frontend/public/locales/en/common.json" -> "common.json"
    // or "public/locales/en/common.json" -> "common.json"
    const frontendMatch = filePath.match(/frontend\/public\/locales\/en\/(.+)$/);
    const relativeMatch = filePath.match(/public\/locales\/en\/(.+)$/);
    return frontendMatch ? frontendMatch[1] : (relativeMatch ? relativeMatch[1] : filePath);
  }

  async updateLanguageWithChanges(languageCode, fileChanges) {
    try {
      // Validate language code first
      const validatedLangCode = this.security.validateLanguageCode(languageCode);
      
      if (Object.keys(fileChanges).length === 0) {
        console.log(`ℹ️  No changes to process for ${validatedLangCode}`);
        return true;
      }

      console.log(`\n🔄 Updating ${validatedLangCode}...`);
      
      const langInfo = this.getLanguageInfo(validatedLangCode);
      const langDir = this.security.getPublicLocaleDirectory(validatedLangCode);
      
      // Ensure the language directory exists
      this.security.safeCreateDirectory(langDir);
      
      let filesUpdated = 0;
      let keysAdded = 0;
      let keysRemoved = 0;
      
      for (const [filePath, changes] of Object.entries(fileChanges)) {
        const namespace = this.convertFilePathToNamespace(filePath);
        
        try {
          this.security.validateLocaleFileName(namespace);
        } catch (error) {
          console.warn(`⚠️  Skipping invalid namespace ${namespace}: ${error.message}`);
          continue;
        }
        
        const targetPath = this.security.getPublicLocaleFilePath(validatedLangCode, namespace);
        
        // Load existing target file
        let existingContent = {};
        if (this.security.safeFileExists(targetPath)) {
          try {
            const existingContentStr = this.security.safeReadFile(targetPath);
            existingContent = JSON.parse(existingContentStr);
          } catch (error) {
            console.warn(`⚠️  Could not parse existing ${namespace}, starting fresh`);
          }
        }
        
        // Process removals first (clean up deleted keys)
        if (changes.removedCount > 0) {
          console.log(`   ➖ Removing ${changes.removedCount} deleted keys from ${namespace}`);
          existingContent = this.removeNestedKeys(existingContent, changes.removed);
          keysRemoved += changes.removedCount;
        }
        
        // Process additions (translate new/changed keys)
        if (changes.addedCount > 0) {
          console.log(`   ➕ Translating ${changes.addedCount} new/changed keys for ${namespace}`);
          
          try {
            // Translate only the added keys
            const translatedContent = await this.translationService.batchTranslate(
              { [namespace]: changes.added },
              validatedLangCode,
              langInfo.name
            );
            
            // Merge translated content with existing content
            if (translatedContent[namespace]) {
              existingContent = this.mergeTranslations(existingContent, translatedContent[namespace]);
              keysAdded += changes.addedCount;
            }
          } catch (error) {
            console.error(`❌ Failed to translate keys for ${namespace}:`, error.message);
            continue;
          }
        }
        
        // Save updated file
        const jsonContent = JSON.stringify(existingContent, null, 2) + '\n';
        this.security.safeWriteFile(targetPath, jsonContent);
        filesUpdated++;
        
        console.log(`   ✅ Updated ${namespace}`);
      }

      console.log(`✅ ${langInfo.name} (${validatedLangCode}): Updated ${filesUpdated} files, +${keysAdded} keys, -${keysRemoved} keys`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update ${languageCode}:`, error.message);
      return false;
    }
  }

  mergeTranslations(existing, updates) {
    const merged = { ...existing };
    
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = this.mergeTranslations(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  async runOptimizedUpdate(languageCodes = null) {
    console.log('🚀 Group Chat AI Optimized Incremental Translation Updater');
    console.log('========================================================');
    
    // Analyze changes in English files
    const fileChanges = this.analyzeChanges();
    
    if (Object.keys(fileChanges).length === 0) {
      console.log('\n✅ No translation updates needed - no changes detected in English locale files.');
      console.log('💡 Make changes to files in frontend/public/locales/en/ and commit them to use this tool.');
      return;
    }
    
    // Show summary of changes
    console.log('\n📋 Change Summary:');
    let totalAdded = 0;
    let totalRemoved = 0;
    
    for (const [filePath, changes] of Object.entries(fileChanges)) {
      console.log(`   📄 ${filePath}:`);
      if (changes.addedCount > 0) {
        console.log(`      ➕ ${changes.addedCount} added/changed keys`);
        totalAdded += changes.addedCount;
      }
      if (changes.removedCount > 0) {
        console.log(`      ➖ ${changes.removedCount} removed keys`);
        totalRemoved += changes.removedCount;
      }
    }
    
    console.log(`\n📊 Total: +${totalAdded} additions, -${totalRemoved} removals`);
    
    // Determine target languages
    const supportedLanguages = this.getSupportedLanguages();
    const targetLanguages = languageCodes 
      ? languageCodes.filter(code => supportedLanguages.includes(code))
      : supportedLanguages;
    
    if (targetLanguages.length === 0) {
      console.log('❌ No valid target languages found');
      return;
    }
    
    console.log(`\n🌍 Updating ${targetLanguages.length} languages: ${targetLanguages.join(', ')}`);
    console.log('💡 Only processing actual changes (additions/removals) to optimize AI usage and speed.\n');
    
    let successful = 0;
    let failed = 0;
    
    for (const lang of targetLanguages) {
      const success = await this.updateLanguageWithChanges(lang, fileChanges);
      if (success) {
        successful++;
      } else {
        failed++;
      }
      
      // Add delay between requests
      if (lang !== targetLanguages[targetLanguages.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n📊 Final Summary:');
    console.log(`✅ Successfully updated: ${successful} languages`);
    if (failed > 0) {
      console.log(`❌ Failed to update: ${failed} languages`);
    }
    
    console.log(`\n💰 Efficiency Gains:`);
    console.log(`   🔄 Processed only ${totalAdded} new/changed keys instead of regenerating entire files`);
    console.log(`   🧹 Cleaned up ${totalRemoved} obsolete keys across all languages`);
    console.log(`   ⚡ Optimized AI usage by translating only what changed`);
    console.log('🎉 Optimized incremental translation complete!');
    
    if (failed > 0) {
      console.log('\n💡 Note: Failed languages likely need AWS credentials configured');
      console.log('   Run: aws configure');
      console.log('   Or set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }
  }

  countKeys(obj) {
    let count = 0;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        count += this.countKeys(value);
      } else {
        count++;
      }
    }
    return count;
  }
}

const showHelp = () => {
  console.log('🚀 Group Chat AI Optimized Incremental Translation Updater');
  console.log('========================================================');
  console.log('');
  console.log('Efficiently updates translations by analyzing git diffs to find exactly');
  console.log('what keys were added, changed, or removed. Only translates new/changed keys');
  console.log('and automatically cleans up removed keys from all target languages.');
  console.log('');
  console.log('Usage:');
  console.log('  npm run i18n:update-changed-optimized              # Update all supported languages');
  console.log('  npm run i18n:update-changed-optimized pt es        # Update specific languages');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h    Show this help message');
  console.log('');
  console.log('Key Improvements over standard update-changed:');
  console.log('  ✅ Compares current vs HEAD to find exact key changes');
  console.log('  ✅ Translates only added/modified keys (not entire files)');
  console.log('  ✅ Automatically removes obsolete keys from target languages');
  console.log('  ✅ Preserves existing translations that haven\'t changed');
  console.log('  ✅ Significantly reduces AI API costs and processing time');
  console.log('');
  console.log('How it works:');
  console.log('  1. Uses git to compare current files vs HEAD revision');
  console.log('  2. Creates precise diff of added, changed, and removed keys');
  console.log('  3. For each target language:');
  console.log('     - Removes obsolete keys (cleanup)');
  console.log('     - Translates only new/changed keys');
  console.log('     - Merges results with existing translations');
  console.log('  4. Preserves all unchanged translations');
  console.log('');
  console.log('Requirements:');
  console.log('  - Git repository with changes in frontend/public/locales/en/');
  console.log('  - AWS credentials configured (aws configure)');
  console.log('  - Bedrock permissions for Claude Haiku model');
  console.log('');
  console.log('Examples:');
  console.log('  npm run i18n:update-changed-optimized              # Update all languages optimally');
  console.log('  npm run i18n:update-changed-optimized pt           # Update just Portuguese');
  console.log('  npm run i18n:update-changed-optimized fr de es     # Update French, German, Spanish');
};

// Command line usage
const main = async () => {
  const args = process.argv.slice(2);
  
  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const updater = new OptimizedIncrementalUpdater();

  try {
    if (args.length === 0) {
      // Update all supported languages
      await updater.runOptimizedUpdate();
    } else {
      // Update specific languages
      await updater.runOptimizedUpdate(args);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    
    if (error.message.includes('AWS') || error.message.includes('credentials')) {
      console.log('\n💡 AWS Setup Required:');
      console.log('   Make sure you have AWS credentials configured');
      console.log('   - AWS CLI: aws configure');
      console.log('   - Environment: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
      console.log('   - IAM Role with Bedrock permissions');
    }
    
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = OptimizedIncrementalUpdater;