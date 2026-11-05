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
import { TRUST_PROXY_HOPS } from '../config/trustProxy';
import { WebSocketRateLimiter, getClientIp, WS_CLOSE_RATE_LIMITED } from './rateLimiter';

const logger = createLogger();

/**
 * ws verifyClient callback. On rejection, `code` is the HTTP status of the
 * upgrade response (the handshake never became a WebSocket), so it must be a
 * real HTTP status such as 400/401/429, never a WebSocket close code.
 */
type VerifyClientCallback = (
  res: boolean,
  code?: number,
  message?: string,
  headers?: Record<string, string>
) => void;

export class WebSocketServer {
  private wss: WebSocket.WebSocketServer;
  private webSocketController: WebSocketController;
  private rateLimiter: WebSocketRateLimiter;

  constructor(
    server: HttpServer,
    sessionService?: SessionService,
    userSessionStorage?: UserSessionStorage,
    rateLimiter?: WebSocketRateLimiter
  ) {
    this.rateLimiter = rateLimiter || new WebSocketRateLimiter();
    this.webSocketController = new WebSocketController(
      sessionService,
      userSessionStorage,
      this.rateLimiter
    );

    // Create WebSocket server that shares the HTTP server
    this.wss = new WebSocket.WebSocketServer({
      server,
      verifyClient: (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        info: any,
        cb: VerifyClientCallback
      ) => {
        // A rejected handshake never becomes a WebSocket, so `code` here is the
        // HTTP status of the upgrade response, not a WebSocket close code. ws
        // writes it verbatim into the status line; a close code such as 1008
        // yields "HTTP/1.1 1008 undefined", which the ALB reports as a 502.
        try {
          this.verifyHandshake(info, cb);
        } catch (error) {
          // Fail closed on anything unexpected rather than letting the throw
          // escape the HTTP server's 'upgrade' listener.
          logger.error('WebSocket handshake verification failed unexpectedly', {
            reason: error instanceof Error ? error.message : 'unknown',
          });
          cb(false, 500, 'Internal Server Error');
        }
      },
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized on HTTP server');
  }

  private verifyHandshake(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    info: any,
    cb: VerifyClientCallback
  ): void {
    // Limit handshake attempts per client IP before any token
    // verification work, mirroring the REST limiter running ahead of auth.
    const clientIp = getClientIp(info.req, TRUST_PROXY_HOPS);
    if (!this.rateLimiter.allowHandshake(clientIp)) {
      logger.warn('WebSocket connection rejected - handshake rate limit', { clientIp });
      cb(false, 429, 'Too Many Requests', {
        'Retry-After': String(this.rateLimiter.handshakeRetryAfterSeconds(clientIp)),
      });
      return;
    }

    const url = parseUrl(info.req.url || '', true);
    const sessionId = this.extractSessionIdFromUrl(url.pathname || '');

    if (!sessionId) {
      logger.warn('WebSocket connection rejected - no session ID', {
        url: info.req.url,
        pathname: url.pathname,
        origin: info.origin,
      });
      cb(false, 400, 'Invalid session ID');
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

    // Promise.resolve().then() turns any synchronous throw from the
    // verifier into a rejection, so every failure lands in the 401 below.
    Promise.resolve()
      .then(() => verifyAccessToken(token))
      .then(
        identity => {
          // Cheap early rejection; the connection handler enforces the cap
          // authoritatively when it registers the socket.
          if (this.rateLimiter.isAtConnectionCap(identity.sub)) {
            logger.warn('WebSocket connection rejected - per-user connection cap', {
              sessionId,
              authenticatedSub: identity.sub,
            });
            cb(false, 429, 'Too Many Connections');
            return;
          }

          // Stash the verified identity on the request for the connection
          // handler (ws passes the same req object through to 'connection').
          (info.req as { auth?: AuthenticatedIdentity }).auth = identity;
          logger.info('WebSocket connection approved', {
            sessionId,
            authenticatedSub: identity.sub,
          });
          cb(true);
        },
        // Only a verification failure reaches this handler (it is the second
        // argument to then, not a trailing catch), so a throw after cb(true)
        // can never answer the same handshake twice.
        error => {
          logger.warn('WebSocket connection rejected - invalid token', {
            sessionId,
            reason: error instanceof Error ? error.message : 'unknown',
          });
          cb(false, 401, 'Unauthorized', { 'WWW-Authenticate': 'Bearer' });
        }
      )
      .catch(error => {
        logger.error('Error completing WebSocket handshake', {
          sessionId,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      });
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

        // Per-user concurrent connection cap. Registration and the count are
        // synchronous, so concurrent handshakes cannot overshoot the cap.
        if (!this.rateLimiter.registerConnection(ws, identity.sub)) {
          logger.warn('WebSocket connection closed - per-user connection cap', {
            sessionId,
            authenticatedSub: identity.sub,
          });
          ws.close(WS_CLOSE_RATE_LIMITED, 'Too many connections');
          return;
        }
        ws.once('close', () => this.rateLimiter.release(ws));

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

    this.rateLimiter.stop();

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
