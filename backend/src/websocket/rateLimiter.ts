// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { IncomingMessage } from 'http';

/**
 * In-memory rate limiting for the WebSocket path.
 *
 * All state lives in this process. A deployment that runs more than one
 * backend instance gets per-instance limits; enforcing them across instances
 * needs a shared store (for example Redis or DynamoDB), which this module does
 * not provide.
 */

/** Close code sent when a socket is closed for exceeding a rate limit. */
export const WS_CLOSE_RATE_LIMITED = 4429;

export type Clock = () => number;

export interface TokenBucketOptions {
  /** Tokens added per window (the sustained rate). */
  readonly max: number;
  /** Window length in milliseconds. */
  readonly windowMs: number;
  /** Bucket capacity: how many requests may arrive back to back. Defaults to `max`. */
  readonly burst?: number;
  /**
   * Upper bound on tracked keys. When the map is full and pruning frees
   * nothing, a NEW key is denied (fail closed) instead of growing the map.
   */
  readonly maxKeys?: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * Keyed token bucket. Each key refills at `max / windowMs` tokens per ms up to
 * `burst`. An idle key whose bucket has refilled to capacity carries no state
 * worth keeping, so `prune()` drops it; that is the TTL.
 */
export class KeyedTokenBucket {
  private readonly buckets = new Map<string, Bucket>();
  private readonly ratePerMs: number;
  private readonly capacity: number;
  private readonly ttlMs: number;
  private readonly maxKeys: number;

  constructor(
    options: TokenBucketOptions,
    private readonly now: Clock = Date.now
  ) {
    if (!(options.max > 0) || !(options.windowMs > 0)) {
      throw new Error('Token bucket max and windowMs must be positive');
    }
    this.capacity = Math.max(1, options.burst ?? options.max);
    this.ratePerMs = options.max / options.windowMs;
    // Time for an empty bucket to refill completely.
    this.ttlMs = Math.ceil(this.capacity / this.ratePerMs);
    this.maxKeys = options.maxKeys ?? Number.POSITIVE_INFINITY;
  }

  /** Take one token for `key`. Returns false when the bucket is empty. */
  tryConsume(key: string): boolean {
    const now = this.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      if (this.buckets.size >= this.maxKeys) {
        this.prune();
        if (this.buckets.size >= this.maxKeys) {
          return false;
        }
      }
      bucket = { tokens: this.capacity, updatedAt: now };
      this.buckets.set(key, bucket);
    } else {
      const elapsed = Math.max(0, now - bucket.updatedAt);
      bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.ratePerMs);
      bucket.updatedAt = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Milliseconds until `key` has a token again (0 when one is available). */
  retryAfterMs(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return 0;
    }
    const elapsed = Math.max(0, this.now() - bucket.updatedAt);
    const tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.ratePerMs);
    return tokens >= 1 ? 0 : Math.ceil((1 - tokens) / this.ratePerMs);
  }

  delete(key: string): void {
    this.buckets.delete(key);
  }

  /** Drop every key that has been idle long enough to refill completely. */
  prune(): void {
    const now = this.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.updatedAt >= this.ttlMs) {
        this.buckets.delete(key);
      }
    }
  }

  get size(): number {
    return this.buckets.size;
  }
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export interface WebSocketRateLimitConfig {
  /** Per-connection: Bedrock-triggering `user_message` frames. */
  readonly message: { max: number; windowMs: number; burst: number };
  /** Per verified user (Cognito `sub`), summed across all their connections. */
  readonly userMessage: { max: number; windowMs: number; burst: number };
  /** Per-connection flood guard on every inbound frame, whatever its type. */
  readonly frame: { max: number; windowMs: number; burst: number };
  /** Rejected frames within `message.windowMs` before the socket is closed. */
  readonly maxViolations: number;
  /** Concurrent open sockets per verified user. */
  readonly maxConnectionsPerUser: number;
  /** Handshake attempts per client IP. */
  readonly handshake: { max: number; windowMs: number; maxKeys: number };
}

/** Read limits from the environment, falling back to the documented defaults. */
export function loadWebSocketRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env
): WebSocketRateLimitConfig {
  const messageWindowMs = positiveInt(env.WS_MSG_RATE_LIMIT_WINDOW_MS, 60_000);
  return {
    message: {
      max: positiveInt(env.WS_MSG_RATE_LIMIT_MAX, 30),
      windowMs: messageWindowMs,
      burst: positiveInt(env.WS_MSG_RATE_LIMIT_BURST, 10),
    },
    userMessage: {
      max: positiveInt(env.WS_USER_MSG_RATE_LIMIT_MAX, 60),
      windowMs: messageWindowMs,
      burst: positiveInt(env.WS_USER_MSG_RATE_LIMIT_BURST, 20),
    },
    frame: {
      max: positiveInt(env.WS_FRAME_RATE_LIMIT_MAX, 300),
      windowMs: messageWindowMs,
      burst: positiveInt(env.WS_FRAME_RATE_LIMIT_BURST, 60),
    },
    maxViolations: positiveInt(env.WS_MSG_RATE_LIMIT_MAX_VIOLATIONS, 10),
    maxConnectionsPerUser: positiveInt(env.WS_MAX_CONNECTIONS_PER_USER, 5),
    handshake: {
      max: positiveInt(env.WS_CONN_RATE_LIMIT_MAX, 20),
      windowMs: positiveInt(env.WS_CONN_RATE_LIMIT_WINDOW_MS, 60_000),
      maxKeys: positiveInt(env.WS_CONN_RATE_LIMIT_MAX_KEYS, 10_000),
    },
  };
}

/**
 * Client IP for an upgrade request, using the same rule as Express's numeric
 * `trust proxy` setting: trust `hops` proxies counted back from the socket
 * peer, and take the next address. A client cannot escape the limit by
 * prepending its own X-Forwarded-For entries, because only the rightmost
 * `hops` entries are trusted.
 */
export function getClientIp(req: IncomingMessage, hops: number): string {
  const peer = req.socket?.remoteAddress || 'unknown';
  const header = req.headers['x-forwarded-for'];
  const forwarded = (Array.isArray(header) ? header.join(',') : header || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .reverse();
  const addrs = [peer, ...forwarded];
  return addrs[Math.min(Math.max(0, hops), addrs.length - 1)];
}

export type FrameDecision = 'allow' | 'reject' | 'close';

interface ConnectionState {
  readonly id: string;
  readonly sub: string;
  violations: number;
  violationWindowStart: number;
}

/**
 * Rate-limit state for the WebSocket server: handshakes per IP, concurrent
 * sockets per user, and inbound frames per connection and per user.
 */
export class WebSocketRateLimiter {
  private readonly handshakes: KeyedTokenBucket;
  private readonly connectionMessages: KeyedTokenBucket;
  private readonly connectionFrames: KeyedTokenBucket;
  private readonly userMessages: KeyedTokenBucket;
  private readonly connections = new Map<object, ConnectionState>();
  private readonly connectionsPerUser = new Map<string, number>();
  private readonly pruneTimer?: NodeJS.Timeout;
  private nextConnectionId = 0;

  constructor(
    readonly config: WebSocketRateLimitConfig = loadWebSocketRateLimitConfig(),
    private readonly now: Clock = Date.now,
    options: { pruneIntervalMs?: number } = {}
  ) {
    this.handshakes = new KeyedTokenBucket(
      {
        max: config.handshake.max,
        windowMs: config.handshake.windowMs,
        maxKeys: config.handshake.maxKeys,
      },
      now
    );
    this.connectionMessages = new KeyedTokenBucket(config.message, now);
    this.connectionFrames = new KeyedTokenBucket(config.frame, now);
    this.userMessages = new KeyedTokenBucket(config.userMessage, now);

    const interval = options.pruneIntervalMs ?? 60_000;
    if (interval > 0) {
      this.pruneTimer = setInterval(() => this.prune(), interval);
      this.pruneTimer.unref();
    }
  }

  /** Count a handshake attempt from `ip`. False means reject with HTTP 429. */
  allowHandshake(ip: string): boolean {
    return this.handshakes.tryConsume(ip);
  }

  handshakeRetryAfterSeconds(ip: string): number {
    return Math.max(1, Math.ceil(this.handshakes.retryAfterMs(ip) / 1000));
  }

  /** True when `sub` already holds the maximum number of open sockets. */
  isAtConnectionCap(sub: string): boolean {
    return (this.connectionsPerUser.get(sub) ?? 0) >= this.config.maxConnectionsPerUser;
  }

  /**
   * Register an open socket for `sub`. Returns false (and registers nothing)
   * when the user is already at the cap. Pair every `true` with `release()`.
   */
  registerConnection(socket: object, sub: string): boolean {
    if (this.connections.has(socket)) {
      return true;
    }
    if (this.isAtConnectionCap(sub)) {
      return false;
    }
    this.connectionsPerUser.set(sub, (this.connectionsPerUser.get(sub) ?? 0) + 1);
    this.connections.set(socket, {
      id: `c${++this.nextConnectionId}`,
      sub,
      violations: 0,
      violationWindowStart: this.now(),
    });
    return true;
  }

  /** Forget a socket. Safe to call more than once. */
  release(socket: object): void {
    const state = this.connections.get(socket);
    if (!state) {
      return;
    }
    this.connections.delete(socket);
    this.connectionMessages.delete(state.id);
    this.connectionFrames.delete(state.id);

    const remaining = (this.connectionsPerUser.get(state.sub) ?? 1) - 1;
    if (remaining > 0) {
      this.connectionsPerUser.set(state.sub, remaining);
    } else {
      this.connectionsPerUser.delete(state.sub);
    }
  }

  /** Every inbound frame, before it is parsed. */
  checkFrame(socket: object): FrameDecision {
    const state = this.connections.get(socket);
    if (!state) {
      return 'close';
    }
    return this.connectionFrames.tryConsume(state.id) ? 'allow' : this.recordViolation(state);
  }

  /** A `user_message` frame, which can start Bedrock calls. */
  checkUserMessage(socket: object): FrameDecision {
    const state = this.connections.get(socket);
    if (!state) {
      return 'close';
    }
    // Check the per-connection bucket first so a connection that is already
    // over its own limit does not also drain the user's shared bucket.
    if (!this.connectionMessages.tryConsume(state.id)) {
      return this.recordViolation(state);
    }
    if (!this.userMessages.tryConsume(state.sub)) {
      return this.recordViolation(state);
    }
    return 'allow';
  }

  private recordViolation(state: ConnectionState): FrameDecision {
    const now = this.now();
    if (now - state.violationWindowStart >= this.config.message.windowMs) {
      state.violations = 0;
      state.violationWindowStart = now;
    }
    state.violations += 1;
    return state.violations >= this.config.maxViolations ? 'close' : 'reject';
  }

  prune(): void {
    this.handshakes.prune();
    this.userMessages.prune();
    this.connectionMessages.prune();
    this.connectionFrames.prune();
  }

  stop(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
    }
  }

  /** Sizes of the internal maps, for tests and diagnostics. */
  stats(): { connections: number; users: number; handshakeKeys: number; userMessageKeys: number } {
    return {
      connections: this.connections.size,
      users: this.connectionsPerUser.size,
      handshakeKeys: this.handshakes.size,
      userMessageKeys: this.userMessages.size,
    };
  }
}
