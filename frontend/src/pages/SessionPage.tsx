// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  Box,
  SpaceBetween,
  Button,
  Alert,
  Spinner,
  Badge,
  TextContent,
  ColumnLayout,
  Modal,
  Select,
  Input,
  ButtonDropdown,
  Grid,
} from '@cloudscape-design/components';
import { useApi } from '../hooks/useApi';
import { webSocketService } from '../services/webSocketService';
import {
  Session,
  ConversationMessage,
  MessageSender,
  PersonaInfo,
  ImageAttachment,
  SessionSummaryResponse,
  generateMessageId,
  VoiceSettings,
} from '@group-chat-ai/shared';
import { BusinessContextDisplay } from '../components/BusinessContextDisplay';
import { AvatarWithInfo } from '../components/Avatar';
import { getPersonaAvatar, getPersonaDisplayName, getPersonaRole } from '../utils/avatarUtils';
import { ImageUpload } from '../components/ImageUpload';
import { ImageMessage } from '../components/ImageMessage';
import { SessionScopedStorage } from '../utils/sessionScopedStorage';
import { VoiceEnabledTextArea } from '../components/VoiceEnabledTextArea';
import { VoiceSettings as VoiceSettingsComponent } from '../components/VoiceSettings';
import { audioService } from '../services/AudioService';
import { SpeakingIndicator } from '../components/SpeakingIndicator';
import { FileUploadManager } from '../components/FileUploadManager';
import { PersonaTileData } from '../components/PersonaTile';
import { useTranslation } from 'react-i18next';

interface SessionPageState {
  session: Session | null;
  messages: ConversationMessage[];
  loading: boolean;
  error: string | null;
  sendingMessage: boolean;
  currentMessage: string;
  showSummaryModal: boolean;
  sessionSummaryResponse: SessionSummaryResponse | null;
  selectedPersonaForDirectQuestion: string | null;
  showPersonaSelector: boolean;
  typingPersonas: Set<string>;
  messageFilter: 'all' | 'user' | 'persona';
  searchQuery: string;
  personaInfoMap: Record<string, PersonaInfo>;
  showImageUpload: boolean;
  currentImageAttachment: ImageAttachment | null;
  voiceSettingsExpanded: boolean;
  voiceSettings: VoiceSettings | null;
  pendingPersonaResponses: ConversationMessage[];
  currentlySpeakingPersona: string | null;
  fileUploadExpanded: boolean;
}

// Helper function to build persona info map from session data
const buildPersonaInfoMap = (session: Session): Record<string, PersonaInfo> => {
  const personaInfoMap: Record<string, PersonaInfo> = {};

  for (const personaId of session.activePersonas) {
    // Check if there's custom persona data
    if (session.customPersonas && session.customPersonas[personaId]) {
      const customPersona = session.customPersonas[personaId];
      personaInfoMap[personaId] = {
        personaId: customPersona.personaId,
        name: customPersona.name,
        role: customPersona.role,
        description:
          customPersona.details.split('\n')[0] || customPersona.details.substring(0, 100) + '...',
      };
    } else {
      // Use default persona info
      personaInfoMap[personaId] = {
        personaId,
        name: getPersonaDisplayName(personaId),
        role: getPersonaRole(personaId),
        description: `${getPersonaRole(personaId)} - ${getPersonaDisplayName(personaId)}`,
      };
    }
  }

  return personaInfoMap;
};

// Helper function to get persona name with custom support
const getPersonaNameWithCustom = (
  personaId: string,
  personaInfoMap: Record<string, PersonaInfo>
): string => {
  return personaInfoMap[personaId]?.name || getPersonaDisplayName(personaId);
};

// Helper function to get persona role with custom support
const getPersonaRoleWithCustom = (
  personaId: string,
  personaInfoMap: Record<string, PersonaInfo>
): string => {
  return personaInfoMap[personaId]?.role || getPersonaRole(personaId);
};

// Helper function to get persona avatar with custom support
const getPersonaAvatarWithCustom = (personaId: string, session: Session | null): string => {
  // Check if there's a custom persona with a custom avatar
  if (session?.customPersonas && session.customPersonas[personaId]) {
    const customPersona = session.customPersonas[personaId];
    if (customPersona.avatarId) {
      return customPersona.avatarId;
    }
  }
  // Fall back to default avatar for this persona
  return getPersonaAvatar(personaId);
};

export const SessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { apiService } = useApi();
  const { t } = useTranslation('pages');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<SessionPageState>({
    session: null,
    messages: [],
    loading: true,
    error: null,
    sendingMessage: false,
    currentMessage: '',
    showSummaryModal: false,
    sessionSummaryResponse: null,
    selectedPersonaForDirectQuestion: null,
    showPersonaSelector: false,
    typingPersonas: new Set(),
    messageFilter: 'all',
    searchQuery: '',
    personaInfoMap: {},
    showImageUpload: false,
    currentImageAttachment: null,
    voiceSettingsExpanded: false,
    voiceSettings: null,
    pendingPersonaResponses: [],
    currentlySpeakingPersona: null,
    fileUploadExpanded: false,
  });


  const loadSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Try to load from sessionStorage first
      const cachedSession = sessionStorage.getItem(`session-${sessionId}`);
      if (cachedSession) {
        const session = JSON.parse(cachedSession) as Session;
        const personaInfoMap = buildPersonaInfoMap(session);
        setState(prev => ({
          ...prev,
          session,
          messages: session.conversationHistory,
          personaInfoMap,
          loading: false,
        }));
        return;
      }

      // Load from API if not cached
      if (!apiService) {
        // nosemgrep: i18next-key-format
        throw new Error(t('session.errors.apiUnavailable'));
      }
      const session = await apiService.getSession(sessionId!);
      const personaInfoMap = buildPersonaInfoMap(session);
      setState(prev => ({
        ...prev,
        session,
        messages: session.conversationHistory,
        personaInfoMap,
        loading: false,
      }));
    } catch {
      // console.error('Failed to load session:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load session. Please try again.',
        loading: false,
      }));
    }
  }, [sessionId, apiService, t]);


  // Load voice settings for the session
  const loadVoiceSettings = useCallback(async () => {
    if (!sessionId || !apiService) { return; }

    try {
      const voiceSettings = await apiService.getVoiceSettings(sessionId);

      setState(prev => ({ ...prev, voiceSettings }));

      // Configure AudioService with the loaded settings
      if (voiceSettings.enabled) {
        audioService.setVoiceSettings(voiceSettings);
      }
    } catch {
      // Failed to load voice settings (may not exist yet)
      // This is okay - voice settings might not exist yet for new sessions
    }
  }, [sessionId, apiService]);

  // Load session data on component mount
  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    loadSession();
    loadVoiceSettings();
  }, [sessionId, navigate, loadVoiceSettings, loadSession]);



  // WebSocket connection setup
  useEffect(() => {
    if (!sessionId || !state.session) {
      return;
    }

    // Add a small delay to ensure session is fully loaded and committed
    const timer = setTimeout(async () => {
      // Load voice settings in parallel (don't block WebSocket connection)
      loadVoiceSettings().catch(() => {
        // Voice settings loading failed, continuing without voice
      });

      try {
        await webSocketService.connect(sessionId, {
          onConnectionEstablished: () => {
            // WebSocket connection established
          },

          onPersonaTyping: data => {
            setState(prev => ({
              ...prev,
              typingPersonas: new Set(
                data.isTyping
                  ? [...prev.typingPersonas, data.personaId]
                  : [...prev.typingPersonas].filter(id => id !== data.personaId)
              ),
            }));
          },

          onPersonaResponse: data => {
            const personaMessage: ConversationMessage = {
              messageId: data.messageId,
              sessionId: sessionId,
              sender: MessageSender.PERSONA,
              content: data.content,
              timestamp: data.timestamp,
              personaId: data.personaId,
            };

            setState(prev => {
              // Check if voice synthesis is enabled - prioritize local settings over defaults
              const localVoiceEnabled = prev.voiceSettings?.enabled;
              const audioServiceSettings = audioService.getVoiceSettings();
              // Use local settings if available, otherwise fall back to audio service settings
              const isVoiceEnabled = localVoiceEnabled !== undefined ? localVoiceEnabled : audioServiceSettings?.enabled;

              // Voice settings check for synchronization

              if (isVoiceEnabled) {
                // Voice enabled: Queue the response for synchronized display when audio starts

                return {
                  ...prev,
                  pendingPersonaResponses: [...prev.pendingPersonaResponses, personaMessage],
                  typingPersonas: new Set(
                    [...prev.typingPersonas].filter(id => id !== data.personaId)
                  ),
                };
              } else {
                // Voice disabled: Display immediately (current behavior)

                const newMessages = [...prev.messages, personaMessage];

                // Update session in sessionStorage with the new messages array
                if (prev.session) {
                  try {
                    const updatedSession = {
                      ...prev.session,
                      conversationHistory: newMessages,
                      lastActivity: Date.now(),
                    };
                    sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(updatedSession));
                  } catch (storageError) {
                    console.error('Failed to update sessionStorage for persona response:', storageError);
                    // Continue even if storage fails - the message was received successfully
                  }
                }

                return {
                  ...prev,
                  messages: newMessages,
                  typingPersonas: new Set(
                    [...prev.typingPersonas].filter(id => id !== data.personaId)
                  ),
                };
              }
            });
          },

          onAllPersonasFinished: () => {
            // All personas finished responding
            setState(prev => ({
              ...prev,
              sendingMessage: false,
              typingPersonas: new Set(),
            }));
          },

          onError: data => {
            // console.error('WebSocket error:', data);
            setState(prev => ({
              ...prev,
              error: `WebSocket error: ${data.message}`,
              sendingMessage: false,
              typingPersonas: new Set(),
            }));
          },

          onConnectionClosed: () => {
            // WebSocket connection closed
          },

          onConnectionError: () => {
            // console.error('WebSocket connection error:', error);
            setState(prev => ({
              ...prev,
              error: 'Connection error. Please refresh the page.',
              sendingMessage: false,
            }));
          },
        });

        // WebSocket connected successfully
      } catch {
        // console.error('Failed to connect WebSocket:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to establish real-time connection. Please refresh the page.',
        }));
      }
    }, 1000); // 1000ms delay

    // Cleanup function
    return () => {
      clearTimeout(timer);
      webSocketService.disconnect();
    };
  }, [loadVoiceSettings, sessionId, state.session]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [state.messages]);

  // Store session in sessionStorage for persistence across refreshes
  useEffect(() => {
    if (state.session) {
      sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(state.session));
    }
  }, [state.session, sessionId]);

  // Set up AudioService callbacks for speaking state management
  useEffect(() => {
    audioService.setAudioCallbacks({
      onAudioStarted: (_messageId: string, personaId: string) => {
        // Audio started for persona

        setState(prev => {
          // Find and display the pending response for this persona
          const pendingResponse = prev.pendingPersonaResponses.find(
            msg => msg.personaId === personaId
          );

          if (pendingResponse) {
            // Move from pending to displayed messages
            const newMessages = [...prev.messages, pendingResponse];
            const remainingPending = prev.pendingPersonaResponses.filter(
              msg => msg.personaId !== personaId
            );

            // Update session in sessionStorage
            if (prev.session && sessionId) {
              try {
                const updatedSession = {
                  ...prev.session,
                  conversationHistory: newMessages,
                  lastActivity: Date.now(),
                };
                sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(updatedSession));
              } catch (storageError) {
                console.error('Failed to update sessionStorage for audio sync:', storageError);
                // Continue even if storage fails - the message is being displayed
              }
            }

            return {
              ...prev,
              messages: newMessages,
              pendingPersonaResponses: remainingPending,
              currentlySpeakingPersona: personaId,
            };
          }

          // Just update speaking state if no pending response found
          return {
            ...prev,
            currentlySpeakingPersona: personaId,
          };
        });
      },

      onAudioFinished: (_messageId: string, personaId: string) => {
        // Audio finished for persona

        setState(prev => ({
          ...prev,
          currentlySpeakingPersona:
            prev.currentlySpeakingPersona === personaId ? null : prev.currentlySpeakingPersona,
        }));
      },
    });
  }, [sessionId]);

  const sendMessage = async (directPersonaId?: string) => {
    if (!state.currentMessage.trim() || !sessionId || state.sendingMessage) {
      return;
    }

    // Check WebSocket connection
    if (!webSocketService.isConnected()) {
      setState(prev => ({
        ...prev,
        error: 'Connection lost. Please refresh the page to reconnect.',
      }));
      return;
    }

    // Store the message content and attachment for sending (declare at function level)
    const messageContent = state.currentMessage.trim();
    const imageAttachment = state.currentImageAttachment;

    try {
      setState(prev => ({ ...prev, sendingMessage: true, error: null }));

      // Send message via WebSocket FIRST before updating UI
      const success = webSocketService.sendMessage(
        messageContent,
        directPersonaId,
        imageAttachment || undefined
      );

      if (!success) {
        // nosemgrep: i18next-key-format
        throw new Error(t('session.errors.webSocketFailed'));
      }

      // Only update state and sessionStorage AFTER successful WebSocket send
      const userMessage: ConversationMessage = {
        messageId: generateMessageId(),
        sessionId: sessionId,
        sender: MessageSender.USER,
        content: messageContent,
        timestamp: Date.now(),
        imageAttachment: imageAttachment || undefined,
      };

      // Update state and sessionStorage together to ensure synchronization
      setState(prev => {
        const newMessages = [...prev.messages, userMessage];

        // Update session in sessionStorage with the new messages array
        if (prev.session) {
          try {
            const updatedSession = {
              ...prev.session,
              conversationHistory: newMessages,
              lastActivity: Date.now(),
            };
            sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(updatedSession));
          } catch (storageError) {
            console.error('Failed to update sessionStorage:', storageError);
            // Continue even if storage fails - the message was sent successfully
          }
        }

        return {
          ...prev,
          messages: newMessages,
          currentMessage: '',
          selectedPersonaForDirectQuestion: null,
          currentImageAttachment: null,
        };
      });

      // Note: sendingMessage will be set to false when we receive the "all_personas_finished" message
    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to send message. Please try again.',
        sendingMessage: false,
        // No need to remove message from array since we never added it
        currentMessage: messageContent, // Restore the message content from captured value
        selectedPersonaForDirectQuestion: directPersonaId || null,
        currentImageAttachment: imageAttachment || null,
      }));
    }
  };

  const getFilteredMessages = () => {
    let filtered = state.messages;

    // Apply message filter
    if (state.messageFilter === 'user') {
      filtered = filtered.filter(msg => msg.sender === MessageSender.USER);
    } else if (state.messageFilter === 'persona') {
      filtered = filtered.filter(msg => msg.sender === MessageSender.PERSONA);
    }

    // Apply search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        msg =>
          msg.content.toLowerCase().includes(query) ||
          (msg.personaId && msg.personaId.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  const getPersonaOptions = () => {
    if (!state.session) { return []; }

    return state.session.activePersonas.map(personaId => ({
      label: getPersonaNameWithCustom(personaId, state.personaInfoMap),
      value: personaId,
      description: `Ask a direct question to ${getPersonaNameWithCustom(personaId, state.personaInfoMap)} (${getPersonaRoleWithCustom(personaId, state.personaInfoMap)})`,
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateSummary = async () => {
    if (!sessionId || !apiService) { return; }

    try {
      setState(prev => ({ ...prev, loading: true }));
      const summaryResponse = await apiService.getSessionSummary(sessionId);
      setState(prev => ({
        ...prev,
        sessionSummaryResponse: summaryResponse,
        showSummaryModal: true,
        loading: false,
      }));
    } catch {
      // console.error('Failed to generate summary:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to generate session summary.',
        loading: false,
      }));
    }
  };

  const handleExportChat = () => {
    if (sessionId) {
      navigate(`/session/${sessionId}/export`);
    }
  };

  const endSession = () => {
    if (sessionId) {
      sessionStorage.removeItem(`session-${sessionId}`);
      // Clear the session ID so persona customizations persist back to home page
      SessionScopedStorage.clearSessionId();
    }
    navigate('/');
  };

  const handleImageUploaded = (imageAttachment: ImageAttachment) => {
    setState(prev => ({
      ...prev,
      currentImageAttachment: imageAttachment,
      showImageUpload: false,
    }));
  };

  const handleImageUploadError = (error: string) => {
    setState(prev => ({
      ...prev,
      error: `Image upload failed: ${error}`,
      showImageUpload: false,
    }));
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Voice settings handlers
  const handleVoiceSettingsChange = (settings: VoiceSettings) => {
    setState(prev => ({ ...prev, voiceSettings: settings }));

    // Configure audio service with new settings
    if (settings.enabled) {
      audioService.setVoiceSettings(settings);
    }
  };

  const handleToggleVoiceSettings = () => {
    setState(prev => ({ ...prev, voiceSettingsExpanded: !prev.voiceSettingsExpanded }));
  };

  const handleToggleFileUpload = () => {
    setState(prev => ({ ...prev, fileUploadExpanded: !prev.fileUploadExpanded }));
  };

  // Memoize voice config to prevent recreation on every render
  const voiceConfig = useMemo(
    () => ({
      continuous: true,
      interimResults: true,
      autoStop: true,
      autoStopTimeout: 5000,
    }),
    []
  );

  if (state.loading && !state.session) {
    return (
      <Container>
        <Box textAlign='center' padding='xxl'>
          <Spinner size='large' />
          <Box variant='p' padding={{ top: 'm' }}>
            {
              // nosemgrep: i18next-key-format
              t('session.loading.sessionLoading')
            }
          </Box>
        </Box>
      </Container>
    );
  }

  if (state.error && !state.session) {
    return (
      <Container>
        <Alert
          type='error'
          header={
            // nosemgrep: i18next-key-format
            t('session.errors.sessionError')
          }
          action={<Button onClick={() => navigate('/')}>{
            // nosemgrep: i18next-key-format
            t('session.actions.returnHome')
          }</Button>}
        >
          {state.error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <SpaceBetween direction='vertical' size='l'>
        {/* Session Header */}
        <Header
          variant='h1'
          description={t('session.header.description', { count: state.session?.activePersonas.length || 0 })}
          actions={
            <SpaceBetween direction='horizontal' size='xs'>
              <Button variant='normal' onClick={handleToggleFileUpload} iconName='upload'>
                Manage Files
              </Button>
              <Button variant='normal' onClick={handleToggleVoiceSettings}>
                {/* nosemgrep: i18next-key-missing-namespace */}
                {t('session.actions.voiceSettings')}
              </Button>
              <Button
                variant='normal'
                onClick={handleExportChat}
                disabled={state.messages.length === 0}
                iconName='download'
              >
                {/* nosemgrep: i18next-key-missing-namespace */}
                {t('session.actions.exportChat')}
              </Button>
              <Button
                variant='normal'
                onClick={generateSummary}
                disabled={state.messages.length === 0}
              >
                {/* nosemgrep: i18next-key-missing-namespace */}
                {t('session.actions.generateSummary')}
              </Button>
              <Button variant='primary' onClick={endSession}>
                {/* nosemgrep: i18next-key-missing-namespace */}
                {t('session.actions.endSession')}
              </Button>
            </SpaceBetween>
          }
        >
          {/* nosemgrep: i18next-key-missing-namespace */}
          {t('session.header.title')}
        </Header>

        {/* Voice Settings Expander - At Top */}
        {sessionId && state.session && (
          <VoiceSettingsComponent
            sessionId={sessionId}
            currentSettings={state.voiceSettings}
            activePersonas={state.session.activePersonas}
            customPersonas={state.session.customPersonas}
            onSettingsChange={handleVoiceSettingsChange}
            isExpanded={state.voiceSettingsExpanded}
            onToggleExpanded={handleToggleVoiceSettings}
          />
        )}

        {/* File Upload Manager */}
        {sessionId && state.session && state.fileUploadExpanded && (
          <FileUploadManager
            sessionId={sessionId}
            availablePersonas={state.session.activePersonas.map(personaId => ({
              personaId,
              name: getPersonaNameWithCustom(personaId, state.personaInfoMap),
              role: getPersonaRoleWithCustom(personaId, state.personaInfoMap),
              avatarId: getPersonaAvatarWithCustom(personaId, state.session),
            }))}
            onFilesUpdated={() => {
              // Optionally reload session or show notification
              console.log('Files updated for session', sessionId);
            }}
          />
        )}

        {/* Active Personas Display */}
        {state.session && (
          <Box>
            <TextContent>
              {/* nosemgrep: i18next-key-missing-namespace */}
              <h3>{t('session.sessionContent.activePersonas')}</h3>
            </TextContent>
            <ColumnLayout columns={3} variant='text-grid'>
              {state.session.activePersonas.map(personaId => (
                <Box key={personaId}>
                  <SpaceBetween direction='horizontal' size='s'>
                    <SpeakingIndicator isActive={state.currentlySpeakingPersona === personaId}>
                      <AvatarWithInfo
                        avatarId={getPersonaAvatarWithCustom(personaId, state.session)}
                        personaId={personaId}
                        size='small'
                        name={getPersonaNameWithCustom(personaId, state.personaInfoMap)}
                        role={getPersonaRoleWithCustom(personaId, state.personaInfoMap)}
                      />
                    </SpeakingIndicator>
                    <div>
                      <Box variant='h4'>
                        {getPersonaNameWithCustom(personaId, state.personaInfoMap)}
                      </Box>
                      <Badge color='blue'>
                        {getPersonaRoleWithCustom(personaId, state.personaInfoMap)}
                      </Badge>
                    </div>
                  </SpaceBetween>
                </Box>
              ))}
            </ColumnLayout>
          </Box>
        )}

        {/* Business Context Display */}
        {state.session?.businessContext && (
          <BusinessContextDisplay businessContext={state.session.businessContext} />
        )}

        {/* Error Alert */}
        {state.error && (
          <Alert
            type='error'
            dismissible
            onDismiss={() => setState(prev => ({ ...prev, error: null }))}
          >
            {state.error}
          </Alert>
        )}

        {/* Chat Controls */}
        <Box>
          <SpaceBetween direction='horizontal' size='s'>
            <div style={{ width: '200px' }}>
              <Select
                selectedOption={{
                  label:
                    state.messageFilter === 'all'
                      // nosemgrep: i18next-key-format
                      ? t('session.messages.allMessages')
                      : state.messageFilter === 'user'
                        // nosemgrep: i18next-key-format
                        ? t('session.messages.yourMessages')
                        // nosemgrep: i18next-key-format
                        : t('session.messages.personaMessages'),
                  value: state.messageFilter,
                }}
                onChange={({ detail }) =>
                  setState(prev => ({
                    ...prev,
                    messageFilter: detail.selectedOption.value as 'all' | 'user' | 'persona',
                  }))
                }
                options={[
                  // nosemgrep: i18next-key-format
                  { label: t('session.messages.allMessages'), value: 'all' },
                  // nosemgrep: i18next-key-format
                  { label: t('session.messages.yourMessages'), value: 'user' },
                  // nosemgrep: i18next-key-format
                  { label: t('session.messages.personaMessages'), value: 'persona' },
                ]}
                // nosemgrep: i18next-key-format
                placeholder={t('session.messages.filterPlaceholder')}
              />
            </div>
            <div style={{ width: '300px' }}>
              <Input
                value={state.searchQuery}
                onChange={({ detail }) =>
                  setState(prev => ({ ...prev, searchQuery: detail.value }))
                }
                // nosemgrep: i18next-key-format
                placeholder={t('session.messages.searchPlaceholder')}
                type='search'
              />
            </div>
            <div style={{ flexGrow: 1 }} />
            <Box variant='small' color='text-body-secondary'>
              {/* nosemgrep: i18next-key-missing-namespace */}
              {t('session.messages.messageCount', {
                filtered: getFilteredMessages().length,
                total: state.messages.length
              })}
            </Box>
          </SpaceBetween>
        </Box>

        {/* Chat Messages */}
        <Box>
          <div
            style={{
              height: '500px',
              overflowY: 'auto',
              border: '1px solid #e9ebed',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: '#fafbfc',
            }}
          >
            <SpaceBetween direction='vertical' size='m'>
              {state.messages.length === 0 ? (
                <Box textAlign='center' padding='xl'>
                  <TextContent>
                    {/* nosemgrep: i18next-key-missing-namespace */}
                    <p>{t('session.messages.startPractice')}</p>
                    <p>
                      {/* nosemgrep: i18next-key-missing-namespace */}
                      {t('session.messages.aiPersonasInfo')}
                    </p>
                  </TextContent>
                </Box>
              ) : (
                getFilteredMessages().map((message, index) => (
                  <div
                    key={`${message.messageId}-${index}`}
                    style={{
                      backgroundColor:
                        message.sender === MessageSender.USER ? '#e8f4fd' : '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #d5dbdb',
                      padding: '12px',
                      marginLeft: message.sender === MessageSender.USER ? '20%' : '0',
                      marginRight: message.sender === MessageSender.PERSONA ? '20%' : '0',
                    }}
                  >
                    <SpaceBetween direction='vertical' size='xs'>
                      <Box>
                        <SpaceBetween direction='horizontal' size='xs'>
                          {message.sender === MessageSender.PERSONA && message.personaId && (
                            <SpeakingIndicator
                              isActive={state.currentlySpeakingPersona === message.personaId}
                            >
                              <AvatarWithInfo
                                avatarId={getPersonaAvatarWithCustom(
                                  message.personaId,
                                  state.session
                                )}
                                personaId={message.personaId}
                                size='small'
                                name={getPersonaNameWithCustom(
                                  message.personaId,
                                  state.personaInfoMap
                                )}
                                role={getPersonaRoleWithCustom(
                                  message.personaId,
                                  state.personaInfoMap
                                )}
                              />
                            </SpeakingIndicator>
                          )}
                          <Box variant='span' fontWeight='bold'>
                            {message.sender === MessageSender.USER
                              // nosemgrep: i18next-key-format
                              ? t('session.messages.you')
                              : message.personaId
                                ? getPersonaNameWithCustom(message.personaId, state.personaInfoMap)
                                // nosemgrep: i18next-key-format
                                : t('session.messages.ai')}
                          </Box>
                          {message.sender === MessageSender.PERSONA && message.personaId && (
                            <Badge color='blue'>
                              {getPersonaRoleWithCustom(message.personaId, state.personaInfoMap)}
                            </Badge>
                          )}
                          {message.sender === MessageSender.USER && (
                            <Badge color='green'>
                              {/* nosemgrep: i18next-key-missing-namespace */}
                              {t('session.messages.user')}
                            </Badge>
                          )}
                          <Box variant='small' color='text-body-secondary'>
                            {formatTimestamp(message.timestamp)}
                          </Box>
                        </SpaceBetween>
                      </Box>
                      <Box>
                        <SpaceBetween direction='vertical' size='xs'>
                          <TextContent>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
                          </TextContent>
                          {message.imageAttachment && (
                            <ImageMessage
                              imageAttachment={message.imageAttachment}
                              maxWidth={300}
                              maxHeight={200}
                            />
                          )}
                        </SpaceBetween>
                      </Box>
                    </SpaceBetween>
                  </div>
                ))
              )}

              {/* Typing indicators for individual personas */}
              {Array.from(state.typingPersonas).map(personaId => (
                <div
                  key={`typing-${personaId}`}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #d5dbdb',
                    padding: '12px',
                    marginRight: '20%',
                  }}
                >
                  <SpaceBetween direction='horizontal' size='xs'>
                    <AvatarWithInfo
                      avatarId={getPersonaAvatarWithCustom(personaId, state.session)}
                      personaId={personaId}
                      size='small'
                      name={getPersonaNameWithCustom(personaId, state.personaInfoMap)}
                      role={getPersonaRoleWithCustom(personaId, state.personaInfoMap)}
                    />
                    <Spinner size='normal' />
                    <TextContent>
                      <p style={{ margin: 0 }}>
                        <strong>{getPersonaNameWithCustom(personaId, state.personaInfoMap)}</strong>{' '}
                        {/* nosemgrep: i18next-key-missing-namespace */}
                        {t('session.messages.isResponding')}
                      </p>
                    </TextContent>
                  </SpaceBetween>
                </div>
              ))}

              {/* General loading indicator when sending message but no specific typing indicators yet */}
              {state.sendingMessage && state.typingPersonas.size === 0 && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #d5dbdb',
                    padding: '12px',
                    marginRight: '20%',
                  }}
                >
                  <SpaceBetween direction='horizontal' size='xs'>
                    <Spinner size='normal' />
                    <TextContent>
                      {/* nosemgrep: i18next-key-missing-namespace */}
                      <p style={{ margin: 0 }}>{t('session.messages.processingMessage')}</p>
                    </TextContent>
                  </SpaceBetween>
                </div>
              )}

              <div ref={messagesEndRef} />
            </SpaceBetween>
          </div>
        </Box>

        {/* Message Input */}
        <Box>
          <SpaceBetween direction='vertical' size='s'>
            {/* Direct Question Selector */}
            {state.selectedPersonaForDirectQuestion && (
              <Box>
                <Alert
                  type='info'
                  dismissible
                  onDismiss={() =>
                    setState(prev => ({ ...prev, selectedPersonaForDirectQuestion: null }))
                  }
                >
                  {/* nosemgrep: i18next-key-missing-namespace */}
                  {t('session.input.directQuestionToPersona', {
                    personaName: getPersonaNameWithCustom(
                      state.selectedPersonaForDirectQuestion,
                      state.personaInfoMap
                    )
                  })} {/* nosemgrep: i18next-key-missing-namespace */}
                  {t('session.input.directQuestionInfo')}
                </Alert>
              </Box>
            )}

            {/* Image Upload Section */}
            {state.showImageUpload && sessionId && (
              <Box>
                <ImageUpload
                  sessionId={sessionId}
                  onImageUploaded={handleImageUploaded}
                  onUploadError={handleImageUploadError}
                  disabled={state.sendingMessage}
                />
              </Box>
            )}

            {/* Current Image Attachment Display */}
            {state.currentImageAttachment && (
              <Box>
                <SpaceBetween direction='horizontal' size='s'>
                  <ImageMessage
                    imageAttachment={state.currentImageAttachment}
                    maxWidth={200}
                    maxHeight={150}
                  />
                  <Button
                    variant='link'
                    iconName='close'
                    onClick={() => setState(prev => ({ ...prev, currentImageAttachment: null }))}
                  >
                    {/* nosemgrep: i18next-key-missing-namespace */}
                    {t('session.actions.remove')}
                  </Button>
                </SpaceBetween>
              </Box>
            )}

            <Grid gridDefinition={[{ colspan: { default: 10 } }, { colspan: { default: 2 } }]}>
              <VoiceEnabledTextArea
                value={state.currentMessage}
                onChange={value => setState(prev => ({ ...prev, currentMessage: value }))}
                placeholder={
                  state.selectedPersonaForDirectQuestion
                    // nosemgrep: i18next-key-format
                    ? t('session.input.askDirectQuestion', { persona: getPersonaNameWithCustom(state.selectedPersonaForDirectQuestion, state.personaInfoMap) })
                    // nosemgrep: i18next-key-format
                    : t('session.input.placeholder')
                }
                spellcheck
                rows={3}
                disabled={state.sendingMessage}
                voiceConfig={voiceConfig}
                // nosemgrep: i18next-key-format
                ariaLabel={t('session.input.ariaLabel')}
              />
              <SpaceBetween direction='vertical' size='xs'>
                <Button
                  variant='normal'
                  iconName='upload'
                  onClick={() =>
                    setState(prev => ({ ...prev, showImageUpload: !prev.showImageUpload }))
                  }
                  disabled={state.sendingMessage}
                >
                  {/* nosemgrep: i18next-key-missing-namespace */}
                  {state.showImageUpload ? t('session.input.hideUpload') :
                    /* nosemgrep: i18next-key-missing-namespace */
                    t('session.input.addImage')}
                </Button>
                <ButtonDropdown
                  items={[
                    {
                      // nosemgrep: i18next-key-format
                      text: t('session.input.askAll'),
                      id: 'all',
                      disabled: state.selectedPersonaForDirectQuestion === null,
                    },
                    // nosemgrep: i18next-key-format
                    { text: t('session.input.askSpecific'), id: 'divider' },
                    ...getPersonaOptions().map(option => ({
                      // nosemgrep: i18next-key-format
                      text: t('session.input.askPersona', { name: option.label }),
                      id: option.value,
                      description: option.description,
                    })),
                  ]}
                  onItemClick={({ detail }) => {
                    if (detail.id === 'all') {
                      setState(prev => ({ ...prev, selectedPersonaForDirectQuestion: null }));
                    } else if (detail.id !== 'divider') {
                      setState(prev => ({ ...prev, selectedPersonaForDirectQuestion: detail.id }));
                    }
                  }}
                  disabled={state.sendingMessage}
                >
                  {state.selectedPersonaForDirectQuestion
                    // nosemgrep: i18next-key-format
                    ? t('session.input.askPersonaShort', { persona: getPersonaNameWithCustom(state.selectedPersonaForDirectQuestion, state.personaInfoMap) })
                    // nosemgrep: i18next-key-format
                    : t('session.input.askAllShort')}
                </ButtonDropdown>
                <Button
                  variant='primary'
                  onClick={() => sendMessage(state.selectedPersonaForDirectQuestion || undefined)}
                  disabled={!state.currentMessage.trim() || state.sendingMessage}
                >
                  {/* // nosemgrep: i18next-key-format */}
                  {state.sendingMessage ? t('session.input.sending') :
                    // nosemgrep: i18next-key-format
                    t('session.input.send')}
                </Button>
              </SpaceBetween>
            </Grid>
          </SpaceBetween>
        </Box>

        {/* Session Summary Modal */}
        <Modal
          visible={state.showSummaryModal}
          onDismiss={() => setState(prev => ({ ...prev, showSummaryModal: false }))}
          // nosemgrep: i18next-key-format
          header={t('session.sessionContent.sessionTitle')}
          size='large'
          footer={
            <Box float='right'>
              <Button
                variant='primary'
                onClick={() => setState(prev => ({ ...prev, showSummaryModal: false }))}
              >
                {/* nosemgrep: i18next-key-missing-namespace */}
                {t('session.summary.closeButton')}
              </Button>
            </Box>
          }
        >
          {state.sessionSummaryResponse ? (
            <SpaceBetween direction='vertical' size='l'>
              {/* Main Summary */}
              <Box>
                <TextContent>
                  {/* nosemgrep: i18next-key-missing-namespace */}
                  <h3>{t('session.summary.sections.summary')}</h3>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {state.sessionSummaryResponse.summary}
                  </div>
                </TextContent>
              </Box>

              {/* Key Insights */}
              {state.sessionSummaryResponse.keyInsights &&
                state.sessionSummaryResponse.keyInsights.length > 0 && (
                  <Box>
                    <TextContent>
                      {/* nosemgrep: i18next-key-missing-namespace */}
                      <h3>{t('session.summary.sections.keyInsights')}</h3>
                    </TextContent>
                    <SpaceBetween direction='vertical' size='s'>
                      {state.sessionSummaryResponse.keyInsights.map(
                        (insight: string, index: number) => (
                          <Box key={index} padding={{ left: 'm' }}>
                            <TextContent>
                              <p>• {insight}</p>
                            </TextContent>
                          </Box>
                        )
                      )}
                    </SpaceBetween>
                  </Box>
                )}

              {/* Recommendations */}
              {state.sessionSummaryResponse.recommendations &&
                state.sessionSummaryResponse.recommendations.length > 0 && (
                  <Box>
                    <TextContent>
                      {/* nosemgrep: i18next-key-missing-namespace */}
                      <h3>{t('session.summary.sections.recommendations')}</h3>
                    </TextContent>
                    <SpaceBetween direction='vertical' size='s'>
                      {state.sessionSummaryResponse.recommendations.map(
                        (recommendation: string, index: number) => (
                          <Box key={index} padding={{ left: 'm' }}>
                            <TextContent>
                              <p>• {recommendation}</p>
                            </TextContent>
                          </Box>
                        )
                      )}
                    </SpaceBetween>
                  </Box>
                )}

              {/* Generated At */}
              <Box>
                <TextContent>
                  <small>
                    {/* nosemgrep: i18next-key-missing-namespace */}
                    {t('session.summary.generatedOn', {
                      date: new Date(state.sessionSummaryResponse.generatedAt).toLocaleString()
                    })}
                  </small>
                </TextContent>
              </Box>
            </SpaceBetween>
          ) : (
            <Box textAlign='center' padding='l'>
              <SpaceBetween direction='vertical' size='s'>
                <Spinner size='large' />
                <TextContent>
                  {/* nosemgrep: i18next-key-missing-namespace */}
                  <p>{t('session.summary.generating')}</p>
                </TextContent>
              </SpaceBetween>
            </Box>
          )}
        </Modal>
      </SpaceBetween>
    </Container>
  );
};
