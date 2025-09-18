// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  VoiceInputConfig,
  VoiceInputState,
  VoiceInputActions,
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
} from '../types/voice';
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  checkMicrophonePermission,
  requestMicrophonePermission,
  getErrorMessage,
  mapSpeechRecognitionError,
  getDefaultLanguage,
  formatTranscript,
  debounce,
} from '../utils/speechRecognition';

const DEFAULT_CONFIG: VoiceInputConfig = {
  continuous: true,
  interimResults: true,
  lang: getDefaultLanguage(),
  maxAlternatives: 1,
  autoStop: true,
  autoStopTimeout: 8000, // 8 seconds of silence - allows for natural pauses
};

export const useVoiceInput = (config: Partial<VoiceInputConfig> = {}) => {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isSupported: isSpeechRecognitionSupported(),
    isProcessing: false,
    hasPermission: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (!state.isSupported || isInitializedRef.current) {
      return;
    }

    const recognition = createSpeechRecognition();
    if (!recognition) {
      setState(prev => ({ ...prev, error: 'Speech recognition not supported' }));
      return;
    }

    // Configure recognition
    recognition.continuous = finalConfig.continuous ?? true;
    recognition.interimResults = finalConfig.interimResults ?? true;
    recognition.lang = finalConfig.lang || 'en-US';
    recognition.maxAlternatives = finalConfig.maxAlternatives || 1;

    // Event handlers
    recognition.onstart = () => {
      setState(prev => ({
        ...prev,
        isRecording: true,
        isProcessing: false,
        error: null,
      }));
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      // Process all results to build complete transcripts
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        transcript: finalTranscript, // Use complete final transcript, not appending
        interimTranscript,
        isProcessing: false,
      }));

      // Reset auto-stop timer if we got results
      if (finalConfig.autoStop && autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, finalConfig.autoStopTimeout);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorType = mapSpeechRecognitionError(event.error);
      const errorMessage = getErrorMessage(event.error);

      setState(prev => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
        isProcessing: false,
      }));

      // Update permission state if it's a permission error
      if (errorType === 'permission-denied') {
        setState(prev => ({ ...prev, hasPermission: false }));
      }
    };

    recognition.onend = () => {
      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        interimTranscript: '',
      }));

      // Clear auto-stop timeout
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = null;
      }
    };

    recognition.onspeechstart = () => {
      setState(prev => ({ ...prev, isProcessing: true }));
    };

    recognition.onspeechend = () => {
      setState(prev => ({ ...prev, isProcessing: false }));
    };

    recognitionRef.current = recognition;
    isInitializedRef.current = true;
  }, [state.isSupported, finalConfig]);

  // Check permission on mount
  useEffect(() => {
    if (state.isSupported) {
      checkMicrophonePermission().then(hasPermission => {
        setState(prev => ({ ...prev, hasPermission }));
      });
    }
  }, [state.isSupported]);

  // Initialize recognition when supported
  useEffect(() => {
    if (state.isSupported) {
      initializeRecognition();
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current && state.isRecording) {
        recognitionRef.current.stop();
      }
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
    };
  }, [state.isSupported, initializeRecognition, state.isRecording]);
   const stopRecording = useCallback(() => {
    if (!recognitionRef.current || !state.isRecording) {
      return;
    }

    try {
      recognitionRef.current.stop();

      // Clear auto-stop timeout
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = null;
      }
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Failed to stop voice recognition.',
        isRecording: false,
        isProcessing: false,
      }));
    }
  }, [state.isRecording]);


  const startRecording = useCallback(async () => {
    if (!state.isSupported || !recognitionRef.current || state.isRecording) {
      return;
    }

    try {
      // Check/request permission if needed
      if (state.hasPermission === false || state.hasPermission === null) {
        const hasPermission = await requestMicrophonePermission();
        setState(prev => ({ ...prev, hasPermission }));

        if (!hasPermission) {
          setState(prev => ({
            ...prev,
            error: 'Microphone permission is required for voice input.',
          }));
          return;
        }
      }

      // Clear previous transcript and error
      setState(prev => ({
        ...prev,
        transcript: '',
        interimTranscript: '',
        error: null,
        isProcessing: true,
      }));

      // Start recognition
      recognitionRef.current.start();

      // Set auto-stop timer if enabled
      if (finalConfig.autoStop) {
        autoStopTimeoutRef.current = setTimeout(() => {
          stopRecording();
        }, finalConfig.autoStopTimeout);
      }
    } catch {
      setState(prev => ({
        ...prev,
        error: 'Failed to start voice recognition. Please try again.',
        isProcessing: false,
      }));
    }
  }, [state.isSupported, state.isRecording, state.hasPermission, finalConfig.autoStop, finalConfig.autoStopTimeout, stopRecording]);

 
  const clearTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
    }));
  }, []);

  const resetError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Get the full transcript (final + interim)
  const fullTranscript = state.transcript + state.interimTranscript;

  // Get formatted transcript
  const formattedTranscript = formatTranscript(state.transcript);

  const actions: VoiceInputActions = {
    startRecording,
    stopRecording,
    clearTranscript,
    resetError,
  };

  return {
    ...state,
    ...actions,
    fullTranscript,
    formattedTranscript,
    isActive: state.isRecording || state.isProcessing,
  };
};

// Debounced version of the hook for components that need less frequent updates
export const useDebouncedVoiceInput = (
  config: Partial<VoiceInputConfig> = {},
  debounceMs: number = 300
) => {
  const voiceInput = useVoiceInput(config);
  const [debouncedTranscript, setDebouncedTranscript] = useState('');

  const debouncedUpdate = useCallback(
    (transcript: string) => {
      const debouncedFn = debounce(() => {
        setDebouncedTranscript(transcript);
      }, debounceMs);
      debouncedFn();
    },
    [debounceMs]
  );

  useEffect(() => {
    debouncedUpdate(voiceInput.fullTranscript);
  }, [voiceInput.fullTranscript, debouncedUpdate]);

  return {
    ...voiceInput,
    debouncedTranscript,
  };
};
