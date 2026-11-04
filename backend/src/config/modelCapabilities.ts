// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

/**
 * Claude models released after Claude Opus 4.6 (Claude Opus 4.7 and 4.8, and
 * every 5.x model such as Sonnet 5.5 and Haiku 5.5) reject `temperature`
 * values other than 1.0 and reject `top_p` entirely, with a
 * ValidationException. Matching works on bare Anthropic API names
 * (`claude-sonnet-5-5`), Bedrock model IDs (`anthropic.claude-haiku-5-5`) and
 * inference profile IDs (`us.anthropic.claude-sonnet-5-5`).
 */
const CLAUDE_FAMILY_VERSION = /claude-(?:opus|sonnet|haiku|fable|mythos)-(\d+)(?:-(\d+))?/;

export function supportsSamplingParameters(modelId: string | undefined): boolean {
  if (!modelId) {
    return true;
  }
  if (modelId.includes('claude-mythos-preview')) {
    return false;
  }

  const match = CLAUDE_FAMILY_VERSION.exec(modelId);
  if (!match) {
    return true;
  }

  const major = Number(match[1]);
  // A long second number is a release date (claude-sonnet-4-20250514), not a minor version.
  const minor = match[2] && match[2].length <= 2 ? Number(match[2]) : 0;
  if (major >= 5) {
    return false;
  }
  return !(major === 4 && minor >= 7);
}

/**
 * The temperature to send for `modelId`: the configured value for models
 * that accept it, or nothing for models that reject it, so they run at their
 * default.
 */
export function temperatureFor(
  modelId: string | undefined,
  temperature: number | undefined
): { temperature?: number } {
  if (temperature === undefined || !supportsSamplingParameters(modelId)) {
    return {};
  }
  return { temperature };
}
