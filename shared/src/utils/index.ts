// Utility functions for Group Chat AI

import { VALIDATION_LIMITS, SESSION_CONFIG } from '../constants';
import { SessionStatus, MessageSender } from '../types';

// Universal random hex string generator (no Node.js crypto dependency)
function getRandomHex(bytes: number): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const array = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Fallback to Math.random (works everywhere, less secure but sufficient for IDs)
  const randomBytes: number[] = [];
  for (let i = 0; i < bytes; i++) {
    randomBytes.push(Math.floor(Math.random() * 256));
  }
  return randomBytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  // Use 16 bytes (128 bits) for strong uniqueness and unpredictability
  const randomPart = getRandomHex(16);
  return `session_${Date.now()}_${randomPart}`;
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  const randomPart = getRandomHex(16);
  return `msg_${Date.now()}_${randomPart}`;
}

/**
 * Generate a unique document ID
 */
export function generateDocumentId(): string {
  const randomPart = getRandomHex(16);
  return `doc_${Date.now()}_${randomPart}`;
}

/**
 * Validate message content
 */
export function validateMessage(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > VALIDATION_LIMITS.MESSAGE_MAX_LENGTH) {
    return { isValid: false, error: `Message exceeds maximum length of ${VALIDATION_LIMITS.MESSAGE_MAX_LENGTH} characters` };
  }
  
  return { isValid: true };
}

/**
 * Validate persona selection
 */
export function validatePersonaSelection(personas: string[]): { isValid: boolean; error?: string } {
  if (!personas || personas.length === 0) {
    return { isValid: false, error: 'At least one persona must be selected' };
  }
  
  if (personas.length > SESSION_CONFIG.MAX_ACTIVE_PERSONAS) {
    return { isValid: false, error: `Cannot select more than ${SESSION_CONFIG.MAX_ACTIVE_PERSONAS} personas` };
  }
  
  return { isValid: true };
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(lastActivity: number): boolean {
  const now = Date.now();
  const timeoutMs = SESSION_CONFIG.TIMEOUT_MINUTES * 60 * 1000;
  return (now - lastActivity) > timeoutMs;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format datetime for display
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for async operations
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      await sleep(delay * attempt);
    }
  }
  
  throw lastError!;
}

/**
 * Check if a value is a valid enum value
 */
export function isValidEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: string
): value is T[keyof T] {
  return Object.values(enumObject).includes(value);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create a timeout promise
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}
