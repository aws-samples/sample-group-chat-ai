// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import request from 'supertest';
import express from 'express';
import { createUserSessionRoutes } from '../../controllers/userSessionController';
import { UserSessionStorage } from '../../services/UserSessionStorage';
import { SessionService } from '../../services/SessionService';
import { Session, SessionStatus } from '@group-chat-ai/shared';

describe('UserSessionController', () => {
  let app: express.Application;
  let userSessionStorage: UserSessionStorage;
  let sessionService: SessionService;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    userSessionStorage = new UserSessionStorage();
    sessionService = new SessionService();

    // Use the factory function to create routes
    const routes = createUserSessionRoutes(userSessionStorage, sessionService);
    app.use('/user-sessions', routes);
  });

  describe('DELETE /user-sessions/:userId/:sessionId', () => {
    it('should delete a user session successfully', async () => {
      const userId = 'test-user-123';
      const sessionId = 'test-session-456';

      // Create a test session first
      const testSession: Session = {
        sessionId,
        userId,
        title: 'Test Session',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        status: SessionStatus.ACTIVE,
        conversationHistory: [
          {
            messageId: 'msg-1',
            sessionId: sessionId,
            content: 'Hello world',
            sender: 'user' as any,
            timestamp: Date.now(),
          }
        ],
        activePersonas: [],
        personaContexts: {},
        conversationTopic: { title: 'Test topic', description: 'A test conversation topic' },
        conversationFlow: {
          currentTurn: {
            turnId: 'turn-1',
            turnType: 'user_message' as any,
            participantId: 'user',
            timestamp: Date.now()
          },
          turnHistory: [],
          agentDiscussionActive: false,
          maxAgentTurns: 3,
          currentAgentTurns: 0,
          pendingAgentResponses: []
        },
        totalMessages: 1,
        isResumable: true,
      };

      // Store the session
      await userSessionStorage.storeUserSession(testSession);

      // Verify session exists
      const sessionExists = await userSessionStorage.sessionExists(userId, sessionId);
      expect(sessionExists).toBe(true);

      // Delete the session
      const response = await request(app)
        .delete(`/user-sessions/${userId}/${sessionId}`)
        .expect(204);

      expect(response.body).toEqual({});

      // Verify session is deleted
      const sessionExistsAfterDelete = await userSessionStorage.sessionExists(userId, sessionId);
      expect(sessionExistsAfterDelete).toBe(false);
    });

    it('should return 404 for non-existent session', async () => {
      const userId = 'test-user-123';
      const sessionId = 'non-existent-session';

      const response = await request(app)
        .delete(`/user-sessions/${userId}/${sessionId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid parameters', async () => {
      // Missing sessionId
      await request(app)
        .delete('/user-sessions/test-user/')
        .expect(400);

      // Missing userId
      await request(app)
        .delete('/user-sessions//test-session')
        .expect(400);
    });
  });

  describe('GET /user-sessions/:userId', () => {
    it('should return empty list when no sessions exist', async () => {
      const userId = 'test-user-123';

      const response = await request(app)
        .get(`/user-sessions/${userId}`)
        .expect(200);

      expect(response.body).toEqual({
        sessions: [],
        total: 0,
        hasMore: false,
      });
    });
  });
});