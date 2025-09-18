// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { BusinessContext, ConversationTopic } from '@group-chat-ai/shared';
import { PersonaTileData } from '../components/PersonaTile';

export interface ExportData {
  personas?: PersonaTileData[];
  businessContext?: BusinessContext;
  conversationTopic?: ConversationTopic;
  exportedAt: string;
  version: string;
}

export class ImportExportService {
  private static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Export personas to JSON file
   */
  static exportPersonas(personas: PersonaTileData[]): void {
    // Exclude personaId from exported personas - it will be regenerated on import
    const exportablePersonas = personas.map(persona => {
       
      const { personaId: _, isSelected: __, ...exportablePersona } = persona;
      return exportablePersona;
    });

    const exportData: ExportData = {
      personas: exportablePersonas as PersonaTileData[],
      exportedAt: new Date().toISOString(),
      version: this.CURRENT_VERSION,
    };

    this.downloadJSON(exportData, `conversation-personas-${this.getDateString()}.json`);
  }

  /**
   * Export business context to JSON file
   */
  static exportBusinessContext(businessContext: BusinessContext): void {
    const exportData: ExportData = {
      businessContext,
      exportedAt: new Date().toISOString(),
      version: this.CURRENT_VERSION,
    };

    this.downloadJSON(exportData, `conversation-business-context-${this.getDateString()}.json`);
  }

  /**
   * Export conversation topic to JSON file
   */
  static exportConversationTopic(conversationTopic: ConversationTopic): void {
    const exportData: ExportData = {
      conversationTopic,
      exportedAt: new Date().toISOString(),
      version: this.CURRENT_VERSION,
    };

    this.downloadJSON(exportData, `conversation-topic-${this.getDateString()}.json`);
  }

  /**
   * Export both personas and business context to JSON file
   */
  static exportAll(personas: PersonaTileData[], businessContext: BusinessContext): void {
    // Exclude personaId from exported personas - it will be regenerated on import
    const exportablePersonas = personas.map(persona => {
       
      const { personaId: _, isSelected: __, ...exportablePersona } = persona;
      return exportablePersona;
    });

    const exportData: ExportData = {
      personas: exportablePersonas as PersonaTileData[],
      businessContext,
      exportedAt: new Date().toISOString(),
      version: this.CURRENT_VERSION,
    };

    this.downloadJSON(exportData, `conversation-complete-${this.getDateString()}.json`);
  }

  /**
   * Export complete session data including conversation topic, personas, and business context
   */
  static exportCompleteSession(
    conversationTopic: ConversationTopic,
    personas: PersonaTileData[],
    businessContext?: BusinessContext
  ): void {
    // Exclude personaId from exported personas - it will be regenerated on import
    const exportablePersonas = personas.map(persona => {
       
      const { personaId: _, isSelected: __, ...exportablePersona } = persona;
      return exportablePersona;
    });

    const exportData: ExportData = {
      conversationTopic,
      personas: exportablePersonas as PersonaTileData[],
      businessContext,
      exportedAt: new Date().toISOString(),
      version: this.CURRENT_VERSION,
    };

    this.downloadJSON(exportData, `conversation-session-${this.getDateString()}.json`);
  }

  /**
   * Import data from JSON file
   */
  static async importFromFile(): Promise<ExportData> {
    return new Promise((resolve, reject) => {
      // nosemgrep: i18next-key-missing-namespace
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = event => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        const reader = new FileReader();
        reader.onload = e => {
          try {
            const content = e.target?.result as string;
            const data = JSON.parse(content) as ExportData;

            // Basic validation
            if (!this.validateImportData(data)) {
              reject(new Error('Invalid file format or corrupted data'));
              return;
            }

            resolve(data);
          } catch {
            reject(new Error('Failed to parse JSON file'));
          }
        };

        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
      };

      input.click();
    });
  }

  /**
   * Validate imported data structure
   */
  private static validateImportData(data: unknown): data is ExportData {
    if (!data || typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // Check required fields
    if (typeof obj.exportedAt !== 'string' || typeof obj.version !== 'string') {
      return false;
    }

    // Validate personas if present
    if (obj.personas !== undefined) {
      if (!Array.isArray(obj.personas)) {
        return false;
      }

      for (const persona of obj.personas) {
        if (!this.validatePersona(persona)) {
          return false;
        }
      }
    }

    // Validate business context if present
    if (obj.businessContext !== undefined) {
      if (!this.validateBusinessContext(obj.businessContext)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate persona structure
   */
  private static validatePersona(persona: unknown): persona is PersonaTileData {
    if (!persona || typeof persona !== 'object' || persona === null) {
      return false;
    }

    const obj = persona as Record<string, unknown>;

    return (
      // personaId is optional on import - will be generated if not present
      (obj.personaId === undefined || typeof obj.personaId === 'string') &&
      typeof obj.name === 'string' &&
      typeof obj.role === 'string' &&
      typeof obj.details === 'string' &&
      (obj.avatarId === undefined || typeof obj.avatarId === 'string') &&
      typeof obj.isCustom === 'boolean' &&
      (obj.isSelected === undefined || typeof obj.isSelected === 'boolean')
    );
  }

  /**
   * Validate business context structure
   */
  private static validateBusinessContext(context: unknown): context is BusinessContext {
    if (!context || typeof context !== 'object' || context === null) {
      return false;
    }

    const obj = context as Record<string, unknown>;

    return (
      typeof obj.industry === 'string' &&
      typeof obj.companySize === 'string' &&
      typeof obj.companyStage === 'string' &&
      Array.isArray(obj.keyPriorities) &&
      Array.isArray(obj.challenges) &&
      Array.isArray(obj.stakeholders)
    );
  }

  /**
   * Download JSON data as file
   */
  private static downloadJSON(data: ExportData, filename: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    // nosemgrep: i18next-key-missing-namespace
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  /**
   * Get formatted date string for filenames
   */
  private static getDateString(): string {
    const now = new Date();
    // nosemgrep: i18next-key-missing-namespace
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Merge imported personas with existing ones, generating new IDs for imports
   */
  static mergePersonas(
    existing: PersonaTileData[],
    imported: PersonaTileData[]
  ): PersonaTileData[] {
    const merged = [...existing];

    for (let i = 0; i < imported.length; i++) {
      const importedPersona = imported[i];

      // Always generate a new unique persona ID for imported personas
      // Ignore any personaId that might exist in the import data
      // Use index to ensure uniqueness when processing multiple personas
      const newPersona: PersonaTileData = {
        ...importedPersona,
        personaId: this.generatePersonaId(i),
        isSelected: false,
        isCustom: true, // Imported personas are always custom
      };

      // Add the new persona with generated ID
      merged.push(newPersona);
    }

    return merged;
  }

  /**
   * Generate unique persona ID for custom personas
   */
  static generatePersonaId(index?: number): string {
    // Use high-resolution time + counter + index + random to ensure absolute uniqueness
    const timestamp = performance.now().toString().replace('.', '');
    const counter = (this._idCounter = (this._idCounter || 0) + 1);
    const indexPart = index !== undefined ? index : Math.floor(Math.random() * 1000);
    const random = Math.random().toString(36).substr(2, 9);
    return `custom-${timestamp}-${counter}-${indexPart}-${random}`;
  }

  // Static counter to ensure uniqueness in rapid succession
  private static _idCounter: number = 0;
}
