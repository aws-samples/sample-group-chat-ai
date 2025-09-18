// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

// Browser storage utility that maintains persona customizations across sessions but isolates by browser

export class SessionScopedStorage {
  private static currentSessionId: string | null = null;

  /**
   * Set the current session ID for scoped storage
   */
  static setSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * Get the current session ID
   */
  static getSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Clear the current session ID (call when session ends)
   */
  static clearSessionId(): void {
    this.currentSessionId = null;
  }

  /**
   * Get storage key - persona customizations persist across sessions, other data is session-scoped
   */
  private static getStorageKey(key: string): string {
    // Persona customizations should persist across sessions in the same browser
    if (
      key === PERSONA_STORAGE_KEYS.EDITED_DEFAULT_PERSONAS ||
      key === PERSONA_STORAGE_KEYS.CUSTOM_PERSONAS
    ) {
      return `browser_${key}`; // Browser-wide persistence
    }

    // Other data is session-scoped
    if (!this.currentSessionId) {
      return `temp_${key}`;
    }
    return `${this.currentSessionId}_${key}`;
  }

  /**
   * Store data in appropriate storage
   */
  static setItem(key: string, value: unknown): void {
    try {
      const storageKey = this.getStorageKey(key);

      // Use localStorage for persona customizations (persist across sessions)
      // Use sessionStorage for session-specific data
      const storage =
        key === PERSONA_STORAGE_KEYS.EDITED_DEFAULT_PERSONAS ||
        key === PERSONA_STORAGE_KEYS.CUSTOM_PERSONAS
          ? localStorage
          : sessionStorage;

      storage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Failed to save to storage
    }
  }

  /**
   * Retrieve data from appropriate storage
   */
  static getItem<T>(key: string, defaultValue: T): T {
    try {
      const storageKey = this.getStorageKey(key);

      // Use localStorage for persona customizations, sessionStorage for others
      const storage =
        key === PERSONA_STORAGE_KEYS.EDITED_DEFAULT_PERSONAS ||
        key === PERSONA_STORAGE_KEYS.CUSTOM_PERSONAS
          ? localStorage
          : sessionStorage;

      const stored = storage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      // Failed to load from storage
      return defaultValue;
    }
  }

  /**
   * Remove data from appropriate storage
   */
  static removeItem(key: string): void {
    try {
      const storageKey = this.getStorageKey(key);

      // Use localStorage for persona customizations, sessionStorage for others
      const storage =
        key === PERSONA_STORAGE_KEYS.EDITED_DEFAULT_PERSONAS ||
        key === PERSONA_STORAGE_KEYS.CUSTOM_PERSONAS
          ? localStorage
          : sessionStorage;

      storage.removeItem(storageKey);
    } catch {
      // Failed to remove from storage
    }
  }

  /**
   * Clear all data for the current session
   */
  static clearSessionData(): void {
    if (!this.currentSessionId) {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      const sessionPrefix = `${this.currentSessionId}_`;

      // Find all keys that belong to the current session
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(sessionPrefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all session-scoped keys
      for (const key of keysToRemove) {
        sessionStorage.removeItem(key);
      }

      // Cleared session-scoped storage data
    } catch {
      // Failed to clear session-scoped storage
    }
  }

  /**
   * Clear all temporary data (when no session ID was set)
   */
  static clearTemporaryData(): void {
    try {
      const keysToRemove: string[] = [];
      const tempPrefix = 'temp_';

      // Find all temporary keys
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(tempPrefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all temporary keys
      for (const key of keysToRemove) {
        sessionStorage.removeItem(key);
      }

      // Cleared temporary storage data
    } catch {
      // Failed to clear temporary storage
    }
  }

  /**
   * Migrate data from old global storage to session-scoped storage
   * This helps transition from the old system
   */
  static migrateFromGlobalStorage(oldKeys: string[]): void {
    if (!this.currentSessionId) {
      return;
    }

    try {
      for (const oldKey of oldKeys) {
        const oldData = sessionStorage.getItem(oldKey);
        if (oldData) {
          // Move to session-scoped storage
          this.setItem(oldKey, JSON.parse(oldData));
          // Remove old global storage
          sessionStorage.removeItem(oldKey);
        }
      }
    } catch {
      // Failed to migrate from global storage
    }
  }
}

// Storage keys for persona customizations
export const PERSONA_STORAGE_KEYS = {
  EDITED_DEFAULT_PERSONAS: 'editedDefaultPersonas',
  CUSTOM_PERSONAS: 'customPersonas',
} as const;
