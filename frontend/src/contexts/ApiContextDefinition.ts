// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { createContext } from 'react';
import { AuthenticatedApiService } from '@/services/authenticatedApi';

export interface ApiContextType {
  apiService: AuthenticatedApiService | null;
  isReady: boolean;
}

export const ApiContext = createContext<ApiContextType>({
  apiService: null,
  isReady: false,
});