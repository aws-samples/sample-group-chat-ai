// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect } from 'react';
import {
  Box,
  SpaceBetween,
  Alert,
  Toggle,
  FormField,
  Checkbox,
  ColumnLayout,
  Container,
  Header,
  Spinner,
  StatusIndicator,
  ExpandableSection,
} from '@cloudscape-design/components';
import {
  VoiceSettings as VoiceSettingsType,
  AudioPlaybackSettings,
  CustomPersonaData,
} from '@group-chat-ai/shared';
import { audioService } from '../services/AudioService';
import { useApi } from '../hooks/useApi';
import { useTranslation } from 'react-i18next';
import { ConversationLanguageSelector } from './ConversationLanguageSelector';

interface VoiceSettingsProps {
  sessionId: string;
  currentSettings: VoiceSettingsType | null;
  activePersonas: string[];
  customPersonas?: Record<string, CustomPersonaData>;
  onSettingsChange: (settings: VoiceSettingsType) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  sessionId,
  currentSettings,
  onSettingsChange,
  isExpanded,
  onToggleExpanded,
}) => {
  const { apiService } = useApi();
  const { t } = useTranslation('components');
  const [settings, setSettings] = useState<VoiceSettingsType>(() => {
    return (
      currentSettings || {
        enabled: false,
        personaVoices: {},
        playbackSettings: {
          volume: 0.8,
          speed: 1.0,
          autoPlay: true,
        },
      }
    );
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load current settings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setSaveError(null);

        // Load current voice settings from backend if not provided
        if (!currentSettings && sessionId && apiService) {
          try {
            const voiceSettings = await apiService.getVoiceSettings(sessionId);
            setSettings(voiceSettings);
          } catch {
            // If settings don't exist yet, use defaults
          }
        }
      } catch {
        // console.error('Failed to load voice data:', error);
        // nosemgrep: i18next-key-format
        setSaveError(t('voiceSettings.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [sessionId, currentSettings, apiService, t]);

  // Update audio service settings when settings change
  useEffect(() => {
    if (settings.enabled) {
      audioService.setVoiceSettings(settings);
    }
  }, [settings]);

  // Save settings to backend
  const saveSettings = async (newSettings: VoiceSettingsType) => {
    try {
      setSaveError(null);

      // Update local state immediately for responsiveness
      setSettings(newSettings);
      onSettingsChange(newSettings);

      // Update audio service immediately
      if (newSettings.enabled) {
        audioService.setVoiceSettings(newSettings);
      }
      audioService.updatePlaybackSettings(newSettings.playbackSettings);

      // Save to backend
      if (sessionId && apiService) {
        await apiService.updateVoiceSettings(sessionId, newSettings);
      }
    } catch {
      // console.error('Failed to save voice settings:', error);
      setSaveError(
        // nosemgrep: i18next-key-format
        t('voiceSettings.saveError')
      );
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    await saveSettings(newSettings);
  };

  const handlePlaybackSettingsChange = async (playbackSettings: AudioPlaybackSettings) => {
    const newSettings = { ...settings, playbackSettings };
    await saveSettings(newSettings);
  };

  if (isLoading) {
    return (
      <Container>
        <Box textAlign='center' padding='l'>
          <SpaceBetween direction='horizontal' size='s' >
            <Spinner />
            {/* nosemgrep: i18next-key-format */}
            <Box variant='span'>{t('voiceSettings.loadingSettings')}</Box>
          </SpaceBetween>
        </Box>
      </Container>
    );
  }

  const headerContent = (
    <SpaceBetween direction='horizontal' size='s' >
      {/* nosemgrep: i18next-key-format */}
      <Box variant='h3'>{t('pages:userGuides.features.contentManagement.title')}</Box>
      {/* nosemgrep: i18next-key-format */}
      {settings.enabled && <StatusIndicator type='success'>{t('common:labels.enabled')}</StatusIndicator>}
    </SpaceBetween>
  );

  const headerActions = (
    <Toggle
      checked={settings.enabled}
      onChange={({ detail }) => handleToggleEnabled(detail.checked)}
    >
      {/* nosemgrep: i18next-key-format */}
      {t('voiceSettings.enableVoiceSynthesis')}
    </Toggle>
  );

  return (
    <Container>
      <ExpandableSection
        header={<Header actions={headerActions}>{headerContent}</Header>}
        expanded={isExpanded}
        onChange={() => onToggleExpanded()}
        variant='container'
      >
        <SpaceBetween direction='vertical' size='l'>
          {/* Error Display */}
          {saveError && (
            <>
              {/* nosemgrep: i18next-key-format */}
              <Alert
                type='error'
                dismissible
                onDismiss={() => setSaveError(null)}
                header={t('voiceSettings.headerError')}
              >
                {saveError}
              </Alert>
            </>
          )}

          {settings.enabled ? (
            <SpaceBetween direction='vertical' size='l'>
              {/* Session-level Description */}
              <Container>
                <Box variant='p'>
                  {/* nosemgrep: i18next-key-format */}
                  {t('voiceSettings.voiceEnabledDescription')}
                </Box>
              </Container>

              {/* Conversation Language */}
              <Container>
                <ConversationLanguageSelector
                  value={settings.conversationLanguage || 'en'}
                  onChange={(language) => {
                    const newSettings = {
                      ...settings,
                      conversationLanguage: language !== 'en' ? language : undefined,
                    };
                    setSettings(newSettings);
                    saveSettings(newSettings);
                  }}
                />
              </Container>

              {/* Playback Settings */}
              <Container>
                {/* nosemgrep: i18next-key-format */}
                <Header variant='h2'>{t('voiceSettings.headers.playbackSettings')}</Header>
                <SpaceBetween direction='vertical' size='m'>
                  <ColumnLayout columns={2}>
                    {/* nosemgrep: i18next-key-format */}
                    <FormField
                      label={`${t('voiceSettings.volumeLabel')} ${Math.round(settings.playbackSettings.volume * 100)}%`}
                    >
                      <input
                        type='range'
                        min='0'
                        max='1'
                        step='0.1'
                        value={settings.playbackSettings.volume}
                        onChange={e =>
                          handlePlaybackSettingsChange({
                            ...settings.playbackSettings,
                            volume: parseFloat(e.target.value),
                          })
                        }
                        style={{ width: '100%' }}
                      />
                    </FormField>

                    {/* nosemgrep: i18next-key-format */}
                    <FormField label={`${t('voiceSettings.speedLabel')} ${settings.playbackSettings.speed}x`}>
                      <input
                        type='range'
                        min='0.5'
                        max='2.0'
                        step='0.1'
                        value={settings.playbackSettings.speed}
                        onChange={e =>
                          handlePlaybackSettingsChange({
                            ...settings.playbackSettings,
                            speed: parseFloat(e.target.value),
                          })
                        }
                        style={{ width: '100%' }}
                      />
                    </FormField>
                  </ColumnLayout>

                  <Checkbox
                    checked={settings.playbackSettings.autoPlay}
                    onChange={({ detail }) =>
                      handlePlaybackSettingsChange({
                        ...settings.playbackSettings,
                        autoPlay: detail.checked,
                      })
                    }
                  >
                    {/* nosemgrep: i18next-key-format */}
                    {t('voiceSettings.autoPlayLabel')}
                  </Checkbox>
                </SpaceBetween>
              </Container>
            </SpaceBetween>
          ) : (
            <Container>
              <Box textAlign='center' padding='xxl'>
                <SpaceBetween direction='vertical' size='m' >
                  <Box variant='h2' color='text-status-inactive'>
                    {/* nosemgrep: i18next-key-format */}
                    {t('voiceSettings.voiceDisabledTitle')}
                  </Box>
                  <Box variant='p' color='text-body-secondary'>
                    {/* nosemgrep: i18next-key-format */}
                    {t('voiceSettings.voiceDisabledDescription')}
                  </Box>
                </SpaceBetween>
              </Box>
            </Container>
          )}
        </SpaceBetween>
      </ExpandableSection>
    </Container>
  );
};
