// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { createLogger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { createSessionRoutes } from './controllers/sessionController';
import { createUserSessionRoutes } from './controllers/userSessionController';
import { personaRoutes } from './controllers/personaController';
import { healthRoutes } from './controllers/healthController';
import { createVoiceRoutes } from './controllers/voiceRoutes';
import { WebSocketServer } from './websocket/WebSocketServer';
import { SessionService } from './services/SessionService';
import { UserSessionStorage } from './services/UserSessionStorage';

// Load environment variables
dotenv.config();

const app = express();
const logger = createLogger();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging - add direct console debug
console.log('🔧 Registering request logger middleware...');
app.use(requestLogger);

// Add a catch-all middleware to see if ANY requests reach the server
app.use((req, res, next) => {
  console.log(`🔧 CATCH-ALL: ${req.method} ${req.originalUrl} - Middleware chain reached`);
  next();
});

// Create shared service instances
const userSessionStorage = new UserSessionStorage();
const sessionService = new SessionService(userSessionStorage);

// API Documentation with authentication
const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
  }
};

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});


// API routes
app.use('/health', healthRoutes);
app.use('/api/sessions', createSessionRoutes(sessionService));
app.use('/api/user-sessions', createUserSessionRoutes(userSessionStorage, sessionService));
app.use('/api/personas', personaRoutes);
app.use('/api/voices', createVoiceRoutes(sessionService));

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API root endpoint
 *     description: Returns basic API information and status
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "AI Multi-Persona Conversation Ochestrator Backend"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 status:
 *                   type: string
 *                   example: "running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/api/', (req, res) => {
  res.json({
    name: 'AI Multi-Persona Conversation Ochestrator Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`AI Multi-Persona Conversation Ochestrator Backend started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize WebSocket server with shared SessionService and UserSessionStorage
const webSocketServer = new WebSocketServer(server, sessionService, userSessionStorage);
logger.info('WebSocket server initialized on /ws path');

// CRITICAL FIX: Make WebSocket server globally accessible for audio queue processing
(global as any).webSocketServer = webSocketServer;

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  webSocketServer.shutdown();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  webSocketServer.shutdown();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default app;
