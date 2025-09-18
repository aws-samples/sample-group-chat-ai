// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Box,
  Alert,
  Table,
  Badge,
  TextFilter,
  Select,
  Pagination,
} from '@cloudscape-design/components';
import { useUserSessions } from '../hooks/useUserSessions';
import { formatDistanceToNow, format } from 'date-fns';
import { UserSession } from '@group-chat-ai/shared';

export const PastConversationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['pages', 'common']);

  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<{ label: string; value?: string }>({ label: t('pastConversations.statusOptions.all'), value: undefined });
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);

  const {
    sessions,
    total,
    loading,
    error,
    resumeSession,
    deleteSession
  } = useUserSessions({
    limit: pageSize,
    offset: (currentPageIndex - 1) * pageSize,
    autoLoad: true,
  });

  const handleViewSession = () => {
    if (selectedSession) {
      navigate(`/session/${selectedSession.sessionId}`);
    }
  };

  const handleResumeSession = async () => {
    if (!selectedSession) return;
    try {
      await resumeSession(selectedSession.sessionId);
      navigate(`/session/${selectedSession.sessionId}`);
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  const handleDeleteSession = async () => {
    if (!selectedSession) return;
    if (window.confirm(
      // nosemgrep: i18next-key-format
      t('pastConversations.confirmDelete', { defaultValue: 'Are you sure you want to delete this session?' }))) {
      try {
        await deleteSession(selectedSession.sessionId);
        setSelectedSession(null); // Clear selection after delete
      } catch (err) {
        console.error('Failed to delete session:', err);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge color="green">{t('pastConversations.statusOptions.active')}</Badge>;
      case 'completed':
        return <Badge color="blue">{t('pastConversations.statusOptions.completed')}</Badge>;
      case 'ended':
        return <Badge color="grey">{t('pastConversations.statusOptions.ended')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy HH:mm');
    } catch {
      // nosemgrep: i18next-key-format
      return t('common:time.justNow');
    }
  };

  const formatLastActivity = (timestamp: number) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      // nosemgrep: i18next-key-format
      return t('common:time.justNow');
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesText = !filterText ||
      session.title?.toLowerCase().includes(filterText.toLowerCase()) ||
      session.sessionId.toLowerCase().includes(filterText.toLowerCase());

    const matchesStatus = !statusFilter.value || session.status === statusFilter.value;

    return matchesText && matchesStatus;
  });

  const statusOptions = [
    { label: t('pastConversations.statusOptions.all'), value: undefined },
    { label: t('pastConversations.statusOptions.active'), value: 'active' },
    { label: t('pastConversations.statusOptions.completed'), value: 'completed' },
    { label: t('pastConversations.statusOptions.ended'), value: 'ended' },
  ];

  return (
    <Container>
      <SpaceBetween size="l">
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                onClick={handleViewSession}
                disabled={!selectedSession}
              >
                {t('common:actions.viewDetails')}
              </Button>
              {selectedSession?.status === 'active' && (
                <Button
                  onClick={handleResumeSession}
                  disabled={!selectedSession}
                >
                  {t('common:actions.resume')}
                </Button>
              )}
              <Button
                onClick={handleDeleteSession}
                disabled={!selectedSession}
              >
                {t('common:actions.delete')}
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/chat')}
              >
                {t('common:actions.newConversation')}
              </Button>
            </SpaceBetween>
          }
        >
          {
            // nosemgrep: i18next-key-format
            t('pastConversations.title')
          }
        </Header>

        {error && (
          <Alert type="error" dismissible>
            {
              // nosemgrep: i18next-key-format
              t('pastConversations.errors.loadFailed')}: {error}
          </Alert>
        )}

        <Table
          columnDefinitions={[
            {
              id: 'title',
              header: t('pastConversations.sessionTitle'), // nosemgrep: i18next-key-format
              cell: (session: UserSession) => (
                session.title || `Session ${session.sessionId.slice(0, 8)}`
              ),
              minWidth: 200,
            },
            {
              id: 'status',
              header: t('pastConversations.status'), // nosemgrep: i18next-key-format
              cell: (session: UserSession) => getStatusBadge(session.status),
              minWidth: 100,
            },
            {
              id: 'createdAt',
              header: t('pastConversations.createdAt'), // nosemgrep: i18next-key-format
              cell: (session: UserSession) => formatDate(session.createdAt),
              minWidth: 150,
            },
            {
              id: 'lastActivity',
              header: t('pastConversations.lastActivity'), // nosemgrep: i18next-key-format
              cell: (session: UserSession) => formatLastActivity(session.lastActivity),
              minWidth: 150,
            },
            {
              id: 'messages',
              header: 'Messages', // nosemgrep: i18next-key-format
              cell: (session: UserSession) => session.totalMessages || 0,
              minWidth: 80,
            },
          ]}
          items={filteredSessions}
          loading={loading}
          loadingText={t('common:states.loading')}// nosemgrep: i18next-key-format
          trackBy="sessionId"
          selectionType="single"
          selectedItems={selectedSession ? [selectedSession] : []}
          onSelectionChange={({ detail }) => {
            setSelectedSession(detail.selectedItems[0] || null);
          }}
          empty={
            <Box textAlign="center" color="inherit">
              <SpaceBetween direction='vertical' size='m'>
                <b>{
                  // nosemgrep: i18next-key-format
                  t('pastConversations.noSessions')

                }</b>

                <Button onClick={() => navigate('/chat')}>
                  {
                    // nosemgrep: i18next-key-format
                    t('common:actions.newConversation')}
                </Button>
              </SpaceBetween>
            </Box>
          }
          filter={
            <SpaceBetween size="xs" direction="horizontal">
              <TextFilter
                filteringText={filterText}
                onChange={({ detail }) => setFilterText(detail.filteringText)}
                filteringPlaceholder={
                  // nosemgrep: i18next-key-format
                  t('pastConversations.search')}
                countText={`${filteredSessions.length} matches`}
              />
              <Select
                selectedOption={statusFilter}
                onChange={({ detail }) => setStatusFilter(detail.selectedOption as { label: string; value?: string })}
                options={statusOptions}
                placeholder={
                  // nosemgrep: i18next-key-format
                  t('pastConversations.filter')}
              />
            </SpaceBetween>
          }
          pagination={
            total > pageSize ? (
              <Pagination
                currentPageIndex={currentPageIndex}
                pagesCount={Math.ceil(total / pageSize)}
                onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
              />
            ) : undefined
          }
        />
      </SpaceBetween>
    </Container>
  );
};
