// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect } from 'react';
import { AuthProvider as OidcAuthProvider } from 'react-oidc-context';
import { Container, Spinner, Box, Alert } from '@cloudscape-design/components';
import { getOidcConfig } from '@/services/authConfig';
import { UserManagerSettings } from 'oidc-client-ts';
import { useTranslation } from 'react-i18next';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { t } = useTranslation('components');
  const [oidcConfig, setOidcConfig] = useState<UserManagerSettings | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const config = await getOidcConfig();
        setOidcConfig(config);
        setConfigError(null);
      } catch (error) {
        console.error('Failed to load OIDC configuration:', error);
        setConfigError(error instanceof Error ? error.message :
          // nosemgrep: i18next-key-format
          t('common:errors.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [t]);

  if (isLoading) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <Spinner size="large" />
          <Box margin={{ top: 'm' }}>
            <h2>{
              // nosemgrep: i18next-key-format
              t('authProvider.loading.title')
            }</h2>
            <p>{
              // nosemgrep: i18next-key-format
              t('authProvider.loading.description')
            }</p>
          </Box>
        </Box>
      </Container>
    );
  }

  if (configError || !oidcConfig) {
    return (
      <Container>
        <Box padding="l">
          <Alert type="error" header={
            // nosemgrep: i18next-key-format
            t('common:errors.configurationError')
          }>
            <p>{
              // nosemgrep: i18next-key-format
              t('authProvider.error.description', { error: configError })
            }</p>
            <p>{
              // nosemgrep: i18next-key-format
              t('authProvider.error.instructions')
            }</p>
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <OidcAuthProvider {...oidcConfig}>
      {children}
    </OidcAuthProvider>
  );
};