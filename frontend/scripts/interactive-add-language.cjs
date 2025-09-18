#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const readline = require('readline');
const { addLanguageWithAI } = require('./add-language-ai.cjs');

// Comprehensive language mapping
const LANGUAGE_MAP = {
  'af': { name: 'Afrikaans', nativeName: 'Afrikaans' },
  'ar': { name: 'Arabic', nativeName: 'العربية' },
  'bg': { name: 'Bulgarian', nativeName: 'Български' },
  'bn': { name: 'Bengali', nativeName: 'বাংলা' },
  'ca': { name: 'Catalan', nativeName: 'Català' },
  'cs': { name: 'Czech', nativeName: 'Čeština' },
  'da': { name: 'Danish', nativeName: 'Dansk' },
  'de': { name: 'German', nativeName: 'Deutsch' },
  'el': { name: 'Greek', nativeName: 'Ελληνικά' },
  'en': { name: 'English', nativeName: 'English' },
  'es': { name: 'Spanish', nativeName: 'Español' },
  'et': { name: 'Estonian', nativeName: 'Eesti' },
  'fa': { name: 'Persian', nativeName: 'فارسی' },
  'fi': { name: 'Finnish', nativeName: 'Suomi' },
  'fr': { name: 'French', nativeName: 'Français' },
  'he': { name: 'Hebrew', nativeName: 'עברית' },
  'hr': { name: 'Croatian', nativeName: 'Hrvatski' },
  'hu': { name: 'Hungarian', nativeName: 'Magyar' },
  'id': { name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  'is': { name: 'Icelandic', nativeName: 'Íslenska' },
  'it': { name: 'Italian', nativeName: 'Italiano' },
  'ja': { name: 'Japanese', nativeName: '日本語' },
  'ko': { name: 'Korean', nativeName: '한국어' },
  'lt': { name: 'Lithuanian', nativeName: 'Lietuvių' },
  'lv': { name: 'Latvian', nativeName: 'Latviešu' },
  'mk': { name: 'Macedonian', nativeName: 'Македонски' },
  'ms': { name: 'Malay', nativeName: 'Bahasa Melayu' },
  'mt': { name: 'Maltese', nativeName: 'Malti' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands' },
  'no': { name: 'Norwegian', nativeName: 'Norsk' },
  'pl': { name: 'Polish', nativeName: 'Polski' },
  'pt': { name: 'Portuguese', nativeName: 'Português' },
  'ro': { name: 'Romanian', nativeName: 'Română' },
  'ru': { name: 'Russian', nativeName: 'Русский' },
  'sk': { name: 'Slovak', nativeName: 'Slovenčina' },
  'sl': { name: 'Slovenian', nativeName: 'Slovenščina' },
  'sq': { name: 'Albanian', nativeName: 'Shqip' },
  'sr': { name: 'Serbian', nativeName: 'Српски' },
  'sv': { name: 'Swedish', nativeName: 'Svenska' },
  'sw': { name: 'Swahili', nativeName: 'Kiswahili' },
  'th': { name: 'Thai', nativeName: 'ไทย' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe' },
  'uk': { name: 'Ukrainian', nativeName: 'Українська' },
  'ur': { name: 'Urdu', nativeName: 'اردو' },
  'vi': { name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  'zh': { name: 'Chinese', nativeName: '中文' },
};

class InteractiveLanguageAdder {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async question(query) {
    return new Promise(resolve => {
      this.rl.question(query, resolve);
    });
  }

  displayAvailableLanguages() {
    console.log('\n📋 Popular languages (showing some examples):');
    const popular = ['es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'];
    popular.forEach(code => {
      if (LANGUAGE_MAP[code]) {
        const lang = LANGUAGE_MAP[code];
        console.log(`  ${code} - ${lang.name} (${lang.nativeName})`);
      }
    });
    console.log(`  ... and ${Object.keys(LANGUAGE_MAP).length - popular.length} more supported codes`);
    console.log('\n💡 Enter any ISO 639-1 two-letter language code');
  }

  async getLanguageCode() {
    this.displayAvailableLanguages();
    
    while (true) {
      const code = await this.question('\n🌍 Enter language code (e.g. "pt" for Portuguese): ');
      const normalizedCode = code.toLowerCase().trim();
      
      if (!normalizedCode) {
        console.log('❌ Please enter a language code');
        continue;
      }
      
      if (normalizedCode === 'en') {
        console.log('❌ English is already the default language');
        continue;
      }
      
      if (LANGUAGE_MAP[normalizedCode]) {
        return normalizedCode;
      } else {
        console.log(`❌ Language code "${normalizedCode}" not recognized`);
        const suggestion = this.findSimilarCode(normalizedCode);
        if (suggestion) {
          console.log(`💡 Did you mean "${suggestion}"?`);
        }
        console.log('💡 Try a standard ISO 639-1 code like: es, fr, de, it, pt, ru, ja, etc.');
      }
    }
  }

  findSimilarCode(input) {
    // Simple similarity check
    for (const code in LANGUAGE_MAP) {
      if (code.includes(input) || input.includes(code)) {
        return code;
      }
    }
    
    // Check if they entered a language name instead of code
    const inputLower = input.toLowerCase();
    for (const [code, lang] of Object.entries(LANGUAGE_MAP)) {
      if (lang.name.toLowerCase().includes(inputLower) || 
          lang.nativeName.toLowerCase().includes(inputLower)) {
        return code;
      }
    }
    
    return null;
  }

  async getTranslationMode() {
    console.log('\n🤖 Translation options:');
    console.log('  1. AI Translation (recommended) - Uses AWS Bedrock for automatic translation');
    console.log('  2. Template Mode - Creates English templates for manual translation');
    
    while (true) {
      const choice = await this.question('\nChoose option (1 or 2): ');
      if (choice === '1') return false; // Use AI
      if (choice === '2') return true;  // Skip AI (template mode)
      console.log('❌ Please enter 1 or 2');
    }
  }

  async confirmAction(languageCode, languageName, nativeName, skipTranslation) {
    console.log('\n📋 Summary:');
    console.log(`  Language Code: ${languageCode}`);
    console.log(`  English Name: ${languageName}`);
    console.log(`  Native Name: ${nativeName}`);
    console.log(`  Mode: ${skipTranslation ? 'Template Mode' : 'AI Translation'}`);
    
    const confirm = await this.question('\nProceed? (Y/n): ');
    return !confirm || confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes';
  }

  close() {
    this.rl.close();
  }

  async run() {
    try {
      console.log('🌍 Group Chat AI Language Addition Tool');
      console.log('=====================================');
      
      const languageCode = await this.getLanguageCode();
      const languageInfo = LANGUAGE_MAP[languageCode];
      
      const skipTranslation = await this.getTranslationMode();
      
      const confirmed = await this.confirmAction(
        languageCode, 
        languageInfo.name, 
        languageInfo.nativeName, 
        skipTranslation
      );
      
      if (!confirmed) {
        console.log('❌ Operation cancelled');
        return;
      }
      
      console.log('\n🚀 Starting language addition...\n');
      
      await addLanguageWithAI(
        languageCode,
        languageInfo.name,
        languageInfo.nativeName,
        skipTranslation
      );
      
    } catch (error) {
      console.error('\n❌ Fatal error:', error.message);
      
      if (error.message.includes('AWS') || error.message.includes('credentials')) {
        console.log('\n💡 AWS Setup Help:');
        console.log('   Run: aws configure');
        console.log('   Or set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
        console.log('   Ensure Bedrock permissions for Claude Haiku model');
      }
    } finally {
      this.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const adder = new InteractiveLanguageAdder();
  adder.run();
}

module.exports = InteractiveLanguageAdder;