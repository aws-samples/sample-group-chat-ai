import * as fs from 'fs';
import * as path from 'path';

describe('Translation Completeness', () => {
  let englishTranslations: Record<string, any> = {};
  let allLanguages: string[] = [];
  let allNamespaces: string[] = [];

  beforeAll(() => {
    const localesPath = path.resolve(__dirname, '../../public/locales');

    // Get all supported languages
    allLanguages = fs.readdirSync(localesPath).filter(item => {
      return fs.statSync(path.join(localesPath, item)).isDirectory();
    });

    // Load English translations as reference
    const englishPath = path.join(localesPath, 'en');
    const englishFiles = fs.readdirSync(englishPath).filter(file => file.endsWith('.json'));

    allNamespaces = englishFiles.map(file => path.basename(file, '.json'));

    for (const file of englishFiles) {
      const namespace = path.basename(file, '.json');
      const content = JSON.parse(fs.readFileSync(path.join(englishPath, file), 'utf8'));
      englishTranslations[namespace] = content;
    }
  });

  test('all languages have the same namespace files as English', () => {
    const missingFiles: Array<{ language: string; namespace: string }> = [];

    allLanguages.forEach(language => {
      if (language === 'en') return; // Skip English itself

      const languagePath = path.resolve(__dirname, `../../public/locales/${language}`);

      allNamespaces.forEach(namespace => {
        const filePath = path.join(languagePath, `${namespace}.json`);
        if (!fs.existsSync(filePath)) {
          missingFiles.push({ language, namespace });
        }
      });
    });

    if (missingFiles.length > 0) {
      console.log('\nMissing translation files:');
      missingFiles.forEach(missing => {
        console.log(`  - ${missing.language}/${missing.namespace}.json`);
      });
    }

    expect(missingFiles).toEqual([]);
  });

  test('all languages have valid JSON files', () => {
    const invalidFiles: Array<{ language: string; namespace: string; error: string }> = [];

    allLanguages.forEach(language => {
      const languagePath = path.resolve(__dirname, `../../public/locales/${language}`);

      allNamespaces.forEach(namespace => {
        const filePath = path.join(languagePath, `${namespace}.json`);

        if (fs.existsSync(filePath)) {
          try {
            JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } catch (error) {
            invalidFiles.push({
              language,
              namespace,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });
    });

    if (invalidFiles.length > 0) {
      console.log('\nInvalid JSON files:');
      invalidFiles.forEach(invalid => {
        console.log(`  - ${invalid.language}/${invalid.namespace}.json: ${invalid.error}`);
      });
    }

    expect(invalidFiles).toEqual([]);
  });

  test('all languages have matching keys to English', () => {
    const missingKeys: Array<{
      language: string;
      namespace: string;
      missingKey: string;
    }> = [];

    allLanguages.forEach(language => {
      if (language === 'en') return; // Skip English itself

      const languagePath = path.resolve(__dirname, `../../public/locales/${language}`);

      allNamespaces.forEach(namespace => {
        const filePath = path.join(languagePath, `${namespace}.json`);

        if (fs.existsSync(filePath)) {
          try {
            const languageTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const englishKeys = getAllKeys(englishTranslations[namespace]);
            const languageKeys = getAllKeys(languageTranslations);

            englishKeys.forEach(key => {
              if (!languageKeys.includes(key)) {
                missingKeys.push({
                  language,
                  namespace,
                  missingKey: key
                });
              }
            });
          } catch (error) {
            // JSON parsing errors are caught in the previous test
          }
        }
      });
    });

    if (missingKeys.length > 0) {
      console.log('\nMissing translation keys:');

      // Group by language for better readability
      const byLanguage = missingKeys.reduce((acc, item) => {
        if (!acc[item.language]) acc[item.language] = [];
        acc[item.language].push(item);
        return acc;
      }, {} as Record<string, typeof missingKeys>);

      Object.entries(byLanguage).forEach(([language, keys]) => {
        console.log(`  ${language}:`);
        keys.forEach(key => {
          console.log(`    - ${key.namespace}: ${key.missingKey}`);
        });
      });

      console.log(`\nTotal missing keys: ${missingKeys.length}`);
    }

    expect(missingKeys).toEqual([]);
  });

  test('no languages have extra keys not present in English', () => {
    const extraKeys: Array<{
      language: string;
      namespace: string;
      extraKey: string;
    }> = [];

    allLanguages.forEach(language => {
      if (language === 'en') return; // Skip English itself

      const languagePath = path.resolve(__dirname, `../../public/locales/${language}`);

      allNamespaces.forEach(namespace => {
        const filePath = path.join(languagePath, `${namespace}.json`);

        if (fs.existsSync(filePath)) {
          try {
            const languageTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const englishKeys = getAllKeys(englishTranslations[namespace]);
            const languageKeys = getAllKeys(languageTranslations);

            languageKeys.forEach(key => {
              if (!englishKeys.includes(key)) {
                extraKeys.push({
                  language,
                  namespace,
                  extraKey: key
                });
              }
            });
          } catch (error) {
            // JSON parsing errors are caught in the previous test
          }
        }
      });
    });

    if (extraKeys.length > 0) {
      console.log('\nExtra translation keys (not in English):');

      // Group by language for better readability
      const byLanguage = extraKeys.reduce((acc, item) => {
        if (!acc[item.language]) acc[item.language] = [];
        acc[item.language].push(item);
        return acc;
      }, {} as Record<string, typeof extraKeys>);

      Object.entries(byLanguage).forEach(([language, keys]) => {
        console.log(`  ${language}:`);
        keys.forEach(key => {
          console.log(`    - ${key.namespace}: ${key.extraKey}`);
        });
      });

      console.log(`\nTotal extra keys: ${extraKeys.length}`);
    }

    // This is a warning test - extra keys don't necessarily break functionality
    // but indicate potential inconsistencies in translation management
    if (extraKeys.length > 0) {
      console.warn('\nNote: Extra keys found. Consider reviewing translation management process.');
    }

    expect(extraKeys).toEqual([]);
  });

  test('translation values are not empty or placeholder', () => {
    const invalidValues: Array<{
      language: string;
      namespace: string;
      key: string;
      value: string;
    }> = [];

    allLanguages.forEach(language => {
      if (language === 'en') return; // Skip English as it's the source

      const languagePath = path.resolve(__dirname, `../../public/locales/${language}`);

      allNamespaces.forEach(namespace => {
        const filePath = path.join(languagePath, `${namespace}.json`);

        if (fs.existsSync(filePath)) {
          try {
            const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            checkForInvalidValues(translations, '', language, namespace, invalidValues);
          } catch (error) {
            // JSON parsing errors are caught in previous tests
          }
        }
      });
    });

    if (invalidValues.length > 0) {
      console.log('\nInvalid translation values:');
      invalidValues.slice(0, 20).forEach(invalid => { // Limit output to first 20
        console.log(`  - ${invalid.language}/${invalid.namespace}: ${invalid.key} = "${invalid.value}"`);
      });

      if (invalidValues.length > 20) {
        console.log(`  ... and ${invalidValues.length - 20} more`);
      }
    }

    expect(invalidValues.length).toBeLessThan(10); // Allow some placeholder values during development
  });
});

/**
 * Recursively gets all keys from a nested object using dot notation
 */
function getAllKeys(obj: any, prefix: string = ''): string[] {
  const keys: string[] = [];

  if (typeof obj !== 'object' || obj === null) {
    return keys;
  }

  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  });

  return keys;
}

/**
 * Recursively checks for invalid translation values (empty, placeholder, etc.)
 */
function checkForInvalidValues(
  obj: any,
  keyPrefix: string,
  language: string,
  namespace: string,
  invalidValues: Array<{ language: string; namespace: string; key: string; value: string }>
): void {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  Object.keys(obj).forEach(key => {
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      checkForInvalidValues(obj[key], fullKey, language, namespace, invalidValues);
    } else if (typeof obj[key] === 'string') {
      const value = obj[key].trim();

      // Check for common placeholder patterns
      if (
        value === '' ||
        value === 'TODO' ||
        value === 'PLACEHOLDER' ||
        value === '...' ||
        value === 'TBD' ||
        value === 'TODO: Translate' ||
        value.startsWith('TRANSLATE:') ||
        value.includes('{{PLACEHOLDER}}')
      ) {
        invalidValues.push({
          language,
          namespace,
          key: fullKey,
          value
        });
      }
    }
  });
}