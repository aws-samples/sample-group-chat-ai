// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { supportsSamplingParameters, temperatureFor } from '../../config/modelCapabilities';

describe('supportsSamplingParameters', () => {
  it.each([
    'us.anthropic.claude-sonnet-5-5',
    'us.anthropic.claude-haiku-5-5',
    'global.anthropic.claude-opus-5-5',
    'anthropic.claude-sonnet-5-5',
    'claude-sonnet-5-5',
    'claude-opus-5',
    'anthropic.claude-opus-4-7',
    'claude-opus-4-8',
    'claude-mythos-5-1',
    'claude-mythos-preview',
  ])('is false for %s', modelId => {
    expect(supportsSamplingParameters(modelId)).toBe(false);
  });

  it.each([
    'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    'anthropic.claude-sonnet-4-20250514-v1:0',
    'claude-opus-4-6',
    'anthropic.claude-3-5-haiku-20241022-v1:0',
    'amazon.nova-pro-v1:0',
    'openai.gpt-oss-120b-1:0',
    'gpt-4',
    'gemma:2b',
    '',
    undefined,
  ])('is true for %s', modelId => {
    expect(supportsSamplingParameters(modelId)).toBe(true);
  });
});

describe('temperatureFor', () => {
  it('passes temperature through for models that accept it', () => {
    expect(temperatureFor('us.anthropic.claude-haiku-4-5-20251001-v1:0', 0.7)).toEqual({
      temperature: 0.7,
    });
  });

  it('omits temperature for models that reject it', () => {
    expect(temperatureFor('us.anthropic.claude-sonnet-5-5', 0.7)).toEqual({});
  });

  it('omits an undefined temperature', () => {
    expect(temperatureFor('amazon.nova-pro-v1:0', undefined)).toEqual({});
  });
});
