// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Persona,
  CustomPersonaData,
  PERSONA_DEFINITIONS,
  SharedPersonaDefinition,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';

const logger = createLogger();

export class PersonaManager {
  private personas: Map<string, Persona> = new Map();

  constructor() {
    this.initializePersonas();
  }

  private initializePersonas(): void {
    // Convert shared persona definitions to backend Persona format
    const personas: Persona[] = PERSONA_DEFINITIONS.map(sharedPersona =>
      this.convertSharedPersonaToPersona(sharedPersona)
    );

    for (const persona of personas) {
      this.personas.set(persona.personaId, persona);
    }

    logger.info('Personas initialized', { count: personas.length });
  }

  // Convert SharedPersonaDefinition to backend Persona interface
  private convertSharedPersonaToPersona(sharedPersona: SharedPersonaDefinition): Persona {
    // Create a basic prompt template based on the persona data
    const promptTemplate = `You are a ${sharedPersona.role} participating in a presentation review.
Your name is ${sharedPersona.name}.

${sharedPersona.details}

Be authentic to your role and focus on the areas that matter most to you based on your background and expertise.
Provide thoughtful, realistic responses that reflect your perspective and priorities.`;

    return {
      personaId: sharedPersona.personaId,
      name: sharedPersona.name,
      role: sharedPersona.role,
      description: sharedPersona.details,
      characteristics: [], // Simplified - details are in description
      priorities: [], // Simplified - priorities are in description
      communicationStyle: `Professional ${sharedPersona.role}`,
      promptTemplate,
      expertiseKeywords: [], // Simplified - not needed for basic functionality
      responsePatterns: [], // Simplified - not needed for basic functionality
      interactionRules: [], // Simplified - not needed for basic functionality
      isCustom: false,
      version: 1,
    };
  }

  getPersona(personaId: string): Persona {
    const persona = this.personas.get(personaId);
    if (!persona) {
      throw new Error(`Persona with ID '${personaId}' not found`);
    }
    return persona;
  }

  getPersonaName(personaId: string): string {
    return this.getPersona(personaId).name;
  }

  getPersonaRole(personaId: string): string {
    return this.getPersona(personaId).role;
  }

  getPersonaDescription(personaId: string): string {
    return this.getPersona(personaId).description;
  }

  getAllPersonas(): Persona[] {
    return Array.from(this.personas.values());
  }


  validatePersonaIds(personaIds: string[]): boolean {
    return personaIds.every(id => this.personas.has(id));
  }

  // Convert CustomPersonaData to Persona for LLM usage
  private convertCustomPersonaToPersona(customPersona: CustomPersonaData): Persona {
    // Create a basic prompt template based on the custom persona data
    const promptTemplate = `You are a ${customPersona.role} participating in a presentation review.
Your name is ${customPersona.name}.

${customPersona.details}

Be authentic to your role and focus on the areas that matter most to you based on the details above.
Provide thoughtful, realistic responses that reflect your perspective and expertise.`;

    return {
      personaId: customPersona.personaId,
      name: customPersona.name,
      role: customPersona.role,
      description: customPersona.details, // Use full details for persona awareness
      characteristics: [], // We don't have this in CustomPersonaData, so leave empty
      priorities: [], // Simplified structure - priorities are in details text
      communicationStyle: `Professional ${customPersona.role}`,
      promptTemplate,
      expertiseKeywords: [], // We don't have this in CustomPersonaData, so leave empty
      responsePatterns: [], // We don't have this in CustomPersonaData, so leave empty
      interactionRules: [], // We don't have this in CustomPersonaData, so leave empty
      isCustom: customPersona.isCustom,
      version: 1,
    };
  }

  // Get persona with custom persona support
  getPersonaWithCustom(
    personaId: string,
    customPersonas?: Record<string, CustomPersonaData>
  ): Persona {
    // Check if there's a custom version of this persona
    if (customPersonas && customPersonas[personaId]) {
      return this.convertCustomPersonaToPersona(customPersonas[personaId]);
    }

    // Fall back to default persona
    return this.getPersona(personaId);
  }

  // Get persona name with custom persona support
  getPersonaNameWithCustom(
    personaId: string,
    customPersonas?: Record<string, CustomPersonaData>
  ): string {
    if (customPersonas && customPersonas[personaId]) {
      return customPersonas[personaId].name;
    }
    return this.getPersonaName(personaId);
  }

  // Get persona role with custom persona support
  getPersonaRoleWithCustom(
    personaId: string,
    customPersonas?: Record<string, CustomPersonaData>
  ): string {
    if (customPersonas && customPersonas[personaId]) {
      return customPersonas[personaId].role;
    }
    return this.getPersonaRole(personaId);
  }

  // Get persona description with custom persona support
  getPersonaDescriptionWithCustom(
    personaId: string,
    customPersonas?: Record<string, CustomPersonaData>
  ): string {
    if (customPersonas && customPersonas[personaId]) {
      return customPersonas[personaId].details; // Use full details for persona awareness
    }
    return this.getPersonaDescription(personaId);
  }
}
