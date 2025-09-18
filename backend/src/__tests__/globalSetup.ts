// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

export default async (): Promise<void> => {
  console.log('🧪 Setting up test environment...');

  // Initialize any global test resources here
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // Use random available port for tests

  console.log('✅ Test environment setup complete');
};
