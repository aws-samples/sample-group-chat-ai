// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import WebSocket from 'ws';
import {
  WebSocketMessage,
  WebSocketMessageType,
  UserMessageWebSocket,
  SendMessageRequest,
  PersonaResponse,
  AudioAcknowledgmentMessage,
  generateMessageId,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { SessionWebSocketManager } from './SessionWebSocketManager';
import { SessionService } from '../services/SessionService';
import { UserSessionStorage } from '../services/UserSessionStorage';

const logger = createLogger();

export class WebSocketController {
  private sessionWebSocketManager: SessionWebSocketManager;
  private sessionService: SessionService;
  private userSessionStorage: UserSessionStorage;

  constructor(sessionService?: SessionService, userSessionStorage?: UserSessionStorage) {
    this.sessionWebSocketManager = new SessionWebSocketManager();
    this.sessionService = sessionService || new SessionService();
    this.userSessionStorage = userSessionStorage || new UserSessionStorage();
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws: WebSocket, sessionId: string): Promise<void> {
    try {
      // First, try to get session from active SessionService
      let session = await this.sessionService.getSession(sessionId);

      // If not found in active sessions, check persistent storage
      if (!session) {
        logger.info('Session not found in active sessions, checking persistent storage', { sessionId });
        const storedSession = await this.userSessionStorage.findSessionBySessionId(sessionId);

        if (!storedSession) {
          logger.warn('WebSocket connection attempted for non-existent session', { sessionId });
          ws.close(1008, 'Session not found');
          return;
        }

        // Restore session to active memory
        logger.info('Restoring session to active memory for WebSocket connection', {
          sessionId,
          userId: storedSession.userId
        });
        this.sessionService.restoreSession(storedSession);
        session = storedSession;
      }

      // Register the connection
      this.sessionWebSocketManager.connectSession(sessionId, ws);

      // Set up message handling
      ws.on('message', async (data: WebSocket.Data) => {
        await this.handleMessage(ws, data);
      });

      logger.info('WebSocket connection established and configured', { sessionId });
    } catch (error) {
      logger.error('Error handling WebSocket connection', { sessionId, error });
      ws.close(1011, 'Server error during connection setup');
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: WebSocket, data: WebSocket.Data): Promise<void> {
    try {
      const sessionId = this.sessionWebSocketManager.getSessionId(ws);
      if (!sessionId) {
        logger.warn('Received message from unregistered WebSocket connection');
        ws.close(1008, 'Connection not registered');
        return;
      }

      // Parse message
      let message: WebSocketMessage;
      try {
        message = JSON.parse(data.toString());
      } catch {
        logger.warn('Invalid JSON received from WebSocket', { sessionId });
        this.sessionWebSocketManager.sendErrorToSession(
          sessionId,
          'Invalid message format',
          'Message must be valid JSON'
        );
        return;
      }

      // Validate message structure
      if (!message.type || !message.sessionId || message.sessionId !== sessionId) {
        logger.warn('Invalid message structure', { sessionId, messageType: message.type });
        this.sessionWebSocketManager.sendErrorToSession(
          sessionId,
          'Invalid message',
          'Message must include valid type and sessionId'
        );
        return;
      }

      // Route message based on type
      logger.info('DEBUG: Backend WebSocket enum values', {
        sessionId,
        messageType: message.type,
        USER_MESSAGE: WebSocketMessageType.USER_MESSAGE,
        CONNECTION_ESTABLISHED: WebSocketMessageType.CONNECTION_ESTABLISHED,
        ERROR: WebSocketMessageType.ERROR,
        AUDIO_ACKNOWLEDGMENT: WebSocketMessageType.AUDIO_ACKNOWLEDGMENT,
        fullMessage: JSON.stringify(message).substring(0, 200),
      });

      switch (message.type) {
        case WebSocketMessageType.USER_MESSAGE:
          await this.handleUserMessage(sessionId, message.data as UserMessageWebSocket);
          break;

        case WebSocketMessageType.AUDIO_ACKNOWLEDGMENT:
          await this.handleAudioAcknowledgment(
            sessionId,
            message.data as AudioAcknowledgmentMessage
          );
          break;

        default:
          logger.warn('Unknown WebSocket message type', {
            sessionId,
            messageType: message.type,
          });
          this.sessionWebSocketManager.sendErrorToSession(
            sessionId,
            'Unknown message type',
            `Message type '${message.type}' is not supported`
          );
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { error });

      const sessionId = this.sessionWebSocketManager.getSessionId(ws);
      if (sessionId) {
        this.sessionWebSocketManager.sendErrorToSession(
          sessionId,
          'Message processing error',
          'An error occurred while processing your message'
        );
      }
    }
  }

  /**
   * Handle user message and stream persona responses
   */
  private async handleUserMessage(sessionId: string, data: UserMessageWebSocket): Promise<void> {
    try {
      logger.info('Processing user message via WebSocket', {
        sessionId,
        messageLength: data.content?.length,
        hasDirectPersona: !!data.directQuestionPersonaId,
        hasImage: !!data.imageAttachment,
      });

      // Convert to SendMessageRequest format
      const request: SendMessageRequest = {
        content: data.content,
        directQuestionPersonaId: data.directQuestionPersonaId,
        imageAttachment: data.imageAttachment,
      };

      // Process message with streaming callbacks
      await this.sessionService.processMessageStreaming(sessionId, request, {
        onPersonaStartTyping: (personaId: string, personaName: string) => {
          logger.debug('Persona started typing', { sessionId, personaId });
          this.sessionWebSocketManager.sendPersonaTyping(sessionId, personaId, personaName, true);
        },

        onPersonaResponse: (response: PersonaResponse) => {
          logger.debug('Persona response ready', { sessionId, personaId: response.personaId });

          // Stop typing indicator
          this.sessionWebSocketManager.sendPersonaTyping(
            sessionId,
            response.personaId,
            response.personaName,
            false
          );

          // Send the response
          this.sessionWebSocketManager.sendPersonaResponse(sessionId, {
            personaId: response.personaId,
            personaName: response.personaName,
            personaRole: response.personaRole,
            content: response.content,
            timestamp: response.timestamp,
            messageId: generateMessageId(),
          });
        },

        onPersonaAudio: (
          messageId: string,
          personaId: string,
          audioUrl: string,
          duration?: number,
          voiceId?: string
        ) => {
          logger.debug('Persona audio ready', {
            sessionId,
            personaId,
            messageId,
            duration,
            voiceId,
          });

          // Send the audio message
          this.sessionWebSocketManager.sendPersonaAudio(sessionId, {
            messageId,
            personaId,
            audioUrl,
            duration,
            voiceId: voiceId || 'unknown',
          });
        },

        onAllFinished: (totalResponses: number) => {
          logger.info('All personas finished responding', {
            sessionId,
            totalResponses,
          });

          this.sessionWebSocketManager.sendAllPersonasFinished(sessionId, totalResponses);
        },

        onError: (error: string, details: string) => {
          logger.error('Error during streaming message processing', {
            sessionId,
            error,
            details,
          });

          this.sessionWebSocketManager.sendErrorToSession(sessionId, error, details);
        },

        onAudioError: (messageId: string, personaId: string, error: string) => {
          logger.error('Error generating persona audio', {
            sessionId,
            personaId,
            messageId,
            error,
          });

          // Send the audio error message
          this.sessionWebSocketManager.sendAudioError(sessionId, {
            messageId,
            personaId,
            error,
            timestamp: Date.now(),
          });
        },
      });
    } catch (error) {
      logger.error('Error processing user message', { sessionId, error });

      this.sessionWebSocketManager.sendErrorToSession(
        sessionId,
        'Message processing failed',
        'An error occurred while processing your message. Please try again.'
      );
    }
  }

  /**
   * Handle audio acknowledgment from frontend
   */
  private async handleAudioAcknowledgment(
    sessionId: string,
    data: AudioAcknowledgmentMessage
  ): Promise<void> {
    try {
      logger.debug('Received audio acknowledgment', {
        sessionId,
        messageId: data.messageId,
        personaId: data.personaId,
        finished: data.finished,
      });

      // Forward acknowledgment to session service for queue processing
      await this.sessionService.handleAudioAcknowledgment(
        sessionId,
        data.messageId,
        data.personaId
      );
    } catch (error) {
      logger.error('Error processing audio acknowledgment', {
        sessionId,
        messageId: data.messageId,
        personaId: data.personaId,
        error,
      });

      this.sessionWebSocketManager.sendErrorToSession(
        sessionId,
        'Audio acknowledgment processing failed',
        'An error occurred while processing audio acknowledgment'
      );
    }
  }

  /**
   * Handle connection disconnection
   */
  handleDisconnection(sessionId: string): void {
    try {
      this.sessionWebSocketManager.disconnectSession(sessionId);
      logger.info('WebSocket connection cleaned up', { sessionId });
    } catch (error) {
      logger.error('Error handling WebSocket disconnection', { sessionId, error });
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): { totalConnections: number; activeSessions: string[] } {
    return this.sessionWebSocketManager.getConnectionStats();
  }

  /**
   * Close all connections (for server shutdown)
   */
  closeAllConnections(): void {
    this.sessionWebSocketManager.closeAllConnections();
  }

  /**
   * Get SessionWebSocketManager instance (for server setup)
   */
  getSessionWebSocketManager(): SessionWebSocketManager {
    return this.sessionWebSocketManager;
  }
}
