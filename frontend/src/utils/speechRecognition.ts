// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { VoiceInputError, SpeechRecognition } from '../types/voice';

/**
 * Check if we're in a secure context (HTTPS or localhost)
 */
export const isSecureContext = (): boolean => {
  return (
    window.isSecureContext ||
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
};

/**
 * Check if speech recognition is supported in the current browser AND secure context
 */
export const isSpeechRecognitionSupported = (): boolean => {
  const hasAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSecure = isSecureContext();

  // Debug info for troubleshooting available in browser developer tools
  if (!hasAPI) {
    // Speech Recognition API not available in this browser
  }
  if (!isSecure) {
    // Speech Recognition requires HTTPS in production
  }

  return hasAPI && isSecure;
};

/**
 * Get specific reason why speech recognition is not supported
 */
export const getSpeechRecognitionUnsupportedReason = (): string => {
  const hasAPI = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSecure = isSecureContext();

  if (!hasAPI) {
    return 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
  }

  if (!isSecure) {
    return 'Voice input requires HTTPS in production. This site must be served over HTTPS to enable microphone access.';
  }

  return 'Speech recognition is not available.';
};

/**
 * Create a new SpeechRecognition instance
 */
export const createSpeechRecognition = (): SpeechRecognition | null => {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  // Use the available constructor (Chrome uses webkitSpeechRecognition)
  const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return new SpeechRecognitionConstructor();
};

/**
 * Check if microphone permissions are granted
 */
export const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    if (!navigator.permissions) {
      // Fallback: try to access microphone directly
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    }

    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return permission.state === 'granted';
  } catch {
    // Failed to check microphone permission
    return false;
  }
};

/**
 * Request microphone permissions
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch {
    // Microphone permission denied
    return false;
  }
};

/**
 * Convert SpeechRecognition error codes to user-friendly messages
 */
export const getErrorMessage = (error: string): string => {
  switch (error) {
    case 'not-allowed':
    case 'permission-denied':
      return 'Microphone access was denied. Please allow microphone access and try again.';
    case 'not-supported':
      return 'Speech recognition is not supported in your browser. Please try Chrome or Edge.';
    case 'network':
      return 'Network error occurred. Please check your internet connection and try again.';
    case 'audio-capture':
      return 'No microphone was found. Please connect a microphone and try again.';
    case 'service-not-allowed':
      return 'Speech recognition service is not available. Please try again later.';
    case 'bad-grammar':
      return 'Speech recognition grammar error. Please try again.';
    case 'language-not-supported':
      return 'The selected language is not supported for speech recognition.';
    case 'aborted':
      return 'Speech recognition was stopped.';
    default:
      return 'An error occurred during speech recognition. Please try again.';
  }
};

/**
 * Convert SpeechRecognition error to our error type
 */
export const mapSpeechRecognitionError = (error: string): VoiceInputError => {
  switch (error) {
    case 'not-allowed':
      return 'permission-denied';
    case 'not-supported':
      return 'not-supported';
    case 'network':
      return 'network-error';
    case 'audio-capture':
      return 'audio-capture';
    case 'service-not-allowed':
      return 'service-not-allowed';
    case 'bad-grammar':
      return 'bad-grammar';
    case 'language-not-supported':
      return 'language-not-supported';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
};

/**
 * Get supported languages for speech recognition
 */
export const getSupportedLanguages = (): Array<{ code: string; name: string }> => {
  return [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'en-AU', name: 'English (Australia)' },
    { code: 'en-CA', name: 'English (Canada)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'es-MX', name: 'Spanish (Mexico)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'it-IT', name: 'Italian (Italy)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)' },
    { code: 'ru-RU', name: 'Russian (Russia)' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'ko-KR', name: 'Korean (Korea)' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'hi-IN', name: 'Hindi (India)' },
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
  ];
};

/**
 * Get the default language based on browser locale
 */
export const getDefaultLanguage = (): string => {
  const browserLang = navigator.language || navigator.languages?.[0] || 'en-US';

  // Check if the browser language is in our supported list
  const supportedLanguages = getSupportedLanguages();
  const supported = supportedLanguages.find(lang => lang.code === browserLang);

  if (supported) {
    return browserLang;
  }

  // Fallback to language family (e.g., 'en-GB' -> 'en-US')
  const langFamily = browserLang.split('-')[0];
  const familyMatch = supportedLanguages.find(lang => lang.code.startsWith(langFamily));

  return familyMatch?.code || 'en-US';
};

/**
 * Format transcript text with basic punctuation and capitalization
 */
export const formatTranscript = (transcript: string): string => {
  if (!transcript.trim()) {
    return transcript;
  }

  let formatted = transcript.trim();

  // Capitalize first letter
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  // Add period at the end if it doesn't end with punctuation
  if (!/[.!?]$/.test(formatted)) {
    formatted += '.';
  }

  return formatted;
};

/**
 * Debounce function for transcript updates
 */
export const debounce = <T extends (...args: never[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Calculate confidence score for transcript quality
 */
export const calculateConfidenceScore = (results: SpeechRecognitionResult[]): number => {
  if (!results.length) {return 0;}

  const totalConfidence = results.reduce((sum, result) => {
    if (result.length > 0) {
      return sum + result[0].confidence;
    }
    return sum;
  }, 0);

  return totalConfidence / results.length;
};
