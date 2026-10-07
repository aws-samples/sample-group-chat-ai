// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

/**
 * Smoke test for LLMService Bedrock ConverseCommand path.
 * Uses aws-sdk-client-mock to capture ACTUAL ConverseCommand instances
 * and assert on the exact command payload, while remaining fully offline.
 */

// Clear the global module-level mock from setup.ts so aws-sdk-client-mock can take over
jest.unmock('@aws-sdk/client-bedrock-runtime');

import { mockClient } from 'aws-sdk-client-mock';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { Persona } from '@group-chat-ai/shared';

// Create the mock client
const bedrockMock = mockClient(BedrockRuntimeClient);

// Mock response matching Bedrock's ConverseCommand output shape
const mockBedrockResponse = {
  output: {
    message: {
      role: 'assistant' as const,
      content: [{ text: 'This is a mock response from Bedrock Claude.' }],
    },
  },
  stopReason: 'end_turn' as const,
  usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  metrics: { latencyMs: 150 },
};

// Mock ModelConfig to avoid Parameter Store calls
jest.mock('../../config/ModelConfig', () => ({
  ModelConfig: {
    getInstance: () => ({
      getFullConfig: () =>
        Promise.resolve({
          personaModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
          routingModel: 'anthropic.claude-3-haiku-20240307-v1:0',
          personaProvider: 'bedrock',
          routingProvider: 'bedrock',
        }),
    }),
  },
}));

// Mock ContextManagementService
jest.mock('../../services/ContextManagementService', () => ({
  ContextManagementService: jest.fn().mockImplementation(() => ({
    selectFileContextForPersona: jest.fn().mockResolvedValue([]),
    formatFileContextForPrompt: jest.fn().mockReturnValue(''),
  })),
}));

// Mock logger
jest.mock('../../config/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Import LLMService AFTER mocks are configured
import { LLMService } from '../../services/LLMService';

describe('LLMService Bedrock ConverseCommand smoke test (aws-sdk-client-mock)', () => {
  let llmService: LLMService;

  const createTestPersona = (overrides: Partial<Persona> = {}): Persona => ({
    personaId: 'test-persona',
    name: 'Test Persona',
    role: 'Test Role',
    description: 'A test persona for unit testing.',
    characteristics: ['analytical', 'thorough'],
    priorities: ['accuracy', 'testing'],
    communicationStyle: 'Clear and direct',
    promptTemplate: 'You are a helpful test persona.',
    expertiseKeywords: ['testing', 'verification'],
    responsePatterns: [],
    interactionRules: [],
    isCustom: false,
    version: 1,
    ...overrides,
  });

  beforeEach(async () => {
    // Reset and configure mock before each test
    bedrockMock.reset();
    bedrockMock.on(ConverseCommand).resolves(mockBedrockResponse);

    // Create fresh service instance
    llmService = new LLMService();

    // Allow async initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  afterAll(() => {
    bedrockMock.restore();
  });

  it('sends a ConverseCommand and returns parsed response text', async () => {
    const testPersona = createTestPersona({
      personaId: 'test-ceo',
      name: 'Test CEO',
      role: 'Chief Executive Officer',
      promptTemplate: 'You are a CEO focused on strategic growth.',
    });

    const response = await llmService.generatePersonaResponse(
      testPersona,
      [],
      'What are your thoughts on expanding to new markets?'
    );

    // Verify response is parsed correctly from mock
    expect(response).toBe('This is a mock response from Bedrock Claude.');

    // Verify ConverseCommand was called at least once
    const calls = bedrockMock.commandCalls(ConverseCommand);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('constructs a ConverseCommand with correct message structure', async () => {
    const testMessage = 'What is our Q4 strategy?';
    const testPersona = createTestPersona({
      personaId: 'strategy-ceo',
      name: 'Strategy CEO',
      role: 'CEO',
      promptTemplate: 'You focus on long-term strategy.',
    });

    await llmService.generatePersonaResponse(testPersona, [], testMessage);

    // Get the captured ConverseCommand calls
    const calls = bedrockMock.commandCalls(ConverseCommand);
    expect(calls.length).toBeGreaterThan(0);

    // Get the LAST call (persona response, not routing) and extract its input
    const lastCall = calls[calls.length - 1];
    const input = lastCall.args[0].input as ConverseCommandInput;

    // Assert on the ACTUAL command input structure
    expect(input).toBeDefined();
    expect(input.modelId).toBeDefined();
    expect(typeof input.modelId).toBe('string');
    expect(input.modelId).toContain('anthropic.claude');

    // Verify messages array structure
    expect(input.messages).toBeDefined();
    expect(Array.isArray(input.messages)).toBe(true);
    expect(input.messages!.length).toBeGreaterThan(0);

    // First message should be user role with content
    const firstMessage = input.messages![0];
    expect(firstMessage.role).toBe('user');
    expect(firstMessage.content).toBeDefined();
    expect(Array.isArray(firstMessage.content)).toBe(true);
    expect(firstMessage.content!.length).toBeGreaterThan(0);

    // Verify the message text contains the test message
    const textContent = firstMessage.content!.find((c) => 'text' in c);
    expect(textContent).toBeDefined();
    expect((textContent as { text: string }).text).toContain(testMessage);

    // Verify inferenceConfig is present
    expect(input.inferenceConfig).toBeDefined();
    expect(input.inferenceConfig?.maxTokens).toBeDefined();
    expect(typeof input.inferenceConfig?.maxTokens).toBe('number');
  });

  it('includes persona name and role in the prompt', async () => {
    const testPersona = createTestPersona({
      personaId: 'cfo-persona',
      name: 'Finance Director',
      role: 'Chief Financial Officer',
      promptTemplate: 'You analyze financial data.',
    });

    await llmService.generatePersonaResponse(testPersona, [], 'Review the budget proposal.');

    // Get captured calls
    const calls = bedrockMock.commandCalls(ConverseCommand);
    expect(calls.length).toBeGreaterThan(0);

    // Find a call whose prompt contains the persona name
    const callWithPersona = calls.find((call) => {
      const input = call.args[0].input as ConverseCommandInput;
      const textContent = input.messages?.[0]?.content?.find((c) => 'text' in c);
      return textContent && (textContent as { text: string }).text.includes('Finance Director');
    });

    expect(callWithPersona).toBeDefined();

    const input = callWithPersona!.args[0].input as ConverseCommandInput;
    const textContent = input.messages![0].content!.find((c) => 'text' in c) as { text: string };

    expect(textContent.text).toContain('Finance Director');
    expect(textContent.text).toContain('Chief Financial Officer');
  });

  it('does not make real network calls (offline verification)', async () => {
    // Spy on fetch to ensure no real calls are made
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network should not be called'));

    const testPersona = createTestPersona({
      personaId: 'offline-test',
      name: 'Offline Tester',
      role: 'QA Engineer',
    });

    // This should succeed via the mock without network calls
    const response = await llmService.generatePersonaResponse(testPersona, [], 'Test offline capability');

    expect(response).toBe('This is a mock response from Bedrock Claude.');
    expect(fetchSpy).not.toHaveBeenCalled();

    // Verify mock was used
    const calls = bedrockMock.commandCalls(ConverseCommand);
    expect(calls.length).toBeGreaterThan(0);

    fetchSpy.mockRestore();
  });

  it('includes custom prompt template in the constructed prompt', async () => {
    const customPrompt = 'You are an expert in cloud architecture and AWS services.';
    const testPersona = createTestPersona({
      personaId: 'cloud-architect',
      name: 'Cloud Architect',
      role: 'Solutions Architect',
      promptTemplate: customPrompt,
    });

    await llmService.generatePersonaResponse(testPersona, [], 'Explain serverless architecture.');

    // Get captured calls
    const calls = bedrockMock.commandCalls(ConverseCommand);
    expect(calls.length).toBeGreaterThan(0);

    // Find a call whose prompt contains the custom template
    const hasCustomPrompt = calls.some((call) => {
      const input = call.args[0].input as ConverseCommandInput;
      const textContent = input.messages?.[0]?.content?.find((c) => 'text' in c);
      return textContent && (textContent as { text: string }).text.includes(customPrompt);
    });

    expect(hasCustomPrompt).toBe(true);
  });

  it('uses the configured model ID from ModelConfig', async () => {
    const testPersona = createTestPersona({
      personaId: 'model-test',
      name: 'Model Tester',
      role: 'Tester',
    });

    await llmService.generatePersonaResponse(testPersona, [], 'Test model configuration');

    // Get captured calls
    const calls = bedrockMock.commandCalls(ConverseCommand);
    expect(calls.length).toBeGreaterThan(0);

    // The last call should use the persona model from mock ModelConfig
    const lastCall = calls[calls.length - 1];
    const input = lastCall.args[0].input as ConverseCommandInput;

    // Verify modelId matches our mocked ModelConfig
    expect(input.modelId).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
  });

  it('sends inference config with temperature and maxTokens', async () => {
    const testPersona = createTestPersona({
      personaId: 'inference-test',
      name: 'Inference Tester',
      role: 'Tester',
    });

    await llmService.generatePersonaResponse(testPersona, [], 'Check inference config');

    // Get captured calls
    const calls = bedrockMock.commandCalls(ConverseCommand);
    expect(calls.length).toBeGreaterThan(0);

    const lastCall = calls[calls.length - 1];
    const input = lastCall.args[0].input as ConverseCommandInput;

    // Verify inference config structure
    expect(input.inferenceConfig).toBeDefined();
    expect(input.inferenceConfig?.maxTokens).toBeGreaterThan(0);
    expect(input.inferenceConfig?.temperature).toBeDefined();
    expect(typeof input.inferenceConfig?.temperature).toBe('number');
    expect(input.inferenceConfig?.temperature).toBeGreaterThanOrEqual(0);
    expect(input.inferenceConfig?.temperature).toBeLessThanOrEqual(1);
  });
});
