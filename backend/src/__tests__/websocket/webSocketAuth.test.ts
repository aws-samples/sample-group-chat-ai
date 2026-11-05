// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import http from 'http';
import net from 'net';
import { AddressInfo } from 'net';
import { generateKeyPairSync, createSign, KeyObject } from 'crypto';
import WebSocket from 'ws';
import { WebSocketMessageType } from '@group-chat-ai/shared';
import { WebSocketServer } from '../../websocket/WebSocketServer';
import { WebSocketRateLimiter, WebSocketRateLimitConfig } from '../../websocket/rateLimiter';
import { SessionService } from '../../services/SessionService';
import { UserSessionStorage } from '../../services/UserSessionStorage';

// Real Cognito verification, no AUTH_DISABLED. The verifier is the genuine
// aws-jwt-verify CognitoJwtVerifier; the only test seam is that its JWKS cache
// is pre-loaded with a locally generated key, so no request ever leaves the
// process and signature, expiry, token_use and client_id checks all run for real.
const REGION = 'us-east-1';
const USER_POOL_ID = `${REGION}_TestPool1`;
const CLIENT_ID = 'test-client-id';
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const KID = 'test-key-1';

process.env.COGNITO_USER_POOL_ID = USER_POOL_ID;
process.env.COGNITO_CLIENT_ID = CLIENT_ID;
delete process.env.AUTH_DISABLED;

const signingKey = generateKeyPairSync('rsa', { modulusLength: 2048 });
// A second key published under the SAME kid: tokens it signs must fail the
// signature check (and, sharing the kid, never trigger a JWKS refetch).
const impostorKey = generateKeyPairSync('rsa', { modulusLength: 2048 });

const testJwks = {
  keys: [{ ...signingKey.publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' }],
};

jest.mock('aws-jwt-verify', () => {
  const actual = jest.requireActual('aws-jwt-verify');
  return {
    ...actual,
    CognitoJwtVerifier: {
      create: (...args: unknown[]) => {
        const verifier = actual.CognitoJwtVerifier.create(...args);
        verifier.cacheJwks(testJwks);
        return verifier;
      },
    },
  };
});

const b64url = (input: string) => Buffer.from(input, 'utf8').toString('base64url');

function makeToken(
  claims: Record<string, unknown> = {},
  key: KeyObject = signingKey.privateKey
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', kid: KID, typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: 'user-123',
      iss: ISSUER,
      client_id: CLIENT_ID,
      token_use: 'access',
      username: 'alice',
      iat: now,
      exp: now + 3600,
      ...claims,
    })
  );
  const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(key, 'base64url');
  return `${header}.${payload}.${signature}`;
}

const testConfig = (
  overrides: Partial<WebSocketRateLimitConfig> = {}
): WebSocketRateLimitConfig => ({
  message: { max: 100, windowMs: 60_000, burst: 100 },
  userMessage: { max: 100, windowMs: 60_000, burst: 100 },
  frame: { max: 1000, windowMs: 60_000, burst: 1000 },
  maxViolations: 3,
  maxConnectionsPerUser: 5,
  handshake: { max: 100, windowMs: 60_000, maxKeys: 1000 },
  ...overrides,
});

interface HandshakeResult {
  /** Raw HTTP status line the server wrote for the upgrade response. */
  statusLine: string;
  headers: string;
}

describe('WebSocket handshake authentication', () => {
  let httpServer: http.Server;
  let wsServer: WebSocketServer;
  let port: number;
  const openSockets: WebSocket[] = [];

  const start = async (config: WebSocketRateLimitConfig = testConfig()) => {
    const sessionService = {
      getSession: jest.fn(async (sessionId: string) => ({ sessionId })),
      restoreSession: jest.fn(),
      processMessageStreaming: jest.fn(),
      handleAudioAcknowledgment: jest.fn(),
    } as unknown as SessionService;
    const userSessionStorage = {
      findSessionBySessionId: jest.fn(async () => null),
    } as unknown as UserSessionStorage;

    const limiter = new WebSocketRateLimiter(config, Date.now, { pruneIntervalMs: 0 });
    httpServer = http.createServer();
    wsServer = new WebSocketServer(httpServer, sessionService, userSessionStorage, limiter);
    // Loopback only: the test server must not be reachable from other hosts.
    await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve));
    port = (httpServer.address() as AddressInfo).port;
  };

  /**
   * Send a raw upgrade request and capture the response head exactly as
   * written, the way a load balancer sees it. This is what proves the status
   * line is valid HTTP rather than a WebSocket close code.
   */
  const rawHandshake = (path: string) =>
    new Promise<HandshakeResult>((resolve, reject) => {
      const socket = net.connect(port, '127.0.0.1', () => {
        socket.write(
          `GET ${path} HTTP/1.1\r\n` +
            `Host: 127.0.0.1:${port}\r\n` +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
            'Sec-WebSocket-Version: 13\r\n\r\n'
        );
      });
      let data = '';
      socket.on('data', chunk => {
        data += chunk.toString();
        const end = data.indexOf('\r\n\r\n');
        if (end !== -1) {
          socket.destroy();
          const [statusLine, ...headerLines] = data.slice(0, end).split('\r\n');
          resolve({ statusLine, headers: headerLines.join('\n') });
        }
      });
      socket.on('error', reject);
    });

  /** Connect with the ws client and resolve once connection_established arrives. */
  const connect = (query: string) =>
    new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/sessions/session-1${query}`);
      openSockets.push(ws);
      ws.on('message', raw => {
        if (JSON.parse(raw.toString()).type === WebSocketMessageType.CONNECTION_ESTABLISHED) {
          resolve(ws);
        }
      });
      ws.on('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
      ws.on('error', reject);
    });

  afterEach(async () => {
    for (const ws of openSockets.splice(0)) {
      ws.terminate();
    }
    wsServer.shutdown();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  const expectUnauthorized = (result: HandshakeResult) => {
    expect(result.statusLine).toBe('HTTP/1.1 401 Unauthorized');
    expect(result.headers).toMatch(/^WWW-Authenticate: Bearer$/m);
  };

  it('rejects a handshake with no token with 401', async () => {
    await start();
    expectUnauthorized(await rawHandshake('/ws/sessions/session-1'));
  });

  it('rejects an empty token with 401', async () => {
    await start();
    expectUnauthorized(await rawHandshake('/ws/sessions/session-1?token='));
  });

  it('rejects a malformed token with 401', async () => {
    await start();
    expectUnauthorized(await rawHandshake('/ws/sessions/session-1?token=not-a-jwt'));
    expectUnauthorized(await rawHandshake('/ws/sessions/session-1?token=a.b.c'));
  });

  it('rejects an expired token with 401', async () => {
    await start();
    const now = Math.floor(Date.now() / 1000);
    const expired = makeToken({ iat: now - 7200, exp: now - 3600 });
    expectUnauthorized(await rawHandshake(`/ws/sessions/session-1?token=${expired}`));
  });

  it('rejects a token with a bad signature with 401', async () => {
    await start();
    const forged = makeToken({}, impostorKey.privateKey);
    expectUnauthorized(await rawHandshake(`/ws/sessions/session-1?token=${forged}`));
  });

  it('rejects an ID token or a token for another client with 401', async () => {
    await start();
    const idToken = makeToken({ token_use: 'id' });
    const otherClient = makeToken({ client_id: 'some-other-client' });
    expectUnauthorized(await rawHandshake(`/ws/sessions/session-1?token=${idToken}`));
    expectUnauthorized(await rawHandshake(`/ws/sessions/session-1?access_token=${otherClient}`));
  });

  it('rejects a bad session path with 400, not a WebSocket close code', async () => {
    await start();
    const result = await rawHandshake(`/ws/not-a-session?token=${makeToken()}`);
    expect(result.statusLine).toBe('HTTP/1.1 400 Bad Request');
  });

  it('still connects with a valid access token (token and access_token params)', async () => {
    await start();
    const ws = await connect(`?token=${makeToken()}`);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    const ws2 = await connect(`?access_token=${makeToken({ sub: 'user-456' })}`);
    expect(ws2.readyState).toBe(WebSocket.OPEN);
  });

  it('keeps the per-IP handshake limit ahead of token verification', async () => {
    await start(testConfig({ handshake: { max: 2, windowMs: 60_000, maxKeys: 1000 } }));
    expectUnauthorized(await rawHandshake('/ws/sessions/session-1?token=bad'));
    expectUnauthorized(await rawHandshake('/ws/sessions/session-1?token=bad'));
    const limited = await rawHandshake(`/ws/sessions/session-1?token=${makeToken()}`);
    expect(limited.statusLine).toBe('HTTP/1.1 429 Too Many Requests');
    expect(limited.headers).toMatch(/^Retry-After: \d+$/m);
  });
});
