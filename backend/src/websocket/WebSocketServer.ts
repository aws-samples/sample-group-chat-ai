// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Server as HttpServer } from 'http';
import WebSocket from 'ws';
import { parse as parseUrl } from 'url';
import { createLogger } from '../config/logger';
import { WebSocketController } from './WebSocketController';
import { SessionService } from '../services/SessionService';

const logger = createLogger();

export class WebSocketServer {
  private wss: WebSocket.WebSocketServer;
  private webSocketController: WebSocketController;

  constructor(server: HttpServer, sessionService?: SessionService) {
    this.webSocketController = new WebSocketController(sessionService);

    // Create WebSocket server that shares the HTTP server
    this.wss = new WebSocket.WebSocketServer({
      server,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      verifyClient: (info: any) => {
        // Log all incoming WebSocket connection attempts
        logger.info('WebSocket connection attempt', {
          url: info.req.url,
          origin: info.origin,
          headers: info.req.headers,
        });

        // Basic verification - could be enhanced with authentication
        const url = parseUrl(info.req.url || '', true);
        const sessionId = this.extractSessionIdFromUrl(url.pathname || '');

        logger.info('WebSocket path parsing', {
          pathname: url.pathname,
          extractedSessionId: sessionId,
        });

        if (!sessionId) {
          logger.warn('WebSocket connection rejected - no session ID', {
            url: info.req.url,
            pathname: url.pathname,
            origin: info.origin,
          });
          return false;
        }

        logger.info('WebSocket connection approved', {
          sessionId,
          url: info.req.url,
        });
        return true;
      },
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized on HTTP server');
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', async (ws: WebSocket, request) => {
      try {
        // Extract session ID from URL path
        const url = parseUrl(request.url || '', true);
        const sessionId = this.extractSessionIdFromUrl(url.pathname || '');

        if (!sessionId) {
          logger.warn('WebSocket connection rejected - invalid session ID');
          ws.close(1008, 'Invalid session ID');
          return;
        }

        logger.info('New WebSocket connection', { sessionId });

        // Handle the connection through the controller
        await this.webSocketController.handleConnection(ws, sessionId);
      } catch (error) {
        logger.error('Error handling WebSocket connection', { error });
        ws.close(1011, 'Server error');
      }
    });

    this.wss.on('error', error => {
      logger.error('WebSocket server error', { error });
    });

    // Handle server shutdown
    process.on('SIGTERM', () => {
      this.shutdown();
    });

    process.on('SIGINT', () => {
      this.shutdown();
    });
  }

  /**
   * Extract session ID from WebSocket URL path
   * Expected format: /ws/sessions/{sessionId}
   */
  private extractSessionIdFromUrl(pathname: string): string | null {
    const matches = pathname.match(/^\/ws\/sessions\/([a-zA-Z0-9-_]+)$/);
    return matches ? matches[1] : null;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalWebSocketConnections: number;
    activeSessionConnections: number;
    activeSessions: string[];
  } {
    const sessionStats = this.webSocketController.getConnectionStats();

    return {
      totalWebSocketConnections: this.wss.clients.size,
      activeSessionConnections: sessionStats.totalConnections,
      activeSessions: sessionStats.activeSessions,
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    logger.info('Shutting down WebSocket server');

    // Close all connections
    this.webSocketController.closeAllConnections();

    // Close the WebSocket server
    this.wss.close(error => {
      if (error) {
        logger.error('Error closing WebSocket server', { error });
      } else {
        logger.info('WebSocket server closed successfully');
      }
    });
  }

  /**
   * Get WebSocket server instance (for testing or advanced usage)
   */
  getWebSocketServer(): WebSocket.WebSocketServer {
    return this.wss;
  }

  /**
   * Get WebSocket controller instance
   */
  getWebSocketController(): WebSocketController {
    return this.webSocketController;
  }
}
