// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Session,
  UserSession,
  SessionStatus,
  ResourceNotFoundException,
  ServiceException,
  UserId,
  SessionId,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const logger = createLogger();

/**
 * UserSessionStorage manages persistent storage of user sessions in DynamoDB
 * Falls back to in-memory storage if DynamoDB is not configured
 */
export class UserSessionStorage {
  private readonly dynamoDbClient?: DynamoDBDocumentClient;
  private readonly tableName: string;
  private useDynamoDB: boolean;
  
  // Fallback in-memory storage
  private userSessions: Map<UserId, UserSession[]> = new Map();
  private fullSessions: Map<SessionId, Session> = new Map();
  private readonly maxSessionsPerUser = 100;

  constructor() {
    // Check if DynamoDB table is configured
    this.tableName = process.env.USER_SESSIONS_TABLE || '';
    this.useDynamoDB = !!this.tableName;

    // Enhanced logging for deployment debugging
    logger.info('UserSessionStorage initialization', {
      tableName: this.tableName,
      useDynamoDB: this.useDynamoDB,
      awsRegion: process.env.AWS_REGION,
      nodeEnv: process.env.NODE_ENV
    });

    if (this.useDynamoDB) {
      try {
        // Enhanced AWS region detection
        const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
        logger.info('Initializing DynamoDB client', {
          region: awsRegion,
          tableName: this.tableName
        });

        const client = new DynamoDBClient({
          region: awsRegion,
          // Add explicit configuration for better error handling
          maxAttempts: 3,
        });
        
        this.dynamoDbClient = DynamoDBDocumentClient.from(client, {
          marshallOptions: {
            convertEmptyValues: false,
            removeUndefinedValues: true,
            convertClassInstanceToMap: false,
          },
          unmarshallOptions: {
            wrapNumbers: false,
          },
        });

        // Test DynamoDB connectivity on startup
        this.testDynamoDBConnection().catch(error => {
          logger.error('DynamoDB connectivity test failed:', error);
          logger.warn('Falling back to in-memory storage due to connectivity issues');
          this.useDynamoDB = false;
        });

        logger.info('UserSessionStorage initialized with DynamoDB', { 
          tableName: this.tableName,
          region: awsRegion
        });
      } catch (error) {
        logger.error('Failed to initialize DynamoDB client, falling back to memory storage:', {
          error: error instanceof Error ? error.message : String(error),
          tableName: this.tableName,
          region: process.env.AWS_REGION
        });
        this.useDynamoDB = false;
      }
    } else {
      logger.warn('UserSessionStorage using in-memory storage - DynamoDB table not configured', {
        userSessionsTableEnv: process.env.USER_SESSIONS_TABLE || 'NOT_SET',
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('TABLE') || key.includes('DYNAMO')),
      });
    }

    this.startCleanupProcess();
  }

  /**
   * Test DynamoDB connection by describing the table
   */
  private async testDynamoDBConnection(): Promise<void> {
    if (!this.dynamoDbClient || !this.useDynamoDB) {
      return;
    }

    try {
      // Simple query to test connectivity - get one item from the table
      const testResult = await this.dynamoDbClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :testUserId',
        ExpressionAttributeValues: {
          ':testUserId': 'connectivity-test-user',
        },
        Limit: 1,
      }));

      logger.info('DynamoDB connectivity test successful', {
        tableName: this.tableName,
        itemsReturned: testResult.Items?.length || 0
      });
    } catch (error) {
      logger.error('DynamoDB connectivity test failed:', {
        error: error instanceof Error ? error.message : String(error),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorCode: (error as any)?.name,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  /**
   * Store a complete session for a user
   */
  async storeUserSession(session: Session): Promise<void> {
    try {
      if (!session.userId) {
        throw new ServiceException('Cannot store session without userId');
      }

      if (this.useDynamoDB && this.dynamoDbClient) {
        await this.storeSessionInDynamoDB(session);
      } else {
        await this.storeSessionInMemory(session);
        if (this.tableName) {
          logger.warn('DynamoDB table configured but not available, using memory storage', {
            tableName: this.tableName,
            sessionId: session.sessionId,
            userId: session.userId
          });
        }
      }

      logger.info('User session stored', {
        sessionId: session.sessionId,
        userId: session.userId,
        title: session.title,
        totalMessages: session.totalMessages || session.conversationHistory.length,
        storage: this.useDynamoDB && this.dynamoDbClient ? 'DynamoDB' : 'memory',
        tableName: this.useDynamoDB ? this.tableName : undefined,
      });
    } catch (error) {
      logger.error('Error storing user session:', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: session.sessionId,
        userId: session.userId,
        storage: this.useDynamoDB && this.dynamoDbClient ? 'DynamoDB' : 'memory',
      });
      
      // If DynamoDB fails, fall back to memory storage for this operation
      if (this.useDynamoDB && this.dynamoDbClient) {
        logger.warn('DynamoDB storage failed, falling back to memory for this session');
        await this.storeSessionInMemory(session);
      } else {
        throw new ServiceException('Failed to store user session', error as Error);
      }
    }
  }

  private async storeSessionInDynamoDB(session: Session): Promise<void> {
    if (!this.dynamoDbClient) {
      throw new ServiceException('DynamoDB client not initialized');
    }

    const ttl = Math.floor((Date.now() + (7 * 24 * 60 * 60 * 1000)) / 1000); // 7 days from now

    const item = {
      userId: session.userId!,
      sessionId: session.sessionId,
      title: session.title || this.generateDefaultTitle(session),
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: session.status,
      totalMessages: session.totalMessages || session.conversationHistory.length,
      preview: this.generatePreview(session),
      isResumable: session.isResumable !== false,
      conversationHistory: session.conversationHistory,
      conversationTopic: session.conversationTopic,
      activePersonas: session.activePersonas,
      personaContexts: session.personaContexts,
      businessContext: session.businessContext,
      conversationFlow: session.conversationFlow,
      conversationLanguage: session.conversationLanguage,
      customPersonas: session.customPersonas,
      voiceSettings: session.voiceSettings,
      documentLinks: session.documentLinks,
      ttl,
    };

    try {
      await this.dynamoDbClient.send(new PutCommand({
        TableName: this.tableName,
        Item: item,
      }));

      logger.debug('Session stored in DynamoDB successfully', {
        sessionId: session.sessionId,
        userId: session.userId,
        tableName: this.tableName
      });
    } catch (error) {
      logger.error('Failed to store session in DynamoDB:', {
        error: error instanceof Error ? error.message : String(error),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorCode: (error as any)?.name,
        sessionId: session.sessionId,
        userId: session.userId,
        tableName: this.tableName,
      });
      throw error;
    }
  }

  private async storeSessionInMemory(session: Session): Promise<void> {
    // Store full session
    this.fullSessions.set(session.sessionId, session);

      // Create user session summary
      const userSession: UserSession = {
        sessionId: session.sessionId,
        userId: session.userId!,
        title: session.title || this.generateDefaultTitle(session),
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        status: session.status,
        totalMessages: session.totalMessages || session.conversationHistory.length,
        preview: this.generatePreview(session),
      };

    // Add to user's session list
    const userSessionList = this.userSessions.get(session.userId!) || [];
    
    // Check if session already exists (update case)
    const existingIndex = userSessionList.findIndex(s => s.sessionId === session.sessionId);
    if (existingIndex >= 0) {
      userSessionList[existingIndex] = userSession;
    } else {
      // Add new session and enforce limit
      userSessionList.unshift(userSession); // Add to front for recency
      if (userSessionList.length > this.maxSessionsPerUser) {
        const removedSession = userSessionList.pop();
        if (removedSession) {
          this.fullSessions.delete(removedSession.sessionId);
        }
      }
    }

    this.userSessions.set(session.userId!, userSessionList);
  }

  /**
   * Get all sessions for a user with pagination
   */
  async getUserSessions(
    userId: UserId,
    options: {
      limit?: number;
      offset?: number;
      status?: SessionStatus;
    } = {}
  ): Promise<{ sessions: UserSession[]; total: number; hasMore: boolean }> {
    try {
      const { limit = 20, offset = 0, status } = options;

      if (this.useDynamoDB && this.dynamoDbClient) {
        return await this.getUserSessionsFromDynamoDB(userId, { limit, offset, status });
      } else {
        return await this.getUserSessionsFromMemory(userId, { limit, offset, status });
      }
    } catch (error) {
      logger.error('Error retrieving user sessions:', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        storage: this.useDynamoDB && this.dynamoDbClient ? 'DynamoDB' : 'memory',
      });
      throw new ServiceException('Failed to retrieve user sessions', error as Error);
    }
  }

  private async getUserSessionsFromDynamoDB(
    userId: UserId,
    options: { limit: number; offset: number; status?: SessionStatus }
  ): Promise<{ sessions: UserSession[]; total: number; hasMore: boolean }> {
    if (!this.dynamoDbClient) {
      throw new ServiceException('DynamoDB client not initialized');
    }

    const { limit, offset, status } = options;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryParams: any = {
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Sort by sort key descending (most recent first)
    };

    // If status filter is specified, use the GSI
    if (status) {
      queryParams.IndexName = 'UserIdStatusIndex';
      queryParams.KeyConditionExpression = 'userId = :userId AND #status = :status';
      queryParams.ExpressionAttributeNames = {
        '#status': 'status',
      };
      queryParams.ExpressionAttributeValues[':status'] = status;
    }

    const result = await this.dynamoDbClient.send(new QueryCommand(queryParams));
    const items = result.Items || [];

    // Convert DynamoDB items to UserSession format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allSessions: UserSession[] = items.map((item: any) => ({
      sessionId: item.sessionId,
      userId: item.userId,
      title: item.title,
      createdAt: item.createdAt,
      lastActivity: item.lastActivity,
      status: item.status,
      totalMessages: item.totalMessages,
      preview: item.preview,
    }));

    // Sort by lastActivity (most recent first) if not using status GSI
    if (!status) {
      allSessions.sort((a, b) => b.lastActivity - a.lastActivity);
    }

    const total = allSessions.length;
    const sessions = allSessions.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    logger.info('Retrieved user sessions from DynamoDB', {
      userId,
      total,
      returned: sessions.length,
      hasMore,
      status,
    });

    return { sessions, total, hasMore };
  }

  private async getUserSessionsFromMemory(
    userId: UserId,
    options: { limit: number; offset: number; status?: SessionStatus }
  ): Promise<{ sessions: UserSession[]; total: number; hasMore: boolean }> {
    const { limit, offset, status } = options;
    
    let userSessionList = this.userSessions.get(userId) || [];

    // Filter by status if specified
    if (status) {
      userSessionList = userSessionList.filter(session => session.status === status);
    }

    // Sort by last activity (most recent first)
    userSessionList.sort((a, b) => b.lastActivity - a.lastActivity);

    const total = userSessionList.length;
    const sessions = userSessionList.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    logger.info('Retrieved user sessions from memory', {
      userId,
      total,
      returned: sessions.length,
      hasMore,
      status,
    });

    return { sessions, total, hasMore };
  }

  /**
   * Get a complete session by ID for a specific user
   */
  async getUserSession(userId: UserId, sessionId: SessionId): Promise<Session> {
    try {
      if (this.useDynamoDB && this.dynamoDbClient) {
        return await this.getUserSessionFromDynamoDB(userId, sessionId);
      } else {
        return await this.getUserSessionFromMemory(userId, sessionId);
      }
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        throw error;
      }
      logger.error('Error retrieving user session:', error);
      throw new ServiceException('Failed to retrieve user session', error as Error);
    }
  }

  private async getUserSessionFromDynamoDB(userId: UserId, sessionId: SessionId): Promise<Session> {
    if (!this.dynamoDbClient) {
      throw new ServiceException('DynamoDB client not initialized');
    }

    const result = await this.dynamoDbClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        userId,
        sessionId,
      },
    }));

    if (!result.Item) {
      throw new ResourceNotFoundException(
        `Session with ID '${sessionId}' not found`,
        'session',
        sessionId
      );
    }

    const item = result.Item;

    // Convert DynamoDB item back to Session format
    const session: Session = {
      sessionId: item.sessionId,
      userId: item.userId,
      title: item.title,
      createdAt: item.createdAt,
      lastActivity: item.lastActivity,
      status: item.status,
      conversationHistory: item.conversationHistory || [],
      conversationTopic: item.conversationTopic,
      activePersonas: item.activePersonas || [],
      personaContexts: item.personaContexts || {},
      businessContext: item.businessContext,
      conversationFlow: item.conversationFlow,
      conversationLanguage: item.conversationLanguage,
      customPersonas: item.customPersonas,
      voiceSettings: item.voiceSettings,
      documentLinks: item.documentLinks,
      isResumable: item.isResumable !== false,
      totalMessages: item.totalMessages,
    };

    return session;
  }

  private async getUserSessionFromMemory(userId: UserId, sessionId: SessionId): Promise<Session> {
    const session = this.fullSessions.get(sessionId);

    if (!session) {
      throw new ResourceNotFoundException(
        `Session with ID '${sessionId}' not found`,
        'session',
        sessionId
      );
    }

    if (session.userId !== userId) {
      throw new ResourceNotFoundException(
        `Session with ID '${sessionId}' does not belong to user '${userId}'`,
        'session',
        sessionId
      );
    }

    return session;
  }

  /**
   * Update entire session
   */
  async updateSession(userId: UserId, session: Session): Promise<void> {
    try {
      if (this.useDynamoDB && this.dynamoDbClient) {
        await this.storeSessionInDynamoDB(session);
      } else {
        this.fullSessions.set(session.sessionId, session);
      }

      logger.info('Session updated', {
        userId,
        sessionId: session.sessionId,
        storage: this.useDynamoDB && this.dynamoDbClient ? 'DynamoDB' : 'memory'
      });
    } catch (error) {
      logger.error('Error updating session:', error);
      throw new ServiceException('Failed to update session', error as Error);
    }
  }

  /**
   * Update session title
   */
  async updateSessionTitle(userId: UserId, sessionId: SessionId, title: string): Promise<void> {
    try {
      if (this.useDynamoDB && this.dynamoDbClient) {
        await this.updateSessionTitleInDynamoDB(userId, sessionId, title);
      } else {
        await this.updateSessionTitleInMemory(userId, sessionId, title);
      }

      logger.info('Session title updated', {
        userId,
        sessionId,
        title,
        storage: this.useDynamoDB && this.dynamoDbClient ? 'DynamoDB' : 'memory'
      });
    } catch (error) {
      logger.error('Error updating session title:', error);
      throw new ServiceException('Failed to update session title', error as Error);
    }
  }

  private async updateSessionTitleInDynamoDB(userId: UserId, sessionId: SessionId, title: string): Promise<void> {
    if (!this.dynamoDbClient) {
      throw new ServiceException('DynamoDB client not initialized');
    }

    await this.dynamoDbClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        userId,
        sessionId,
      },
      UpdateExpression: 'SET title = :title, lastActivity = :lastActivity',
      ExpressionAttributeValues: {
        ':title': title,
        ':lastActivity': Date.now(),
      },
      ConditionExpression: 'attribute_exists(userId) AND attribute_exists(sessionId)',
    }));
  }

  private async updateSessionTitleInMemory(userId: UserId, sessionId: SessionId, title: string): Promise<void> {
    // Update full session
    const fullSession = this.fullSessions.get(sessionId);
    if (fullSession && fullSession.userId === userId) {
      fullSession.title = title;
    }

    // Update user session summary
    const userSessionList = this.userSessions.get(userId) || [];
    const sessionIndex = userSessionList.findIndex(s => s.sessionId === sessionId);
    if (sessionIndex >= 0) {
      userSessionList[sessionIndex].title = title;
      this.userSessions.set(userId, userSessionList);
    }
  }

  /**
   * Delete a user session
   */
  async deleteUserSession(userId: UserId, sessionId: SessionId): Promise<void> {
    try {
      if (this.useDynamoDB && this.dynamoDbClient) {
        await this.deleteUserSessionFromDynamoDB(userId, sessionId);
      } else {
        await this.deleteUserSessionFromMemory(userId, sessionId);
      }

      logger.info('User session deleted', { 
        userId, 
        sessionId, 
        storage: this.useDynamoDB && this.dynamoDbClient ? 'DynamoDB' : 'memory' 
      });
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        throw error;
      }
      logger.error('Error deleting user session:', error);
      throw new ServiceException('Failed to delete user session', error as Error);
    }
  }

  private async deleteUserSessionFromDynamoDB(userId: UserId, sessionId: SessionId): Promise<void> {
    if (!this.dynamoDbClient) {
      throw new ServiceException('DynamoDB client not initialized');
    }

    // First check if session exists
    const result = await this.dynamoDbClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { userId, sessionId },
    }));

    if (!result.Item) {
      throw new ResourceNotFoundException(
        `Session with ID '${sessionId}' not found for user '${userId}'`,
        'session',
        sessionId
      );
    }

    await this.dynamoDbClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { userId, sessionId },
    }));
  }

  private async deleteUserSessionFromMemory(userId: UserId, sessionId: SessionId): Promise<void> {
    // Remove from full sessions
    const fullSession = this.fullSessions.get(sessionId);
    if (!fullSession || fullSession.userId !== userId) {
      throw new ResourceNotFoundException(
        `Session with ID '${sessionId}' not found for user '${userId}'`,
        'session',
        sessionId
      );
    }

    this.fullSessions.delete(sessionId);

    // Remove from user session list
    const userSessionList = this.userSessions.get(userId) || [];
    const filteredList = userSessionList.filter(s => s.sessionId !== sessionId);
    this.userSessions.set(userId, filteredList);
  }

  /**
   * Check if a session exists for a user
   */
  async sessionExists(userId: UserId, sessionId: SessionId): Promise<boolean> {
    try {
      if (this.useDynamoDB && this.dynamoDbClient) {
        const result = await this.dynamoDbClient.send(new GetCommand({
          TableName: this.tableName,
          Key: { userId, sessionId },
        }));
        return !!result.Item;
      } else {
        const session = this.fullSessions.get(sessionId);
        return !!(session && session.userId === userId);
      }
    } catch (error) {
      logger.error('Error checking session existence:', error);
      return false;
    }
  }

  /**
   * Find a session by sessionId alone (without requiring userId)
   * This is useful for WebSocket connections that only have sessionId
   */
  async findSessionBySessionId(sessionId: SessionId): Promise<Session | null> {
    try {
      if (this.useDynamoDB && this.dynamoDbClient) {
        return await this.findSessionBySessionIdFromDynamoDB(sessionId);
      } else {
        return await this.findSessionBySessionIdFromMemory(sessionId);
      }
    } catch (error) {
      logger.error('Error finding session by sessionId:', { sessionId, error });
      return null;
    }
  }

  private async findSessionBySessionIdFromMemory(sessionId: SessionId): Promise<Session | null> {
    // In memory storage, sessions are indexed by sessionId
    const session = this.fullSessions.get(sessionId);
    return session || null;
  }

  private async findSessionBySessionIdFromDynamoDB(sessionId: SessionId): Promise<Session | null> {
    // For DynamoDB, we'd need to scan since sessionId is not the partition key
    // For now, return null to fall back to memory storage behavior
    logger.warn('DynamoDB session lookup by sessionId alone is not implemented');
    return null;
  }

  /**
   * Get session statistics for a user
   */
  async getUserSessionStats(userId: UserId): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    lastActivity?: number;
  }> {
    try {
      if (this.useDynamoDB && this.dynamoDbClient) {
        return await this.getUserSessionStatsFromDynamoDB(userId);
      } else {
        return await this.getUserSessionStatsFromMemory(userId);
      }
    } catch (error) {
      logger.error('Error getting user session stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        totalMessages: 0,
        lastActivity: undefined,
      };
    }
  }

  private async getUserSessionStatsFromDynamoDB(userId: UserId): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    lastActivity?: number;
  }> {
    if (!this.dynamoDbClient) {
      throw new ServiceException('DynamoDB client not initialized');
    }

    const result = await this.dynamoDbClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ProjectionExpression: '#status, totalMessages, lastActivity',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
    }));

    const sessions = result.Items || [];
    
    const stats = {
      totalSessions: sessions.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeSessions: sessions.filter((s: any) => s.status === SessionStatus.ACTIVE).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalMessages: sessions.reduce((sum: number, s: any) => sum + (s.totalMessages || 0), 0),
      lastActivity: sessions.length > 0 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? Math.max(...sessions.map((s: any) => s.lastActivity || 0))
        : undefined,
    };

    return stats;
  }

  private async getUserSessionStatsFromMemory(userId: UserId): Promise<{
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    lastActivity?: number;
  }> {
    const userSessionList = this.userSessions.get(userId) || [];
    
    const stats = {
      totalSessions: userSessionList.length,
      activeSessions: userSessionList.filter(s => s.status === SessionStatus.ACTIVE).length,
      totalMessages: userSessionList.reduce((sum, s) => sum + s.totalMessages, 0),
      lastActivity: userSessionList.length > 0 
        ? Math.max(...userSessionList.map(s => s.lastActivity))
        : undefined,
    };

    return stats;
  }

  private generateDefaultTitle(session: Session): string {
    const firstUserMessage = session.conversationHistory.find(
      msg => msg.sender === 'user'
    );

    if (firstUserMessage) {
      // Truncate and clean the message for title
      const title = firstUserMessage.content
        .slice(0, 50)
        .replace(/[^\w\s-]/g, '')
        .trim();
      return title || `Conversation Session`;
    }

    return `Conversation Session`;
  }

  private generatePreview(session: Session): string {
    const firstUserMessage = session.conversationHistory.find(
      msg => msg.sender === 'user'
    );
    
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 100) + (firstUserMessage.content.length > 100 ? '...' : '');
    }
    
    return 'New conversation';
  }

  /**
   * Cleanup expired sessions periodically
   */
  private startCleanupProcess(): void {
    const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
    const EXPIRED_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days

    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      // Clean up old sessions
      for (const [userId, userSessionList] of this.userSessions.entries()) {
        const filteredSessions = userSessionList.filter(session => {
          const isExpired = (now - session.lastActivity) > EXPIRED_THRESHOLD;
          if (isExpired) {
            this.fullSessions.delete(session.sessionId);
            cleanedCount++;
            return false;
          }
          return true;
        });

        if (filteredSessions.length !== userSessionList.length) {
          this.userSessions.set(userId, filteredSessions);
        }
      }

      if (cleanedCount > 0) {
        logger.info('User session cleanup completed', {
          cleanedSessions: cleanedCount,
          totalUsers: this.userSessions.size,
          totalSessions: this.fullSessions.size,
        });
      }
    }, CLEANUP_INTERVAL);
  }
}
