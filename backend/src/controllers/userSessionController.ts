// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Router, Request, Response, NextFunction } from 'express';
import {
  GetUserSessionsResponse,
  ResumeSessionResponse,
  ValidationException,
  ResourceNotFoundException,
  SessionStatus,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { UserSessionStorage } from '../services/UserSessionStorage';
import { SessionService } from '../services/SessionService';

const logger = createLogger();

// Factory function to create routes with shared services
export function createUserSessionRoutes(
  userSessionStorage: UserSessionStorage,
  sessionService: SessionService
) {
  const router = Router();

  /**
   * @swagger
   * /api/user-sessions/{userId}:
   *   get:
   *     summary: Get user sessions
   *     description: Retrieve all conversation sessions for a specific user
   *     tags: [User Sessions]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the user
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Maximum number of sessions to return
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *           minimum: 0
   *           default: 0
   *         description: Number of sessions to skip
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [active, completed, archived]
   *         description: Filter by session status
   *     responses:
   *       200:
   *         description: User sessions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessions:
   *                   type: array
   *                   items:
   *                     type: object
   *                 total:
   *                   type: integer
   *                 hasMore:
   *                   type: boolean
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { limit, offset, status } = req.query;

      logger.info('Getting user sessions', {
        userId,
        limit: limit || 'default',
        offset: offset || 0,
        status: status || 'all',
      });

      // Validate parameters
      if (!userId) {
        throw new ValidationException('User ID is required');
      }

      const parsedLimit = limit ? parseInt(limit as string, 10) : 20;
      const parsedOffset = offset ? parseInt(offset as string, 10) : 0;
      const parsedStatus = status && Object.values(SessionStatus).includes(status as SessionStatus)
        ? (status as SessionStatus)
        : undefined;

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw new ValidationException('Limit must be between 1 and 100');
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new ValidationException('Offset must be 0 or greater');
      }

      const result = await userSessionStorage.getUserSessions(userId, {
        limit: parsedLimit,
        offset: parsedOffset,
        status: parsedStatus,
      });

      const response: GetUserSessionsResponse = {
        sessions: result.sessions,
        total: result.total,
        hasMore: result.hasMore,
      };

      logger.info('User sessions retrieved successfully', {
        userId,
        sessionCount: result.sessions.length,
        total: result.total,
        hasMore: result.hasMore,
      });

      res.json(response);
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      next(error);
    }
  });

  /**
   * @swagger
   * /api/user-sessions/{userId}/{sessionId}:
   *   get:
   *     summary: Get specific user session
   *     description: Retrieve detailed information about a specific conversation session for a user
   *     tags: [User Sessions]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the user
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the session
   *     responses:
   *       200:
   *         description: Session details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessionId:
   *                   type: string
   *                 title:
   *                   type: string
   *                 userId:
   *                   type: string
   *                 activePersonas:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       personaId:
   *                         type: string
   *                       name:
   *                         type: string
   *                       role:
   *                         type: string
   *                 conversationHistory:
   *                   type: array
   *                   items:
   *                     type: object
   *                 status:
   *                   type: string
   *                 createdAt:
   *                   type: number
   *                 updatedAt:
   *                   type: number
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get('/:userId/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, sessionId } = req.params;

      logger.info('Getting user session', { userId, sessionId });

      if (!userId || !sessionId) {
        throw new ValidationException('User ID and Session ID are required');
      }

      const session = await userSessionStorage.getUserSession(userId, sessionId);

      logger.info('User session retrieved successfully', {
        userId,
        sessionId,
        messageCount: session.conversationHistory.length,
      });

      res.json(session);
    } catch (error) {
      logger.error('Error getting user session:', error);
      next(error);
    }
  });

  /**
   * @swagger
   * /api/user-sessions/{userId}/{sessionId}/resume:
   *   post:
   *     summary: Resume a session
   *     description: Resume an existing conversation session for a user
   *     tags: [User Sessions]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the user
   *       - in: path
   *         name: sessionId
   *         required: true
   *         schema:
   *           type: string
   *         description: Unique identifier of the session
   *     responses:
   *       200:
   *         description: Session resumed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessionId:
   *                   type: string
   *                 message:
   *                   type: string
   *                 resumedAt:
   *                   type: number
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.post('/:userId/:sessionId/resume', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, sessionId } = req.params;

      logger.info('Resuming user session', { userId, sessionId });

      if (!userId || !sessionId) {
        throw new ValidationException('User ID and Session ID are required');
      }

      // Check if session exists and belongs to user
      const existsForUser = await userSessionStorage.sessionExists(userId, sessionId);
      if (!existsForUser) {
        throw new ResourceNotFoundException(
          `Session with ID '${sessionId}' not found for user '${userId}'`,
          'session',
          sessionId
        );
      }

      // Get the stored session
      const storedSession = await userSessionStorage.getUserSession(userId, sessionId);

      // Check if session can be resumed
      let canResume = true;
      let reason: string | undefined;

      if (storedSession.status !== SessionStatus.ACTIVE) {
        canResume = false;
        reason = `Session status is '${storedSession.status}', only active sessions can be resumed`;
      }

      if (canResume && storedSession.isResumable === false) {
        canResume = false;
        reason = 'Session is marked as non-resumable';
      }

      // If session can be resumed, restore it to SessionService
      if (canResume) {
        // Mark session as resumable and update activity
        storedSession.lastActivity = Date.now();
        storedSession.isResumable = true;
        
        // Store the session back in SessionService for active use
        sessionService.restoreSession(storedSession);

        logger.info('Session resumed successfully', {
          userId,
          sessionId,
          messageCount: storedSession.conversationHistory.length,
        });
      } else {
        logger.warn('Session resume failed', { userId, sessionId, reason });
      }

      const response: ResumeSessionResponse = {
        session: storedSession,
        canResume,
        reason,
      };

      res.json(response);
    } catch (error) {
      logger.error('Error resuming session:', error);
      next(error);
    }
  });

  // PUT /user-sessions/:userId/:sessionId/title - Update session title
  router.put('/:userId/:sessionId/title', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, sessionId } = req.params;
      const { title } = req.body;

      logger.info('Updating session title', { userId, sessionId, title });

      if (!userId || !sessionId) {
        throw new ValidationException('User ID and Session ID are required');
      }

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new ValidationException('Title is required and must be a non-empty string');
      }

      if (title.length > 100) {
        throw new ValidationException('Title must be 100 characters or less');
      }

      const trimmedTitle = title.trim();

      await userSessionStorage.updateSessionTitle(userId, sessionId, trimmedTitle);

      // Also update in active session if it exists
      const activeSession = await sessionService.getSession(sessionId);
      if (activeSession && activeSession.userId === userId) {
        activeSession.title = trimmedTitle;
      }

      logger.info('Session title updated successfully', { userId, sessionId, title: trimmedTitle });

      res.json({
        sessionId,
        userId,
        title: trimmedTitle,
        updatedAt: Date.now(),
      });
    } catch (error) {
      logger.error('Error updating session title:', error);
      next(error);
    }
  });

  // DELETE /user-sessions/:userId/:sessionId - Delete a session
  router.delete('/:userId/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, sessionId } = req.params;

      logger.info('Deleting user session', { userId, sessionId });

      if (!userId || !sessionId || userId.trim() === '' || sessionId.trim() === '') {
        throw new ValidationException('User ID and Session ID are required');
      }

      await userSessionStorage.deleteUserSession(userId, sessionId);

      // Also end the session if it's currently active
      try {
        const activeSession = await sessionService.getSession(sessionId);
        if (activeSession && activeSession.userId === userId) {
          await sessionService.endSession(sessionId);
        }
      } catch (error) {
        // Session might not be active, which is fine
        logger.debug('Active session not found during delete (expected):', error);
      }

      logger.info('User session deleted successfully', { userId, sessionId });

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting user session:', error);
      next(error);
    }
  });

  // GET /user-sessions/:userId/stats - Get user session statistics
  router.get('/:userId/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      logger.info('Getting user session stats', { userId });

      if (!userId) {
        throw new ValidationException('User ID is required');
      }

      const stats = await userSessionStorage.getUserSessionStats(userId);

      logger.info('User session stats retrieved successfully', {
        userId,
        totalSessions: stats.totalSessions,
        activeSessions: stats.activeSessions,
      });

      res.json({
        userId,
        ...stats,
      });
    } catch (error) {
      logger.error('Error getting user session stats:', error);
      next(error);
    }
  });

  return router;
}

// For backward compatibility - create default instance
const userSessionStorage = new UserSessionStorage();
const sessionService = new SessionService();
export const userSessionRoutes = createUserSessionRoutes(userSessionStorage, sessionService);