// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { Container, Spinner, Box } from '@cloudscape-design/components';
import { clearStoredState } from '@/services/authSecurity';
import { useTranslation } from 'react-i18next';

export const LogoutPage: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation('pages');

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Clear CSRF state
        clearStoredState();
        
        // Manually construct logout URL with correct parameter name
        const logoutUrl = `https://group-chat-ai-staging.auth.us-west-2.amazoncognito.com/logout?client_id=369g2am12tn6lv7l118liomhf0&logout_uri=${encodeURIComponent(window.location.origin + '/')}`;
        
        // Clear auth state and redirect manually
        await auth.removeUser();
        window.location.href = logoutUrl;
      } catch (error) {
        console.error('Logout error:', error);
        // Fallback: redirect to home page
        window.location.href = '/';
      }
    };

    performLogout();
  }, [auth]);

  return (
    <Container>
      <Box textAlign="center" padding="xxl">
        <Spinner size="large" />
        <Box margin={{ top: 'm' }}>
          <h2>{t('logout.signingOut', { defaultValue: 'Signing out...' })}</h2>
          <p>{t('logout.pleaseWait', { defaultValue: 'Please wait while we sign you out.' })}</p>
        </Box>
      </Box>
    </Container>
  );
};