// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Request, Response, NextFunction } from 'express';
import {
  ValidationException,
  ResourceNotFoundException,
  ServiceException,
} from '@group-chat-ai/shared';
import { errorHandler } from '../../middleware/errorHandler';
import { mockRequest, mockResponse } from '../mocks';

// Mock the logger
jest.mock('../../config/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('Error Handler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = mockRequest({
      url: '/test',
      method: 'POST',
      body: { test: 'data' },
    });
    res = mockResponse();
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle ValidationException with 400 status', () => {
    const error = new ValidationException('Invalid input', 'email');

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ValidationException',
      message: 'Invalid input',
      field: 'email',
      statusCode: 400,
      timestamp: expect.any(Number),
    });
  });

  it('should handle ResourceNotFoundException with 404 status', () => {
    const error = new ResourceNotFoundException('Session not found', 'session', 'test-session-123');

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ResourceNotFoundException',
      message: 'Session not found',
      resourceType: 'session',
      resourceId: 'test-session-123',
      statusCode: 404,
      timestamp: expect.any(Number),
    });
  });

  it('should handle ServiceException with 500 status', () => {
    const error = new ServiceException('Service unavailable');

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'ServiceException',
      message: 'Service unavailable',
      statusCode: 500,
      timestamp: expect.any(Number),
    });
  });

  it('should handle unknown errors with 500 status', () => {
    const error = new Error('Unknown error');

    errorHandler(error, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      statusCode: 500,
      timestamp: expect.any(Number),
    });
  });

  it('should not call next function', () => {
    const error = new Error('Test error');

    errorHandler(error, req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
  });
});
