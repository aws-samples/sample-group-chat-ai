/**
 * Copyright 2025 Amazon.com, Inc. or its affiliates.
 * SPDX-License-Identifier: MIT-0
 */

import type Anthropic from '@anthropic-ai/sdk';
import { extractAnthropicText } from '../../services/LLMService';

const message = (content: unknown[]): Anthropic.Message =>
  ({ id: 'msg_1', type: 'message', role: 'assistant', content }) as unknown as Anthropic.Message;

describe('extractAnthropicText', () => {
  it('joins text blocks in order', () => {
    expect(
      extractAnthropicText(
        message([
          { type: 'text', text: 'Hello, ' },
          { type: 'text', text: 'world' },
        ])
      )
    ).toBe('Hello, world');
  });

  it('skips thinking and redacted thinking blocks', () => {
    expect(
      extractAnthropicText(
        message([
          { type: 'thinking', thinking: 'internal reasoning', signature: 'sig' },
          { type: 'redacted_thinking', data: 'opaque' },
          { type: 'text', text: 'Answer' },
        ])
      )
    ).toBe('Answer');
  });

  it('returns an empty string when there is no text', () => {
    expect(extractAnthropicText(message([]))).toBe('');
  });
});
