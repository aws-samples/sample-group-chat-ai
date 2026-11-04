# Internationalization (i18n) Setup

This application supports internationalization using `react-i18next` and integrates with Cloudscape Design System components.

## Features

- **Automatic Language Detection**: Uses browser language by default
- **Language Persistence**: Saves selected language in localStorage
- **Cloudscape Integration**: Works seamlessly with Cloudscape components
- **Easy Language Addition**: Simple process to add new languages
- **Namespace Organization**: Translations organized by feature areas

## Supported Languages

Currently supported languages:
- English (en) - Default
- Spanish (es)
- French (fr) - Templates only
- German (de) - Templates only
- Japanese (ja) - Templates only
- Chinese (zh) - Templates only

## Translation Structure

Translations are organized into namespaces:

```
public/locales/
├── en/
│   ├── common.json      # Common UI elements (buttons, states, validation)
│   ├── navigation.json  # Navigation and app title
│   ├── pages.json       # Page-specific content
│   └── components.json  # Component-specific content
├── es/
│   ├── common.json
│   ├── navigation.json
│   ├── pages.json
│   └── components.json
└── [other languages]...
```

## Usage in Components

### Basic Usage
```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation('pages'); // Specify namespace
  
  return <h1>{t('home.title')}</h1>;
};
```

### Cross-Namespace Usage
```tsx
// Access different namespace
{t('common:actions.save')}
```

### Language Selector
```tsx
import { LanguageSelector } from '@/components/LanguageSelector';

// Displays dropdown for language selection
<LanguageSelector />
```

## Adding a New Language

### Method 1: Interactive Mode (Recommended) 🚀
```bash
npm run i18n:add-language
```

**Super simple!** Just enter the two-letter language code (e.g., `pt`, `fr`, `de`) and the script:
- ✅ **Auto-detects** language name and native name
- ✅ **Asks** whether you want AI translation or templates  
- ✅ **Confirms** before proceeding
- ✅ **Supports 47+ languages** out of the box

### Method 2: Direct Command Mode
```bash
# AI translation (requires AWS credentials)
npm run i18n:add-language-manual pt Portuguese Português

# Template-only mode
npm run i18n:add-language-template pt Portuguese Português
```

### Method 3: Manual Setup
1. Create language directory: `public/locales/[code]/`
2. Copy English JSON files as templates
3. Add language to `I18nContext.tsx` supported languages list
4. Add language code to `i18n/index.ts` supportedLngs array
5. Translate the JSON files

## Updating Existing Languages

When you add new strings to the English translation files, regenerate all existing languages:

```bash
# Regenerate all supported languages with latest strings
npm run i18n:update-languages

# Update specific languages only  
npm run i18n:update-languages pt es fr

# Show help
npm run i18n:update-languages --help
```

**This automatically**:
- ✅ **Reads supported languages** from i18n configuration
- ✅ **Merges new English strings** with existing translations  
- ✅ **AI-translates missing keys** using Bedrock Claude
- ✅ **Preserves existing translations** for unchanged keys
- ✅ **Updates all namespaces** (common, navigation, pages, components)

### AWS Setup for AI Translation

To use AI-powered translation, configure AWS credentials:

```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_REGION=us-east-1

# Option 3: IAM Role (recommended for EC2/Lambda)
```

**Required Permissions**: Your AWS user/role needs:
- `bedrock:InvokeModel` for the translation model configured in `frontend/scripts/translation-service.cjs`

## Configuration

### i18n Configuration (`src/i18n/index.ts`)
- Language detection order: localStorage → browser → HTML tag
- Fallback language: English
- Caching: localStorage
- Suspense: Disabled for SSR compatibility

### Language Detection
1. Checks localStorage for previously selected language
2. Falls back to browser navigator language
3. Finally uses HTML lang attribute
4. Defaults to English if none found

## Best Practices

### Translation Keys
- Use hierarchical keys: `pages.home.title`
- Keep keys descriptive and consistent
- Group related translations in same namespace

### Pluralization
```json
{
  "item_one": "{{count}} item",
  "item_other": "{{count}} items"
}
```

### Interpolation
```json
{
  "welcome": "Welcome, {{name}}!"
}
```

```tsx
{t('welcome', { name: user.name })}
```

### Context-Specific Translations
```tsx
// For different contexts of the same word
{t('button.edit')}     // "Edit" button
{t('page.edit')}       // "Edit Page" title
```

## Performance Considerations

- Lazy loading: Translations loaded on demand
- Caching: Translation files cached in browser
- Bundle splitting: i18n resources separate from main bundle

## Development Guidelines

1. **Always use translation keys** instead of hardcoded text
2. **Test with multiple languages** during development
3. **Consider text expansion** - some languages use 30% more space
4. **Use semantic keys** rather than literal text as keys
5. **Organize translations logically** by feature/component

## Browser Language vs Conversation Language

This internationalization setup affects only the **UI language** (menus, buttons, labels, etc.). The **conversation language** with AI personas remains separate and is not impacted by these UI language settings.

## Cloudscape Integration

The language selector uses Cloudscape's `Select` component and follows Cloudscape design patterns. All text strings used in Cloudscape components are internationalized using the translation keys.

## Troubleshooting

### Language not switching
- Check browser dev tools for console errors
- Verify translation files exist in `public/locales/[code]/`
- Check localStorage is enabled

### Missing translations
- Keys fall back to fallback language (English)
- Check JSON syntax in translation files
- Verify namespace is correctly specified in useTranslation hook

### Build issues
- Ensure translation files are in public/ directory (not src/)
- Check all JSON files are valid JSON format