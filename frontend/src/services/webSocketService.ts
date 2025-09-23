// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  WebSocketMessage,
  WebSocketMessageType,
  UserMessageWebSocket,
  PersonaTypingMessage,
  PersonaResponseWebSocket,
  AllPersonasFinishedMessage,
  WebSocketErrorMessage,
  ConnectionEstablishedMessage,
  PersonaAudioMessage,
  AudioErrorMessage,
  AudioAcknowledgmentMessage,
  ImageAttachment,
} from '@group-chat-ai/shared';
import { audioService } from './AudioService';

export interface WebSocketCallbacks {
  onConnectionEstablished?: (data: ConnectionEstablishedMessage) => void;
  onPersonaTyping?: (data: PersonaTypingMessage) => void;
  onPersonaResponse?: (data: PersonaResponseWebSocket) => void;
  onAllPersonasFinished?: (data: AllPersonasFinishedMessage) => void;
  onError?: (data: WebSocketErrorMessage) => void;
  onConnectionClosed?: () => void;
  onConnectionError?: (error: Event) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnectFailed?: (attempt: number) => void;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private reconnectInterval = 1000; // Start with 1 second
  private maxReconnectInterval = 30000; // Max 30 seconds between attempts
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private pingInterval = 30000; // Ping every 30 seconds
  private isManualClose = false;
  private lastPongReceived = 0;

  /**
   * Connect to WebSocket server for a specific session
   */
  connect(sessionId: string, callbacks: WebSocketCallbacks): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.sessionId = sessionId;
        this.callbacks = callbacks;
        this.isManualClose = false;

        // Close existing connection if any
        if (this.ws) {
          this.disconnect();
        }

        // Create WebSocket connection
        const wsUrl = this.getWebSocketUrl(sessionId);
        console.log('Attempting WebSocket connection to:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        // Set up event handlers
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully for session:', sessionId);
          this.reconnectAttempts = 0;
          this.lastPongReceived = Date.now();
          this.startPingTimer();
          resolve();
        };

        this.ws.onmessage = event => {
          console.log('📨 WebSocket message received:', event.data);
          this.handleMessage(event);
        };

        this.ws.onclose = event => {
          console.log('❌ WebSocket connection closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });

          if (this.callbacks.onConnectionClosed) {
            this.callbacks.onConnectionClosed();
          }

          // Attempt reconnection if not manually closed
          if (!this.isManualClose) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = error => {
          console.error('🚨 WebSocket error:', error);
          console.log('WebSocket state when error occurred:', this.ws?.readyState);
          console.log('WebSocket URL that failed:', wsUrl);

          if (this.callbacks.onConnectionError) {
            this.callbacks.onConnectionError(error);
          }

          reject(new Error('WebSocket connection failed'));
        };

        // Set connection timeout
        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 second timeout
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isManualClose = true;

    this.stopPingTimer();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.sessionId = null;
    this.callbacks = {};
  }

  /**
   * Send user message via WebSocket
   */
  sendMessage(
    content: string,
    directQuestionPersonaId?: string,
    imageAttachment?: ImageAttachment
  ): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionId) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    const userMessageData: UserMessageWebSocket = {
      content,
      directQuestionPersonaId,
      imageAttachment,
    };

    const message: WebSocketMessage = {
      type: WebSocketMessageType.USER_MESSAGE,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data: userMessageData,
    };

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Send audio acknowledgment to backend
   */
  sendAudioAcknowledgment(messageId: string, personaId: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionId) {
      console.warn('WebSocket not connected, cannot send audio acknowledgment');
      return false;
    }

    const acknowledgmentData: AudioAcknowledgmentMessage = {
      messageId,
      personaId,
      finished: true,
      timestamp: Date.now(),
    };

    const message: WebSocketMessage = {
      type: WebSocketMessageType.AUDIO_ACKNOWLEDGMENT,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      data: acknowledgmentData,
    };

    try {
      this.ws.send(JSON.stringify(message));
      console.log('🎧 Audio acknowledgment sent:', { messageId, personaId });
      return true;
    } catch (error) {
      console.error('Error sending audio acknowledgment:', error);
      return false;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): string {
    if (!this.ws) {return 'DISCONNECTED';}

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'DISCONNECTED';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Get current reconnect attempt number
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Manual reconnect - resets attempt counter and tries immediately
   */
  reconnect(): Promise<void> {
    if (!this.sessionId) {
      return Promise.reject(new Error('No session ID available for reconnection'));
    }

    // Reset attempts and try connecting immediately
    this.reconnectAttempts = 0;
    this.isManualClose = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    return this.connect(this.sessionId, this.callbacks);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case WebSocketMessageType.CONNECTION_ESTABLISHED:
          if (this.callbacks.onConnectionEstablished) {
            this.callbacks.onConnectionEstablished(message.data as ConnectionEstablishedMessage);
          }
          break;

        case WebSocketMessageType.PERSONA_TYPING:
          if (this.callbacks.onPersonaTyping) {
            this.callbacks.onPersonaTyping(message.data as PersonaTypingMessage);
          }
          break;

        case WebSocketMessageType.PERSONA_RESPONSE:
          if (this.callbacks.onPersonaResponse) {
            this.callbacks.onPersonaResponse(message.data as PersonaResponseWebSocket);
          }
          break;

        case WebSocketMessageType.ALL_PERSONAS_FINISHED:
          if (this.callbacks.onAllPersonasFinished) {
            this.callbacks.onAllPersonasFinished(message.data as AllPersonasFinishedMessage);
          }
          break;

        case WebSocketMessageType.PERSONA_AUDIO:
          // Handle persona audio message with acknowledgment callback
          audioService
            .handlePersonaAudio(
              message.data as PersonaAudioMessage,
              (messageId: string, personaId: string) => {
                // Send acknowledgment back to backend when audio finishes
                this.sendAudioAcknowledgment(messageId, personaId);
              }
            )
            .catch(error => {
              console.error('Error handling persona audio:', error);
            });
          break;

        case WebSocketMessageType.AUDIO_ERROR:
          // Handle audio error message
          audioService.handleAudioError(message.data as AudioErrorMessage);
          break;

        case WebSocketMessageType.ERROR:
          if (this.callbacks.onError) {
            this.callbacks.onError(message.data as WebSocketErrorMessage);
          }
          break;

        default:
          // Handle pong messages
          if (event.data === 'pong') {
            this.lastPongReceived = Date.now();
            console.log('📍 Pong received from server');
          } else {
            console.warn('Unknown WebSocket message type:', message.type);
          }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectInterval
    );

    console.log(
      `Scheduling WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`
    );

    // Notify callback about reconnection attempt
    if (this.callbacks.onReconnecting) {
      this.callbacks.onReconnecting(this.reconnectAttempts + 1);
    }

    this.reconnectTimer = setTimeout(() => {
      if (this.sessionId && !this.isManualClose) {
        this.reconnectAttempts++;
        this.connect(this.sessionId, this.callbacks).catch(error => {
          console.error('Reconnection failed:', error);
          if (this.callbacks.onReconnectFailed) {
            this.callbacks.onReconnectFailed(this.reconnectAttempts);
          }
          // Continue trying to reconnect
          this.scheduleReconnect();
        });
      }
    }, delay);
  }

  /**
   * Start ping timer to monitor connection health
   */
  private startPingTimer(): void {
    this.stopPingTimer();

    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping
        try {
          this.ws.send('ping');
          console.log('📍 Ping sent to server');

          // Check if we received a pong within reasonable time
          setTimeout(() => {
            const timeSinceLastPong = Date.now() - this.lastPongReceived;
            if (timeSinceLastPong > this.pingInterval * 2) {
              console.warn('🚨 No pong received, connection may be stale');
              // Close connection to trigger reconnection
              if (this.ws) {
                this.ws.close();
              }
            }
          }, 5000); // Wait 5 seconds for pong
        } catch (error) {
          console.error('Failed to send ping:', error);
        }
      }
    }, this.pingInterval);
  }

  /**
   * Stop ping timer
   */
  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Get WebSocket URL for session
   */
  private getWebSocketUrl(sessionId: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host;
    const importMeta = import.meta as { env?: Record<string, string> };
    if (importMeta?.env?.VITE_WS_HOST) {
      // Use explicit environment variable if set
      host = importMeta.env.VITE_WS_HOST;
    } else if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      // Development mode:
      // - Frontend (Vite) runs on port 3001
      // - Backend (Express + WebSocket) runs on port 3000
      // So WebSocket should connect to backend on port 3000
      host = `${window.location.hostname}:3000`;
    } else {
      // Production mode - CloudFront routes /ws/* directly to ALB
      // Use same host as frontend (CloudFront domain)
      host = window.location.host;
    }

    const url = `${protocol}//${host}/ws/sessions/${sessionId}`;
    console.log('WebSocket URL generated:', url);
    console.log('Production WebSocket routing: CloudFront → ALB → ECS WebSocket Server');
    return url;
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();
