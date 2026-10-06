// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Request, Response } from 'express';
import {
  requireSelf,
  identityKeysFor,
  verifyAccessToken,
  extractBearerToken,
  AuthenticatedIdentity,
} from '../../middleware/auth';

function mockReqWithAuthHeader(value: string | undefined) {
  return {
    get: (name: string) =>
      name.toLowerCase() === 'authorization' ? value : undefined,
  } as unknown as Request;
}

function mockRes() {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.json = jest.fn().mockImplementation((payload: unknown) => {
    res.body = payload;
    return res as Response;
  });
  return res as Response & { statusCode?: number; body?: unknown };
}

describe('extractBearerToken', () => {
  it('extracts the token from a well-formed Bearer header', () => {
    expect(extractBearerToken(mockReqWithAuthHeader('Bearer abc.def.ghi'))).toBe('abc.def.ghi');
  });

  it('is case-insensitive on the scheme', () => {
    expect(extractBearerToken(mockReqWithAuthHeader('bearer tok'))).toBe('tok');
    expect(extractBearerToken(mockReqWithAuthHeader('BEARER tok'))).toBe('tok');
  });

  it('returns null for a missing header', () => {
    expect(extractBearerToken(mockReqWithAuthHeader(undefined))).toBeNull();
  });

  it('returns null for a non-Bearer scheme', () => {
    expect(extractBearerToken(mockReqWithAuthHeader('Basic abc'))).toBeNull();
  });

  it('returns null when the scheme is present but the token is empty', () => {
    expect(extractBearerToken(mockReqWithAuthHeader('Bearer    '))).toBeNull();
  });

  // Regression for the CodeQL ReDoS finding (CWE-1333): the old
  // /^Bearer\s+(.+)$/i backtracked polynomially on "bearer " + many spaces.
  // The slice-based parser must handle a pathological header in ~constant time.
  it('handles a pathological whitespace header without catastrophic backtracking', () => {
    const evil = 'bearer ' + ' '.repeat(100000);
    const start = Date.now();
    const result = extractBearerToken(mockReqWithAuthHeader(evil));
    const elapsedMs = Date.now() - start;

    // An all-whitespace token trims to empty -> null; must return fast.
    expect(result).toBeNull();
    expect(elapsedMs).toBeLessThan(50);
  });
});

describe('identityKeysFor', () => {
  it('includes sub and email, dropping undefined', () => {
    expect(identityKeysFor({ sub: 'abc', email: 'a@b.com' })).toEqual(['abc', 'a@b.com']);
    expect(identityKeysFor({ sub: 'abc' })).toEqual(['abc']);
  });
});

describe('requireSelf', () => {
  const auth: AuthenticatedIdentity = { sub: 'user-abc', email: 'user@example.com' };

  it('allows access when path userId matches the authenticated sub', () => {
    const req = { params: { userId: 'user-abc' }, auth, originalUrl: '/x' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    requireSelf(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows access when path userId matches the authenticated email (documented fallback)', () => {
    const req = {
      params: { userId: 'user@example.com' },
      auth,
      originalUrl: '/x',
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    requireSelf(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects with 403 when path userId belongs to another user (the IDOR fix)', () => {
    const req = {
      params: { userId: 'victim-user-abc123' },
      auth,
      originalUrl: '/user-sessions/victim-user-abc123',
    } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    requireSelf(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects with 401 when there is no authenticated identity', () => {
    const req = { params: { userId: 'anyone' }, originalUrl: '/x' } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();

    requireSelf(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('verifyAccessToken', () => {
  const savedEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('returns a synthetic dev identity when AUTH_DISABLED=true (local dev)', async () => {
    process.env.AUTH_DISABLED = 'true';
    delete process.env.NODE_ENV;

    const identity = await verifyAccessToken('alice-dev');
    expect(identity.sub).toBe('alice-dev');
    expect(identity.username).toBe('alice-dev');
  });

  it('falls back to a fixed dev user when AUTH_DISABLED=true and no token given', async () => {
    process.env.AUTH_DISABLED = 'true';
    delete process.env.NODE_ENV;

    const identity = await verifyAccessToken(null);
    expect(identity.sub).toBe('local-dev-user');
  });

  it('refuses AUTH_DISABLED in production (fail-closed)', async () => {
    process.env.AUTH_DISABLED = 'true';
    process.env.NODE_ENV = 'production';

    await expect(verifyAccessToken('anything')).rejects.toThrow(/not permitted when NODE_ENV=production/);
  });

  it('throws on a missing token when auth is enabled', async () => {
    delete process.env.AUTH_DISABLED;
    process.env.COGNITO_USER_POOL_ID = 'us-east-1_test';
    process.env.COGNITO_CLIENT_ID = 'testclient';

    await expect(verifyAccessToken(null)).rejects.toThrow(/Missing bearer token/);
  });
});
