import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Ignore .cjs files entirely
  {
    ignores: ["**/*.cjs", "**/node_modules/**", "**/dist/**", "**/build/**"]
  },
  // Main configuration for TypeScript and React files
  {
    files: ["**/*.{js,mjs,ts,mts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { 
      globals: {
        ...globals.browser,
        ...globals.node,
        // Add missing global types
        NodeJS: "readonly",
        RequestInit: "readonly",
        PermissionName: "readonly",
        SpeechRecognitionResult: "readonly",
        SpeechRecognition: "readonly",
        webkitSpeechRecognition: "readonly"
      }
    }
  },
  // Apply TypeScript rules only to TypeScript files
  {
    files: ["**/*.{ts,tsx,mts}"],
    ...tseslint.configs.recommended[0],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  // Apply React rules only to React files
  {
    files: ["**/*.{jsx,tsx}"],
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "detect"
      }
    }
  }
]);
