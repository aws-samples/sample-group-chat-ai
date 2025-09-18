// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Request, Response } from 'express';
import { SharedPersonaDefinition, Session } from '@group-chat-ai/shared';

export const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  get: jest.fn().mockImplementation((header: string) => {
    if (header.toLowerCase() === 'set-cookie') {
      return ['test-cookie=value'];
    }
    const headers: Record<string, string> = {
      'user-agent': 'jest-test-agent',
      'authorization': 'Bearer test-token',
      'content-type': 'application/json',
    };
    return headers[header.toLowerCase()] || undefined;
  }) as jest.MockedFunction<Request['get']>,
  ...overrides,
});

export const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

export const mockPersona: SharedPersonaDefinition = {
  personaId: 'test-persona-1',
  name: 'Test CEO',
  role: 'CEO',
  details: 'A test CEO persona focused on strategic decisions and business outcomes.',
  avatarId: 'avatar1',
  defaultVoiceId: 'Joanna',
};

export const mockSession: Partial<Session> = {
  sessionId: 'test-session-1',
  createdAt: Date.now(),
  lastActivity: Date.now(),
  activePersonas: ['persona_1'],
  conversationHistory: [],
  personaContexts: {},
};

export const mockLLMResponse = {
  personaId: 'test-persona-1',
  content: 'This is a test response from the CEO persona.',
  timestamp: new Date(),
  messageId: 'test-message-1',
};

export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock AWS SDK clients
export const mockBedrockClient = {
  send: jest.fn(),
};

export const mockPollyClient = {
  send: jest.fn(),
};

export const mockS3Client = {
  send: jest.fn(),
};
