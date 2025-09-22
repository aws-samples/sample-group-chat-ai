// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Grid,
  ColumnLayout,
  Badge,
  Spinner,
  Alert,
  Button,
} from '@cloudscape-design/components';
import {
  Session,
  ConversationMessage,
  MessageSender,
  PersonaInfo,
  ConversationTopic,
  BusinessContext,
} from '@group-chat-ai/shared';
import { getPersonaRole, getPersonaDisplayName } from '@/utils/avatarUtils';
import { useApi } from '@/hooks/useApi';
import './ExportPage.css';

interface ExportPageState {
  session: Session | null;
  messages: ConversationMessage[];
  conversationTopic: ConversationTopic | null;
  businessContext: BusinessContext | null;
  personaInfoMap: Record<string, PersonaInfo>;
  loading: boolean;
  error: string | null;
}

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

export const ExportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['pages', 'common']);
  const { apiService } = useApi();
  
  const [state, setState] = useState<ExportPageState>({
    session: null,
    messages: [],
    conversationTopic: null,
    businessContext: null,
    personaInfoMap: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!sessionId) {
      setState(prev => ({ ...prev, error: 'Session ID is required', loading: false }));
      return;
    }

    loadSessionData(sessionId);
  }, [sessionId]);

  const loadSessionData = async (id: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      if (!apiService) {
        throw new Error('API service not available');
      }

      const session = await apiService.getSession(id);
      const personaInfoMap = buildPersonaInfoMap(session);

      setState(prev => ({
        ...prev,
        session,
        messages: session.conversationHistory,
        conversationTopic: session.conversationTopic ?? null,
        businessContext: session.businessContext ?? null,
        personaInfoMap,
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to load session data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load session data',
        loading: false,
      }));
    }
  };

  const formatDuration = (startTime: number, endTime: number): string => {
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    if (minutes === 0) {
      return t('export.duration.seconds', { count: seconds });
    } else if (minutes < 60) {
      return t('export.duration.minutesSeconds', { minutes, seconds });
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return t('export.duration.hoursMinutes', { hours, minutes: remainingMinutes });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBackToSession = () => {
    if (sessionId) {
      navigate(`/session/${sessionId}`);
    } else {
      navigate('/');
    }
  };

  if (state.loading) {
    return (
      <Container>
        <Box textAlign="center" padding="xxl">
          <Spinner size="large" />
          <Box variant="p" margin={{ top: 'm' }}>
            {t('export.loading')}
          </Box>
        </Box>
      </Container>
    );
  }

  if (state.error || !state.session) {
    return (
      <Container>
        <Alert
          type="error"
          header={t('export.error.title')}
          action={
            <Button onClick={handleBackToSession}>
              {t('export.error.backToSession')}
            </Button>
          }
        >
          {state.error || t('export.error.sessionNotFound')}
        </Alert>
      </Container>
    );
  }

  const { session, messages, conversationTopic, businessContext, personaInfoMap } = state;

  return (
    <div className="export-page">
      <div className="export-header no-print">
        <Container>
          <Header
            variant="h1"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={handleBackToSession}>
                  {t('export.actions.backToSession')}
                </Button>
                <Button variant="primary" onClick={handlePrint}>
                  {t('export.actions.print')}
                </Button>
              </SpaceBetween>
            }
          >
            {t('export.title')}
          </Header>
        </Container>
      </div>

      <Container>
        <SpaceBetween size="l">
          {/* Main Header */}
          <Header variant="h1" className="export-main-header">
            {t('export.reportTitle')}
          </Header>

          {/* Session Metadata */}
          <ColumnLayout columns={4} variant="text-grid">
            <div>
              <Box variant="awsui-key-label">{t('export.sessionInfo.sessionId')}</Box>
              <div>{session.sessionId}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">{t('export.sessionInfo.date')}</Box>
              <div>{new Date(session.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">{t('export.sessionInfo.duration')}</Box>
              <div>{formatDuration(session.createdAt, session.lastActivity)}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">{t('export.sessionInfo.messages')}</Box>
              <div>{messages.length}</div>
            </div>
          </ColumnLayout>

          {/* Conversation Topic */}
          {conversationTopic && (
            <Container>
              <Header variant="h2">{t('export.sections.conversationTopic')}</Header>
              <SpaceBetween size="m">
                <div>
                  <Box variant="awsui-key-label">{t('export.conversationTopic.title')}</Box>
                  <div>{conversationTopic.title}</div>
                </div>
                <div>
                  <Box variant="awsui-key-label">{t('export.conversationTopic.description')}</Box>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{conversationTopic.description}</div>
                </div>
              </SpaceBetween>
            </Container>
          )}

          {/* Business Context */}
          {businessContext && (
            <Container>
              <Header variant="h2">{t('export.sections.businessContext')}</Header>
              <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                <SpaceBetween size="s">
                  <div>
                    <Box variant="awsui-key-label">{t('export.businessContext.industry')}</Box>
                    <div>{businessContext.industry}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">{t('export.businessContext.companySize')}</Box>
                    <div>{businessContext.companySize}</div>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">{t('export.businessContext.companyStage')}</Box>
                    <div>{businessContext.companyStage}</div>
                  </div>
                </SpaceBetween>
                <SpaceBetween size="s">
                  {businessContext.keyPriorities.length > 0 && (
                    <div>
                      <Box variant="awsui-key-label">{t('export.businessContext.keyPriorities')}</Box>
                      <ul>
                        {businessContext.keyPriorities.map((priority, index) => (
                          <li key={index}>{priority}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {businessContext.challenges.length > 0 && (
                    <div>
                      <Box variant="awsui-key-label">{t('export.businessContext.challenges')}</Box>
                      <ul>
                        {businessContext.challenges.map((challenge, index) => (
                          <li key={index}>{challenge}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </SpaceBetween>
              </Grid>
            </Container>
          )}

          {/* Active Personas */}
          <Container>
            <Header variant="h2">
              {t('export.sections.activePersonas')} ({session.activePersonas.length})
            </Header>
            <Grid gridDefinition={session.activePersonas.map(() => ({ colspan: 3 }))}>
              {session.activePersonas.map(personaId => {
                const personaInfo = personaInfoMap[personaId];
                const name = getPersonaNameWithCustom(personaId, personaInfoMap);
                const role = personaInfo?.role || getPersonaRole(personaId);
                const description = personaInfo?.description || `${role} - ${name}`;

                return (
                  <Box key={personaId} padding="s">
                    <SpaceBetween size="xs">
                      <div>
                        <strong>{name}</strong>
                      </div>
                      <Badge color="blue">{role}</Badge>
                      <div style={{ fontSize: '0.875rem', color: '#5f6b7a' }}>
                        {description}
                      </div>
                    </SpaceBetween>
                  </Box>
                );
              })}
            </Grid>
          </Container>

          {/* Conversation Transcript */}
          <Container>
            <Header variant="h2">{t('export.sections.conversationTranscript')}</Header>
            {messages.length === 0 ? (
              <Box textAlign="center" color="text-body-secondary">
                {t('export.noMessages')}
              </Box>
            ) : (
              <SpaceBetween size="s">
                {messages
                  .filter((message, index, array) => {
                    // Remove duplicate messages by checking if this is the first occurrence of this messageId
                    return array.findIndex(m => m.messageId === message.messageId) === index;
                  })
                  .map((message, index) => {
                  const isUser = message.sender === MessageSender.USER;
                  const senderName = isUser
                    ? t('export.message.you')
                    : getPersonaNameWithCustom(message.personaId || '', personaInfoMap);
                  const senderRole = isUser
                    ? t('export.message.user')
                    : (personaInfoMap[message.personaId || '']?.role || getPersonaRole(message.personaId || ''));
                  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={`${message.messageId}-${index}`}
                      className={`export-message ${isUser ? 'user-message' : 'persona-message'}`}
                    >
                      <div className="message-header">
                        <span className="message-sender">{senderName}</span>
                        <Badge color={isUser ? 'blue' : 'grey'}>{senderRole}</Badge>
                        <span className="message-timestamp">{timestamp}</span>
                      </div>
                      <div className="message-content">
                        {message.content}
                      </div>
                    </div>
                  );
                })}
              </SpaceBetween>
            )}
          </Container>

          {/* Footer */}
          <Box textAlign="center" color="text-body-secondary" className="export-footer">
            <p>{t('export.footer.generatedBy')}</p>
            <p>{t('export.footer.generatedAt', { date: new Date().toLocaleString() })}</p>
          </Box>
        </SpaceBetween>
      </Container>
    </div>
  );
};
