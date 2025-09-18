// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  CreateSessionRequest,
  SendMessageRequest,
  validateMessage,
  validatePersonaSelection,
  getAllPersonaIds,
} from '@group-chat-ai/shared';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateCreateSession(request: CreateSessionRequest): ValidationResult {
  if (!request) {
    return { isValid: false, error: 'Request body is required' };
  }


  if (!request.selectedPersonas) {
    return { isValid: false, error: 'Selected personas are required' };
  }

  const personaValidation = validatePersonaSelection(request.selectedPersonas);
  if (!personaValidation.isValid) {
    return personaValidation;
  }

  return { isValid: true };
}

export function validateSendMessage(request: SendMessageRequest): ValidationResult {
  if (!request) {
    return { isValid: false, error: 'Request body is required' };
  }

  if (!request.content) {
    return { isValid: false, error: 'Message content is required' };
  }

  const messageValidation = validateMessage(request.content);
  if (!messageValidation.isValid) {
    return messageValidation;
  }

  return { isValid: true };
}

export function validateSessionId(sessionId: string): ValidationResult {
  if (!sessionId) {
    return { isValid: false, error: 'Session ID is required' };
  }

  if (typeof sessionId !== 'string') {
    return { isValid: false, error: 'Session ID must be a string' };
  }

  if (sessionId.trim().length === 0) {
    return { isValid: false, error: 'Session ID cannot be empty' };
  }

  return { isValid: true };
}

export function validatePersonaId(personaId: string): ValidationResult {
  if (!personaId) {
    return { isValid: false, error: 'Persona ID is required' };
  }

  if (typeof personaId !== 'string') {
    return { isValid: false, error: 'Persona ID must be a string' };
  }

  if (personaId.trim().length === 0) {
    return { isValid: false, error: 'Persona ID cannot be empty' };
  }

  const validPersonaIds = getAllPersonaIds();
  if (!validPersonaIds.includes(personaId)) {
    return { isValid: false, error: 'Invalid persona ID' };
  }

  return { isValid: true };
}
