// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { AuthenticatedApiService } from '@/services/authenticatedApi';
import { ApiContext } from './ApiContextDefinition';

interface ApiProviderProps {
  children: React.ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ children }) => {
  const auth = useAuth();
  const [apiService, setApiService] = useState<AuthenticatedApiService | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApi = async () => {
      try {
        const service = new AuthenticatedApiService(() => auth.user || null);
        await service.initialize();
        setApiService(service);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize API service:', error);
        setIsReady(true); // Still set ready to prevent infinite loading
      }
    };

    if (auth.isAuthenticated) {
      initializeApi();
    } else if (!auth.isLoading) {
      setIsReady(true);
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user]);

  return (
    <ApiContext.Provider value={{ apiService, isReady }}>
      {children}
    </ApiContext.Provider>
  );
};

