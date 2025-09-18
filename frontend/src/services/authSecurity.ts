// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { v4 as uuidv4 } from 'uuid';

const STATE_STORAGE_KEY = 'oidc_csrf_state';
const VALIDATED_STORAGE_KEY = 'oidc_csrf_validated';
const SIGNIN_INITIATED_KEY = 'oidc_signin_initiated';

/**
 * Generates a cryptographically secure state parameter for CSRF protection
 */
export const generateState = (): string => {
  // Generate a UUID v4 as the state parameter
  const state = uuidv4();
  
  // Store in sessionStorage (cleared when tab closes)
  sessionStorage.setItem(STATE_STORAGE_KEY, state);
  
  return state;
};

/**
 * Marks that a sign-in was initiated by our application
 */
export const markSignInInitiated = (): void => {
  const timestamp = Date.now().toString();
  sessionStorage.setItem(SIGNIN_INITIATED_KEY, timestamp);
};

/**
 * Checks if sign-in was initiated by our application
 */
export const wasSignInInitiated = (): boolean => {
  const initiated = sessionStorage.getItem(SIGNIN_INITIATED_KEY);
  return initiated !== null;
};

/**
 * Validates and clears the sign-in initiated marker (only once)
 */
export const validateAndClearSignInInitiated = (): boolean => {
  const validatedKey = 'oidc_signin_validated_once';
  
  // Check if we already validated in this session
  if (sessionStorage.getItem(validatedKey)) {
    return true; // Already validated successfully
  }
  
  // Check if sign-in was initiated
  const initiated = sessionStorage.getItem(SIGNIN_INITIATED_KEY);
  if (!initiated) {
    return false;
  }
  
  // Mark as validated and clear the initiation marker
  sessionStorage.setItem(validatedKey, 'true');
  sessionStorage.removeItem(SIGNIN_INITIATED_KEY);
  
  return true;
};

/**
 * Clears the sign-in initiated marker
 */
export const clearSignInInitiated = (): void => {
  sessionStorage.removeItem(SIGNIN_INITIATED_KEY);
  sessionStorage.removeItem('oidc_signin_validated_once');
};

/**
 * Validates the state parameter from the OAuth callback against stored state
 */
export const validateState = (receivedState: string | null): boolean => {
  // Check if we've already validated this callback
  const alreadyValidated = sessionStorage.getItem(VALIDATED_STORAGE_KEY);
  if (alreadyValidated) {
    return alreadyValidated === 'true';
  }

  if (!receivedState) {
    console.error('Auth Security: No state parameter received in callback');
    sessionStorage.setItem(VALIDATED_STORAGE_KEY, 'false');
    return false;
  }

  const storedState = sessionStorage.getItem(STATE_STORAGE_KEY);
  
  if (!storedState) {
    console.error('Auth Security: No stored state found for validation');
    sessionStorage.setItem(VALIDATED_STORAGE_KEY, 'false');
    return false;
  }

  const isValid = storedState === receivedState;
  
  if (!isValid) {
    console.error('Auth Security: State parameter mismatch - possible CSRF attack');
    sessionStorage.setItem(VALIDATED_STORAGE_KEY, 'false');
    sessionStorage.removeItem(STATE_STORAGE_KEY);
    return false;
  }

  // Mark as successfully validated and clean up
  sessionStorage.setItem(VALIDATED_STORAGE_KEY, 'true');
  sessionStorage.removeItem(STATE_STORAGE_KEY);
  return true;
};

/**
 * Clears any stored state (useful for cleanup)
 */
export const clearStoredState = (): void => {
  sessionStorage.removeItem(STATE_STORAGE_KEY);
  sessionStorage.removeItem(VALIDATED_STORAGE_KEY);
  sessionStorage.removeItem(SIGNIN_INITIATED_KEY);
};