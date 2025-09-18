// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { Select, SelectProps } from '@cloudscape-design/components';
import { useI18n } from '@/contexts/I18nContext';
import { useTranslation } from 'react-i18next';

 
interface LanguageSelectorProps {
  // variant prop is not supported by Cloudscape Select component
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = () => {
  const { currentLanguage, changeLanguage, supportedLanguages } = useI18n();
  const { t } = useTranslation('components');

  const options = supportedLanguages.map(lang => ({
    label: `${lang.nativeName} (${lang.name})`,
    value: lang.code,
  }));

  const selectedOption = options.find(option => option.value === currentLanguage) || options[0];

  const handleSelectionChange: SelectProps['onChange'] = ({ detail }) => {
    if (detail.selectedOption?.value) {
      changeLanguage(detail.selectedOption.value);
    }
  };

  return (
    <Select
      selectedOption={selectedOption}
      onChange={handleSelectionChange}
      options={options}
      placeholder={
        // nosemgrep: i18next-key-format
        t('languageSelector.placeholder')
      }
    />
  );
};
