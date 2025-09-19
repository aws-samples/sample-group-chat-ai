import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('I18n Key Validation', () => {
  let englishTranslations: Record<string, any> = {};
  let usedKeys: Set<string> = new Set();

  beforeAll(async () => {
    // Load all English translation files
    const localesPath = path.resolve(__dirname, '../../public/locales/en');
    const englishFiles = fs.readdirSync(localesPath).filter(file => file.endsWith('.json'));

    for (const file of englishFiles) {
      const namespace = path.basename(file, '.json');
      const content = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
      englishTranslations[namespace] = content;
    }

    // Extract all translation keys used in the codebase
    const srcPath = path.resolve(__dirname, '..');
    const tsxFiles = await glob('**/*.{ts,tsx}', { cwd: srcPath });

    for (const file of tsxFiles) {
      const filePath = path.join(srcPath, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Find t('...') and t("...") calls
      const tFunctionMatches = content.match(/\bt\(\s*['"`]([^'"`]+)['"`]/g);
      if (tFunctionMatches) {
        tFunctionMatches.forEach(match => {
          const keyMatch = match.match(/\bt\(\s*['"`]([^'"`]+)['"`]/);
          if (keyMatch && keyMatch[1]) {
            usedKeys.add(keyMatch[1]);
          }
        });
      }

      // Find useTranslation namespace specifications
      const useTranslationMatches = content.match(/useTranslation\(\s*['"`]([^'"`]+)['"`]/g);
      if (useTranslationMatches) {
        useTranslationMatches.forEach(match => {
          const namespaceMatch = match.match(/useTranslation\(\s*['"`]([^'"`]+)['"`]/);
          if (namespaceMatch && namespaceMatch[1]) {
            // Store namespaces for context but don't add to usedKeys as they are namespace declarations
          }
        });
      }
    }
  });

  test('all used translation keys exist in English JSON files', () => {
    const missingKeys: string[] = [];

    usedKeys.forEach(key => {
      const keyExists = checkKeyExists(key, englishTranslations);
      if (!keyExists) {
        missingKeys.push(key);
      }
    });

    if (missingKeys.length > 0) {
      console.log('\nMissing translation keys:');
      missingKeys.forEach(key => console.log(`  - ${key}`));
      console.log(`\nFound ${usedKeys.size} total keys, ${missingKeys.length} missing`);
    }

    expect(missingKeys).toEqual([]);
  });

  test('English translation files are valid JSON', () => {
    const localesPath = path.resolve(__dirname, '../../public/locales/en');
    const englishFiles = fs.readdirSync(localesPath).filter(file => file.endsWith('.json'));

    englishFiles.forEach(file => {
      const filePath = path.join(localesPath, file);
      expect(() => {
        JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }).not.toThrow();
    });
  });

  test('all English namespaces have corresponding files', () => {
    const expectedNamespaces = ['common', 'pages', 'components', 'personas'];
    const localesPath = path.resolve(__dirname, '../../public/locales/en');
    const actualFiles = fs.readdirSync(localesPath).filter(file => file.endsWith('.json'));
    const actualNamespaces = actualFiles.map(file => path.basename(file, '.json'));

    expectedNamespaces.forEach(namespace => {
      expect(actualNamespaces).toContain(namespace);
    });
  });
});

/**
 * Checks if a translation key exists in the English translations
 * Handles both simple keys (key) and namespaced keys (namespace:key)
 */
function checkKeyExists(key: string, translations: Record<string, any>): boolean {
  // Handle namespaced keys (e.g., "common:actions.save")
  if (key.includes(':')) {
    const [namespace, ...keyParts] = key.split(':');
    const actualKey = keyParts.join(':');

    if (!translations[namespace]) {
      return false;
    }

    return checkNestedKey(actualKey, translations[namespace]);
  }

  // Handle keys without namespace - check all namespaces
  for (const namespace of Object.keys(translations)) {
    if (checkNestedKey(key, translations[namespace])) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a nested key exists in an object using dot notation
 */
function checkNestedKey(key: string, obj: any): boolean {
  const keyParts = key.split('.');
  let current = obj;

  for (const part of keyParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }

  return current !== undefined;
}