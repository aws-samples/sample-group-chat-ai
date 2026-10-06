// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Server as HttpServer } from 'http';
import WebSocket from 'ws';
import { parse as parseUrl } from 'url';
import { createLogger } from '../config/logger';
import { WebSocketController } from './WebSocketController';
import { SessionService } from '../services/SessionService';
import { UserSessionStorage } from '../services/UserSessionStorage';
import { verifyAccessToken, AuthenticatedIdentity } from '../middleware/auth';

const logger = createLogger();

export class WebSocketServer {
  private wss: WebSocket.WebSocketServer;
  private webSocketController: WebSocketController;

  constructor(server: HttpServer, sessionService?: SessionService, userSessionStorage?: UserSessionStorage) {
    this.webSocketController = new WebSocketController(sessionService, userSessionStorage);

    // Create WebSocket server that shares the HTTP server
    this.wss = new WebSocket.WebSocketServer({
      server,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      verifyClient: (info: any, cb: (res: boolean, code?: number, message?: string) => void) => {
        const url = parseUrl(info.req.url || '', true);
        const sessionId = this.extractSessionIdFromUrl(url.pathname || '');

        if (!sessionId) {
          logger.warn('WebSocket connection rejected - no session ID', {
            url: info.req.url,
            pathname: url.pathname,
            origin: info.origin,
          });
          cb(false, 1008, 'Invalid session ID');
          return;
        }

        // Fail-closed authentication: the browser WebSocket API cannot set an
        // Authorization header, so the access token is passed as the `token`
        // query parameter (or `access_token`). verifyAccessToken enforces the
        // same Cognito verification and AUTH_DISABLED policy as the HTTP API.
        const token =
          (typeof url.query.token === 'string' && url.query.token) ||
          (typeof url.query.access_token === 'string' && url.query.access_token) ||
          null;

        verifyAccessToken(token)
          .then(identity => {
            // Stash the verified identity on the request for the connection
            // handler (ws passes the same req object through to 'connection').
            (info.req as { auth?: AuthenticatedIdentity }).auth = identity;
            logger.info('WebSocket connection approved', {
              sessionId,
              authenticatedSub: identity.sub,
            });
            cb(true);
          })
          .catch(error => {
            logger.warn('WebSocket connection rejected - invalid token', {
              sessionId,
              reason: error instanceof Error ? error.message : 'unknown',
            });
            cb(false, 1008, 'Unauthorized');
          });
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

        // Backstop: verifyClient already authenticated this handshake and set
        // request.auth. If it is somehow absent, fail closed.
        const identity = (request as { auth?: AuthenticatedIdentity }).auth;
        if (!identity) {
          logger.warn('WebSocket connection rejected - unauthenticated', { sessionId });
          ws.close(1008, 'Unauthorized');
          return;
        }

        logger.info('New WebSocket connection', { sessionId, authenticatedSub: identity.sub });

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
