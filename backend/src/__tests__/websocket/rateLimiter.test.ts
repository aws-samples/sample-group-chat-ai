// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { IncomingMessage } from 'http';
import {
  KeyedTokenBucket,
  WebSocketRateLimiter,
  WebSocketRateLimitConfig,
  getClientIp,
  loadWebSocketRateLimitConfig,
} from '../../websocket/rateLimiter';

const fakeClock = (start = 1_000_000) => {
  let t = start;
  const now = () => t;
  now.advance = (ms: number) => {
    t += ms;
  };
  return now;
};

const config = (overrides: Partial<WebSocketRateLimitConfig> = {}): WebSocketRateLimitConfig => ({
  message: { max: 6, windowMs: 60_000, burst: 2 },
  userMessage: { max: 60, windowMs: 60_000, burst: 3 },
  frame: { max: 600, windowMs: 60_000, burst: 100 },
  maxViolations: 3,
  maxConnectionsPerUser: 2,
  handshake: { max: 3, windowMs: 60_000, maxKeys: 2 },
  ...overrides,
});

describe('KeyedTokenBucket', () => {
  it('allows a burst, then refills at max/windowMs', () => {
    const clock = fakeClock();
    const bucket = new KeyedTokenBucket({ max: 6, windowMs: 60_000, burst: 2 }, clock);

    expect(bucket.tryConsume('a')).toBe(true);
    expect(bucket.tryConsume('a')).toBe(true);
    expect(bucket.tryConsume('a')).toBe(false);
    expect(bucket.retryAfterMs('a')).toBe(10_000);

    clock.advance(9_999);
    expect(bucket.tryConsume('a')).toBe(false);
    clock.advance(1);
    expect(bucket.tryConsume('a')).toBe(true);
  });

  it('keeps keys independent', () => {
    const bucket = new KeyedTokenBucket({ max: 1, windowMs: 60_000 }, fakeClock());
    expect(bucket.tryConsume('a')).toBe(true);
    expect(bucket.tryConsume('a')).toBe(false);
    expect(bucket.tryConsume('b')).toBe(true);
  });

  it('prunes keys idle long enough to refill (TTL)', () => {
    const clock = fakeClock();
    const bucket = new KeyedTokenBucket({ max: 6, windowMs: 60_000, burst: 2 }, clock);
    bucket.tryConsume('a');
    bucket.tryConsume('b');
    expect(bucket.size).toBe(2);

    clock.advance(19_999);
    bucket.prune();
    expect(bucket.size).toBe(2);

    clock.advance(1);
    bucket.prune();
    expect(bucket.size).toBe(0);
  });

  it('fails closed for new keys when maxKeys is reached and nothing can be pruned', () => {
    const clock = fakeClock();
    const bucket = new KeyedTokenBucket({ max: 1, windowMs: 60_000, maxKeys: 2 }, clock);
    expect(bucket.tryConsume('a')).toBe(true);
    expect(bucket.tryConsume('b')).toBe(true);
    expect(bucket.tryConsume('c')).toBe(false);
    expect(bucket.size).toBe(2);

    clock.advance(60_000);
    expect(bucket.tryConsume('c')).toBe(true);
    expect(bucket.size).toBe(1);
  });

  it('rejects non-positive configuration', () => {
    expect(() => new KeyedTokenBucket({ max: 0, windowMs: 1000 })).toThrow();
    expect(() => new KeyedTokenBucket({ max: 1, windowMs: 0 })).toThrow();
  });
});

describe('loadWebSocketRateLimitConfig', () => {
  it('uses the documented defaults', () => {
    expect(loadWebSocketRateLimitConfig({})).toEqual({
      message: { max: 30, windowMs: 60_000, burst: 10 },
      userMessage: { max: 60, windowMs: 60_000, burst: 20 },
      frame: { max: 300, windowMs: 60_000, burst: 60 },
      maxViolations: 10,
      maxConnectionsPerUser: 5,
      handshake: { max: 20, windowMs: 60_000, maxKeys: 10_000 },
    });
  });

  it('reads env overrides and ignores invalid values', () => {
    const cfg = loadWebSocketRateLimitConfig({
      WS_MSG_RATE_LIMIT_MAX: '5',
      WS_MSG_RATE_LIMIT_WINDOW_MS: '1000',
      WS_MAX_CONNECTIONS_PER_USER: '2',
      WS_CONN_RATE_LIMIT_MAX: 'not-a-number',
      WS_MSG_RATE_LIMIT_BURST: '-3',
    });
    expect(cfg.message).toEqual({ max: 5, windowMs: 1000, burst: 10 });
    expect(cfg.userMessage.windowMs).toBe(1000);
    expect(cfg.maxConnectionsPerUser).toBe(2);
    expect(cfg.handshake.max).toBe(20);
  });
});

describe('getClientIp', () => {
  const req = (remoteAddress: string, xff?: string) =>
    ({
      socket: { remoteAddress },
      headers: xff === undefined ? {} : { 'x-forwarded-for': xff },
    }) as unknown as IncomingMessage;

  it('returns the socket peer when no proxies are trusted', () => {
    expect(getClientIp(req('10.0.0.5', '1.2.3.4'), 0)).toBe('10.0.0.5');
  });

  it('takes the address behind the trusted hops (CloudFront -> ALB)', () => {
    expect(getClientIp(req('10.0.0.5', '203.0.113.7, 130.176.0.1'), 2)).toBe('203.0.113.7');
  });

  it('ignores spoofed entries a client prepends to X-Forwarded-For', () => {
    expect(getClientIp(req('10.0.0.5', '6.6.6.6, 203.0.113.7, 130.176.0.1'), 2)).toBe(
      '203.0.113.7'
    );
  });

  it('falls back to the leftmost address when there are fewer hops than trusted', () => {
    expect(getClientIp(req('127.0.0.1'), 2)).toBe('127.0.0.1');
  });
});

describe('WebSocketRateLimiter', () => {
  let limiter: WebSocketRateLimiter;
  let clock: ReturnType<typeof fakeClock>;

  beforeEach(() => {
    clock = fakeClock();
    limiter = new WebSocketRateLimiter(config(), clock, { pruneIntervalMs: 0 });
  });

  afterEach(() => limiter.stop());

  it('limits handshakes per IP', () => {
    expect(limiter.allowHandshake('1.1.1.1')).toBe(true);
    expect(limiter.allowHandshake('1.1.1.1')).toBe(true);
    expect(limiter.allowHandshake('1.1.1.1')).toBe(true);
    expect(limiter.allowHandshake('1.1.1.1')).toBe(false);
    expect(limiter.handshakeRetryAfterSeconds('1.1.1.1')).toBe(20);
    expect(limiter.allowHandshake('2.2.2.2')).toBe(true);
  });

  it('caps concurrent connections per user and frees slots on release', () => {
    const a = {};
    const b = {};
    const c = {};
    expect(limiter.registerConnection(a, 'user-1')).toBe(true);
    expect(limiter.registerConnection(b, 'user-1')).toBe(true);
    expect(limiter.isAtConnectionCap('user-1')).toBe(true);
    expect(limiter.registerConnection(c, 'user-1')).toBe(false);
    expect(limiter.registerConnection(c, 'user-2')).toBe(true);

    limiter.release(a);
    limiter.release(a);
    expect(limiter.registerConnection({}, 'user-1')).toBe(true);
  });

  it('rejects user messages over the per-connection limit, then closes on repeated violations', () => {
    const ws = {};
    limiter.registerConnection(ws, 'user-1');
    expect(limiter.checkUserMessage(ws)).toBe('allow');
    expect(limiter.checkUserMessage(ws)).toBe('allow');
    expect(limiter.checkUserMessage(ws)).toBe('reject');
    expect(limiter.checkUserMessage(ws)).toBe('reject');
    expect(limiter.checkUserMessage(ws)).toBe('close');
  });

  it('forgets old violations after the window', () => {
    const ws = {};
    limiter.registerConnection(ws, 'user-1');
    limiter.checkUserMessage(ws);
    limiter.checkUserMessage(ws);
    expect(limiter.checkUserMessage(ws)).toBe('reject');
    expect(limiter.checkUserMessage(ws)).toBe('reject');

    clock.advance(60_000);
    expect(limiter.checkUserMessage(ws)).toBe('allow');
    expect(limiter.checkUserMessage(ws)).toBe('allow');
    expect(limiter.checkUserMessage(ws)).toBe('reject');
  });

  it('shares the per-user limit across connections', () => {
    const a = {};
    const b = {};
    limiter.registerConnection(a, 'user-1');
    limiter.registerConnection(b, 'user-1');

    // userMessage burst is 3; each connection's own burst is 2.
    expect(limiter.checkUserMessage(a)).toBe('allow');
    expect(limiter.checkUserMessage(a)).toBe('allow');
    expect(limiter.checkUserMessage(b)).toBe('allow');
    expect(limiter.checkUserMessage(b)).toBe('reject');
  });

  it('treats an unregistered socket as closable', () => {
    expect(limiter.checkFrame({})).toBe('close');
    expect(limiter.checkUserMessage({})).toBe('close');
  });

  it('removes per-connection state on release and prunes idle keys', () => {
    const ws = {};
    limiter.registerConnection(ws, 'user-1');
    limiter.checkUserMessage(ws);
    limiter.allowHandshake('1.1.1.1');
    expect(limiter.stats()).toEqual({
      connections: 1,
      users: 1,
      handshakeKeys: 1,
      userMessageKeys: 1,
    });

    limiter.release(ws);
    expect(limiter.stats().connections).toBe(0);
    expect(limiter.stats().users).toBe(0);

    clock.advance(60_000);
    limiter.prune();
    expect(limiter.stats()).toEqual({
      connections: 0,
      users: 0,
      handshakeKeys: 0,
      userMessageKeys: 0,
    });
  });
});
