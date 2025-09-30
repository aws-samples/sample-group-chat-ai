// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import WebSocket from 'ws';
import {
  WebSocketMessage,
  WebSocketMessageType,
  PersonaTypingMessage,
  PersonaResponseWebSocket,
  AllPersonasFinishedMessage,
  WebSocketErrorMessage,
  ConnectionEstablishedMessage,
  PersonaAudioMessage,
  AudioErrorMessage,
  AudioAcknowledgmentMessage,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';

const logger = createLogger();

export class SessionWebSocketManager {
  private sessionConnections: Map<string, WebSocket> = new Map();
  private connectionSessions: Map<WebSocket, string> = new Map();

  /**
   * Register a WebSocket connection for a specific session
   */
  connectSession(sessionId: string, ws: WebSocket): void {
    try {
      // Remove any existing connection for this session
      const existingConnection = this.sessionConnections.get(sessionId);
      if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
        logger.info('Closing existing WebSocket connection for session', { sessionId });
        existingConnection.close();
      }

      // Register new connection
      this.sessionConnections.set(sessionId, ws);
      this.connectionSessions.set(ws, sessionId);

      // Set up connection event handlers
      ws.on('close', () => {
        this.disconnectSession(sessionId);
      });

      ws.on('error', error => {
        logger.error('WebSocket error for session', { sessionId, error: error.message });
        this.sendErrorToSession(sessionId, 'WebSocket connection error', error.message);
      });

      // Send connection established message
      this.sendConnectionEstablished(sessionId);

      logger.info('WebSocket connection established for session', { sessionId });
    } catch (error) {
      logger.error('Error connecting session WebSocket', { sessionId, error });
      throw error;
    }
  }

  /**
   * Remove WebSocket connection for a session
   */
  disconnectSession(sessionId: string): void {
    try {
      const connection = this.sessionConnections.get(sessionId);
      if (connection) {
        this.connectionSessions.delete(connection);
        this.sessionConnections.delete(sessionId);

        if (connection.readyState === WebSocket.OPEN) {
          connection.close();
        }

        logger.info('WebSocket connection disconnected for session', { sessionId });
      }
    } catch (error) {
      logger.error('Error disconnecting session WebSocket', { sessionId, error });
    }
  }

  /**
   * Send a message to a specific session
   */
  sendToSession(sessionId: string, message: WebSocketMessage): boolean {
    try {
      const connection = this.sessionConnections.get(sessionId);

      if (!connection || connection.readyState !== WebSocket.OPEN) {
        logger.warn('No active WebSocket connection for session', { sessionId });
        return false;
      }

      connection.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger.error('Error sending message to session', { sessionId, error });
      return false;
    }
  }

  /**
   * Send typing indicator for a persona
   */
  sendPersonaTyping(
    sessionId: string,
    personaId: string,
    personaName: string,
    isTyping: boolean
  ): void {
    const typingData: PersonaTypingMessage = {
      personaId,
      personaName,
      isTyping,
    };

    const message: WebSocketMessage = {
      type: WebSocketMessageType.PERSONA_TYPING,
      sessionId,
      timestamp: Date.now(),
      data: typingData,
    };

    this.sendToSession(sessionId, message);
  }

  /**
   * Send persona response
   */
  sendPersonaResponse(sessionId: string, response: PersonaResponseWebSocket): void {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.PERSONA_RESPONSE,
      sessionId,
      timestamp: Date.now(),
      data: response,
    };

    this.sendToSession(sessionId, message);
  }

  /**
   * Send all personas finished signal
   */
  sendAllPersonasFinished(sessionId: string, totalResponses: number): void {
    const finishedData: AllPersonasFinishedMessage = {
      totalResponses,
      timestamp: Date.now(),
    };

    const message: WebSocketMessage = {
      type: WebSocketMessageType.ALL_PERSONAS_FINISHED,
      sessionId,
      timestamp: Date.now(),
      data: finishedData,
    };

    this.sendToSession(sessionId, message);
  }

  /**
   * Send persona audio message
   */
  sendPersonaAudio(sessionId: string, audioData: PersonaAudioMessage): void {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.PERSONA_AUDIO,
      sessionId,
      timestamp: Date.now(),
      data: audioData,
    };

    this.sendToSession(sessionId, message);
  }

  /**
   * Send audio error message
   */
  sendAudioError(sessionId: string, audioError: AudioErrorMessage): void {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.AUDIO_ERROR,
      sessionId,
      timestamp: Date.now(),
      data: audioError,
    };

    this.sendToSession(sessionId, message);
  }

  /**
   * Send audio acknowledgment message
   */
  sendAudioAcknowledgment(sessionId: string, audioAck: AudioAcknowledgmentMessage): void {
    const message: WebSocketMessage = {
      type: WebSocketMessageType.AUDIO_ACKNOWLEDGMENT,
      sessionId,
      timestamp: Date.now(),
      data: audioAck,
    };

    this.sendToSession(sessionId, message);
  }

  /**
   * Send error message to session
   */
  sendErrorToSession(sessionId: string, error: string, details: string): void {
    const errorData: WebSocketErrorMessage = {
      error,
      message: details,
      timestamp: Date.now(),
    };

    const message: WebSocketMessage = {
      type: WebSocketMessageType.ERROR,
      sessionId,
      timestamp: Date.now(),
      data: errorData,
    };

    this.sendToSession(sessionId, message);
  }

  /**
   * Send connection established message
   */
  private sendConnectionEstablished(sessionId: string): void {
    const now = Date.now();
    const connectionData: ConnectionEstablishedMessage = {
      sessionId,
      timestamp: now,
      connectedAt: now,
    };

    const message: WebSocketMessage = {
      type: WebSocketMessageType.CONNECTION_ESTABLISHED,
      sessionId,
      timestamp: Date.now(),
      data: connectionData,
    };

    this.sendToSession(sessionId, message);
  }

  /**
   * Check if session has active WebSocket connection
   */
  hasActiveConnection(sessionId: string): boolean {
    const connection = this.sessionConnections.get(sessionId);
    return connection !== undefined && connection.readyState === WebSocket.OPEN;
  }

  /**
   * Get session ID from WebSocket connection
   */
  getSessionId(ws: WebSocket): string | undefined {
    return this.connectionSessions.get(ws);
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): { totalConnections: number; activeSessions: string[] } {
    const activeSessions = Array.from(this.sessionConnections.keys()).filter(sessionId =>
      this.hasActiveConnection(sessionId)
    );

    return {
      totalConnections: activeSessions.length,
      activeSessions,
    };
  }

  /**
   * Close all connections (for server shutdown)
   */
  closeAllConnections(): void {
    logger.info('Closing all WebSocket connections');

    for (const [sessionId, connection] of this.sessionConnections.entries()) {
      try {
        if (connection.readyState === WebSocket.OPEN) {
          connection.close();
        }
      } catch (error) {
        logger.error('Error closing WebSocket connection', { sessionId, error });
      }
    }

    this.sessionConnections.clear();
    this.connectionSessions.clear();
  }
}
