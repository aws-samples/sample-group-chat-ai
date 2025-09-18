// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  FormField,
  Input,
  Textarea,
  Button,
  Header,
  Select,
  Spinner,
} from '@cloudscape-design/components';
import { PersonaTileData } from './PersonaTile';
import { AvatarSelector } from './AvatarSelector';
import { PollyVoice } from '@group-chat-ai/shared';
import { useApi } from '../hooks/useApi';
import { useTranslation } from 'react-i18next';

interface PersonaEditorProps {
  persona: PersonaTileData | null;
  isVisible: boolean;
  onDismiss: () => void;
  onSave: (persona: PersonaTileData) => void;
  isCreating?: boolean;
}

// Local helper function to get persona by ID (fallback when shared exports are not available)
const getPersonaById = (personaId: string) => {
  // Fallback implementation - return default voice for known persona IDs
  const defaultVoices: Record<string, string> = {
    'persona_1': 'Joanna',    
    'persona_2': 'Kajal',     
    'persona_3': 'Matthew',   
    'persona_4': 'Brian',     
    'persona_5': 'Gregory',   
    'persona_6': 'Joey',      
    'persona_7': 'Stephen',   
    'persona_8': 'Amy',       
    'persona_9': 'Danielle',  
    'persona_10': 'Arthur',   
    'persona_11': 'Emma',     
    'persona_12': 'Brian',    
    'persona_13': 'Kimberly', 
    'persona_14': 'Olivia',   
    'persona_15': 'Ruth',     
    'persona_16': 'Gregory',  
  };
  
  return {
    personaId,
    name: 'Unknown',
    role: 'Executive',
    details: 'Default persona',
    defaultVoiceId: defaultVoices[personaId] || 'Joanna'
  };
};

export const PersonaEditor: React.FC<PersonaEditorProps> = ({
  persona,
  isVisible,
  onDismiss,
  onSave,
  isCreating = false,
}) => {
  const { apiService } = useApi();
  const { t } = useTranslation('components');
  const [editedPersona, setEditedPersona] = useState<PersonaTileData>(() => {
    if (persona) {
      return { ...persona };
    }
    return {
      personaId: `custom-${Date.now()}`,
      name: '',
      role: '',
      details: '',
      isCustom: true,
      isSelected: false,
    };
  });

  const [availableVoices, setAvailableVoices] = useState<PollyVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);

  // Load available voices when component mounts
  useEffect(() => {
    const loadVoices = async () => {
      if (!apiService) { return; }

      try {
        setVoicesLoading(true);
        const voices = await apiService.getAvailableVoices();
        setAvailableVoices(voices);
      } catch {
        // console.error('Failed to load voices:', error);
      } finally {
        setVoicesLoading(false);
      }
    };

    if (isVisible) {
      loadVoices();
    }
  }, [isVisible, apiService]);

  // Reset form when persona changes
  React.useEffect(() => {
    if (persona) {
      // For existing personas, get their default voice if not already set
      const updatedPersona = { ...persona };
      if (!updatedPersona.voiceId && !updatedPersona.isCustom) {
        const defaultPersona = getPersonaById(updatedPersona.personaId);
        updatedPersona.voiceId = defaultPersona?.defaultVoiceId || 'Joanna';
      }
      setEditedPersona(updatedPersona);
    } else if (isCreating) {
      setEditedPersona({
        personaId: `custom-${Date.now()}`,
        name: '',
        role: '',
        details: '',
        voiceId: 'Joanna', // Default voice for custom personas
        isCustom: true,
        isSelected: false,
      });
    }
  }, [persona, isCreating]);

  // Get default voice for existing personas
  const getDefaultVoiceId = () => {
    if (editedPersona.voiceId) {
      return editedPersona.voiceId;
    }

    // For non-custom personas, get default from persona definition
    if (!editedPersona.isCustom) {
      const defaultPersona = getPersonaById(editedPersona.personaId);
      return defaultPersona?.defaultVoiceId || 'Joanna';
    }

    return 'Joanna';
  };

  // Format voice options as "Name - Locale (Gender)"
  const getVoiceOptions = () => {
    if (!availableVoices || availableVoices.length === 0) {
      return [];
    }
    return availableVoices.map(voice => ({
      label: `${voice.name} - ${voice.language} (${voice.gender})`,
      value: voice.voiceId,
    }));
  };

  // Get current selected voice info
  const getSelectedVoiceInfo = () => {
    const currentVoiceId = getDefaultVoiceId();
    if (!availableVoices || availableVoices.length === 0) {
      return { label: 'Joanna - en-US (Female)', value: 'Joanna' };
    }
    const voice = availableVoices.find(v => v.voiceId === currentVoiceId);
    return voice
      ? {
        label: `${voice.name} - ${voice.language} (${voice.gender})`,
        value: currentVoiceId,
      }
      : { label: 'Joanna - en-US (Female)', value: 'Joanna' };
  };

  // Handle voice preview
  const handleVoicePreview = async (voiceId: string) => {
    if (!apiService || !availableVoices || availableVoices.length === 0) {
      return;
    }

    try {
      const voice = availableVoices.find(v => v.voiceId === voiceId);
      if (!voice) {
        // console.error('Voice not found:', voiceId);
        return;
      }

      // Generate voice preview using API
      const previewResult = await apiService.generateVoicePreview(voiceId, editedPersona.personaId);

      // Create audio element for preview playback
      const previewAudio = new Audio();
      previewAudio.src = previewResult.audioUrl;
      previewAudio.volume = 0.8; // Reasonable preview volume

      // Set up event listeners
      previewAudio.onloadstart = () => {
        // Loading voice preview
      };

      previewAudio.oncanplay = () => {
        // Voice preview ready to play
      };

      previewAudio.onended = () => {
        // Voice preview finished
      };

      previewAudio.onerror = () => {
        // console.error('Error playing voice preview:', error);
      };

      // Play the preview
      await previewAudio.play();
    } catch {
      // console.error('Error generating voice preview:', error);
      // Could show a toast notification here in the future
    }
  };

  const handleSave = () => {
    if (!editedPersona.name.trim() || !editedPersona.role.trim()) {
      return; // Basic validation
    }

    onSave(editedPersona);
    onDismiss();
  };

  const updateField = <K extends keyof PersonaTileData>(field: K, value: PersonaTileData[K]) => {
    setEditedPersona(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Modal
      onDismiss={onDismiss}
      visible={isVisible}
      size='large'
      footer={
        <Box float='right'>
          <SpaceBetween direction='horizontal' size='xs'>
            <Button variant='link' onClick={onDismiss}>

              {
                // nosemgrep: i18next-key-format
                t('personaEditor.actions.cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={handleSave}
              disabled={!editedPersona.name.trim() || !editedPersona.role.trim()}
            >
              {isCreating ?
                // nosemgrep: i18next-key-format
                t('personaEditor.create') :
                // nosemgrep: i18next-key-format
                t('personaEditor.saveChanges')}
            </Button>
          </SpaceBetween>
        </Box>
      }
      header={
        <Header variant='h1'>
          {isCreating ?
            // nosemgrep: i18next-key-format
            t('personaEditor.createTitle') :
            // nosemgrep: i18next-key-format
            t('personaEditor.editTitle', { name: persona?.name || 'Persona' })}
        </Header>
      }
    >
      <SpaceBetween size='l'>
        <Box>
          <SpaceBetween size='m'>
            {/* nosemgrep: i18next-key-format */}
            <Header variant='h3'>{
              // nosemgrep: i18next-key-format
              t('personaEditor.headers.personaInformation')}</Header>

            <FormField label={
              // nosemgrep: i18next-key-format
              t('personaEditor.fields.name.label')} description={t('personaEditor.fields.name.description')}>
              <Input
                value={editedPersona.name}
                onChange={({ detail }) => updateField('name', detail.value)}
                placeholder={
                  // nosemgrep: i18next-key-format
                  t('personaEditor.placeholders.rolePlaceholder')}
              />
            </FormField>

            <FormField label={
              // nosemgrep: i18next-key-format
              t('personaEditor.fields.role.label')} description={
                // nosemgrep: i18next-key-format
                t('personaEditor.fields.role.description')}>
              <Input
                value={editedPersona.role}
                onChange={({ detail }) => updateField('role', detail.value)}
                placeholder={
                  // nosemgrep: i18next-key-format
                  t('personaEditor.placeholders.nameExample')}
              />
            </FormField>

            <FormField
              label={
                // nosemgrep: i18next-key-format
                t('personaEditor.fields.details.label')}
              description={
                // nosemgrep: i18next-key-format
                t('personaEditor.fields.details.description')}
            >
              <Textarea
                value={editedPersona.details}
                onChange={({ detail }) => updateField('details', detail.value)}
                placeholder={
                  // nosemgrep: i18next-key-format
                  t('personaEditor.placeholders.detailsExample')}
                rows={8}
              />
            </FormField>
          </SpaceBetween>
        </Box>

        <Box>
          <SpaceBetween size='m'>
            <Header variant='h3'>{
              // nosemgrep: i18next-key-format
              t('personaEditor.headers.avatarSelection')}</Header>

            <FormField label={
              // nosemgrep: i18next-key-format
              t('personaEditor.fields.avatar.label')} description={
                // nosemgrep: i18next-key-format
                t('personaEditor.fields.avatar.description')}>
              <AvatarSelector
                personaId={editedPersona.personaId}
                selectedAvatarId={editedPersona.avatarId}
                onAvatarSelect={avatarId => updateField('avatarId', avatarId)}
              />
            </FormField>
          </SpaceBetween>
        </Box>

        <Box>
          <SpaceBetween size='m'>
            <Header variant='h3'>{
              // nosemgrep: i18next-key-format
              t('personaEditor.headers.voiceSelection')}</Header>

            <FormField
              label={
                // nosemgrep: i18next-key-format
                t('personaEditor.fields.voice.label')}
              description={
                // nosemgrep: i18next-key-format
                t('personaEditor.fields.voice.description')}
            >
              {voicesLoading ? (
                <Box textAlign='center' padding='m'>
                  <SpaceBetween direction='horizontal' size='s'>
                    <Spinner />
                    <Box variant='span'>{
                      // nosemgrep: i18next-key-format
                      t('personaEditor.messages.loadingVoices')
                    }</Box>
                  </SpaceBetween>
                </Box>
              ) : (
                <SpaceBetween direction='horizontal' size='s'>
                  <div style={{ flex: 1 }}>
                    <Select
                      selectedOption={getSelectedVoiceInfo()}
                      onChange={({ detail }) => {
                        if (detail.selectedOption.value) {
                          updateField('voiceId', detail.selectedOption.value);
                        }
                      }}
                      options={getVoiceOptions()}
                      placeholder={
                        // nosemgrep: i18next-key-format
                        t('personaEditor.fields.voice.placeholder')}
                      empty={
                        // nosemgrep: i18next-key-format
                        t('personaEditor.fields.voice.empty')}
                    />
                  </div>
                  <Button
                    variant='normal'
                    iconName='notification'
                    onClick={() => handleVoicePreview(getDefaultVoiceId())}
                    disabled={!getDefaultVoiceId()}
                  >

                    {
                      // nosemgrep: i18next-key-format
                      t('personaEditor.actions.preview')}
                  </Button>
                </SpaceBetween>
              )}
            </FormField>
          </SpaceBetween>
        </Box>

        {!isCreating && !editedPersona.isCustom && (
          <Box>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f0f8ff',
                border: '1px solid #0073bb',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <strong>{
                // nosemgrep: i18next-key-format
                t('personaEditor.messages.noteLabel')}</strong>{' '}
              {
                // nosemgrep: i18next-key-format
                t('personaEditor.messages.defaultPersonaNote')}
            </div>
          </Box>
        )}
      </SpaceBetween>
    </Modal>
  );
};
