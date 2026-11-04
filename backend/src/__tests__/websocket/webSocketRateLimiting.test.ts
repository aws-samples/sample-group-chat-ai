// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import http from 'http';
import { AddressInfo } from 'net';
import WebSocket from 'ws';
import { WebSocketMessageType } from '@group-chat-ai/shared';
import { WebSocketServer } from '../../websocket/WebSocketServer';
import { WebSocketRateLimiter, WebSocketRateLimitConfig } from '../../websocket/rateLimiter';
import { SessionService } from '../../services/SessionService';
import { UserSessionStorage } from '../../services/UserSessionStorage';

// With AUTH_DISABLED the token query parameter becomes the verified `sub`,
// which lets each test pick its own user. Cognito verification is unchanged.
process.env.AUTH_DISABLED = 'true';

interface Frame {
  type: string;
  data?: { error?: string; message?: string };
}

const testConfig = (
  overrides: Partial<WebSocketRateLimitConfig> = {}
): WebSocketRateLimitConfig => ({
  message: { max: 3, windowMs: 60_000, burst: 3 },
  userMessage: { max: 100, windowMs: 60_000, burst: 100 },
  frame: { max: 1000, windowMs: 60_000, burst: 1000 },
  maxViolations: 3,
  maxConnectionsPerUser: 2,
  handshake: { max: 100, windowMs: 60_000, maxKeys: 1000 },
  ...overrides,
});

describe('WebSocket rate limiting (integration)', () => {
  let httpServer: http.Server;
  let wsServer: WebSocketServer;
  let limiter: WebSocketRateLimiter;
  let port: number;
  // Stand-in for the LLM path: every user message that gets past the limiter
  // reaches processMessageStreaming, which is where Bedrock would be called.
  let processMessageStreaming: jest.Mock;
  const openSockets: WebSocket[] = [];

  const start = async (config: WebSocketRateLimitConfig) => {
    processMessageStreaming = jest.fn(async (_sessionId, _request, callbacks) => {
      callbacks.onAllFinished(0);
    });
    const sessionService = {
      getSession: jest.fn(async (sessionId: string) => ({ sessionId })),
      restoreSession: jest.fn(),
      processMessageStreaming,
      handleAudioAcknowledgment: jest.fn(),
    } as unknown as SessionService;
    const userSessionStorage = {
      findSessionBySessionId: jest.fn(async () => null),
    } as unknown as UserSessionStorage;

    limiter = new WebSocketRateLimiter(config, Date.now, { pruneIntervalMs: 0 });
    httpServer = http.createServer();
    wsServer = new WebSocketServer(httpServer, sessionService, userSessionStorage, limiter);
    // Loopback only: the test server must not be reachable from other hosts.
    await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
    port = (httpServer.address() as AddressInfo).port;
  };

  /** Open a socket and resolve once the server's connection_established frame arrives. */
  const connect = (user: string, sessionId: string) =>
    new Promise<{ ws: WebSocket; frames: Frame[] }>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/sessions/${sessionId}?token=${user}`);
      openSockets.push(ws);
      const frames: Frame[] = [];
      ws.on('message', raw => {
        const frame = JSON.parse(raw.toString()) as Frame;
        frames.push(frame);
        if (frame.type === WebSocketMessageType.CONNECTION_ESTABLISHED) {
          resolve({ ws, frames });
        }
      });
      ws.on('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
      ws.on('close', code => reject(new Error(`closed ${code}`)));
      ws.on('error', reject);
    });

  const sendUserMessage = (ws: WebSocket, sessionId: string, content: string) =>
    ws.send(
      JSON.stringify({
        type: WebSocketMessageType.USER_MESSAGE,
        sessionId,
        timestamp: Date.now(),
        data: { content },
      })
    );

  const waitFor = async (predicate: () => boolean, timeoutMs = 3000) => {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
      if (Date.now() > deadline) {
        throw new Error('Timed out waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

  afterEach(async () => {
    for (const ws of openSockets.splice(0)) {
      ws.removeAllListeners();
      ws.on('error', () => undefined);
      ws.terminate();
    }
    wsServer.shutdown();
    await new Promise(resolve => httpServer.close(resolve));
  });

  it('lets normal traffic through', async () => {
    await start(testConfig());
    const { ws, frames } = await connect('user-normal', 'session-normal');

    sendUserMessage(ws, 'session-normal', 'hello');
    sendUserMessage(ws, 'session-normal', 'hello again');

    await waitFor(() => processMessageStreaming.mock.calls.length === 2);
    await waitFor(
      () => frames.filter(f => f.type === WebSocketMessageType.ALL_PERSONAS_FINISHED).length === 2
    );
    expect(frames.some(f => f.type === WebSocketMessageType.ERROR)).toBe(false);
  });

  it('answers an over-limit message with an error frame and never calls the LLM for it', async () => {
    await start(testConfig());
    const { ws, frames } = await connect('user-burst', 'session-burst');

    for (let i = 0; i < 4; i++) {
      sendUserMessage(ws, 'session-burst', `message ${i}`);
    }

    await waitFor(() => frames.some(f => f.type === WebSocketMessageType.ERROR));
    const error = frames.find(f => f.type === WebSocketMessageType.ERROR);
    expect(error?.data?.error).toBe('Rate limit exceeded');
    await waitFor(() => processMessageStreaming.mock.calls.length === 3);
    // Give a dropped message time to (wrongly) reach the LLM path.
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(processMessageStreaming).toHaveBeenCalledTimes(3);
  });

  it('closes a connection that keeps exceeding the limit with 4429', async () => {
    await start(testConfig());
    const { ws } = await connect('user-flood', 'session-flood');
    const closed = new Promise<number>(resolve => ws.on('close', code => resolve(code)));
    ws.removeAllListeners('error');
    ws.on('error', () => undefined);

    for (let i = 0; i < 10; i++) {
      sendUserMessage(ws, 'session-flood', `message ${i}`);
    }

    expect(await closed).toBe(4429);
    expect(processMessageStreaming).toHaveBeenCalledTimes(3);
  });

  it('caps concurrent connections per user and frees the slot on disconnect', async () => {
    await start(testConfig());
    const first = await connect('user-cap', 'session-cap-1');
    await connect('user-cap', 'session-cap-2');

    await expect(connect('user-cap', 'session-cap-3')).rejects.toThrow('HTTP 429');
    // A different user is unaffected.
    await connect('user-other', 'session-other-1');

    first.ws.close();
    await waitFor(() => !limiter.isAtConnectionCap('user-cap'));
    await connect('user-cap', 'session-cap-4');
    expect(limiter.stats().users).toBe(2);
  });

  it('rejects handshakes over the per-IP limit with 429', async () => {
    await start(testConfig({ handshake: { max: 2, windowMs: 60_000, maxKeys: 1000 } }));
    await connect('user-ip-1', 'session-ip-1');
    await connect('user-ip-2', 'session-ip-2');
    await expect(connect('user-ip-3', 'session-ip-3')).rejects.toThrow('HTTP 429');
  });
});
