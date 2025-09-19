#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

class TranslationService {
  constructor() {
    this.client = new BedrockRuntimeClient({
    });
    this.modelId = 'us.anthropic.claude-sonnet-4-20250514-v1:0';
    this.maxOutputTokens = 64000;
  }

  // Rough token estimation for content sizing
  estimateTokens(text) {
    // Conservative estimation: ~4 characters per token for most languages
    // This accounts for both ASCII and multi-byte characters
    return Math.ceil(text.length / 4);
  }

  shouldUseChunking(content) {
    const contentJson = JSON.stringify(content);
    const promptOverhead = 500; // Estimate for system prompt and formatting

    const inputTokens = this.estimateTokens(contentJson) + promptOverhead;
    const estimatedOutputTokens = inputTokens * 1.2; // Translations often 10-20% longer
    const totalTokens = inputTokens + estimatedOutputTokens;

    // Use 90% of max capacity to leave buffer for model variations
    const tokenLimit = this.maxOutputTokens * 0.9;

    return totalTokens > tokenLimit;
  }

  async translateJson(jsonContent, targetLanguage, languageName, context = '') {
    // Validate input JSON first
    let validatedContent;
    try {
      validatedContent = JSON.parse(JSON.stringify(jsonContent));
    } catch (error) {
      console.error('Input JSON is invalid:', error.message);
      throw new Error('Invalid input JSON provided for translation');
    }

    const prompt = `Translate this JSON from English to ${languageName} (${targetLanguage}). Return ONLY the translated JSON with no other text.

Rules:
- Keep all JSON keys unchanged (only translate values)
- Preserve all placeholders like {{name}} or {{count}}
- Use proper escaping for quotes within strings
- Return valid JSON format only

Input JSON:
${JSON.stringify(validatedContent, null, 2)}

Output the translated JSON:`;

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
          maxTokens: 64000, // Increased for larger responses
          temperature: 0.1
        },
        additionalModelRequestFields: {
          // Disable reasoning mode if the model supports it
          // reasoning_effort: 'low'
        }
      });

      // Add timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 60 second timeout

      let response;
      try {
        response = await this.client.send(command, {
          abortSignal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        if (timeoutError.name === 'AbortError') {
          throw new Error('Translation request timed out after 3 minutes');
        }
        throw timeoutError;
      }

      // Handle different response formats based on the response structure
      let translatedText;

      if (response.output && response.output.message && response.output.message.content) {
        // Converse API format
        const content = response.output.message.content;

        // Debug: Log full content array to understand structure
        // console.log('Full content array length:', content.length);

        // Look through all content items for the actual text response
        for (const item of content) {
          if (item.text) {
            // Standard text response
            translatedText = item.text.trim();
            break;
          }
        }

        // If no text found in any content item, it might be a model that only returns reasoning
        // In this case, we should retry with a different approach or fallback
        if (!translatedText) {
          // Check if there's reasoning content (model might be in reasoning mode)
          const hasReasoning = content.some(item => item.reasoningContent);
          if (hasReasoning) {
            console.warn('Model returned only reasoning content, no translation. Consider disabling reasoning mode or switching models.');
          }

          // Log the full content structure to understand what we're getting
          console.error('No text found in content. Structure:', JSON.stringify(content, null, 2).substring(0, 2000));
          throw new Error('Model did not return translated text (only reasoning). Please check model configuration.');
        }
      } else {
        // Log the actual response structure for debugging
        console.error('Unexpected response structure:', JSON.stringify(response, null, 2).substring(0, 500));
        throw new Error('Invalid response format from Bedrock');
      }

      if (!translatedText) {
        throw new Error('Empty response from Bedrock');
      }

      // Remove markdown code blocks if present
      translatedText = translatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Remove any potential BOM or zero-width characters
      translatedText = translatedText.replace(/^\uFEFF/, '').replace(/\u200B/g, '');

      // Try to parse as-is first (in case it's already valid JSON)
      try {
        return JSON.parse(translatedText);
      } catch (firstAttempt) {
        // Not valid JSON as-is, try to extract it
      }

      // Check if the response looks like it's missing the opening brace
      if (!translatedText.trim().startsWith('{') && translatedText.includes('"') && translatedText.includes(':')) {
        // Try adding opening brace
        translatedText = '{' + translatedText;
      }

      // Extract JSON from the response (in case there's extra text)
      // First try to find a complete JSON object
      let jsonMatch = translatedText.match(/\{[\s\S]*\}/);

      // If no match, the response might be incomplete or malformed
      if (!jsonMatch) {
        console.error('Response length:', translatedText.length);
        console.error('Raw response (first 200 chars):', translatedText.substring(0, 200));

        // If it ends with } but doesn't start with {, try to repair
        if (translatedText.trim().endsWith('}') && !translatedText.trim().startsWith('{')) {
          console.error('Response missing opening brace, attempting repair');
          const repairedJson = '{' + translatedText;
          try {
            return JSON.parse(this.sanitizeJsonString(repairedJson));
          } catch (repairError) {
            console.error('Failed to repair JSON with missing opening brace');
          }
        }

        throw new Error('No valid JSON found in translation response');
      }

      let jsonString = jsonMatch[0];

      // Clean up common issues before parsing
      jsonString = this.sanitizeJsonString(jsonString);

      // Validate JSON before parsing
      try {
        return JSON.parse(jsonString);
      } catch (parseError) {
        // Try more aggressive fixes
        let fixedJson = this.aggressiveJsonFix(jsonString);

        try {
          return JSON.parse(fixedJson);
        } catch (secondParseError) {
          // Last resort: try to rebuild JSON structure
          try {
            const rebuiltJson = this.rebuildJsonStructure(jsonString, jsonContent);
            return JSON.parse(rebuiltJson);
          } catch (rebuildError) {
            throw new Error(`JSON parsing failed after all attempts: ${parseError.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`Translation error for ${targetLanguage}:`, error.message);

      // Fallback: return original JSON with a note
      const fallbackJson = JSON.parse(JSON.stringify(jsonContent));
      this.addTranslationNote(fallbackJson, `Translation failed - manual translation needed for ${languageName}`);
      return fallbackJson;
    }
  }

  sanitizeJsonString(jsonString) {
    // Remove RTL/LTR marks and other directional characters
    let cleaned = jsonString
      .replace(/[\u200E\u200F\u202A-\u202E]/g, '') // Remove LTR/RTL marks
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters (keep \t, \n, \r)
      .replace(/\t/g, '  ') // Replace tabs with spaces
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Quote unquoted keys

    // Fix line breaks within string values (common issue with Arabic text)
    cleaned = cleaned.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
    cleaned = cleaned.replace(/"([^"]*)\r\n([^"]*)"/g, '"$1 $2"');

    // Fix improperly escaped quotes - be more careful
    cleaned = cleaned.replace(/([^\\])\\([^"\\nrt])/g, '$1\\\\$2'); // Escape backslashes that aren't escaping something valid

    // Ensure proper string quoting
    cleaned = cleaned.replace(/:\s*'([^']*)'/g, (match, p1) => {
      // Replace single quotes with double quotes, escaping backslashes and internal quotes
      return ': "' + p1.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ') + '"';
    });

    return cleaned;
  }

  aggressiveJsonFix(jsonString) {
    let fixed = jsonString;

    // Remove any non-JSON content before first { or after last }
    const firstBrace = fixed.indexOf('{');
    const lastBrace = fixed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      fixed = fixed.substring(firstBrace, lastBrace + 1);
    }

    // Fix nested quotes issues
    fixed = fixed.replace(/"([^"]*)"(\s*:\s*)"([^"]*)"/g, (match, key, colon, value) => {
      // Escape any quotes within the value
      const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${key}"${colon}"${escapedValue}"`;
    });

    // Remove duplicate commas
    fixed = fixed.replace(/,\s*,/g, ',');

    // Ensure no comma before closing braces/brackets
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Fix missing commas between properties
    fixed = fixed.replace(/"\s*}\s*"/g, '"},\n"');
    fixed = fixed.replace(/"\s*"\s*([a-zA-Z_])/g, '",\n"$1');

    return fixed;
  }

  rebuildJsonStructure(brokenJson, originalStructure) {
    // This is a last-resort method that tries to extract translations
    // and rebuild them using the original structure as a template
    const result = JSON.parse(JSON.stringify(originalStructure));

    // Extract all key-value pairs from the broken JSON
    const keyValueRegex = /"([^"]+)"\s*:\s*"([^"]*)"/g;
    const translations = {};
    let match;

    while ((match = keyValueRegex.exec(brokenJson)) !== null) {
      translations[match[1]] = match[2];
    }

    // Apply translations to the original structure
    function applyTranslations(obj) {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Keep original if no translation found
          obj[key] = translations[key] || obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          applyTranslations(obj[key]);
        }
      }
    }

    applyTranslations(result);
    return JSON.stringify(result);
  }

  addTranslationNote(obj, note) {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach(item => this.addTranslationNote(item, note));
      } else {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = `[${note}] ${obj[key]}`;
            return; // Only add note to first string found
          } else if (typeof obj[key] === 'object') {
            this.addTranslationNote(obj[key], note);
          }
        }
      }
    }
  }

  async translateLargeJson(jsonContent, targetLanguage, languageName, context = '') {
    // Split large JSON into smaller chunks
    // Calculate chunk size based on token limits
    const maxSafeTokens = this.maxOutputTokens * 0.4; // Use 40% of limit per chunk for safety
    const maxChunkCharacters = Math.floor(maxSafeTokens * 4); // ~4 chars per token

    const chunks = [];
    const maxChunkSize = maxChunkCharacters;

    function splitObject(obj, path = '') {
      const chunk = {};
      let currentSize = 0;

      for (const [key, value] of Object.entries(obj)) {
        const valueSize = JSON.stringify({ [key]: value }).length;

        if (typeof value === 'object' && value !== null && !Array.isArray(value) && valueSize > maxChunkSize) {
          // Recursively split nested objects
          const nestedChunks = splitObject(value, path ? `${path}.${key}` : key);
          chunks.push(...nestedChunks);
        } else if (currentSize + valueSize > maxChunkSize && Object.keys(chunk).length > 0) {
          // Start a new chunk
          chunks.push({ path, content: chunk });
          chunk[key] = value;
          currentSize = valueSize;
        } else {
          // Add to current chunk
          chunk[key] = value;
          currentSize += valueSize;
        }
      }

      if (Object.keys(chunk).length > 0) {
        chunks.push({ path, content: chunk });
      }

      return chunks;
    }

    // Split the content
    const contentChunks = splitObject(jsonContent);

    if (contentChunks.length === 1 && !this.shouldUseChunking(jsonContent)) {
      // Small enough to translate as-is
      return await this.translateJson(jsonContent, targetLanguage, languageName, context);
    }

    console.log(`   📦 Splitting into ${contentChunks.length} chunks for translation...`);

    // Translate each chunk
    const translatedChunks = [];
    for (let i = 0; i < contentChunks.length; i++) {
      console.log(`   📝 Translating chunk ${i + 1}/${contentChunks.length}...`);
      const translatedChunk = await this.translateJson(
        contentChunks[i].content,
        targetLanguage,
        languageName,
        context
      );
      translatedChunks.push({ path: contentChunks[i].path, content: translatedChunk });

      // Small delay between chunks
      if (i < contentChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Reconstruct the full object
    const result = {};
    for (const chunk of translatedChunks) {
      if (chunk.path) {
        // Nested content
        const keys = chunk.path.split('.');
        let current = result;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = chunk.content;
      } else {
        // Root level content
        Object.assign(result, chunk.content);
      }
    }

    return result;
  }

  async batchTranslate(jsonFiles, targetLanguage, languageName) {
    const results = {};
    const totalFiles = Object.keys(jsonFiles).length;
    let completed = 0;
    let failed = 0;

    console.log(`🤖 Starting AI translation to ${languageName} (${targetLanguage})...`);
    console.log(`📊 Processing ${totalFiles} files (including nested structure files)`);

    for (const [filename, content] of Object.entries(jsonFiles)) {
      try {
        console.log(`📝 Translating ${filename}... (${completed + failed + 1}/${totalFiles})`);

        // Handle nested structure files with context-aware translation
        let translationContext = '';
        if (filename === 'common' || filename.startsWith('common/')) {
          translationContext = 'These are common UI elements used throughout the application.';
        } else if (filename === 'components' || filename.startsWith('components/')) {
          translationContext = 'These are component-specific UI texts and messages.';
        } else if (filename === 'pages' || filename.startsWith('pages/')) {
          translationContext = 'These are page-specific content and navigation elements.';
        }

        // Check if file needs chunking based on token estimation
        if (this.shouldUseChunking(content)) {
          const contentSize = JSON.stringify(content).length;
          const estimatedTokens = this.estimateTokens(contentSize);
          console.log(`   ⚠️  Large file detected (${contentSize} chars, ~${estimatedTokens} input tokens), using chunked translation...`);
          results[filename] = await this.translateLargeJson(content, targetLanguage, languageName, translationContext);
        } else {
          results[filename] = await this.translateJson(content, targetLanguage, languageName, translationContext);
        }

        completed++;
        console.log(`   ✅ Successfully translated ${filename}`);

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        failed++;
        console.error(`   ❌ Failed to translate ${filename}:`, error.message);

        // Log more details for debugging
        if (error.message.includes('JSON parsing')) {
          console.error(`      Debug: Check the AI response format for ${targetLanguage}`);
          console.error(`      Hint: The model might be adding extra formatting or characters`);
        }
        if (error.message.includes('timeout')) {
          console.error(`      Debug: Translation timed out - file might be too large`);
          console.error(`      Hint: Consider breaking the file into smaller sections`);
        }

        results[filename] = content; // Use original content as fallback
      }
    }

    console.log(`✅ Translation completed: ${completed}/${totalFiles} files successfully translated`);
    if (failed > 0) {
      console.log(`⚠️  ${failed} files used fallback due to translation errors`);
    }
    return results;
  }
}

module.exports = TranslationService;