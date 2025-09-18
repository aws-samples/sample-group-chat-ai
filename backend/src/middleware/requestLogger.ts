// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../config/logger';

const logger = createLogger();

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Capture original URL before routing modifies it
  const originalPath = req.originalUrl || req.url;

  const requestLog = `📥 [${requestId}] ${req.method} ${originalPath}`;
  logger.debug(requestLog, {
    method: req.method,
    url: originalPath,
    query: req.query,
    headers: {
      'user-agent': req.get('User-Agent'),
      'authorization': req.get('Authorization') ? '[PRESENT]' : '[NOT_SET]'
    }
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: unknown[]) {
    const duration = Date.now() - start;
    const responseLog = `📤 [${requestId}] ${req.method} ${originalPath} → ${res.statusCode} (${duration}ms)`;

    // Log with winston
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](responseLog);

    // ALSO direct console log for development
    // eslint-disable-next-line no-console
    console.log(`🔧 ${responseLog}`);

    return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
  };

  next();
}
