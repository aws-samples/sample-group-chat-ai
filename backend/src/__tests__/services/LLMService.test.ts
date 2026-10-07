// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

/**
 * Smoke test for LLMService Bedrock ConverseCommand path.
 * Verifies that LLMService correctly constructs and sends a ConverseCommand
 * and parses the response text, WITHOUT making real AWS calls.
 */

import { Persona } from '@group-chat-ai/shared';

// Mock responses for different test scenarios
const mockBedrockResponse = {
  output: {
    message: {
      content: [{ text: 'This is a mock response from Bedrock Claude.' }],
    },
  },
  stopReason: 'end_turn',
  usage: { inputTokens: 100, outputTokens: 50 },
};

// Captured command inputs for verification
const capturedInputs: unknown[] = [];

// Create a mock send function that captures inputs
const mockSend = jest.fn().mockImplementation((command: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const input = (command as any).input;
  capturedInputs.push(input);
  return Promise.resolve(mockBedrockResponse);
});

// Mock BedrockRuntimeClient
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const actual = jest.requireActual('@aws-sdk/client-bedrock-runtime');
  return {
    ...actual,
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
      config: { region: 'us-west-2' },
    })),
  };
});

// Mock ModelConfig to avoid Parameter Store calls
jest.mock('../../config/ModelConfig', () => ({
  ModelConfig: {
    getInstance: () => ({
      getFullConfig: () => Promise.resolve({
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

// Import after mocks
import { LLMService } from '../../services/LLMService';

describe('LLMService Bedrock ConverseCommand smoke test', () => {
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
    // Clear captured inputs and reset mocks
    capturedInputs.length = 0;
    mockSend.mockClear();
    
    // Create fresh service instance
    llmService = new LLMService();
    
    // Allow async initialization to complete
    await new Promise(resolve => setTimeout(resolve, 200));
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

    // Verify response is parsed from mock
    expect(response).toBe('This is a mock response from Bedrock Claude.');
    
    // Verify send was called
    expect(mockSend).toHaveBeenCalled();
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

    // Verify input was captured
    expect(capturedInputs.length).toBeGreaterThan(0);
    
    // Get the last captured input (the persona call, not routing)
    const lastInput = capturedInputs[capturedInputs.length - 1] as {
      modelId?: string;
      messages?: Array<{
        role: string;
        content: Array<{ text: string }>;
      }>;
      inferenceConfig?: {
        maxTokens?: number;
        temperature?: number;
      };
    };

    // Verify structure
    expect(lastInput).toBeDefined();
    expect(lastInput.modelId).toBeDefined();
    expect(lastInput.messages).toBeDefined();
    expect(lastInput.messages?.length).toBeGreaterThan(0);
    expect(lastInput.messages?.[0].role).toBe('user');
    expect(lastInput.messages?.[0].content).toBeDefined();
    expect(lastInput.messages?.[0].content[0].text).toContain(testMessage);
    expect(lastInput.inferenceConfig).toBeDefined();
  });

  it('includes persona name and role in the prompt', async () => {
    const testPersona = createTestPersona({
      personaId: 'cfo-persona',
      name: 'Finance Director',
      role: 'Chief Financial Officer',
      promptTemplate: 'You analyze financial data.',
    });

    await llmService.generatePersonaResponse(
      testPersona,
      [],
      'Review the budget proposal.'
    );

    // Find the captured input containing our prompt
    const capturedInput = capturedInputs.find((input) => {
      const typedInput = input as { messages?: Array<{ content: Array<{ text: string }> }> };
      return typedInput.messages?.[0]?.content?.[0]?.text?.includes('Finance Director');
    }) as { messages: Array<{ content: Array<{ text: string }> }> } | undefined;

    expect(capturedInput).toBeDefined();
    const promptText = capturedInput!.messages[0].content[0].text;
    
    expect(promptText).toContain('Finance Director');
    expect(promptText).toContain('Chief Financial Officer');
  });

  it('does not make real network calls (offline verification)', async () => {
    // Spy on fetch to ensure no real calls are made
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(
      new Error('Network should not be called')
    );

    const testPersona = createTestPersona({
      personaId: 'offline-test',
      name: 'Offline Tester',
      role: 'QA Engineer',
    });

    // This should succeed via the mock without network calls
    const response = await llmService.generatePersonaResponse(
      testPersona,
      [],
      'Test offline capability'
    );

    expect(response).toBe('This is a mock response from Bedrock Claude.');
    expect(fetchSpy).not.toHaveBeenCalled();
    
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

    await llmService.generatePersonaResponse(
      testPersona,
      [],
      'Explain serverless architecture.'
    );

    // Find captured input with our custom prompt
    const hasCustomPrompt = capturedInputs.some((input) => {
      const typedInput = input as { messages?: Array<{ content: Array<{ text: string }> }> };
      return typedInput.messages?.[0]?.content?.[0]?.text?.includes(customPrompt);
    });

    expect(hasCustomPrompt).toBe(true);
  });
});
