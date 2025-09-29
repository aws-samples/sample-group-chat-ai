// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic health status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Returns detailed health status including memory usage
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed service health information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailedHealthStatus'
 */
router.get('/detailed', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

export { router as healthRoutes };
