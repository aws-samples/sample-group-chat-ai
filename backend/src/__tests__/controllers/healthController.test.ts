// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import request from 'supertest';
import express from 'express';
import { healthRoutes } from '../../controllers/healthController';

describe('Health Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRoutes);
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '1.0.0',
      });
    });

    it('should return valid ISO timestamp', async () => {
      const response = await request(app).get('/health').expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should return positive uptime', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '1.0.0',
        memory: {
          rss: expect.stringMatching(/\d+MB/),
          heapTotal: expect.stringMatching(/\d+MB/),
          heapUsed: expect.stringMatching(/\d+MB/),
          external: expect.stringMatching(/\d+MB/),
        },
        environment: expect.any(String),
      });
    });

    it('should return memory information in MB format', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      const { memory } = response.body;
      expect(memory.rss).toMatch(/^\d+MB$/);
      expect(memory.heapTotal).toMatch(/^\d+MB$/);
      expect(memory.heapUsed).toMatch(/^\d+MB$/);
      expect(memory.external).toMatch(/^\d+MB$/);
    });

    it('should return environment information', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const response = await request(app).get('/health/detailed').expect(200);

      expect(response.body.environment).toBe('test');

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should default to development environment when NODE_ENV not set', async () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const response = await request(app).get('/health/detailed').expect(200);

      expect(response.body.environment).toBe('development');

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should have reasonable memory values', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      const { memory } = response.body;

      // Extract numeric values
      const rss = parseInt(memory.rss.replace('MB', ''));
      const heapTotal = parseInt(memory.heapTotal.replace('MB', ''));
      const heapUsed = parseInt(memory.heapUsed.replace('MB', ''));
      const external = parseInt(memory.external.replace('MB', ''));

      // Basic sanity checks
      expect(rss).toBeGreaterThan(0);
      expect(heapTotal).toBeGreaterThan(0);
      expect(heapUsed).toBeGreaterThan(0);
      expect(external).toBeGreaterThanOrEqual(0);

      // Heap used should not exceed heap total
      expect(heapUsed).toBeLessThanOrEqual(heapTotal);
    });
  });

  describe('Response format', () => {
    it('should return JSON content type', async () => {
      await request(app).get('/health').expect('Content-Type', /json/).expect(200);
    });

    it('should have consistent response format between endpoints', async () => {
      const basicResponse = await request(app).get('/health');
      const detailedResponse = await request(app).get('/health/detailed');

      // Basic response should be a subset of detailed response
      expect(detailedResponse.body.status).toBe(basicResponse.body.status);
      expect(detailedResponse.body.version).toBe(basicResponse.body.version);
      expect(detailedResponse.body.uptime).toBeGreaterThanOrEqual(basicResponse.body.uptime);
    });
  });
});
