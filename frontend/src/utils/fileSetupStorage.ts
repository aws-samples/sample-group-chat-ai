// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { FileSetupData } from '../components/FileManagementSetup';

const FILE_SETUP_KEY = 'conversationFileSetup';

interface SerializedFileData {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string; // Base64 encoded file data
  isGlobal: boolean;
  targetPersonas: string[];
}

interface FileSetupStorage {
  files: SerializedFileData[];
  lastUpdated: number;
}

/**
 * Utility for persisting file setup data in localStorage
 * Files are stored as base64 to preserve them across page refreshes
 */
export class FileSetupStorageManager {
  /**
   * Convert File to base64 string for storage
   */
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  /**
   * Convert base64 string back to File
   */
  private static base64ToFile(base64: string, fileName: string, fileType: string): File {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || fileType;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
  }

  /**
   * Save file setup data to localStorage
   */
  static async saveFiles(files: FileSetupData[]): Promise<void> {
    try {
      const serializedFiles: SerializedFileData[] = await Promise.all(
        files.map(async (fileData) => ({
          id: fileData.id,
          fileName: fileData.file.name,
          fileSize: fileData.file.size,
          fileType: fileData.file.type,
          fileData: await this.fileToBase64(fileData.file),
          isGlobal: fileData.isGlobal,
          targetPersonas: fileData.targetPersonas,
        }))
      );

      const storage: FileSetupStorage = {
        files: serializedFiles,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(FILE_SETUP_KEY, JSON.stringify(storage));
    } catch (error) {
      console.error('Failed to save files to localStorage:', error);
      throw new Error('Failed to save files. They may be too large for browser storage.');
    }
  }

  /**
   * Load file setup data from localStorage
   */
  static async loadFiles(): Promise<FileSetupData[]> {
    try {
      const stored = localStorage.getItem(FILE_SETUP_KEY);
      if (!stored) {
        return [];
      }

      const storage: FileSetupStorage = JSON.parse(stored);

      const files: FileSetupData[] = storage.files.map((serialized) => ({
        id: serialized.id,
        file: this.base64ToFile(serialized.fileData, serialized.fileName, serialized.fileType),
        isGlobal: serialized.isGlobal,
        targetPersonas: serialized.targetPersonas,
      }));

      return files;
    } catch (error) {
      console.error('Failed to load files from localStorage:', error);
      // If there's an error, clear the corrupted data
      this.clearFiles();
      return [];
    }
  }

  /**
   * Clear all stored file data
   */
  static clearFiles(): void {
    try {
      localStorage.removeItem(FILE_SETUP_KEY);
    } catch (error) {
      console.error('Failed to clear files from localStorage:', error);
    }
  }

  /**
   * Check if there are stored files
   */
  static hasStoredFiles(): boolean {
    return localStorage.getItem(FILE_SETUP_KEY) !== null;
  }

  /**
   * Get the last updated timestamp
   */
  static getLastUpdated(): number | null {
    try {
      const stored = localStorage.getItem(FILE_SETUP_KEY);
      if (!stored) {
        return null;
      }
      const storage: FileSetupStorage = JSON.parse(stored);
      return storage.lastUpdated;
    } catch {
      return null;
    }
  }
}
