// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from 'react';
import { Button, Box, Spinner, Alert } from '@cloudscape-design/components';
import { VoiceMicrophoneButtonProps } from '../types/voice';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { getSpeechRecognitionUnsupportedReason } from '../utils/speechRecognition';
import { useTranslation } from 'react-i18next';

export const VoiceMicrophoneButton: React.FC<VoiceMicrophoneButtonProps> = ({
  onTranscript,
  onTranscriptChange,
  disabled = false,
  size: _size = 'normal',
  config = {},
  ariaLabel = 'Voice input',
}) => {
  const { t } = useTranslation('components');
  const [showError, setShowError] = useState(false);
  const voiceInput = useVoiceInput(config);

  // Handle final transcript when recording stops
  useEffect(() => {
    if (voiceInput.formattedTranscript && !voiceInput.isRecording && !voiceInput.isProcessing) {
      onTranscript(voiceInput.formattedTranscript);
      voiceInput.clearTranscript(); // Clear after sending to prevent re-sending
    }
  }, [
    voiceInput.formattedTranscript,
    voiceInput.isRecording,
    voiceInput.isProcessing,
    onTranscript,
    voiceInput,
  ]);

  // Handle interim transcript updates for live preview
  useEffect(() => {
    if (onTranscriptChange && voiceInput.isRecording) {
      onTranscriptChange(voiceInput.fullTranscript, !!voiceInput.interimTranscript);
    }
  }, [
    voiceInput.fullTranscript,
    voiceInput.interimTranscript,
    voiceInput.isRecording,
    onTranscriptChange,
  ]);

  // Handle errors
  useEffect(() => {
    if (voiceInput.error) {
      setShowError(true);
    }
  }, [voiceInput.error]);

  const handleClick = () => {
    if (voiceInput.isRecording) {
      voiceInput.stopRecording();
    } else {
      voiceInput.startRecording();
      setShowError(false);
    }
  };

  const handleErrorDismiss = () => {
    setShowError(false);
    voiceInput.resetError();
  };

  // Show HTTPS warning if not supported
  if (!voiceInput.isSupported) {
    const reason = getSpeechRecognitionUnsupportedReason();
    return (
      <Box>
        <Button
          variant='normal'
          iconName='microphone'
          disabled
          // nosemgrep: i18next-key-format
          ariaLabel={t('voiceMicrophone.notAvailableLabel')}
        >
          {/* nosemgrep: i18next-key-format */}
          {t('voiceMicrophone.voiceUnavailable')}
        </Button>
        <Box margin={{ top: 'xs' }}>
          {/* nosemgrep: i18next-key-format */}
          <Alert type='warning' header={t('voiceMicrophone.notAvailableTitle')}>
            {reason}
          </Alert>
        </Box>
      </Box>
    );
  }

  const getButtonVariant = () => {
    if (voiceInput.isRecording) {
      return 'primary';
    }
    return 'normal';
  };

  
  const getButtonText = () => {
    if (voiceInput.isProcessing || voiceInput.isRecording) {
      // nosemgrep: i18next-key-format
      return t('voiceMicrophone.listening');
    }
    return '';
  };

  // Only disable if explicitly disabled via props or if there's an active permission denial error
  // Don't disable just because hasPermission is false initially - let user try to click
  const isButtonDisabled =
    disabled || (voiceInput.error ? voiceInput.error.includes('permission') : false);

  return (
    <Box>
      {showError && voiceInput.error && (
        <Box margin={{ bottom: 'xs' }}>
          {/* nosemgrep: i18next-key-format */}
          <Alert type='error' dismissible onDismiss={handleErrorDismiss} header={t('voiceMicrophone.errorTitle')}>
            {voiceInput.error}
          </Alert>
        </Box>
      )}

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Button
          variant={getButtonVariant()}
          iconName='microphone'
          onClick={handleClick}
          disabled={isButtonDisabled}
          ariaLabel={ariaLabel}
        >
          {getButtonText()}
        </Button>

        {voiceInput.isProcessing && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '8px',
              transform: 'translateY(-50%)',
              zIndex: 1,
            }}
          >
            <Spinner size='normal' />
          </div>
        )}

        {/* Recording indicator animation */}
        {voiceInput.isRecording && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '8px',
              transform: 'translateY(-50%)',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#d91515',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0% {
              opacity: 1;
              transform: translateY(-50%) scale(1);
            }
            50% {
              opacity: 0.5;
              transform: translateY(-50%) scale(1.2);
            }
            100% {
              opacity: 1;
              transform: translateY(-50%) scale(1);
            }
          }
        `}
      </style>
    </Box>
  );
};
