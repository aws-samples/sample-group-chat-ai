// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { useAuth } from 'react-oidc-context';
import { Container, Button, Box, Spinner, Alert } from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';
import { markSignInInitiated } from '@/services/authSecurity';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const { t } = useTranslation(['pages', 'common', 'components']);

  const handleSignIn = async () => {
    try {
      // Mark that sign-in was initiated by our application
      markSignInInitiated();

      // Force storage to persist by reading it back
      const stored = sessionStorage.getItem('oidc_signin_initiated');
      console.log('Sign-in initiated - stored value:', stored);
      console.log('All sessionStorage keys:', Object.keys(sessionStorage));

      if (!stored) {
        console.error('Failed to store sign-in marker!');
        return;
      }

      // Small delay to ensure all operations complete
      await new Promise(resolve => setTimeout(resolve, 50));

      console.log('Initiating redirect...');
      auth.signinRedirect();
    } catch (error) {
      console.error('Error in handleSignIn:', error);
    }
  };

  if (auth.isLoading) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <h2>{
            // nosemgrep: i18next-key-format
            t('components:protectedRoute.loading.title')}</h2>
          <Spinner size='large' />
          <p>{
            // nosemgrep: i18next-key-format
            t('components:protectedRoute.loading.description')}</p>
        </Box>
      </Container>
    );
  }

  if (auth.error) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <h2>{
            // nosemgrep: i18next-key-format
            t('common:errors.authenticationError')}</h2>
          <Alert type='error' dismissible={false}>
            <p>{
              // nosemgrep: i18next-key-format
              t('components:protectedRoute.error.description', { error: auth.error.message })}</p>
            <Box margin={{ top: 'm' }}>
              <Button
                variant="primary"
                onClick={handleSignIn}
              >
                {
                  // nosemgrep: i18next-key-format
                  t('components:protectedRoute.signIn.tryAgainLabel')}
              </Button>
            </Box>
          </Alert>
        </Box>
      </Container>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <h2>{
            // nosemgrep: i18next-key-format
          t('pages:session.sessionContent.welcomeToGroupChatAI')}</h2>
          <Alert type='info' dismissible={false}>
            <p>{
              // nosemgrep: i18next-key-format
            t('components:protectedRoute.signIn.description')}</p>
            <Box margin={{ top: 'l' }}>
              <Button
                variant="primary"
                onClick={handleSignIn}
              >
                {
                  // nosemgrep: i18next-key-format
                t('components:protectedRoute.signIn.buttonLabel')}
              </Button>
            </Box>
          </Alert>
        </Box>
      </Container>
    );
  }

  return <>{children}</>;
};
