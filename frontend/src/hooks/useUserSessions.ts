// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from 'react-oidc-context';
import { GetUserSessionsResponse, UserSession } from '@group-chat-ai/shared';
import { useApi } from './useApi';

interface UseUserSessionsOptions {
  limit?: number;
  offset?: number;
  autoLoad?: boolean;
}

interface UseUserSessionsReturn {
  sessions: UserSession[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  loadSessions: () => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export function useUserSessions(options: UseUserSessionsOptions = {}): UseUserSessionsReturn {
  const { limit = 10, offset = 0, autoLoad = true } = options;
  const auth = useAuth();
  const { apiService } = useApi();
  
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserId = useCallback((): string | null => {
    return auth.user?.profile?.sub || auth.user?.profile?.email || null;
  },[auth.user?.profile?.sub, auth.user?.profile?.email]);

  const loadSessions = useCallback(async () => {
    const userId = getUserId();
    if (!userId || !apiService) {
      setError('User not authenticated or API service not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: GetUserSessionsResponse = await apiService.getUserSessions(userId, limit, offset);
      setSessions(data.sessions);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  },[apiService, getUserId, limit, offset]);

  const resumeSession = async (sessionId: string) => {
    const userId = getUserId();
    if (!userId || !apiService) {
      throw new Error('User not authenticated or API service not available');
    }

    return await apiService.resumeUserSession(userId, sessionId);
  };

  const deleteSession = async (sessionId: string) => {
    const userId = getUserId();
    if (!userId || !apiService) {
      throw new Error('User not authenticated or API service not available');
    }

    await apiService.deleteUserSession(userId, sessionId);

    // Remove the session from the local state
    setSessions(prevSessions => prevSessions.filter(session => session.sessionId !== sessionId));
    setTotal(prevTotal => prevTotal - 1);
  };

  useEffect(() => {
    if (autoLoad && auth.isAuthenticated) {
      loadSessions();
    }
  }, [auth, limit, offset, autoLoad, loadSessions]);

  return {
    sessions,
    total,
    hasMore,
    loading,
    error,
    loadSessions,
    resumeSession,
    deleteSession,
  };
}
