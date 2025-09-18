#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

class MarkdownTranslationService {
  constructor() {
    this.bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.modelId = 'us.anthropic.claude-sonnet-4-20250514-v1:0';
    
    // Language configurations (sorted by language code)
    this.supportedLanguages = [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
      { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
      { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
      { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    ];
  }

  getLanguageInfo(languageCode) {
    return this.supportedLanguages.find(lang => lang.code === languageCode) || {
      code: languageCode,
      name: languageCode.toUpperCase(),
      nativeName: languageCode.toUpperCase()
    };
  }

  getSupportedLanguageCodes() {
    return this.supportedLanguages.map(lang => lang.code).filter(code => code !== 'en');
  }

  /**
   * Get translated language names for navigation
   */
  getTranslatedLanguageNames(targetLanguage) {
    const translations = {
      'ar': {
        'ar': 'العربية', 'de': 'الألمانية', 'en': 'الإنجليزية', 'es': 'الإسبانية', 'fr': 'الفرنسية',
        'he': 'العبرية', 'it': 'الإيطالية', 'ja': 'اليابانية', 'ko': 'الكورية', 'nl': 'الهولندية',
        'pt': 'البرتغالية', 'ru': 'الروسية', 'sv': 'السويدية', 'zh': 'الصينية'
      },
      'de': {
        'ar': 'Arabisch', 'de': 'Deutsch', 'en': 'Englisch', 'es': 'Spanisch', 'fr': 'Französisch',
        'he': 'Hebräisch', 'it': 'Italienisch', 'ja': 'Japanisch', 'ko': 'Koreanisch', 'nl': 'Niederländisch',
        'pt': 'Portugiesisch', 'ru': 'Russisch', 'sv': 'Schwedisch', 'zh': 'Chinesisch'
      },
      'en': {
        'ar': 'Arabic', 'de': 'German', 'en': 'English', 'es': 'Spanish', 'fr': 'French',
        'he': 'Hebrew', 'it': 'Italian', 'ja': 'Japanese', 'ko': 'Korean', 'nl': 'Dutch',
        'pt': 'Portuguese', 'ru': 'Russian', 'sv': 'Swedish', 'zh': 'Chinese'
      },
      'es': {
        'ar': 'Árabe', 'de': 'Alemán', 'en': 'Inglés', 'es': 'Español', 'fr': 'Francés',
        'he': 'Hebreo', 'it': 'Italiano', 'ja': 'Japonés', 'ko': 'Coreano', 'nl': 'Holandés',
        'pt': 'Portugués', 'ru': 'Ruso', 'sv': 'Sueco', 'zh': 'Chino'
      },
      'fr': {
        'ar': 'Arabe', 'de': 'Allemand', 'en': 'Anglais', 'es': 'Espagnol', 'fr': 'Français',
        'he': 'Hébreu', 'it': 'Italien', 'ja': 'Japonais', 'ko': 'Coréen', 'nl': 'Néerlandais',
        'pt': 'Portugais', 'ru': 'Russe', 'sv': 'Suédois', 'zh': 'Chinois'
      },
      'he': {
        'ar': 'ערבית', 'de': 'גרמנית', 'en': 'אנגלית', 'es': 'ספרדית', 'fr': 'צרפתית',
        'he': 'עברית', 'it': 'איטלקית', 'ja': 'יפנית', 'ko': 'קוריאנית', 'nl': 'הולנדית',
        'pt': 'פורטוגזית', 'ru': 'רוסית', 'sv': 'שוודית', 'zh': 'סינית'
      },
      'it': {
        'ar': 'Arabo', 'de': 'Tedesco', 'en': 'Inglese', 'es': 'Spagnolo', 'fr': 'Francese',
        'he': 'Ebraico', 'it': 'Italiano', 'ja': 'Giapponese', 'ko': 'Coreano', 'nl': 'Olandese',
        'pt': 'Portoghese', 'ru': 'Russo', 'sv': 'Svedese', 'zh': 'Cinese'
      },
      'ja': {
        'ar': 'アラビア語', 'de': 'ドイツ語', 'en': '英語', 'es': 'スペイン語', 'fr': 'フランス語',
        'he': 'ヘブライ語', 'it': 'イタリア語', 'ja': '日本語', 'ko': '韓国語', 'nl': 'オランダ語',
        'pt': 'ポルトガル語', 'ru': 'ロシア語', 'sv': 'スウェーデン語', 'zh': '中国語'
      },
      'ko': {
        'ar': '아랍어', 'de': '독일어', 'en': '영어', 'es': '스페인어', 'fr': '프랑스어',
        'he': '히브리어', 'it': '이탈리아어', 'ja': '일본어', 'ko': '한국어', 'nl': '네덜란드어',
        'pt': '포르투갈어', 'ru': '러시아어', 'sv': '스웨덴어', 'zh': '중국어'
      },
      'nl': {
        'ar': 'Arabisch', 'de': 'Duits', 'en': 'Engels', 'es': 'Spaans', 'fr': 'Frans',
        'he': 'Hebreeuws', 'it': 'Italiaans', 'ja': 'Japans', 'ko': 'Koreaans', 'nl': 'Nederlands',
        'pt': 'Portugees', 'ru': 'Russisch', 'sv': 'Zweeds', 'zh': 'Chinees'
      },
      'pt': {
        'ar': 'Árabe', 'de': 'Alemão', 'en': 'Inglês', 'es': 'Espanhol', 'fr': 'Francês',
        'he': 'Hebraico', 'it': 'Italiano', 'ja': 'Japonês', 'ko': 'Coreano', 'nl': 'Holandês',
        'pt': 'Português', 'ru': 'Russo', 'sv': 'Sueco', 'zh': 'Chinês'
      },
      'ru': {
        'ar': 'Арабский', 'de': 'Немецкий', 'en': 'Английский', 'es': 'Испанский', 'fr': 'Французский',
        'he': 'Иврит', 'it': 'Итальянский', 'ja': 'Японский', 'ko': 'Корейский', 'nl': 'Голландский',
        'pt': 'Португальский', 'ru': 'Русский', 'sv': 'Шведский', 'zh': 'Китайский'
      },
      'sv': {
        'ar': 'Arabiska', 'de': 'Tyska', 'en': 'Engelska', 'es': 'Spanska', 'fr': 'Franska',
        'he': 'Hebreiska', 'it': 'Italienska', 'ja': 'Japanska', 'ko': 'Koreanska', 'nl': 'Nederländska',
        'pt': 'Portugisiska', 'ru': 'Ryska', 'sv': 'Svenska', 'zh': 'Kinesiska'
      },
      'zh': {
        'ar': '阿拉伯语', 'de': '德语', 'en': '英语', 'es': '西班牙语', 'fr': '法语',
        'he': '希伯来语', 'it': '意大利语', 'ja': '日语', 'ko': '韩语', 'nl': '荷兰语',
        'pt': '葡萄牙语', 'ru': '俄语', 'sv': '瑞典语', 'zh': '中文'
      }
    };
    
    return translations[targetLanguage] || translations['en'];
  }

  /**
   * Get translated navigation header for each language
   */
  getNavigationHeader(languageCode) {
    const headers = {
      'ar': '**هذا المستند متوفر أيضاً بـ:**',
      'de': '**Dieses Dokument ist auch verfügbar in:**',
      'en': '**This document is also available in:**',
      'es': '**Este documento también está disponible en:**',
      'fr': '**Ce document est également disponible en:**',
      'he': '**מסמך זה זמין גם ב:**',
      'it': '**Questo documento è disponibile anche in:**',
      'ja': '**この文書は以下の言語でもご利用いただけます:**',
      'ko': '**이 문서는 다음 언어로도 제공됩니다:**',
      'nl': '**Dit document is ook beschikbaar in:**',
      'pt': '**Este documento também está disponível em:**',
      'ru': '**Этот документ также доступен на:**',
      'sv': '**Detta dokument är också tillgängligt på:**',
      'zh': '**本文档还提供以下语言版本:**'
    };
    
    return headers[languageCode] || headers['en'];
  }

  /**
   * Generate cross-language navigation links for markdown documents
   */
  generateLanguageNavigation(currentLang, documentName, excludeCurrent = true) {
    // Generate navigation headers in ALL languages, each linking to its own version
    const allLanguageCodes = ['en', ...this.getSupportedLanguageCodes()];
    const navigationLines = allLanguageCodes.map(langCode => {
      const header = this.getNavigationHeader(langCode);
      
      // Generate the path for this specific language
      const path = langCode === 'en' 
        ? (currentLang === 'en' ? '#' : `../${documentName}`)
        : (currentLang === 'en' 
          ? `./docs/${langCode}/${documentName.replace('.md', '')}_${langCode}.md`
          : (currentLang === langCode ? '#' : `./${documentName.replace('.md', '')}_${langCode}.md`));
      
      // Get the language name and flag
      const translatedNames = this.getTranslatedLanguageNames(langCode);
      const langName = translatedNames[langCode] || this.getLanguageInfo(langCode).nativeName;
      const flag = this.getLanguageInfo(langCode).flag || '';
      
      return `• ${flag} ${header} [${langName}](${path})`;
    });
    
    return navigationLines.join('\n> ');
  }

  /**
   * Translate markdown content using Claude
   */
  async translateMarkdown(content, targetLanguage, documentTitle) {
    const langInfo = this.getLanguageInfo(targetLanguage);
    
    const prompt = `You are a professional technical translator specializing in software documentation. Please translate the following English markdown document to ${langInfo.name} (${langInfo.nativeName}).

IMPORTANT TRANSLATION GUIDELINES:
1. Preserve ALL markdown formatting (headers, links, code blocks, tables, etc.)
2. Do NOT translate:
   - Code snippets, command lines, file paths, URLs
   - Technical terms like "AWS", "CDK", "GitHub", "npm", "API" 
   - Variable names, function names, class names
   - Configuration keys and values
3. DO translate:
   - All narrative text, descriptions, explanations
   - Comments within code (if any)
   - User-facing messages and labels
4. Maintain the same document structure and hierarchy
5. Ensure the translation is natural and professional for ${langInfo.name} speakers
6. Keep technical accuracy while making it culturally appropriate

Document Title: ${documentTitle}
Target Language: ${langInfo.name} (${langInfo.nativeName})

Original English Content:
${content}

Please provide the translated markdown document:`;

    try {
      const command = new ConverseCommand({
        modelId: this.modelId,
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              }
            ]
          }
        ],
        inferenceConfig: {
          maxTokens: 64000,
          temperature: 0.1
        }
      });

      const response = await this.bedrock.send(command);
      return response.output.message.content[0].text.trim();
    } catch (error) {
      console.error(`Translation failed for ${targetLanguage}:`, error.message);
      throw error;
    }
  }

  /**
   * Process markdown content to add language navigation
   */
  processMarkdownWithNavigation(content, currentLang, documentName) {
    const navigation = this.generateLanguageNavigation(currentLang, documentName);
    
    // Insert navigation after the first heading or at the beginning
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the first non-empty line that's not a heading
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() && !lines[i].startsWith('#')) {
        insertIndex = i;
        break;
      }
      if (lines[i].startsWith('#')) {
        insertIndex = i + 1;
        break;
      }
    }
    
    // Insert navigation with proper spacing
    lines.splice(insertIndex, 0, '', `> ${navigation}`, '');
    
    return lines.join('\n');
  }

  /**
   * Clean and prepare markdown content for translation
   */
  prepareContentForTranslation(content) {
    // Remove any existing language navigation (in case we're re-translating)
    const lines = content.split('\n');
    let cleanedLines = [];
    let inNavigationBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      
      // Start of navigation block - check for flag emoji and navigation text
      if (trimmed.startsWith('> •') && trimmed.includes('🇺🇸') && (
          trimmed.includes('This document is also available') ||
          trimmed.includes('هذا المستند متوفر أيضاً بـ') ||
          trimmed.includes('Dieses Dokument ist auch verfügbar') ||
          trimmed.includes('Este documento también está disponible') ||
          trimmed.includes('Ce document est également disponible') ||
          trimmed.includes('מסמך זה זמין גם ב') ||
          trimmed.includes('Questo documento è disponibile anche') ||
          trimmed.includes('この文書は以下の言語でもご利用') ||
          trimmed.includes('이 문서는 다음 언어로도 제공') ||
          trimmed.includes('Dit document is ook beschikbaar') ||
          trimmed.includes('Este documento também está disponível') ||
          trimmed.includes('Этот документ также доступен') ||
          trimmed.includes('Detta dokument är också tillgängligt') ||
          trimmed.includes('本文档还提供以下语言版本')
        )) {
        inNavigationBlock = true;
        continue; // Skip this line
      }
      
      // Continue skipping lines that are part of navigation block
      if (inNavigationBlock) {
        if (trimmed.startsWith('> •') && (trimmed.includes('🇸🇦') || trimmed.includes('🇩🇪') || 
            trimmed.includes('🇪🇸') || trimmed.includes('🇫🇷') || trimmed.includes('🇮🇱') ||
            trimmed.includes('🇮🇹') || trimmed.includes('🇯🇵') || trimmed.includes('🇰🇷') ||
            trimmed.includes('🇳🇱') || trimmed.includes('🇵🇹') || trimmed.includes('🇷🇺') ||
            trimmed.includes('🇸🇪') || trimmed.includes('🇨🇳'))) {
          continue; // Skip navigation lines
        } else if (trimmed === '' && i + 1 < lines.length && lines[i + 1].trim() !== '' && !lines[i + 1].trim().startsWith('> •')) {
          // End of navigation block - found empty line followed by non-navigation content
          inNavigationBlock = false;
          cleanedLines.push(lines[i]); // Keep the empty line
        } else if (trimmed === '') {
          continue; // Skip empty lines in navigation block
        } else {
          // End of navigation block
          inNavigationBlock = false;
          cleanedLines.push(lines[i]);
        }
      } else {
        cleanedLines.push(lines[i]);
      }
    }
    
    return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n'); // Clean up excessive newlines
  }

  /**
   * Validate that the translation preserved markdown structure
   */
  validateTranslation(original, translated) {
    const issues = [];
    
    // Clean both original and translated content for comparison
    const cleanOriginal = this.prepareContentForTranslation(original);
    const cleanTranslated = this.prepareContentForTranslation(translated);
    
    // Check that heading count is preserved (excluding navigation blocks)
    // Use flexible regex to handle headers with or without leading spaces
    const originalHeaders = (cleanOriginal.match(/^\s*#+\s/gm) || []).length;
    const translatedHeaders = (cleanTranslated.match(/^\s*#+\s/gm) || []).length;
    
    if (originalHeaders !== translatedHeaders) {
      issues.push(`Header count mismatch: ${originalHeaders} -> ${translatedHeaders}`);
    }
    
    // Check that code blocks are preserved
    const originalCodeBlocks = (cleanOriginal.match(/```/g) || []).length;
    const translatedCodeBlocks = (cleanTranslated.match(/```/g) || []).length;
    
    if (originalCodeBlocks !== translatedCodeBlocks) {
      issues.push(`Code block count mismatch: ${originalCodeBlocks} -> ${translatedCodeBlocks}`);
    }
    
    // Check for common URLs that shouldn't be translated
    const originalUrls = (cleanOriginal.match(/https?:\/\/[^\s\)]+/g) || []).length;
    const translatedUrls = (cleanTranslated.match(/https?:\/\/[^\s\)]+/g) || []).length;
    
    if (Math.abs(originalUrls - translatedUrls) > 2) { // Allow some variance for flexibility
      issues.push(`Significant URL count difference: ${originalUrls} -> ${translatedUrls}`);
    }
    
    return issues;
  }
}

module.exports = MarkdownTranslationService;