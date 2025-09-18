#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const fs = require('fs');
const path = require('path');
const TranslationService = require('./translation-service.cjs');
const SecurityUtils = require('./security-utils.cjs');

const addLanguageWithAI = async (languageCode, languageName, nativeName, skipTranslation = false) => {
  const security = new SecurityUtils();
  
  try {
    // Validate inputs
    const validatedLangCode = security.validateLanguageCode(languageCode);
    if (!languageName || typeof languageName !== 'string' || languageName.length > 100) {
      throw new Error('Language name must be a non-empty string (max 100 characters)');
    }
    if (!nativeName || typeof nativeName !== 'string' || nativeName.length > 100) {
      throw new Error('Native name must be a non-empty string (max 100 characters)');
    }
    
    // Get validated paths
    const langDir = security.getLocaleDirectory(validatedLangCode);
    const enDir = security.getLocaleDirectory('en');
    
    // Create language directory safely
    security.safeCreateDirectory(langDir);

  // Get consolidated translation files
  const getTranslationFiles = () => {
    return ['common.json', 'components.json', 'pages.json'];

    return files.sort(); // Sort for consistent ordering
  };
  
  const translationFiles = getTranslationFiles();
  
    // Check if language already exists
    const existingFiles = translationFiles.filter(file => {
      try {
        return security.safeFileExists(path.join(langDir, file));
      } catch (error) {
        return false;
      }
    });
  
    if (existingFiles.length > 0) {
      console.log(`⚠️  Language ${validatedLangCode} already exists with files: ${existingFiles.join(', ')}`);
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Overwrite existing translations? (y/N): ', resolve);
      });
      rl.close();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('❌ Translation cancelled');
        return;
      }
    }

    if (skipTranslation) {
        // Copy English files as templates (original behavior)
        console.log('📋 Creating template files (no AI translation)...');
        translationFiles.forEach(file => {
          try {
            const validatedFile = security.validateLocaleFileName(file);
            const enFile = security.getLocaleFilePath('en', validatedFile);
            const newFile = security.getLocaleFilePath(validatedLangCode, validatedFile);
            
            if (security.safeFileExists(enFile)) {
              security.safeCopyFile(enFile, newFile);
              console.log(`✓ Created ${validatedLangCode}/${validatedFile} (template for manual translation)`);
            }
          } catch (error) {
            console.warn(`⚠️  Failed to copy ${file}: ${error.message}`);
          }
        });
    } else {
        // Use AI translation
        console.log('🤖 Starting AI-powered translation...');
        
        // Load English source files
        const sourceFiles = {};
        for (const file of translationFiles) {
          try {
            const validatedFile = security.validateLocaleFileName(file);
            const enFile = security.getLocaleFilePath('en', validatedFile);
            if (security.safeFileExists(enFile)) {
              const content = security.safeReadFile(enFile);
              sourceFiles[validatedFile] = JSON.parse(content);
            }
          } catch (error) {
            console.warn(`⚠️  Failed to load ${file}: ${error.message}`);
          }
        }

        // Initialize translation service
        const translator = new TranslationService();
        
        // Translate all files
        const translatedFiles = await translator.batchTranslate(
          sourceFiles, 
          validatedLangCode, 
          languageName
        );

        // Write translated files
        for (const [filename, content] of Object.entries(translatedFiles)) {
          try {
            const validatedFilename = security.validateLocaleFileName(filename);
            const outputFile = security.getLocaleFilePath(validatedLangCode, validatedFilename);
            
            const jsonContent = JSON.stringify(content, null, 2) + '\n';
            security.safeWriteFile(outputFile, jsonContent);
            console.log(`✅ Created ${validatedLangCode}/${validatedFilename} with AI translation`);
          } catch (error) {
            console.error(`❌ Failed to write ${filename}: ${error.message}`);
          }
        }
      }

      // Update the I18nContext with the new language
      const contextFile = security.validateFilePath(path.join('src', 'contexts', 'I18nContext.tsx'));
      let contextContent = security.safeReadFile(contextFile);
      
      // Sanitize the language entry values to prevent injection
      const sanitizedLangName = languageName.replace(/['"]/g, '').slice(0, 100);
      const sanitizedNativeName = nativeName.replace(/['"]/g, '').slice(0, 100);
      const newLanguageEntry = `  { code: '${validatedLangCode}', name: '${sanitizedLangName}', nativeName: '${sanitizedNativeName}' },`;
      
      if (!contextContent.includes(`code: '${validatedLangCode}'`)) {
        const insertIndex = contextContent.indexOf('];');
        if (insertIndex !== -1) {
          contextContent = contextContent.slice(0, insertIndex) + newLanguageEntry + '\n' + contextContent.slice(insertIndex);
          security.safeWriteFile(contextFile, contextContent);
          console.log(`✅ Added ${sanitizedLangName} (${validatedLangCode}) to supported languages`);
        }
      } else {
        console.log(`ℹ️  Language ${validatedLangCode} already exists in supported languages`);
      }

      // Update i18n configuration
      const i18nFile = security.validateFilePath(path.join('src', 'i18n', 'index.ts'));
      let i18nContent = security.safeReadFile(i18nFile);
      
      const supportedLngsMatch = i18nContent.match(/supportedLngs: \[(.*?)\]/s);
      if (supportedLngsMatch) {
        const currentLangs = supportedLngsMatch[1]
          .split(',')
          .map(l => l.trim().replace(/['"]/g, ''))
          .filter(l => l.length > 0);
        
        if (!currentLangs.includes(validatedLangCode)) {
          const newSupportedLngs = [...currentLangs, validatedLangCode].map(l => `'${l}'`).join(', ');
          i18nContent = i18nContent.replace(
            /supportedLngs: \[.*?\]/s,
            `supportedLngs: [${newSupportedLngs}]`
          );
          security.safeWriteFile(i18nFile, i18nContent);
          console.log(`✅ Added ${validatedLangCode} to i18n configuration`);
        }
      }

      console.log(`\n🎉 Successfully added ${sanitizedLangName} (${validatedLangCode}) support!`);
      
      if (skipTranslation) {
        console.log(`📝 Next steps:`);
        console.log(`   1. Translate the JSON files in src/i18n/locales/${validatedLangCode}/`);
        console.log(`   2. Test the new language in the application`);
      } else {
        console.log(`🚀 Ready to use! The translations have been generated using AI.`);
        console.log(`📝 Optional next steps:`);
        console.log(`   1. Review and refine translations in src/i18n/locales/${validatedLangCode}/`);
        console.log(`   2. Test the new language in the application`);
        console.log(`   3. Have native speakers review for cultural accuracy`);
      }
      
      console.log(`   4. Consider adding RTL support if needed for ${sanitizedLangName}`);

  } catch (error) {
    console.error(`❌ Error adding language:`, error.message);
    
    if (error.message.includes('AWS') || error.message.includes('credentials')) {
      console.log(`\n💡 AWS Setup Required:`);
      console.log(`   Make sure you have AWS credentials configured:`);
      console.log(`   - AWS CLI: aws configure`);
      console.log(`   - Environment: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY`);
      console.log(`   - IAM Role with Bedrock permissions`);
      console.log(`\n   Falling back to template creation...`);
      
      // Fallback to template creation (validate inputs again for security)
      try {
        await addLanguageWithAI(languageCode, languageName, nativeName, true);
      } catch (fallbackError) {
        console.error(`❌ Fallback failed:`, fallbackError.message);
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
};

// Command line usage
const main = async () => {
  const args = process.argv.slice(2);
  
  // Parse flags
  const flags = args.filter(arg => arg.startsWith('--'));
  const positionalArgs = args.filter(arg => !arg.startsWith('--'));
  
  const skipTranslation = flags.includes('--no-ai') || flags.includes('--template-only');
  
  if (positionalArgs.length !== 3) {
    console.log('Usage: node add-language-ai.cjs <language-code> <language-name> <native-name> [--no-ai]');
    console.log('');
    console.log('Examples:');
    console.log('  node add-language-ai.cjs pt Portuguese Português');
    console.log('  node add-language-ai.cjs fr French Français --no-ai');
    console.log('');
    console.log('Options:');
    console.log('  --no-ai, --template-only  Skip AI translation and create templates only');
    process.exit(1);
  }

  const [languageCode, languageName, nativeName] = positionalArgs;
  
  console.log(`🌍 Adding ${languageName} (${languageCode})...`);
  if (skipTranslation) {
    console.log('📋 Template mode: Creating English templates for manual translation');
  } else {
    console.log('🤖 AI mode: Using Bedrock Claude for automatic translation');
  }
  
  await addLanguageWithAI(languageCode, languageName, nativeName, skipTranslation);
};

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { addLanguageWithAI };