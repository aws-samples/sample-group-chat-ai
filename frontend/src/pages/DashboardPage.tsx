// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Box,
  TextContent,
  Alert,
  Cards,
  Badge,
  Link,
} from '@cloudscape-design/components';
import { useUserSessions } from '../hooks/useUserSessions';
import { formatDistanceToNow } from 'date-fns';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  
  const { sessions, loading, error, resumeSession } = useUserSessions({
    limit: 5,
    autoLoad: true,
  });

  const getUserDisplayName = (): string => {
    return auth.user?.profile?.given_name || 
           auth.user?.profile?.name || 
           auth.user?.profile?.email || 
           t('common:labels.user');
  };

  const handleResumeSession = async (sessionId: string) => {
    try {
      await resumeSession(sessionId);
      navigate(`/session/${sessionId}`);
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge color="green">Active</Badge>;
      case 'completed':
        return <Badge color="blue">Completed</Badge>;
      case 'ended':
        return <Badge color="grey">Ended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatLastActivity = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return t('common:time.justNow');
    }
  };

  return (
    <Container>
      <SpaceBetween size="l">
        {/* Welcome Header */}
        <Header 
          variant="h1"
          description={t('dashboard.subtitle')}
        >
          {t('dashboard.welcomeBack', { name: getUserDisplayName() })}
        </Header>

        {/* Quick Actions */}
        <Box>
          <SpaceBetween size="m">
            <Header variant="h2">{t('dashboard.quickActions')}</Header>
            <SpaceBetween direction="horizontal" size="s">
              <Button
                variant="primary"
                onClick={() => navigate('/chat')}
              >
                {t('dashboard.newGroupChat')}
              </Button>
              <Button
                onClick={() => navigate('/past-conversations')}
              >
                {t('dashboard.viewAllConversations')}
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        </Box>

        {/* Recent Sessions */}
        <Box>
          <SpaceBetween size="m">
            <Header 
              variant="h2"
              actions={
                sessions.length > 0 ? (
                  <Link href="#" onClick={() => navigate('/past-conversations')}>
                    {t('dashboard.viewAllConversations')}
                  </Link>
                ) : undefined
              }
            >
              {t('dashboard.recentConversations')}
            </Header>

            {error && (
              <Alert type="error" dismissible>
                {t('dashboard.errors.loadFailed')}: {error}
              </Alert>
            )}

            {sessions.length === 0 && !loading && !error && (
              <Box textAlign="center" padding="l">
                <TextContent>
                  <h3>{t('dashboard.noRecentSessions')}</h3>
                  <p>{t('dashboard.noRecentSessionsDescription', { 
                    defaultValue: 'Start your first practice session to see it here.' 
                  })}</p>
                </TextContent>
                <Box margin={{ top: 'm' }}>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/chat')}
                  >
                    {t('dashboard.newGroupChat')}
                  </Button>
                </Box>
              </Box>
            )}

            {sessions.length > 0 && (
              <Cards
                cardDefinition={{
                  header: (session) => (
                    <SpaceBetween direction="horizontal" size="xs">
                      <Link
                        href="#"
                        fontSize="heading-m"
                        onFollow={() => navigate(`/session/${session.sessionId}`)}
                      >
                        {session.title || `Session ${session.sessionId.slice(0, 8)}`}
                      </Link>
                      {getStatusBadge(session.status)}
                    </SpaceBetween>
                  ),
                  sections: [
                    {
                      id: 'details',
                      content: (session) => (
                        <SpaceBetween size="xs">
                          <Box fontSize="body-s" color="text-status-inactive">
                            {t('dashboard.lastActivity', { time: formatLastActivity(session.lastActivity) })}
                          </Box>
                          <Box fontSize="body-s" color="text-status-inactive">
                            {t('dashboard.sessionCount', { 
                              count: session.totalMessages || 0,
                              defaultValue: '{{count}} messages'
                            })}
                          </Box>
                        </SpaceBetween>
                      ),
                    },
                    {
                      id: 'actions',
                      content: (session) => (
                        session.status === 'active' ? (
                          <Button
                            onClick={() => handleResumeSession(session.sessionId)}
                          >
                            {t('common:actions.resume')}
                          </Button>
                        ) : null
                      ),
                    },
                  ],
                }}
                items={sessions}
                loading={loading}
                loadingText={t('common:states.loading')}
                trackBy="sessionId"
              />
            )}
          </SpaceBetween>
        </Box>
      </SpaceBetween>
    </Container>
  );
};
