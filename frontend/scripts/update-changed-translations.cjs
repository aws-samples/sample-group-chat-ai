#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const TranslationService = require('./translation-service.cjs');
const SecurityUtils = require('./security-utils.cjs');

class IncrementalLanguageUpdater {
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
      // Get all modified, added, and deleted files in the English locales directory
      // Determine the correct path based on current working directory
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

  getChangedKeys() {
    const changedFiles = this.getChangedEnglishFiles();
    const changedTranslations = {};
    
    if (changedFiles.length === 0) {
      console.log('ℹ️  No uncommitted changes detected in English locale files.');
      return {};
    }
    
    console.log(`📝 Found ${changedFiles.length} changed English locale files:`);
    
    for (const { path: filePath, status } of changedFiles) {
      console.log(`   ${status} ${filePath}`);
      
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
      
      if (status === '??') {
        // New untracked file - include all keys
        const keys = this.extractKeysFromFile(fullPath);
        if (Object.keys(keys).length > 0) {
          changedTranslations[filePath] = keys;
        }
      } else if (status === 'M') {
        // Modified file - for complex JSON changes, just translate the entire file
        // This is more reliable than trying to parse diffs for nested JSON
        console.log(`   📄 Modified file detected, regenerating entire file: ${path.basename(filePath)}`);
        const keys = this.extractKeysFromFile(fullPath);
        if (Object.keys(keys).length > 0) {
          changedTranslations[filePath] = keys;
        }
      }
    }
    
    return changedTranslations;
  }

  extractKeysFromDiff(diffOutput, currentFilePath) {
    const addedKeys = {};
    const currentContent = this.extractKeysFromFile(currentFilePath);
    
    // Parse diff to find added/modified lines
    const lines = diffOutput.split('\n');
    const addedLines = lines.filter(line => line.startsWith('+') && !line.startsWith('+++'));
    
    // If we can't parse the diff effectively, return all current keys
    if (addedLines.length === 0) {
      return currentContent;
    }
    
    // Try to extract JSON keys from added lines
    const jsonKeyRegex = /"([^"]+)"\s*:\s*"([^"]*?)"/g;
    
    for (const line of addedLines) {
      let match;
      while ((match = jsonKeyRegex.exec(line)) !== null) {
        const [, key, value] = match;
        
        // Check if this key exists in current content and add it
        if (this.hasNestedKey(currentContent, key)) {
          this.setNestedKey(addedKeys, key, this.getNestedKey(currentContent, key));
        }
      }
    }
    
    // If we couldn't extract specific keys from diff, return all current content
    return Object.keys(addedKeys).length > 0 ? addedKeys : currentContent;
  }

  hasNestedKey(obj, key) {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return false;
      }
    }
    
    return true;
  }

  getNestedKey(obj, key) {
    const keys = key.split('.');
    let current = obj;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  setNestedKey(obj, key, value) {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  convertFilePathToNamespace(filePath) {
    // Convert file paths to namespace format expected by translation service
    // e.g., "frontend/public/locales/en/common.json" -> "common.json"
    // or "public/locales/en/common.json" -> "common.json"
    const frontendMatch = filePath.match(/frontend\/public\/locales\/en\/(.+)$/);
    const relativeMatch = filePath.match(/public\/locales\/en\/(.+)$/);
    return frontendMatch ? frontendMatch[1] : (relativeMatch ? relativeMatch[1] : filePath);
  }

  async updateLanguageWithChangedKeys(languageCode, changedTranslations) {
    try {
      // Validate language code first
      const validatedLangCode = this.security.validateLanguageCode(languageCode);
      
      if (Object.keys(changedTranslations).length === 0) {
        console.log(`ℹ️  No changes to translate for ${validatedLangCode}`);
        return true;
      }

      console.log(`\n🔄 Updating ${validatedLangCode} with ${Object.keys(changedTranslations).length} changed files...`);
      
      const langInfo = this.getLanguageInfo(validatedLangCode);
      const langDir = this.security.getPublicLocaleDirectory(validatedLangCode);
      
      // Ensure the language directory exists
      this.security.safeCreateDirectory(langDir);
      
      try {
        // Convert file paths to namespaces and prepare for translation
        const translationInput = {};
        for (const [filePath, keys] of Object.entries(changedTranslations)) {
          const namespace = this.convertFilePathToNamespace(filePath);
          // Validate namespace is a safe filename
          try {
            this.security.validateLocaleFileName(namespace);
            translationInput[namespace] = keys;
          } catch (error) {
            console.warn(`⚠️  Skipping invalid namespace ${namespace}: ${error.message}`);
          }
        }

        // Translate the changed keys
        const translatedContent = await this.translationService.batchTranslate(
          translationInput,
          validatedLangCode,
          langInfo.name
        );

        // Update the target language files
        let filesUpdated = 0;
        for (const [namespace, content] of Object.entries(translatedContent)) {
          try {
            const validatedNamespace = this.security.validateLocaleFileName(namespace);
            const targetPath = this.security.getPublicLocaleFilePath(validatedLangCode, validatedNamespace);
            
            // If target file exists, merge with existing content
            let finalContent = content;
            if (this.security.safeFileExists(targetPath)) {
              try {
                const existingContentStr = this.security.safeReadFile(targetPath);
                const existingContent = JSON.parse(existingContentStr);
                finalContent = this.mergeTranslations(existingContent, content);
              } catch (error) {
                console.warn(`⚠️  Could not parse existing ${namespace}, overwriting`);
              }
            }
            
            const jsonContent = JSON.stringify(finalContent, null, 2) + '\n';
            this.security.safeWriteFile(targetPath, jsonContent);
            filesUpdated++;
          } catch (error) {
            console.error(`❌ Failed to update ${namespace}:`, error.message);
          }
        }

        console.log(`✅ Updated ${filesUpdated} files for ${langInfo.name} (${validatedLangCode})`);
        return true;
      } catch (error) {
        console.error(`❌ Failed to update ${validatedLangCode}:`, error.message);
        return false;
      }
    } catch (error) {
      console.error(`❌ Invalid language code ${languageCode}:`, error.message);
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

  async updateChangedTranslations(languageCodes = null) {
    console.log('🚀 Group Chat AI Incremental Translation Updater');
    console.log('===============================================');
    
    // Get changed keys from git
    const changedTranslations = this.getChangedKeys();
    
    if (Object.keys(changedTranslations).length === 0) {
      console.log('\n✅ No translation updates needed - no changes detected in English locale files.');
      console.log('💡 Make changes to files in frontend/public/locales/en/ and commit them to use this tool.');
      return;
    }
    
    // Show what will be translated
    console.log('\n📋 Changes detected:');
    for (const [filePath, keys] of Object.entries(changedTranslations)) {
      const keyCount = this.countKeys(keys);
      console.log(`   ${filePath} (${keyCount} keys)`);
    }
    
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
    console.log('📝 Only translating changed/new keys to reduce AI costs and processing time.\n');
    
    let successful = 0;
    let failed = 0;
    
    for (const lang of targetLanguages) {
      const success = await this.updateLanguageWithChangedKeys(lang, changedTranslations);
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
    
    console.log('\n📊 Update Summary:');
    console.log(`✅ Successfully updated: ${successful} languages`);
    if (failed > 0) {
      console.log(`❌ Failed to update: ${failed} languages`);
    }
    
    // Calculate savings
    const totalKeys = this.countKeys(changedTranslations);
    console.log(`\n💰 Efficiency: Translated ${totalKeys} changed keys instead of all keys`);
    console.log('🎉 Incremental translation complete!');
    
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
  console.log('🚀 Group Chat AI Incremental Translation Updater');
  console.log('===============================================');
  console.log('');
  console.log('Efficiently updates translations by only translating keys that have changed');
  console.log('in uncommitted English locale files. Uses git diff to detect changes.');
  console.log('');
  console.log('Usage:');
  console.log('  npm run i18n:update-changed                 # Update all supported languages');
  console.log('  npm run i18n:update-changed pt es          # Update specific languages');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h    Show this help message');
  console.log('');
  console.log('How it works:');
  console.log('  1. Analyzes git status to find uncommitted English locale files');
  console.log('  2. For new files: translates all keys');
  console.log('  3. For modified files: uses git diff to find changed keys');
  console.log('  4. Only translates the changed/new keys, reducing AI cost and time');
  console.log('');
  console.log('Requirements:');
  console.log('  - Git repository with uncommitted changes in frontend/public/locales/en/');
  console.log('  - AWS credentials configured (aws configure)');
  console.log('  - Bedrock permissions for Claude Haiku model');
  console.log('');
  console.log('Examples:');
  console.log('  npm run i18n:update-changed                 # Update all languages with changes');
  console.log('  npm run i18n:update-changed pt              # Update just Portuguese');
  console.log('  npm run i18n:update-changed fr de es        # Update French, German, Spanish');
};

// Command line usage
const main = async () => {
  const args = process.argv.slice(2);
  
  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const updater = new IncrementalLanguageUpdater();

  try {
    if (args.length === 0) {
      // Update all supported languages
      await updater.updateChangedTranslations();
    } else {
      // Update specific languages
      await updater.updateChangedTranslations(args);
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

module.exports = IncrementalLanguageUpdater;