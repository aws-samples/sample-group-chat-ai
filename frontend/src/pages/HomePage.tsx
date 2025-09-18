// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Box,
  TextContent,
  Alert,
} from '@cloudscape-design/components';
import {
  ConversationTopic,
  DEFAULT_CONVERSATION_TOPIC,
  CustomPersonaData,
} from '@group-chat-ai/shared';
import { useApi } from '../hooks/useApi';
import { PersonaTileManager } from '../components/PersonaTileManager';
import { PersonaTileData } from '../components/PersonaTile';
import { ConversationTopicDisplay } from '../components/ConversationTopicDisplay';
import { ConversationTopicEditor } from '../components/ConversationTopicEditor';
import { SessionScopedStorage } from '../utils/sessionScopedStorage';
import { ConversationLanguageSelector } from '../components/ConversationLanguageSelector';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { apiService } = useApi();
  const { t } = useTranslation('pages');

  // Create a proper default scenario with simplified structure
  const createDefaultScenario = (): ConversationTopic => ({
    title: DEFAULT_CONVERSATION_TOPIC.title,
    description: DEFAULT_CONVERSATION_TOPIC.description,
  });

  const [conversationTopic, setConversationTopic] = useState<ConversationTopic>(createDefaultScenario);
  const [isScenarioCustomized, setIsScenarioCustomized] = useState(false);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [customizedPersonas, setCustomizedPersonas] = useState<PersonaTileData[]>([]);
  const [conversationLanguage, setConversationLanguage] = useState<string>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScenarioSave = (newScenario: ConversationTopic) => {
    setConversationTopic(newScenario);
    setIsScenarioCustomized(true);
    setIsEditorVisible(false);

    // Save to session storage
    try {
      sessionStorage.setItem('customConversationTopic', JSON.stringify(newScenario));
      sessionStorage.setItem('isScenarioCustomized', 'true');
    } catch {
      // Failed to save conversation topic to session storage
    }
  };

  const handleScenarioImport = (importedScenario: ConversationTopic) => {
    setConversationTopic(importedScenario);
    setIsScenarioCustomized(true);

    // Save to session storage
    try {
      sessionStorage.setItem('customConversationTopic', JSON.stringify(importedScenario));
      sessionStorage.setItem('isScenarioCustomized', 'true');
    } catch {
      // Failed to save imported conversation topic to session storage
    }
  };

  const handleScenarioReset = () => {
    setConversationTopic(createDefaultScenario());
    setIsScenarioCustomized(false);

    // Clear from session storage
    try {
      sessionStorage.removeItem('customConversationTopic');
      sessionStorage.removeItem('isScenarioCustomized');
    } catch {
      // Failed to clear conversation topic from session storage
    }
  };

  // Load customized scenario from session storage on mount
  React.useEffect(() => {
    try {
      const savedScenario = sessionStorage.getItem('customConversationTopic');
      const isCustomized = sessionStorage.getItem('isScenarioCustomized') === 'true';

      if (savedScenario && isCustomized) {
        setConversationTopic(JSON.parse(savedScenario));
        setIsScenarioCustomized(true);
      }
    } catch {
      // Failed to load conversation topic from session storage
    }
  }, []);

  const handlePersonasChange = (personas: PersonaTileData[]) => {
    setCustomizedPersonas(personas);
  };

  const convertToCustomPersonaData = (personaTileData: PersonaTileData): CustomPersonaData => ({
    personaId: personaTileData.personaId,
    name: personaTileData.name,
    role: personaTileData.role,
    details: personaTileData.details,
    avatarId: personaTileData.avatarId,
    isCustom: personaTileData.isCustom,
    voiceId: personaTileData.voiceId, // CRITICAL FIX: Include voiceId in custom persona data
  });

  const handleStartSession = async () => {
    if (selectedPersonaIds.length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clear any temporary data before starting new session
      SessionScopedStorage.clearTemporaryData();

      // Get ALL persona data for selected personas (both default and customized)
      const selectedPersonaData = customizedPersonas
        .filter(persona => selectedPersonaIds.includes(persona.personaId))
        .map(convertToCustomPersonaData);

      if (!apiService) {
        // nosemgrep: i18next-key-format
        throw new Error(t('home.errors.apiUnavailable'));
      }

      const response = await apiService.createSession({
        conversationTopic: conversationTopic,
        selectedPersonas: selectedPersonaIds,
        customPersonas: selectedPersonaData.length > 0 ? selectedPersonaData : undefined,
        conversationLanguage: conversationLanguage !== 'en' ? conversationLanguage : undefined,
      });

      // Set the session ID for scoped storage
      SessionScopedStorage.setSessionId(response.sessionId);

      // Migrate from old global storage to session-scoped storage
      SessionScopedStorage.migrateFromGlobalStorage(['editedDefaultPersonas', 'customPersonas']);

      // Navigate to session page with the session ID
      navigate(`/session/${response.sessionId}`);
    } catch (error) {
      // console.error('Error starting session:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        // nosemgrep: i18next-key-format
        setError(t('home.errors.sessionStartFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <SpaceBetween size='l'>
        <Header variant='h1'>
          {
            // nosemgrep: i18next-key-format
            t('home.title')
          }
        </Header>

        <TextContent>
          <p>
            {
              // nosemgrep: i18next-key-format
              t('home.title')
            }
          </p>
        </TextContent>

        <Box>
          <SpaceBetween size='m'>
            <Header variant='h2'>
              {
                // nosemgrep: i18next-key-format
                t('home.configureSession')
              }
            </Header>

            <ConversationTopicDisplay
              conversationTopic={conversationTopic}
              onEdit={() => setIsEditorVisible(true)}
              onReset={handleScenarioReset}
              onImport={handleScenarioImport}
              isCustomized={isScenarioCustomized}
            />

            <PersonaTileManager
              selectedPersonaIds={selectedPersonaIds}
              onSelectionChange={setSelectedPersonaIds}
              onPersonasChange={handlePersonasChange}
            />

            <ConversationLanguageSelector
              value={conversationLanguage}
              onChange={setConversationLanguage}
            />

            {error && (
              <Alert type='error' dismissible onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Button
              variant='primary'
              onClick={handleStartSession}
              disabled={selectedPersonaIds.length === 0}
              loading={isLoading}
            >
              {
                // nosemgrep: i18next-key-format
                t('home.startSession')
              }
            </Button>
          </SpaceBetween>
        </Box>

        <ConversationTopicEditor
          visible={isEditorVisible}
          conversationTopic={conversationTopic}
          onDismiss={() => setIsEditorVisible(false)}
          onSave={handleScenarioSave}
        />
      </SpaceBetween>
    </Container>
  );
};
