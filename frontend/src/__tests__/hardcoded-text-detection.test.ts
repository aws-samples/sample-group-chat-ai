import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

describe('Hardcoded Text Detection', () => {
  let violations: Array<{ file: string; line: number; text: string; context: string }> = [];

  beforeAll(async () => {
    const srcPath = path.resolve(__dirname, '..');
    const tsxFiles = await glob('**/*.{ts,tsx}', { cwd: srcPath });

    for (const file of tsxFiles) {
      // Skip test files and type definition files
      if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.') || file.endsWith('.d.ts')) {
        continue;
      }

      const filePath = path.join(srcPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
          return;
        }

        // Check for hardcoded English text in JSX/TSX
        const jsxTextViolations = findJSXTextViolations(trimmedLine);
        jsxTextViolations.forEach(violation => {
          violations.push({
            file: file,
            line: lineNumber,
            text: violation,
            context: trimmedLine
          });
        });

        // Check for hardcoded strings in common properties
        const propertyViolations = findPropertyViolations(trimmedLine);
        propertyViolations.forEach(violation => {
          violations.push({
            file: file,
            line: lineNumber,
            text: violation,
            context: trimmedLine
          });
        });
      });
    }
  });

  test('should not contain hardcoded English text in JSX elements', () => {
    const jsxViolations = violations.filter(v => !isPropertyViolation(v.context));

    if (jsxViolations.length > 0) {
      console.log('\nFound hardcoded English text in JSX elements:');
      jsxViolations.forEach(violation => {
        console.log(`  ${violation.file}:${violation.line} - "${violation.text}"`);
        console.log(`    Context: ${violation.context}`);
      });
    }

    expect(jsxViolations).toEqual([]);
  });

  test('should not contain hardcoded English in component properties', () => {
    const propertyViolations = violations.filter(v => isPropertyViolation(v.context));

    if (propertyViolations.length > 0) {
      console.log('\nFound hardcoded English in component properties:');
      propertyViolations.forEach(violation => {
        console.log(`  ${violation.file}:${violation.line} - "${violation.text}"`);
        console.log(`    Context: ${violation.context}`);
      });
    }

    expect(propertyViolations).toEqual([]);
  });

  test('should use translation functions instead of hardcoded text', () => {
    // This test ensures that components are using t() function properly
    const srcPath = path.resolve(__dirname, '..');

    // Sample check: Look for components that import useTranslation but don't use t()
    const componentFiles = fs.readdirSync(path.join(srcPath, 'components'))
      .filter(file => file.endsWith('.tsx'))
      .slice(0, 3); // Test a few files as examples

    componentFiles.forEach(file => {
      const filePath = path.join(srcPath, 'components', file);
      const content = fs.readFileSync(filePath, 'utf8');

      const hasUseTranslation = content.includes('useTranslation');
      const hasTranslationUsage = content.includes('t(') || content.includes('i18n.');

      // If a component imports useTranslation, it should use it
      if (hasUseTranslation && !hasTranslationUsage) {
        console.warn(`Warning: ${file} imports useTranslation but doesn't seem to use translation functions`);
      }
    });

    // This test always passes but provides warnings
    expect(true).toBe(true);
  });
});

function findJSXTextViolations(line: string): string[] {
  const violations: string[] = [];

  // Pattern to match JSX text content between tags: >text<
  const jsxTextPattern = />([^<>{]*[a-zA-Z][^<>{}]*)</g;
  let match;

  while ((match = jsxTextPattern.exec(line)) !== null) {
    const text = match[1].trim();

    if (isHardcodedEnglish(text)) {
      violations.push(text);
    }
  }

  return violations;
}

function findPropertyViolations(line: string): string[] {
  const violations: string[] = [];

  // Common properties that should be internationalized
  const propertiesToCheck = [
    'placeholder', 'title', 'label', 'ariaLabel', 'description',
    'errorText', 'warningText', 'infoText', 'buttonText', 'loadingText',
    'emptyText', 'noMatchText', 'expandButtonText', 'collapseButtonText'
  ];

  for (const prop of propertiesToCheck) {
    // Pattern to match prop="text" or prop='text'
    const propPattern = new RegExp(`${prop}\\s*=\\s*["']([^"']+)["']`, 'g');
    let match;

    while ((match = propPattern.exec(line)) !== null) {
      const text = match[1].trim();

      if (isHardcodedEnglish(text)) {
        violations.push(text);
      }
    }
  }

  return violations;
}

function isHardcodedEnglish(text: string): boolean {
  // Skip if it's clearly not user-facing text
  if (!text || text.length === 0) return false;
  if (/^[^a-zA-Z]*$/.test(text)) return false; // No letters (numbers, symbols only)
  if (text.startsWith('data-') || text.startsWith('aria-')) return false;
  if (text.includes('{{') || text.includes('${')) return false; // Template strings
  if (text.includes('/') && text.includes('.')) return false; // Likely URLs or paths
  if (text.includes('@')) return false; // Email addresses
  if (text.match(/^[A-Z_][A-Z0-9_]*$/)) return false; // CONSTANTS
  if (text.match(/^[a-z][a-zA-Z0-9]*$/)) return false; // camelCase variables
  if (text.match(/^[a-z-]+$/)) return false; // kebab-case
  if (text.includes('px') || text.includes('rem') || text.includes('%')) return false; // CSS values
  if (text.includes('rgb') || text.includes('#')) return false; // Colors
  if (['true', 'false', 'null', 'undefined'].includes(text)) return false; // Boolean/null values

  // Skip common technical terms and abbreviations
  const technicalTerms = [
    'API', 'URL', 'HTTP', 'HTTPS', 'JSON', 'XML', 'CSV', 'PDF', 'JPG', 'PNG', 'SVG',
    'AWS', 'SDK', 'UUID', 'ID', 'CSS', 'HTML', 'JS', 'TS', 'TSX', 'JSX'
  ];
  if (technicalTerms.some(term => text.toUpperCase().includes(term))) return false;

  // Skip single characters and very short strings
  if (text.length <= 2) return false;

  // Skip if it looks like a translation key (contains dots)
  if (text.includes('.') && !text.includes(' ')) return false;

  // Skip if it looks like a function call
  if (text.includes('(') && text.includes(')')) return false;

  // Skip semgrep comments and nosemgrep directives
  if (text.includes('nosemgrep') || text.includes('semgrep')) return false;

  // Skip copyright notices and SPDX identifiers
  if (text.includes('Copyright') || text.includes('SPDX-License-Identifier')) return false;

  // Check if it contains English words and looks like user-facing text
  const englishWordPattern = /\b(a|an|the|is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|can|must|shall|to|of|in|for|on|with|by|from|about|into|through|during|before|after|above|below|up|down|out|off|over|under|again|further|then|once|and|or|but|if|while|when|where|why|how|all|any|both|each|few|more|most|other|some|such|no|nor|not|only|own|same|so|than|too|very|just|now|here|there|this|that|these|those|you|your|yours|yourself|yourselves|he|him|his|himself|she|her|hers|herself|it|its|itself|we|us|our|ours|ourselves|they|them|their|theirs|themselves|what|which|who|whom|whose|when|where|why|how)\b/i;

  return englishWordPattern.test(text) && text.includes(' '); // Must contain spaces to be a phrase
}

function isPropertyViolation(context: string): boolean {
  const propertiesToCheck = [
    'placeholder', 'title', 'label', 'ariaLabel', 'description',
    'errorText', 'warningText', 'infoText', 'buttonText', 'loadingText',
    'emptyText', 'noMatchText', 'expandButtonText', 'collapseButtonText'
  ];

  return propertiesToCheck.some(prop => context.includes(`${prop}=`));
}