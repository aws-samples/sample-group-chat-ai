// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { Select, FormField } from '@cloudscape-design/components';
import { useTranslation } from 'react-i18next';

interface ConversationLanguageOption {
  label: string;
  value: string;
  description?: string;
}

interface ConversationLanguageSelectorProps {
  value?: string;
  onChange: (language: string) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

// Supported conversation languages matching backend
const CONVERSATION_LANGUAGE_OPTIONS: ConversationLanguageOption[] = [
  { label: 'English', value: 'en', description: 'English' },
  { label: 'Español', value: 'es', description: 'Spanish' },
  { label: 'Français', value: 'fr', description: 'French' },
  { label: 'Deutsch', value: 'de', description: 'German' },
  { label: '日本語', value: 'ja', description: 'Japanese' },
  { label: '中文', value: 'zh', description: 'Chinese' },
  { label: 'Português', value: 'pt', description: 'Portuguese' },
  { label: 'Italiano', value: 'it', description: 'Italian' },
  { label: 'Русский', value: 'ru', description: 'Russian' },
  { label: '한국어', value: 'ko', description: 'Korean' },
  { label: 'العربية', value: 'ar', description: 'Arabic' },
  { label: 'Svenska', value: 'sv', description: 'Swedish' },
];

export const ConversationLanguageSelector: React.FC<ConversationLanguageSelectorProps> = ({
  value = 'en',
  onChange,
  disabled = false,
  label,
  description,
}) => {
  const { t } = useTranslation('components');

  const selectedOption = CONVERSATION_LANGUAGE_OPTIONS.find(option => option.value === value) || 
                        CONVERSATION_LANGUAGE_OPTIONS[0];

  const handleSelectionChange = (detail: any) => {
    if (detail.selectedOption && detail.selectedOption.value) {
      onChange(detail.selectedOption.value);
    }
  };

  return (
    <FormField
      // nosemgrep: i18next-key-format
      label={label || t('conversationLanguageSelector.label', 'Conversation Language')}
      // nosemgrep: i18next-key-format
      description={description || t('conversationLanguageSelector.description', 'Choose the language for AI persona responses and voice synthesis')}
    >
      <Select
        selectedOption={selectedOption}
        onChange={({ detail }) => handleSelectionChange(detail)}
        options={CONVERSATION_LANGUAGE_OPTIONS}
        disabled={disabled}
        // nosemgrep: i18next-key-format
        placeholder={t('conversationLanguageSelector.placeholder', 'Select conversation language')}
        // nosemgrep: i18next-key-format
        ariaLabel={t('conversationLanguageSelector.ariaLabel', 'Select conversation language')}
      />
    </FormField>
  );
};
