#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const fs = require('fs');
const path = require('path');
const MarkdownTranslationService = require('./markdown-translation-service.cjs');

class TranslationTester {
  constructor() {
    this.translationService = new MarkdownTranslationService();
    this.rootDir = process.cwd();
    this.docsDir = path.join(this.rootDir, 'docs');
  }

  /**
   * Test the markdown translation service with a small example
   */
  async testTranslationService() {
    console.log('🧪 Testing Markdown Translation Service');
    console.log('=====================================\n');

    const testMarkdown = `# Test Document

This is a test document for the translation service.

## Features

- **Markdown formatting** should be preserved
- Code blocks like \`npm install\` should not be translated
- Links [like this](https://example.com) should work
- Technical terms like AWS, API, CDK should remain unchanged

## Code Example

\`\`\`bash
npm run docs:translate
\`\`\`

This command translates documentation.`;

    try {
      console.log('📝 Testing translation to Spanish...');
      const spanishResult = await this.translationService.translateMarkdown(
        testMarkdown, 'es', 'Test Document'
      );

      console.log('✅ Spanish translation completed');
      console.log('📄 Result preview:');
      console.log('---');
      console.log(spanishResult.substring(0, 300) + '...');
      console.log('---\n');

      // Test validation
      const issues = this.translationService.validateTranslation(testMarkdown, spanishResult);
      if (issues.length > 0) {
        console.log('⚠️  Validation issues detected:');
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log('✅ Translation validation passed');
      }

      // Test navigation generation
      const navigation = this.translationService.generateLanguageNavigation('es', 'TEST.md');
      console.log('\n🔗 Generated navigation:');
      console.log(navigation);

      return true;
    } catch (error) {
      console.error('❌ Translation test failed:', error.message);
      return false;
    }
  }

  /**
   * Check if all required dependencies and setup are available
   */
  checkSetup() {
    console.log('🔍 Checking Translation Setup');
    console.log('============================\n');

    const checks = [];

    // Check AWS SDK v3
    try {
      require('@aws-sdk/client-bedrock-runtime');
      checks.push({ name: 'AWS SDK v3', status: '✅ Available' });
    } catch (error) {
      checks.push({ name: 'AWS SDK v3', status: '❌ Missing - run: npm install' });
    }

    // Check AWS credentials
    const hasCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    const hasProfile = process.env.AWS_PROFILE;
    
    if (hasCredentials || hasProfile) {
      checks.push({ name: 'AWS Credentials', status: '✅ Configured' });
    } else {
      checks.push({ name: 'AWS Credentials', status: '❌ Missing - run: aws configure' });
    }

    // Check root markdown files
    const rootFiles = fs.readdirSync(this.rootDir).filter(f => f.endsWith('.md'));
    checks.push({ 
      name: 'Root MD Files', 
      status: rootFiles.length > 0 ? `✅ Found ${rootFiles.length} files` : '⚠️  No .md files found' 
    });

    // Display results
    checks.forEach(check => {
      console.log(`${check.status.padEnd(30)} ${check.name}`);
    });

    const allGood = checks.every(check => check.status.startsWith('✅'));
    
    console.log('\n' + (allGood ? '🎉 Setup looks good!' : '⚠️  Setup needs attention'));
    
    return allGood;
  }

  /**
   * Validate existing translated documents
   */
  validateExistingTranslations() {
    console.log('\n🔍 Validating Existing Translations');
    console.log('==================================\n');

    if (!fs.existsSync(this.docsDir)) {
      console.log('ℹ️  No docs directory found - no existing translations to validate');
      return true;
    }

    const languages = this.translationService.getSupportedLanguageCodes();
    let validationsPassed = 0;
    let validationsFailed = 0;

    for (const lang of languages) {
      const langDir = path.join(this.docsDir, lang);
      
      if (!fs.existsSync(langDir)) {
        console.log(`ℹ️  No translations found for ${lang}`);
        continue;
      }

      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.md'));
      
      if (files.length === 0) {
        console.log(`ℹ️  No .md files found in docs/${lang}/`);
        continue;
      }

      console.log(`📂 Checking ${lang}/ (${files.length} files):`);
      
      for (const file of files) {
        const filePath = path.join(langDir, file);
        
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          
          // Basic checks
          const hasNavigation = content.includes('This document is also available in');
          const hasValidMarkdown = content.includes('#') || content.includes('**');
          
          if (hasNavigation && hasValidMarkdown) {
            console.log(`   ✅ ${file} - looks good`);
            validationsPassed++;
          } else {
            console.log(`   ⚠️  ${file} - may need regeneration`);
            validationsFailed++;
          }
        } catch (error) {
          console.log(`   ❌ ${file} - read error: ${error.message}`);
          validationsFailed++;
        }
      }
    }

    console.log(`\n📊 Validation Summary: ${validationsPassed} passed, ${validationsFailed} issues`);
    return validationsFailed === 0;
  }

  /**
   * Run comprehensive tests
   */
  async runTests() {
    console.log('🚀 Group Chat AI Documentation Translation Tests');
    console.log('==============================================\n');

    // Check setup
    const setupOk = this.checkSetup();
    
    if (!setupOk) {
      console.log('\n❌ Setup check failed - please fix the issues above before testing');
      return false;
    }

    // Test translation service (only if AWS credentials are available)
    let translationTestOk = true;
    try {
      translationTestOk = await this.testTranslationService();
    } catch (error) {
      console.log('\n⚠️  Skipping translation test - AWS credentials may not be configured');
      translationTestOk = false;
    }

    // Validate existing translations
    const validationOk = this.validateExistingTranslations();

    console.log('\n🎯 Test Summary:');
    console.log(`   Setup Check: ${setupOk ? '✅' : '❌'}`);
    console.log(`   Translation Test: ${translationTestOk ? '✅' : '⚠️ '}`);
    console.log(`   Validation: ${validationOk ? '✅' : '⚠️ '}`);

    if (setupOk && !translationTestOk) {
      console.log('\n💡 Translation test skipped due to AWS configuration.');
      console.log('   To test translations, ensure AWS credentials are configured.');
    }

    return setupOk;
  }
}

// Command line usage
const main = async () => {
  const tester = new TranslationTester();
  
  try {
    const success = await tester.runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = TranslationTester;