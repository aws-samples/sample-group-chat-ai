#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const fs = require('fs');
const path = require('path');
const MarkdownTranslationService = require('./markdown-translation-service.cjs');

class DocumentTranslator {
  constructor() {
    this.translationService = new MarkdownTranslationService();
    this.rootDir = process.cwd();
    this.docsDir = path.join(this.rootDir, 'docs');
  }

  /**
   * Get all markdown files in the root directory
   */
  getRootMarkdownFiles() {
    try {
      const files = fs.readdirSync(this.rootDir);
      return files
        .filter(file => file.endsWith('.md') && fs.statSync(path.join(this.rootDir, file)).isFile())
        .sort();
    } catch (error) {
      console.error('Error reading root directory:', error.message);
      return [];
    }
  }

  /**
   * Ensure docs directory structure exists
   */
  ensureDocsStructure() {
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
      console.log(`📁 Created docs directory: ${this.docsDir}`);
    }

    // Create language subdirectories
    const languages = this.translationService.getSupportedLanguageCodes();
    for (const lang of languages) {
      const langDir = path.join(this.docsDir, lang);
      if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
        console.log(`📁 Created language directory: docs/${lang}/`);
      }
    }
  }

  /**
   * Read markdown file content
   */
  readMarkdownFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Write markdown file content
   */
  writeMarkdownFile(filePath, content) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error(`Error writing ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Get the translated filename for a language
   */
  getTranslatedFilename(originalFilename, languageCode) {
    const nameWithoutExt = path.parse(originalFilename).name;
    return `${nameWithoutExt}_${languageCode}.md`;
  }

  /**
   * Get document title from markdown content
   */
  extractDocumentTitle(content) {
    const lines = content.split('\n');
    
    // Look for the first heading
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim();
      }
    }
    
    return 'Documentation';
  }

  /**
   * Update the English version with cross-language navigation
   */
  updateEnglishDocument(filename) {
    const filePath = path.join(this.rootDir, filename);
    const content = this.readMarkdownFile(filePath);
    
    if (!content) {
      console.error(`❌ Could not read ${filename}`);
      return false;
    }

    // Prepare content (remove existing navigation)
    const cleanContent = this.translationService.prepareContentForTranslation(content);
    
    // Add navigation
    const contentWithNav = this.translationService.processMarkdownWithNavigation(
      cleanContent, 'en', filename
    );

    // Write back to the original file
    if (this.writeMarkdownFile(filePath, contentWithNav)) {
      console.log(`✅ Updated English navigation in ${filename}`);
      return true;
    }
    
    return false;
  }

  /**
   * Translate a single document to a specific language
   */
  async translateDocument(filename, targetLanguage) {
    console.log(`\n🔄 Translating ${filename} to ${targetLanguage}...`);
    
    const langInfo = this.translationService.getLanguageInfo(targetLanguage);
    const sourcePath = path.join(this.rootDir, filename);
    
    // Read source content
    const sourceContent = this.readMarkdownFile(sourcePath);
    if (!sourceContent) {
      console.error(`❌ Could not read source file: ${filename}`);
      return false;
    }

    // Prepare content for translation (remove navigation)
    const cleanContent = this.translationService.prepareContentForTranslation(sourceContent);
    const documentTitle = this.extractDocumentTitle(cleanContent);

    try {
      // Translate the content
      console.log(`   📝 Translating content to ${langInfo.nativeName}...`);
      const translatedContent = await this.translationService.translateMarkdown(
        cleanContent, targetLanguage, documentTitle
      );

      // Validate translation
      const validationIssues = this.translationService.validateTranslation(cleanContent, translatedContent);
      if (validationIssues.length > 0) {
        console.warn(`⚠️  Translation validation issues for ${filename} (${targetLanguage}):`);
        validationIssues.forEach(issue => console.warn(`     - ${issue}`));
      }

      // Add cross-language navigation
      const contentWithNav = this.translationService.processMarkdownWithNavigation(
        translatedContent, targetLanguage, filename
      );

      // Write translated file
      const translatedFilename = this.getTranslatedFilename(filename, targetLanguage);
      const outputPath = path.join(this.docsDir, targetLanguage, translatedFilename);
      
      if (this.writeMarkdownFile(outputPath, contentWithNav)) {
        console.log(`   ✅ Saved: docs/${targetLanguage}/${translatedFilename}`);
        return true;
      } else {
        console.error(`   ❌ Failed to save: docs/${targetLanguage}/${translatedFilename}`);
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Translation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Translate a document to all supported languages or specific languages
   */
  async translateDocumentToAllLanguages(filename, specificLanguages = null) {
    const targetLanguages = specificLanguages || this.translationService.getSupportedLanguageCodes();
    const langText = specificLanguages ?
      `specified languages (${specificLanguages.join(', ')})` :
      'all supported languages';

    console.log(`\n🌍 Translating ${filename} to ${langText}...`);

    let successful = 0;
    let failed = 0;

    // First update the English version with navigation (only if translating all languages)
    if (!specificLanguages && this.updateEnglishDocument(filename)) {
      console.log(`   ✅ Updated English version with cross-language navigation`);
    }

    // Translate to each language
    for (const lang of targetLanguages) {
      const success = await this.translateDocument(filename, lang);
      if (success) {
        successful++;
      } else {
        failed++;
      }

      // Add delay between requests to respect rate limits
      if (lang !== targetLanguages[targetLanguages.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    console.log(`\n📊 Translation Summary for ${filename}:`);
    console.log(`   ✅ Successful: ${successful} languages`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed} languages`);
    }

    return { successful, failed };
  }

  /**
   * Translate all root markdown documents
   */
  async translateAllDocuments() {
    console.log('🚀 Group Chat AI Documentation Translator');
    console.log('========================================');

    this.ensureDocsStructure();

    const markdownFiles = this.getRootMarkdownFiles();

    if (markdownFiles.length === 0) {
      console.log('❌ No markdown files found in root directory');
      return;
    }

    console.log(`📄 Found ${markdownFiles.length} markdown files to translate:`);
    markdownFiles.forEach(file => console.log(`   - ${file}`));

    let totalSuccessful = 0;
    let totalFailed = 0;

    for (const file of markdownFiles) {
      const { successful, failed } = await this.translateDocumentToAllLanguages(file);
      totalSuccessful += successful;
      totalFailed += failed;
    }

    console.log('\n🎉 Final Translation Summary:');
    console.log(`📄 Documents processed: ${markdownFiles.length}`);
    console.log(`✅ Total successful translations: ${totalSuccessful}`);
    if (totalFailed > 0) {
      console.log(`❌ Total failed translations: ${totalFailed}`);
    }

    console.log('\n📁 Translated documents are available in:');
    const languages = this.translationService.getSupportedLanguageCodes();
    languages.forEach(lang => {
      const langInfo = this.translationService.getLanguageInfo(lang);
      console.log(`   📂 docs/${lang}/ (${langInfo.nativeName})`);
    });

    if (totalFailed > 0) {
      console.log('\n💡 Note: Failed translations likely need AWS credentials configured');
      console.log('   Run: aws configure');
      console.log('   Or set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }
  }

  /**
   * Translate all root markdown documents to specific languages
   */
  async translateAllDocumentsToSpecificLanguages(specificLanguages) {
    console.log('🚀 Group Chat AI Documentation Translator');
    console.log('========================================');

    this.ensureDocsStructure();

    const markdownFiles = this.getRootMarkdownFiles();

    if (markdownFiles.length === 0) {
      console.log('❌ No markdown files found in root directory');
      return;
    }

    console.log(`📄 Found ${markdownFiles.length} markdown files to translate to ${specificLanguages.length} language(s):`);
    markdownFiles.forEach(file => console.log(`   - ${file}`));
    console.log(`🌍 Target languages: ${specificLanguages.join(', ')}`);

    let totalSuccessful = 0;
    let totalFailed = 0;

    for (const file of markdownFiles) {
      const { successful, failed } = await this.translateDocumentToAllLanguages(file, specificLanguages);
      totalSuccessful += successful;
      totalFailed += failed;
    }

    console.log('\n🎉 Final Translation Summary:');
    console.log(`📄 Documents processed: ${markdownFiles.length}`);
    console.log(`✅ Total successful translations: ${totalSuccessful}`);
    if (totalFailed > 0) {
      console.log(`❌ Total failed translations: ${totalFailed}`);
    }

    console.log('\n📁 Translated documents are available in:');
    specificLanguages.forEach(lang => {
      const langInfo = this.translationService.getLanguageInfo(lang);
      console.log(`   📂 docs/${lang}/ (${langInfo.nativeName})`);
    });

    if (totalFailed > 0) {
      console.log('\n💡 Note: Failed translations likely need AWS credentials configured');
      console.log('   Run: aws configure');
      console.log('   Or set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
    }
  }

  /**
   * Translate specific documents with optional language filtering
   */
  async translateSpecificDocuments(filenames, specificLanguages = null) {
    console.log('🚀 Group Chat AI Documentation Translator');
    console.log('========================================');

    this.ensureDocsStructure();

    const allMarkdownFiles = this.getRootMarkdownFiles();
    const validFiles = filenames.filter(file => {
      if (allMarkdownFiles.includes(file)) {
        return true;
      } else {
        console.warn(`⚠️  File not found in root directory: ${file}`);
        return false;
      }
    });

    if (validFiles.length === 0) {
      console.log('❌ No valid markdown files to translate');
      return;
    }

    const langText = specificLanguages ?
      `to ${specificLanguages.length} specific language(s): ${specificLanguages.join(', ')}` :
      'to all supported languages';

    console.log(`📄 Translating ${validFiles.length} specified files ${langText}:`);
    validFiles.forEach(file => console.log(`   - ${file}`));

    let totalSuccessful = 0;
    let totalFailed = 0;

    for (const file of validFiles) {
      const { successful, failed } = await this.translateDocumentToAllLanguages(file, specificLanguages);
      totalSuccessful += successful;
      totalFailed += failed;
    }

    console.log('\n🎉 Translation Summary:');
    console.log(`📄 Documents processed: ${validFiles.length}`);
    console.log(`✅ Total successful translations: ${totalSuccessful}`);
    if (totalFailed > 0) {
      console.log(`❌ Total failed translations: ${totalFailed}`);
    }
  }
}

const showHelp = () => {
  console.log('🚀 Group Chat AI Documentation Translator');
  console.log('========================================');
  console.log('');
  console.log('Translates root-level markdown documents to all supported languages');
  console.log('and creates cross-language navigation links in each document.');
  console.log('');
  console.log('Usage:');
  console.log('  npm run docs:translate                      # Translate all root .md files');
  console.log('  npm run docs:translate README.md            # Translate specific file');
  console.log('  npm run docs:translate README.md ARCH*      # Translate multiple files');
  console.log('  npm run docs:translate --lang es README.md  # Translate to specific language');
  console.log('  npm run docs:translate --lang es,fr,de      # Translate all files to specific languages');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h        Show this help message');
  console.log('  --lang LANGS      Comma-separated language codes to translate to');
  console.log('                    Available: ar, de, es, fr, he, it, ja, ko, nl, pt, ru, sv, zh');
  console.log('');
  console.log('Features:');
  console.log('  ✅ Translates all root-level .md files to 13 languages');
  console.log('  ✅ Preserves markdown formatting and structure');
  console.log('  ✅ Adds cross-language navigation to each document');
  console.log('  ✅ Organizes translations in docs/{language}/ folders');
  console.log('  ✅ Validates translation quality automatically');
  console.log('  ✅ Supports single language re-runs for efficiency');
  console.log('');
  console.log('Output Structure:');
  console.log('  docs/');
  console.log('  ├── es/README_es.md       (Spanish)');
  console.log('  ├── fr/README_fr.md       (French)');
  console.log('  ├── de/README_de.md       (German)');
  console.log('  └── ... (and 10 more languages)');
  console.log('');
  console.log('Requirements:');
  console.log('  - AWS credentials configured (aws configure)');
  console.log('  - Bedrock permissions for Claude Haiku model');
  console.log('  - Root .md files to translate');
  console.log('');
  console.log('Examples:');
  console.log('  npm run docs:translate                      # All files, all languages');
  console.log('  npm run docs:translate README.md            # Just README, all languages');
  console.log('  npm run docs:translate --lang es            # All files, Spanish only');
  console.log('  npm run docs:translate --lang es,fr README.md  # README to Spanish & French');
};

// Command line usage
const main = async () => {
  const args = process.argv.slice(2);

  // Handle help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  // Parse --lang argument
  let specificLanguages = null;
  let fileArgs = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && i + 1 < args.length) {
      const langString = args[i + 1];
      specificLanguages = langString.split(',').map(lang => lang.trim());
      i++; // Skip the next argument since we consumed it
    } else if (!args[i].startsWith('--')) {
      fileArgs.push(args[i]);
    }
  }

  const translator = new DocumentTranslator();

  // Validate languages if provided
  if (specificLanguages) {
    const supportedLangs = translator.translationService.getSupportedLanguageCodes();
    const invalidLangs = specificLanguages.filter(lang => !supportedLangs.includes(lang));

    if (invalidLangs.length > 0) {
      console.error(`❌ Invalid language codes: ${invalidLangs.join(', ')}`);
      console.log(`✅ Supported languages: ${supportedLangs.join(', ')}`);
      process.exit(1);
    }
  }

  try {
    if (fileArgs.length === 0) {
      // Translate all markdown files
      if (specificLanguages) {
        // Create a custom method for translating all files to specific languages
        await translator.translateAllDocumentsToSpecificLanguages(specificLanguages);
      } else {
        await translator.translateAllDocuments();
      }
    } else {
      // Translate specific files
      await translator.translateSpecificDocuments(fileArgs, specificLanguages);
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

module.exports = DocumentTranslator;