// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { Container, Header, Button, SpaceBetween } from '@cloudscape-design/components';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['pages', 'common']);

  return (
    <Container>
      <SpaceBetween size='l'>
        {/* nosemgrep: i18next-colon-format-error */}
        <Header variant='h1'>{t('pages:notFound.title')}</Header>
        {/* nosemgrep: i18next-colon-format-error */}
        <p>{t('pages:notFound.message')}</p>
        <Button variant='primary' onClick={() => navigate('/')}>
          {/* nosemgrep: i18next-colon-format-error */}
          {t('common:actions.goHome')}
        </Button>
      </SpaceBetween>
    </Container>
  );
};
