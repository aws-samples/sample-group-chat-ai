// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { Container, Spinner, Box, Alert } from '@cloudscape-design/components';
import { validateAndClearSignInInitiated } from '@/services/authSecurity';
import { useTranslation } from 'react-i18next';

export const CallbackPage: React.FC = () => {
  const auth = useAuth();
  const { t } = useTranslation('pages');
  const [csrfError, setCsrfError] = useState<string | null>(null);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    // Only validate once to prevent loops
    if (hasValidated) {
      return;
    }

    // Validate that sign-in was initiated by our application
    const validateCallback = () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Debug: Check what's in storage when callback loads
      console.log('Callback page - checking storage...');
      console.log('All sessionStorage keys:', Object.keys(sessionStorage));
      console.log('oidc_signin_initiated value:', sessionStorage.getItem('oidc_signin_initiated'));
      console.log('oidc_signin_validated_once value:', sessionStorage.getItem('oidc_signin_validated_once'));
      
      // Only validate if we have URL parameters (indicates callback)
      if (urlParams.has('code') || urlParams.has('error')) {
        // Validate and clear sign-in marker (handles React Strict Mode double execution)
        if (!validateAndClearSignInInitiated()) {
          console.error('CSRF Security: Sign-in was not initiated by this application');
          console.error('Available sessionStorage keys:', Object.keys(sessionStorage));
          setCsrfError(t('callback.csrfError'));
          setHasValidated(true);
          return;
        }
        
        console.log('CSRF validation passed - sign-in was initiated by this application');
      }
      setHasValidated(true);
    };

    validateCallback();
  }, [hasValidated, t]);

  useEffect(() => {
    // Don't process authentication if CSRF validation failed
    if (csrfError) {
      return;
    }

    // The react-oidc-context will automatically handle the callback
    // We just need to show a loading state while it processes
    if (auth.isLoading) {
      console.log('Processing authentication callback...');
    }
    
    if (auth.error) {
      console.error('Authentication error:', auth.error);
    }
    
    if (auth.user) {
      console.log('Authentication successful, redirecting...');
      // Redirect to home page or intended route
      window.location.href = '/';
    }
  }, [auth.isLoading, auth.error, auth.user, csrfError]);

  if (csrfError) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <Alert type="error" header={t('callback.securityError')}>
            <p>{csrfError}</p>
            <p>{t('callback.securityMessage')}</p>
            <p><a href="/">{t('common:labels.returnToHome')}</a></p>
          </Alert>
        </Box>
      </Container>
    );
  }

  if (auth.error) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <h2>{t('common:errors.authenticationError')}</h2>
          <p>{t('callback.authenticationErrorMessage', { message: auth.error.message })}</p>
          <p><a href="/">{t('common:labels.returnToHome')}</a></p>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box textAlign="center" padding="xxl">
        <Spinner size="large" />
        <Box margin={{ top: 'm' }}>
          <h2>{t('callback.processingTitle')}</h2>
          <p>{t('callback.processingMessage')}</p>
        </Box>
      </Box>
    </Container>
  );
};