#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const fs = require('fs');
const path = require('path');
const TranslationService = require('./translation-service.cjs');
const SecurityUtils = require('./security-utils.cjs');

class LanguageUpdater {
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
          .map(l => l.trim().replace(/['"]/g, ''))
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

  loadEnglishTranslations() {
    const translations = {};

    // Load consolidated files (new structure)
    const consolidatedFiles = ['common.json', 'components.json', 'pages.json', 'personas.json'];
    
    for (const file of consolidatedFiles) {
      try {
        const validatedFile = this.security.validateLocaleFileName(file);
        const filePath = this.security.getPublicLocaleFilePath('en', validatedFile);
        
        if (this.security.safeFileExists(filePath)) {
          const content = this.security.safeReadFile(filePath);
          translations[validatedFile.replace('.json', '')] = JSON.parse(content);
        }
      } catch (error) {
        console.error(`Error loading ${file}:`, error.message);
      }
    }

    return translations;
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

  cleanupOldFiles(langDir) {
    // Remove old nested structure directories that are now consolidated
    const oldDirs = ['common', 'components', 'pages'];
    let cleaned = 0;
    
    for (const dir of oldDirs) {
      try {
        const dirPath = path.join(langDir, dir);
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          // Validate the path is within allowed directories before deletion
          this.security.validateFilePath(dirPath);
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`🗑️  Removed old directory: ${dir}/`);
          cleaned++;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to remove ${dir}/:`, error.message);
      }
    }
    
    // Also remove old navigation.json if it exists (now in common.json)
    try {
      const navigationPath = path.join(langDir, 'navigation.json');
      if (fs.existsSync(navigationPath)) {
        // Validate the path before deletion
        this.security.validateFilePath(navigationPath);
        fs.unlinkSync(navigationPath);
        console.log(`🗑️  Removed old file: navigation.json`);
        cleaned++;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to remove navigation.json:`, error.message);
    }
    
    if (cleaned > 0) {
      console.log(`✅ Cleaned up ${cleaned} old structure files/directories`);
    }
  }

  async updateLanguage(languageCode) {
    try {
      // Validate language code first
      const validatedLangCode = this.security.validateLanguageCode(languageCode);
      console.log(`\n🔄 Updating ${validatedLangCode}...`);
      
      const langInfo = this.getLanguageInfo(validatedLangCode);
      const englishTranslations = this.loadEnglishTranslations();
      const langDir = this.security.getPublicLocaleDirectory(validatedLangCode);
      
      // Ensure the language directory exists
      this.security.safeCreateDirectory(langDir);
      
      try {
        // Translate all files
        const updatedTranslations = await this.translationService.batchTranslate(
          englishTranslations,
          validatedLangCode,
          langInfo.name
        );

        // Clean up old flat structure files first
        this.cleanupOldFiles(langDir);

        // Write consolidated files
        let filesUpdated = 0;
        for (const [category, content] of Object.entries(updatedTranslations)) {
          try {
            const validatedFilename = this.security.validateLocaleFileName(`${category}.json`);
            const outputFile = this.security.getPublicLocaleFilePath(validatedLangCode, validatedFilename);
            const jsonContent = JSON.stringify(content, null, 2) + '\n';
            this.security.safeWriteFile(outputFile, jsonContent);
            filesUpdated++;
          } catch (error) {
            console.error(`❌ Failed to write ${category}.json:`, error.message);
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

  async updateAllLanguages() {
    const languages = this.getSupportedLanguages();
    
    if (languages.length === 0) {
      console.log('❌ No supported languages found to update');
      console.log('💡 Add languages first using: npm run i18n:add-language');
      return;
    }

    console.log('🌍 Group Chat AI Language Update Tool');
    console.log('====================================');
    console.log(`Regenerating ${languages.length} supported languages: ${languages.join(', ')}\n`);
    console.log('📝 This will update all translations with any new strings from English source files.');

    let successful = 0;
    let failed = 0;

    for (const lang of languages) {
      const success = await this.updateLanguage(lang);
      if (success) {
        successful++;
      } else {
        failed++;
      }
      
      // Add delay between requests
      if (lang !== languages[languages.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`✅ Successfully updated: ${successful} languages`);
    if (failed > 0) {
      console.log(`❌ Failed to update: ${failed} languages`);
    }
    console.log('\n🎉 Language update complete!');
    
    if (failed > 0) {
      console.log('\n💡 Note: Failed languages likely need AWS credentials configured');
      console.log('   Run: aws configure');
      console.log('   Or set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }
  }

  async updateSpecificLanguages(languageCodes) {
    console.log('🌍 Group Chat AI Language Update Tool');
    console.log('====================================');

    const supportedLanguages = this.getSupportedLanguages();
    const validLanguages = languageCodes.filter(code => {
      if (!supportedLanguages.includes(code)) {
        console.log(`⚠️  Language '${code}' not supported. Available: ${supportedLanguages.join(', ')}`);
        return false;
      }
      return true;
    });

    if (validLanguages.length === 0) {
      console.log('❌ No valid languages to update');
      return;
    }

    console.log(`Updating ${validLanguages.length} languages: ${validLanguages.join(', ')}\n`);

    let successful = 0;
    let failed = 0;

    for (const lang of validLanguages) {
      const success = await this.updateLanguage(lang);
      if (success) {
        successful++;
      } else {
        failed++;
      }
      
      // Add delay between requests
      if (lang !== validLanguages[validLanguages.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`✅ Successfully updated: ${successful} languages`);
    if (failed > 0) {
      console.log(`❌ Failed to update: ${failed} languages`);
    }
  }
}

const showHelp = () => {
  console.log('🌍 Group Chat AI Language Update Tool');
  console.log('====================================');
  console.log('');
  console.log('Regenerates all translation files using the latest English source files.');
  console.log('Uses AWS Bedrock Claude to automatically translate new strings.');
  console.log('');
  console.log('Usage:');
  console.log('  npm run i18n:update-languages           # Update all supported languages');
  console.log('  npm run i18n:update-languages pt es     # Update specific languages');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h    Show this help message');
  console.log('');
  console.log('Requirements:');
  console.log('  - AWS credentials configured (aws configure)');
  console.log('  - Bedrock permissions for Claude Haiku model');
  console.log('');
  console.log('Examples:');
  console.log('  npm run i18n:update-languages           # Regenerate all languages');  
  console.log('  npm run i18n:update-languages pt        # Update just Portuguese');
  console.log('  npm run i18n:update-languages fr de es  # Update French, German, Spanish');
};

// Command line usage
const main = async () => {
  const args = process.argv.slice(2);
  
  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const updater = new LanguageUpdater();

  try {
    if (args.length === 0) {
      // Update all supported languages
      await updater.updateAllLanguages();
    } else {
      // Update specific languages
      await updater.updateSpecificLanguages(args);
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

module.exports = LanguageUpdater;
