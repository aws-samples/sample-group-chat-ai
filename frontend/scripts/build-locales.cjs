#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('./security-utils.cjs');

class LocaleBuilder {
  constructor() {
    this.security = new SecurityUtils();
    // Use security utils to validate paths
    // Locales are now stored directly in public/locales
    this.srcLocalesPath = this.security.validateFilePath(path.join('public', 'locales'));
    // Process in place since they're already in the correct location
    this.publicLocalesPath = this.security.validateFilePath(path.join('public', 'locales'));
  }

  // Minify JSON content
  minifyJson(content) {
    try {
      // Parse and stringify without formatting to minify
      return JSON.stringify(JSON.parse(content));
    } catch (error) {
      console.warn('Failed to minify JSON:', error.message);
      return content;
    }
  }

  // Copy and minify a single file
  processFile(srcPath, destPath) {
    try {
      // Validate paths for security
      const validatedSrc = this.security.validateFilePath(srcPath);
      const validatedDest = this.security.validateFilePath(destPath);
      
      const content = this.security.safeReadFile(validatedSrc);
      const minified = this.minifyJson(content);
      
      // Use security utils to safely write file
      this.security.safeWriteFile(validatedDest, minified);
      
      const originalSize = Buffer.byteLength(content, 'utf8');
      const minifiedSize = Buffer.byteLength(minified, 'utf8');
      const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
      
      return {
        originalSize,
        minifiedSize,
        savings: parseFloat(savings)
      };
    } catch (error) {
      console.error(`Failed to process ${srcPath}:`, error.message);
      return null;
    }
  }

  // Process all locale files
  buildLocales() {
    console.log('🏗️  Building and minifying locale files...');
    console.log(`📂 Processing: ${path.relative(process.cwd(), this.srcLocalesPath)}`);
    console.log('');

    if (!this.security.safeFileExists(this.srcLocalesPath)) {
      console.error('❌ Locales directory not found:', this.srcLocalesPath);
      process.exit(1);
    }

    // Since we're processing in place, no need to clean/recreate directory

    let totalOriginalSize = 0;
    let totalMinifiedSize = 0;
    let filesProcessed = 0;

    // Process each language directory
    const languages = this.security.safeReadDirectory(this.srcLocalesPath)
      .filter(entry => {
        const entryPath = path.join(this.srcLocalesPath, entry);
        try {
          return fs.statSync(entryPath).isDirectory();
        } catch (error) {
          return false;
        }
      })
      .filter(langCode => {
        try {
          this.security.validateLanguageCode(langCode);
          return true;
        } catch (error) {
          console.warn(`⚠️  Skipping invalid language directory: ${langCode}`);
          return false;
        }
      });

    console.log(`🌍 Processing ${languages.length} languages: ${languages.join(', ')}`);
    console.log('');

    for (const language of languages) {
      try {
        const langPath = path.join(this.srcLocalesPath, language);

        console.log(`📝 Processing ${language}...`);

        // Process each JSON file in the language directory
        const files = this.security.safeReadDirectory(langPath)
          .filter(file => {
            try {
              this.security.validateLocaleFileName(file);
              return file.endsWith('.json');
            } catch (error) {
              console.warn(`⚠️  Skipping invalid file: ${file}`);
              return false;
            }
          });

        for (const file of files) {
          try {
            const filePath = path.join(langPath, file);

            const result = this.processFile(filePath, filePath);
            if (result) {
              totalOriginalSize += result.originalSize;
              totalMinifiedSize += result.minifiedSize;
              filesProcessed++;
              
              console.log(`   ✅ ${file} (${result.originalSize}B → ${result.minifiedSize}B, -${result.savings}%)`);
            }
          } catch (error) {
            console.error(`❌ Failed to process ${file}:`, error.message);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to process language ${language}:`, error.message);
      }
    }

    const totalSavings = totalOriginalSize > 0 
      ? ((totalOriginalSize - totalMinifiedSize) / totalOriginalSize * 100).toFixed(1)
      : 0;

    console.log('');
    console.log('📊 Build Summary:');
    console.log(`   Files processed: ${filesProcessed}`);
    console.log(`   Original size: ${(totalOriginalSize / 1024).toFixed(1)}KB`);
    console.log(`   Minified size: ${(totalMinifiedSize / 1024).toFixed(1)}KB`);
    console.log(`   Total savings: ${totalSavings}%`);
    console.log('');
    console.log('✅ Locale build complete!');
  }

  // Watch mode for development (optional)
  watch() {
    console.log('👀 Watching for locale changes...');
    console.log('Press Ctrl+C to stop');
    
    // Simple file watcher (could be enhanced with chokidar if needed)
    const watchRecursive = (dir) => {
      try {
        fs.watch(dir, { recursive: true }, (eventType, filename) => {
          if (filename && filename.endsWith('.json')) {
            console.log(`🔄 File changed: ${filename}, rebuilding...`);
            this.buildLocales();
          }
        });
      } catch (error) {
        console.warn('Watch not supported, falling back to manual builds');
        process.exit(0);
      }
    };

    this.buildLocales();
    watchRecursive(this.srcLocalesPath);
  }
}

// Main execution
if (require.main === module) {
  const builder = new LocaleBuilder();
  const args = process.argv.slice(2);

  if (args.includes('--watch')) {
    builder.watch();
  } else if (args.includes('--help')) {
    console.log('🏗️  Locale Build Tool');
    console.log('===================');
    console.log('');
    console.log('Minifies locale JSON files in public/locales directory');
    console.log('');
    console.log('Usage:');
    console.log('  node build-locales.cjs           # Build once');
    console.log('  node build-locales.cjs --watch   # Build and watch for changes');
    console.log('  node build-locales.cjs --help    # Show this help');
    console.log('');
    console.log('This script is automatically run during the build process.');
  } else {
    builder.buildLocales();
  }
}

module.exports = LocaleBuilder;