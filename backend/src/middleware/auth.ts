// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { createLogger } from '../config/logger';

const logger = createLogger();

/**
 * Verified identity attached to a request after authentication succeeds.
 */
export interface AuthenticatedIdentity {
  /** Cognito subject (stable, unique user id from the `sub` claim). */
  sub: string;
  /** Cognito username, when present. */
  username?: string;
  /** Email, when present on the token. */
  email?: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthenticatedIdentity;
  }
}

/**
 * When AUTH_DISABLED === 'true' the API skips token verification. This exists
 * ONLY for local development against the in-memory fallback store, and is
 * explicitly refused when NODE_ENV === 'production' so it can never weaken a
 * deployed environment. Everywhere else the default is fail-closed.
 */
function isAuthDisabled(): boolean {
  const disabled = process.env.AUTH_DISABLED === 'true';
  if (disabled && process.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_DISABLED=true is not permitted when NODE_ENV=production. ' +
        'Authentication cannot be turned off in production.'
    );
  }
  return disabled;
}

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

/**
 * Lazily build a Cognito access-token verifier from environment configuration.
 * COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID are published by the infrastructure
 * stack (see infrastructure/lib/group-chat-ai-stack.ts SSM parameters/exports).
 */
function getVerifier() {
  if (verifier) {
    return verifier;
  }

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId) {
    throw new Error(
      'Authentication is enabled but COGNITO_USER_POOL_ID and/or COGNITO_CLIENT_ID ' +
        'are not configured. Set them (or set AUTH_DISABLED=true for local development).'
    );
  }

  verifier = CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'access',
  });

  return verifier;
}

/**
 * Verify a raw Cognito access token string and return the identity it proves.
 * Shared by the HTTP middleware and the WebSocket handshake so both surfaces
 * use one verifier, one token-use policy, and one AUTH_DISABLED escape hatch.
 *
 * Returns a dev identity when AUTH_DISABLED (local only; throws in production).
 * Throws on a missing/invalid/expired token so callers can fail closed.
 */
export async function verifyAccessToken(
  token: string | null | undefined
): Promise<AuthenticatedIdentity> {
  if (isAuthDisabled()) {
    const devUser = (typeof token === 'string' && token.trim()) || 'local-dev-user';
    return { sub: devUser, username: devUser, email: undefined };
  }

  if (!token) {
    throw new Error('Missing bearer token');
  }

  const payload = await getVerifier().verify(token);
  return {
    sub: payload.sub,
    username: typeof payload.username === 'string' ? payload.username : undefined,
    email:
      typeof (payload as Record<string, unknown>).email === 'string'
        ? ((payload as Record<string, unknown>).email as string)
        : undefined,
  };
}

function extractBearerToken(req: Request): string | null {
  const header = req.get('Authorization') || req.get('authorization');
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Express middleware that verifies the caller's Cognito access token and
 * attaches the verified identity to req.auth. Rejects with 401 on any missing
 * or invalid token. Fail-closed: an unconfigured verifier is a 500, not a pass.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (isAuthDisabled()) {
    // Local-dev only: synthesize an identity from a header or a fixed dev user
    // so path-vs-identity checks still run end to end without Cognito.
    const devUser = req.get('x-dev-user-id') || 'local-dev-user';
    req.auth = { sub: devUser, username: devUser, email: undefined };
    next();
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing bearer token',
    });
    return;
  }

  try {
    req.auth = await verifyAccessToken(token);
    next();
  } catch (error) {
    logger.warn('Rejected request with invalid token', {
      path: req.originalUrl,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

/**
 * Returns the set of identifier values that legitimately identify the
 * authenticated caller. The frontend uses the Cognito `sub` as userId, with a
 * documented fallback to email, so both are accepted.
 */
export function identityKeysFor(auth: AuthenticatedIdentity): string[] {
  return [auth.sub, auth.email].filter((v): v is string => Boolean(v));
}

/**
 * Route guard: the `:userId` path parameter MUST match the authenticated
 * caller's own identity. Prevents one user from reading or mutating another
 * user's sessions by supplying a different userId in the URL.
 *
 * Must run AFTER authMiddleware.
 */
export function requireSelf(req: Request, res: Response, next: NextFunction): void {
  const pathUserId = Array.isArray(req.params.userId)
    ? req.params.userId[0]
    : req.params.userId;

  if (!req.auth) {
    // Defensive: authMiddleware should always have populated this.
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated' });
    return;
  }

  if (!pathUserId || !identityKeysFor(req.auth).includes(pathUserId)) {
    logger.warn('Rejected cross-user access attempt', {
      authenticatedSub: req.auth.sub,
      requestedUserId: pathUserId,
      path: req.originalUrl,
    });
    res.status(403).json({
      error: 'Forbidden',
      message: 'You may only access your own sessions',
    });
    return;
  }

  next();
}
