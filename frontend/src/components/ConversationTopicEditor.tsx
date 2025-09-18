// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Textarea,
  Header,
} from '@cloudscape-design/components';
import { ConversationTopic } from '@group-chat-ai/shared';
import { useTranslation } from 'react-i18next';

interface ConversationTopicEditorProps {
  visible: boolean;
  conversationTopic: ConversationTopic;
  onDismiss: () => void;
  onSave: (scenario: ConversationTopic) => void;
}

export const ConversationTopicEditor: React.FC<ConversationTopicEditorProps> = ({
  visible,
  conversationTopic,
  onDismiss,
  onSave,
}) => {
  const { t } = useTranslation('components');
  const [formData, setFormData] = useState<ConversationTopic>(conversationTopic);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(conversationTopic);
    setErrors({});
  }, [conversationTopic, visible]);

  const handleInputChange = (field: keyof ConversationTopic, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      // nosemgrep: i18next-key-format
      newErrors.title = t('conversationTopicEditor.validation.titleRequired');
    }
    if (!formData.description.trim()) {
      // nosemgrep: i18next-key-format
      newErrors.description = t('conversationTopicEditor.validation.scenarioRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleCancel = () => {
    setFormData(conversationTopic);
    setErrors({});
    onDismiss();
  };

  return (
    <Modal
      onDismiss={handleCancel}
      visible={visible}
      size='large'
      footer={
        <Box float='right'>
          <SpaceBetween direction='horizontal' size='xs'>
            <Button variant='link' onClick={handleCancel}>
              {/* nosemgrep: i18next-key-format */}
              {t('personaEditor.actions.cancel')}
            </Button>
            <Button variant='primary' onClick={handleSave}>
              {/* nosemgrep: i18next-key-format */}
              {t('common:actions.save')}
            </Button>
          </SpaceBetween>
        </Box>
      }
      header={<Header variant='h1'>{
        /* nosemgrep: i18next-key-format */
        t('conversationTopicEditor.headers.editConversationTopic')
      }</Header>}
    >
      <SpaceBetween size='l'>
        <FormField
          // nosemgrep: i18next-key-format
          label={t('conversationTopicEditor.fields.title.label')}
          // nosemgrep: i18next-key-format
          description={t('conversationTopicEditor.fields.title.description')}
          errorText={errors.title}
        >
          <Input
            value={formData.title}
            onChange={({ detail }) => handleInputChange('title', detail.value)}
            // nosemgrep: i18next-key-format
            placeholder={t('conversationTopicEditor.placeholders.titleExample')}
          />
        </FormField>

        <FormField
          // nosemgrep: i18next-key-format
          label={t('conversationTopicEditor.fields.scenario.label')}
          // nosemgrep: i18next-key-format
          description={t('conversationTopicEditor.fields.scenario.description')}
          errorText={errors.scenario}
        >
          <Textarea
            value={formData.description}
            onChange={({ detail }) => handleInputChange('description', detail.value)}
            // nosemgrep: i18next-key-format
            placeholder={t('conversationTopicEditor.placeholders.scenarioExample')}
            rows={15}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
};
