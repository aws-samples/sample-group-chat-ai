// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Request, Response, NextFunction } from 'express';
import {
  ValidationException,
  ResourceNotFoundException,
  ServiceException,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';

const logger = createLogger();

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    originalUrl: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: {
      'user-agent': req.get('User-Agent'),
      'authorization': req.get('Authorization') ? '[PRESENT]' : '[NOT_SET]',
      'content-type': req.get('Content-Type'),
    },
  });

  // Handle known error types
  if (error instanceof ValidationException) {
    res.status(400).json({
      error: 'ValidationException',
      message: error.message,
      field: error.field,
      statusCode: 400,
      timestamp: Date.now(),
    });
    return;
  }

  if (error instanceof ResourceNotFoundException) {
    res.status(404).json({
      error: 'ResourceNotFoundException',
      message: error.message,
      resourceType: error.resourceType,
      resourceId: error.resourceId,
      statusCode: 404,
      timestamp: Date.now(),
    });
    return;
  }

  if (error instanceof ServiceException) {
    res.status(500).json({
      error: 'ServiceException',
      message: error.message,
      statusCode: 500,
      timestamp: Date.now(),
    });
    return;
  }

  // Handle unknown errors
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    statusCode: 500,
    timestamp: Date.now(),
  });
}
