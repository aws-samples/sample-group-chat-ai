// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Textarea, SpaceBetween, Box } from '@cloudscape-design/components';
import { VoiceEnabledTextAreaProps } from '../types/voice';
import { VoiceMicrophoneButton } from './VoiceMicrophoneButton';
import { useTranslation } from 'react-i18next';

export const VoiceEnabledTextArea: React.FC<VoiceEnabledTextAreaProps> = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 3,
  voiceConfig = {},
  showVoiceButton = true,
  ariaLabel,
}) => {
  const { t } = useTranslation('components');
  const currentValueRef = useRef(value);
  const [interimTranscript, setInterimTranscript] = useState('');

  // Keep ref in sync with prop
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      if (transcript.trim()) {
        // Use ref to get current value to avoid dependency on value prop
        const currentValue = currentValueRef.current;
        const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
        onChange(newValue);
        // Clear interim transcript after final transcript
        setInterimTranscript('');
      }
    },
    [onChange]
  );

  const handleInterimTranscript = useCallback((transcript: string, isInterim: boolean) => {
    if (isInterim) {
      setInterimTranscript(transcript);
    }
  }, []);

  const handleTextAreaChange = ({ detail }: { detail: { value: string } }) => {
    onChange(detail.value);
  };

  return (
    <SpaceBetween direction='vertical' size='xs'>
      <div style={{ position: 'relative' }}>
        <Textarea
          value={value + '' + interimTranscript}
          onChange={handleTextAreaChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          ariaLabel={ariaLabel}
        />
      </div>

      {showVoiceButton && (
        <Box>
          <SpaceBetween direction='vertical' size='xs'>
            <SpaceBetween direction='horizontal' size='xs'>
              <VoiceMicrophoneButton
                onTranscript={handleVoiceTranscript}
                onTranscriptChange={handleInterimTranscript}
                disabled={disabled}
                config={voiceConfig}
                // nosemgrep: i18next-key-format
                ariaLabel={ariaLabel ? t('voiceTextArea.voiceAriaLabel', { label: ariaLabel }) : t('voiceTextArea.defaultVoiceAriaLabel')}
              />
              <div
                style={{
                  fontSize: '12px',
                  color: '#5f6b7a',
                }}
              >
                {/* nosemgrep: i18next-key-format */}
                {t('voiceTextArea.clickToAddVoice')}
              </div>
            </SpaceBetween>
          </SpaceBetween>
        </Box>
      )}
    </SpaceBetween>
  );
};
