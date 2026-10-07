// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import request from 'supertest';
import express from 'express';
import { createUserSessionRoutes } from '../../controllers/userSessionController';
import { UserSessionStorage } from '../../services/UserSessionStorage';
import { SessionService } from '../../services/SessionService';
import { Session, SessionStatus } from '@group-chat-ai/shared';
import { errorHandler } from '../../middleware/errorHandler';
import { authMiddleware } from '../../middleware/auth';

// Enable auth bypass for tests - required for authMiddleware to accept x-dev-user-id header
process.env.AUTH_DISABLED = 'true';

describe('UserSessionController', () => {
  let app: express.Application;
  let userSessionStorage: UserSessionStorage;
  let sessionService: SessionService;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    userSessionStorage = new UserSessionStorage();
    sessionService = new SessionService();

    // Mount authMiddleware first, just like production (index.ts) does.
    // With AUTH_DISABLED=true, it accepts the x-dev-user-id header and populates req.auth.
    // This ensures the requireSelf guard inside createUserSessionRoutes has an authenticated identity.
    app.use('/user-sessions', authMiddleware);

    // Use the factory function to create routes
    const routes = createUserSessionRoutes(userSessionStorage, sessionService);
    app.use('/user-sessions', routes);

    // Add error handler middleware
    app.use(errorHandler);
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

      // Delete the session - must provide x-dev-user-id header matching the userId
      // so authMiddleware populates req.auth and requireSelf allows the request
      const response = await request(app)
        .delete(`/user-sessions/${userId}/${sessionId}`)
        .set('x-dev-user-id', userId)
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
        .set('x-dev-user-id', userId)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should return 404 for invalid route patterns', async () => {
      // Missing sessionId - doesn't match route pattern
      // Still need auth header; using a placeholder user id
      await request(app)
        .delete('/user-sessions/test-user/')
        .set('x-dev-user-id', 'test-user')
        .expect(404);

      // Missing userId - doesn't match route pattern
      await request(app)
        .delete('/user-sessions//test-session')
        .set('x-dev-user-id', 'test-user')
        .expect(404);
    });

    it('should return 400 for empty parameters', async () => {
      // Empty userId (whitespace) - requireSelf correctly returns 403 Forbidden since
      // the auth identity (user-id) doesn't match the path userId (whitespace).
      // This is correct security behavior: you can't access another user's resources.
      const response1 = await request(app)
        .delete('/user-sessions/%20/session-id')
        .set('x-dev-user-id', 'user-id')
        .expect(403);

      expect(response1.body).toHaveProperty('message');
      expect(response1.body.message).toContain('only access your own sessions');

      // Empty sessionId - auth as 'user-id' to match path, reaches controller validation
      const response2 = await request(app)
        .delete('/user-sessions/user-id/%20')
        .set('x-dev-user-id', 'user-id')
        .expect(400);

      expect(response2.body).toHaveProperty('message');
      expect(response2.body.message).toContain('User ID and Session ID are required');
    });
  });

  describe('GET /user-sessions/:userId', () => {
    it('should return empty list when no sessions exist', async () => {
      const userId = 'test-user-123';

      const response = await request(app)
        .get(`/user-sessions/${userId}`)
        .set('x-dev-user-id', userId)
        .expect(200);

      expect(response.body).toEqual({
        sessions: [],
        total: 0,
        hasMore: false,
      });
    });
  });
});