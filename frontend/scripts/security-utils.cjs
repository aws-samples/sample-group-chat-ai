#!/usr/bin/env node

// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

const fs = require('fs');
const path = require('path');

/**
 * Security utilities for filesystem operations in translation scripts
 */
class SecurityUtils {
  constructor() {
    // Define safe base directories relative to the frontend directory
    this.frontendDir = path.join(__dirname, '..');
    this.allowedBasePaths = [
      path.resolve(this.frontendDir, 'src', 'i18n', 'locales'),
      path.resolve(this.frontendDir, 'src', 'contexts'),
      path.resolve(this.frontendDir, 'src', 'i18n'),
      path.resolve(this.frontendDir, 'dist', 'locales'),
      path.resolve(this.frontendDir, 'public', 'locales'),
      path.resolve(this.frontendDir, 'public'),
    ];
    
    // Valid language codes (ISO 639-1 plus common variants)
    this.validLanguageCodes = new Set([
      'ar', 'bg', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fi', 'fr',
      'he', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'lt', 'lv', 'nl', 'no',
      'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'th', 'tr', 'uk', 'vi', 'zh',
      'zh-CN', 'zh-TW', 'pt-BR', 'en-US', 'en-GB', 'es-ES', 'es-MX'
    ]);
    
    // Valid file extensions for locale files
    this.validFileExtensions = new Set(['.json', '.ts', '.tsx']);
    
    // Valid locale file names
    this.validLocaleFiles = new Set([
      'common.json', 'components.json', 'pages.json', 'navigation.json',
      'index.ts', 'I18nContext.tsx', 'personas.json'
    ]);
  }

  /**
   * Validates and normalizes a language code
   * @param {string} languageCode - The language code to validate
   * @returns {string} - The normalized language code
   * @throws {Error} - If the language code is invalid
   */
  validateLanguageCode(languageCode) {
    if (!languageCode || typeof languageCode !== 'string') {
      throw new Error('Language code must be a non-empty string');
    }
    
    // Remove any potential path traversal characters
    const sanitized = languageCode.replace(/[^a-zA-Z0-9-_]/g, '');
    
    if (!sanitized || sanitized !== languageCode) {
      throw new Error(`Invalid language code: ${languageCode}. Only alphanumeric characters, hyphens, and underscores are allowed.`);
    }
    
    if (!this.validLanguageCodes.has(sanitized)) {
      throw new Error(`Unsupported language code: ${sanitized}. Supported codes: ${Array.from(this.validLanguageCodes).join(', ')}`);
    }
    
    return sanitized;
  }

  /**
   * Validates and resolves a file path to ensure it's within allowed directories
   * @param {string} filePath - The file path to validate
   * @param {string} expectedBasePath - The expected base path (optional)
   * @returns {string} - The resolved absolute path
   * @throws {Error} - If the path is invalid or outside allowed directories
   */
  validateFilePath(filePath, expectedBasePath = null) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }

    // Remove null bytes and other dangerous characters
    const sanitized = filePath.replace(/\0/g, '').replace(/\.\./g, '');
    
    // Resolve to absolute path
    let resolvedPath;
    if (path.isAbsolute(sanitized)) {
      resolvedPath = path.resolve(sanitized);
    } else {
      resolvedPath = path.resolve(this.frontendDir, sanitized);
    }
    
    // Check if the resolved path is within one of the allowed base paths
    const isAllowed = this.allowedBasePaths.some(basePath => {
      const relativePath = path.relative(basePath, resolvedPath);
      return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    });
    
    if (!isAllowed) {
      throw new Error(`Access denied: ${filePath} is outside allowed directories`);
    }
    
    // If expected base path is provided, verify it matches
    if (expectedBasePath) {
      const expectedResolved = path.resolve(this.frontendDir, expectedBasePath);
      const relativePath = path.relative(expectedResolved, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error(`Access denied: ${filePath} is outside expected directory ${expectedBasePath}`);
      }
    }
    
    return resolvedPath;
  }

  /**
   * Validates a locale file name
   * @param {string} fileName - The file name to validate
   * @returns {string} - The validated file name
   * @throws {Error} - If the file name is invalid
   */
  validateLocaleFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('File name must be a non-empty string');
    }
    
    // Remove path components - only allow base file names
    const baseName = path.basename(fileName);
    if (baseName !== fileName) {
      throw new Error(`Invalid file name: ${fileName}. Path components not allowed.`);
    }
    
    // Check file extension
    const ext = path.extname(baseName);
    if (!this.validFileExtensions.has(ext)) {
      throw new Error(`Invalid file extension: ${ext}. Allowed: ${Array.from(this.validFileExtensions).join(', ')}`);
    }
    
    // For JSON files, check against whitelist
    if (ext === '.json' && !this.validLocaleFiles.has(baseName)) {
      throw new Error(`Invalid locale file: ${baseName}. Allowed: ${Array.from(this.validLocaleFiles).join(', ')}`);
    }
    
    return baseName;
  }

  /**
   * Safely creates a directory with validation
   * @param {string} dirPath - The directory path to create
   * @returns {void}
   * @throws {Error} - If the path is invalid
   */
  safeCreateDirectory(dirPath) {
    const validatedPath = this.validateFilePath(dirPath);
    
    if (!fs.existsSync(validatedPath)) {
      fs.mkdirSync(validatedPath, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * Safely reads a file with validation
   * @param {string} filePath - The file path to read
   * @returns {string} - The file contents
   * @throws {Error} - If the path is invalid or file cannot be read
   */
  safeReadFile(filePath) {
    const validatedPath = this.validateFilePath(filePath);
    
    if (!fs.existsSync(validatedPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const stats = fs.statSync(validatedPath);
    if (!stats.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }
    
    // Check file size (limit to 10MB for security)
    if (stats.size > 10 * 1024 * 1024) {
      throw new Error(`File too large: ${filePath} (${stats.size} bytes)`);
    }
    
    return fs.readFileSync(validatedPath, 'utf8');
  }

  /**
   * Safely writes a file with validation
   * @param {string} filePath - The file path to write
   * @param {string} content - The content to write
   * @returns {void}
   * @throws {Error} - If the path is invalid
   */
  safeWriteFile(filePath, content) {
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }
    
    const validatedPath = this.validateFilePath(filePath);
    
    // Ensure parent directory exists
    const parentDir = path.dirname(validatedPath);
    this.safeCreateDirectory(parentDir);
    
    fs.writeFileSync(validatedPath, content, { mode: 0o644 });
  }

  /**
   * Safely copies a file with validation
   * @param {string} srcPath - The source file path
   * @param {string} destPath - The destination file path
   * @returns {void}
   * @throws {Error} - If either path is invalid
   */
  safeCopyFile(srcPath, destPath) {
    const validatedSrc = this.validateFilePath(srcPath);
    const validatedDest = this.validateFilePath(destPath);
    
    if (!fs.existsSync(validatedSrc)) {
      throw new Error(`Source file not found: ${srcPath}`);
    }
    
    // Ensure parent directory exists
    const parentDir = path.dirname(validatedDest);
    this.safeCreateDirectory(parentDir);
    
    fs.copyFileSync(validatedSrc, validatedDest);
  }

  /**
   * Safely checks if a file exists with validation
   * @param {string} filePath - The file path to check
   * @returns {boolean} - Whether the file exists
   */
  safeFileExists(filePath) {
    try {
      const validatedPath = this.validateFilePath(filePath);
      return fs.existsSync(validatedPath);
    } catch (error) {
      // If path validation fails, treat as non-existent
      return false;
    }
  }

  /**
   * Safely reads directory contents with validation
   * @param {string} dirPath - The directory path to read
   * @returns {string[]} - Array of file/directory names
   * @throws {Error} - If the path is invalid
   */
  safeReadDirectory(dirPath) {
    const validatedPath = this.validateFilePath(dirPath);
    
    if (!fs.existsSync(validatedPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    
    const stats = fs.statSync(validatedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`);
    }
    
    return fs.readdirSync(validatedPath);
  }

  /**
   * Gets the validated locale directory path for a language
   * @param {string} languageCode - The language code
   * @returns {string} - The validated locale directory path
   * @throws {Error} - If the language code is invalid
   */
  getLocaleDirectory(languageCode) {
    const validatedLang = this.validateLanguageCode(languageCode);
    return this.validateFilePath(path.join('src', 'i18n', 'locales', validatedLang));
  }

  /**
   * Gets the validated locale file path
   * @param {string} languageCode - The language code
   * @param {string} fileName - The file name
   * @returns {string} - The validated file path
   * @throws {Error} - If the language code or file name is invalid
   */
  getLocaleFilePath(languageCode, fileName) {
    const validatedLang = this.validateLanguageCode(languageCode);
    const validatedFile = this.validateLocaleFileName(fileName);
    return this.validateFilePath(path.join('src', 'i18n', 'locales', validatedLang, validatedFile));
  }

  /**
   * Gets the validated public locale directory path for a language
   * @param {string} languageCode - The language code
   * @returns {string} - The validated locale directory path
   * @throws {Error} - If the language code is invalid
   */
  getPublicLocaleDirectory(languageCode) {
    const validatedLang = this.validateLanguageCode(languageCode);
    return this.validateFilePath(path.join('public', 'locales', validatedLang));
  }

  /**
   * Gets the validated public locale file path
   * @param {string} languageCode - The language code
   * @param {string} fileName - The file name
   * @returns {string} - The validated file path
   * @throws {Error} - If the language code or file name is invalid
   */
  getPublicLocaleFilePath(languageCode, fileName) {
    const validatedLang = this.validateLanguageCode(languageCode);
    const validatedFile = this.validateLocaleFileName(fileName);
    return this.validateFilePath(path.join('public', 'locales', validatedLang, validatedFile));
  }
}

module.exports = SecurityUtils;