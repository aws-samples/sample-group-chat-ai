// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.LLM_PROVIDER = 'mock';
process.env.ENABLE_VOICE_SYNTHESIS = 'false';

// Mock AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-polly');
jest.mock('@aws-sdk/client-s3');

// Mock external APIs
jest.mock('openai');
jest.mock('@anthropic-ai/sdk');

// Global test timeout
jest.setTimeout(30000);
