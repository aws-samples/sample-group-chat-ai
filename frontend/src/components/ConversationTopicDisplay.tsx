// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Box,
  TextContent,
  Badge,
  ButtonDropdown,
  Alert,
} from '@cloudscape-design/components';
import { ConversationTopic } from '@group-chat-ai/shared';
import { ImportExportService } from '../utils/importExport';
import { useTranslation } from 'react-i18next';

interface ConversationTopicDisplayProps {
  conversationTopic: ConversationTopic;
  onEdit: () => void;
  onReset?: () => void;
  onImport?: (scenario: ConversationTopic) => void;
  isCustomized?: boolean;
}

export const ConversationTopicDisplay: React.FC<ConversationTopicDisplayProps> = ({
  conversationTopic,
  onEdit,
  onReset,
  onImport,
  isCustomized = false,
}) => {
  const { t } = useTranslation('components');
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = () => {
    ImportExportService.exportConversationTopic(conversationTopic);
  };

  const handleImport = async () => {
    try {
      setImportError(null);
      const importedData = await ImportExportService.importFromFile();

      if (importedData.conversationTopic && onImport) {
        onImport(importedData.conversationTopic);
      } else {
        setImportError(t('conversationTopicDisplay.errors.noConversationTopicFound'));
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t('common:errors.importFailed'));
    }
  };

  return (
    <Container
      header={
        <Header
          variant='h2'
          actions={
            <SpaceBetween direction='horizontal' size='xs'>
              <ButtonDropdown
                items={[
                  {
                    text:
                      // nosemgrep: i18next-key-format
                      t('conversationTopicDisplay.actions.exportScenario'),
                    id: 'export',
                    iconName: 'download',
                  },
                  {
                    text:
                      // nosemgrep: i18next-key-format
                      t('conversationTopicDisplay.actions.importScenario'),
                    id: 'import',
                    iconName: 'upload',
                  },
                ]}
                onItemClick={({ detail }) => {
                  if (detail.id === 'export') {
                    handleExport();
                  } else if (detail.id === 'import') {
                    handleImport();
                  }
                }}
              >
                {
                  // nosemgrep: i18next-key-format
                  t('conversationTopicDisplay.actions.importExport')}
              </ButtonDropdown>
              {isCustomized && onReset && (
                <Button variant='normal' onClick={onReset} iconName='refresh'>
                  {
                    // nosemgrep: i18next-key-format
                    t('conversationTopicDisplay.actions.resetToDefault')}
                </Button>
              )}
              <Button variant='primary' onClick={onEdit} iconName='edit'>
                {
                  // nosemgrep: i18next-key-format
                  t('conversationTopicDisplay.actions.editConversationTopic')}
              </Button>
            </SpaceBetween>
          }
        >
          {t('conversationTopicDisplay.headers.conversationTopic')}
          {isCustomized && (
            <>
              {' '}
              <Badge color='blue'>{
                // nosemgrep: i18next-key-format
                t('common:labels.customized')}</Badge>
            </>
          )}
        </Header>
      }
    >
      <SpaceBetween size='m'>
        {importError && (
          <Alert type='error' dismissible onDismiss={() => setImportError(null)}>
            {importError}
          </Alert>
        )}

        <Box>
          <TextContent>
            <h3>{conversationTopic.title}</h3>
          </TextContent>
        </Box>

        <Box>
          <TextContent>
            <h4>{
              // nosemgrep: i18next-key-format
              t('conversationTopicDisplay.headers.scenarioDescription')}</h4>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {conversationTopic.description}
            </div>
          </TextContent>
        </Box>
      </SpaceBetween>
    </Container>
  );
};
