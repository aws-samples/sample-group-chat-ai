// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  CreateSessionRequest,
  CreateSessionResponse,
  SendMessageRequest,
  SendMessageResponse,
  UpdateSessionPersonasRequest,
  UpdateSessionPersonasResponse,
  ResetSessionPersonasResponse,
  SessionSummaryResponse,
  ValidationException,
  ResourceNotFoundException,
  InitiateImageUploadRequest,
  UploadImageChunkRequest,
  CompleteImageUploadRequest,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { SessionService } from '../services/SessionService';
import { ImageService } from '../services/ImageService';
import { validateCreateSession, validateSendMessage } from '../utils/validation';
import { VoiceController } from './voiceController';

const logger = createLogger();
const imageService = new ImageService();

// Factory function to create routes with shared SessionService
export function createSessionRoutes(sessionService: SessionService) {
  const router = Router();
  const voiceController = new VoiceController(sessionService);

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow common document types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, Word, Excel, and text files are allowed.'));
      }
    },
  });

  // POST /sessions - Create new conversation session
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestData: CreateSessionRequest = req.body;

      logger.info('Creating new session', {
        personas: requestData.selectedPersonas,
      });

      // Validate request
      const validation = validateCreateSession(requestData);
      if (!validation.isValid) {
        throw new ValidationException(validation.error!);
      }

      // Create session
      const session = await sessionService.createSession(requestData);

      const response: CreateSessionResponse = {
        sessionId: session.sessionId,
        activePersonas: session.activePersonas.map(personaId => ({
          personaId,
          name: sessionService.getPersonaName(personaId, session.customPersonas),
          role: sessionService.getPersonaRole(personaId, session.customPersonas),
          description: sessionService.getPersonaDescription(personaId, session.customPersonas),
        })),
        createdAt: session.createdAt,
      };

      logger.info('Session created successfully', { sessionId: session.sessionId });
      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating session:', error);
      next(error);
    }
  });

  // POST /sessions/:sessionId/messages - Send message and get responses
  router.post('/:sessionId/messages', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const requestData: SendMessageRequest = req.body;

      logger.info('Processing message', { sessionId, messageLength: requestData.content?.length });

      // Validate request
      const validation = validateSendMessage(requestData);
      if (!validation.isValid) {
        throw new ValidationException(validation.error!);
      }

      // Process message and get responses
      const responses = await sessionService.processMessage(sessionId, requestData);

      const response: SendMessageResponse = {
        sessionId,
        responses,
        timestamp: Date.now(),
      };

      logger.info('Message processed successfully', {
        sessionId,
        responseCount: responses.length,
      });

      res.json(response);
    } catch (error) {
      logger.error('Error processing message:', error);
      next(error);
    }
  });

  // PUT /sessions/:sessionId/personas - Update session personas
  router.put('/:sessionId/personas', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const requestData: UpdateSessionPersonasRequest = req.body;

      logger.info('Updating session personas', { sessionId, personas: requestData.activePersonas });

      // Update personas
      const updatedSession = await sessionService.updateSessionPersonas(
        sessionId,
        requestData.activePersonas
      );

      const response: UpdateSessionPersonasResponse = {
        sessionId,
        activePersonas: updatedSession.activePersonas.map(personaId => ({
          personaId,
          name: sessionService.getPersonaName(personaId),
          role: sessionService.getPersonaRole(personaId),
          description: sessionService.getPersonaDescription(personaId),
        })),
        updatedAt: Date.now(),
      };

      logger.info('Session personas updated successfully', { sessionId });
      res.json(response);
    } catch (error) {
      logger.error('Error updating session personas:', error);
      next(error);
    }
  });

  // DELETE /sessions/:sessionId/personas - Reset session personas to defaults
  router.delete('/:sessionId/personas', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info('Resetting session personas to defaults', { sessionId });

      // Reset personas
      await sessionService.resetSessionPersonas(sessionId);

      const response: ResetSessionPersonasResponse = {
        sessionId,
        message: 'Session personas have been reset to defaults',
        updatedAt: Date.now(),
      };

      logger.info('Session personas reset successfully', { sessionId });
      res.json(response);
    } catch (error) {
      logger.error('Error resetting session personas:', error);
      next(error);
    }
  });

  // GET /sessions/:sessionId/summary - Get session summary
  router.get('/:sessionId/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info('Generating session summary', { sessionId });

      const summary = await sessionService.generateSessionSummary(sessionId);

      const response: SessionSummaryResponse = {
        sessionId,
        summary: summary.summary,
        keyInsights: summary.keyInsights,
        recommendations: summary.recommendations,
        generatedAt: Date.now(),
      };

      logger.info('Session summary generated successfully', { sessionId });
      res.json(response);
    } catch (error) {
      logger.error('Error generating session summary:', error);
      next(error);
    }
  });

  // DELETE /sessions/:sessionId - End session
  router.delete('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info('Ending session', { sessionId });

      await sessionService.endSession(sessionId);

      logger.info('Session ended successfully', { sessionId });
      res.status(204).send();
    } catch (error) {
      logger.error('Error ending session:', error);
      next(error);
    }
  });

  // POST /sessions/:sessionId/documents - Upload document to session
  router.post(
    '/:sessionId/documents',
    upload.single('document'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId } = req.params;
        const file = req.file;

        if (!file) {
          throw new ValidationException('No document file provided');
        }

        logger.info('Uploading document to session', {
          sessionId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        });

        // Process document and add to session
        const documentLink = await sessionService.addDocumentToSession(sessionId, {
          fileName: file.originalname,
          fileType: file.mimetype,
          content: file.buffer.toString('utf-8'), // For text files, convert to string
          fileSize: file.size,
        });

        logger.info('Document uploaded successfully', {
          sessionId,
          documentId: documentLink.documentId,
        });
        res.status(201).json(documentLink);
      } catch (error) {
        logger.error('Error uploading document:', error);
        next(error);
      }
    }
  );

  // GET /sessions/:sessionId/documents - Get session documents
  router.get('/:sessionId/documents', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info('Fetching session documents', { sessionId });

      const documents = await sessionService.getSessionDocuments(sessionId);

      logger.info('Session documents fetched successfully', {
        sessionId,
        documentCount: documents.length,
      });
      res.json({ documents });
    } catch (error) {
      logger.error('Error fetching session documents:', error);
      next(error);
    }
  });

  // DELETE /sessions/:sessionId/documents/:documentId - Remove document from session
  router.delete(
    '/:sessionId/documents/:documentId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId, documentId } = req.params;

        logger.info('Removing document from session', { sessionId, documentId });

        await sessionService.removeDocumentFromSession(sessionId, documentId);

        logger.info('Document removed successfully', { sessionId, documentId });
        res.status(204).send();
      } catch (error) {
        logger.error('Error removing document:', error);
        next(error);
      }
    }
  );

  // POST /sessions/:sessionId/images/initiate - Initiate chunked image upload
  router.post(
    '/:sessionId/images/initiate',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId } = req.params;
        const requestData: InitiateImageUploadRequest = req.body;

        logger.info('Initiating image upload', {
          sessionId,
          fileName: requestData.fileName,
          fileSize: requestData.fileSize,
          totalChunks: requestData.totalChunks,
        });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException(
            `Session with ID '${sessionId}' not found`,
            'session',
            sessionId
          );
        }

        // Initiate upload
        const response = await imageService.initiateImageUpload(requestData);

        logger.info('Image upload initiated successfully', {
          sessionId,
          imageId: response.imageId,
        });

        res.status(201).json(response);
      } catch (error) {
        logger.error('Error initiating image upload:', error);
        next(error);
      }
    }
  );

  // POST /sessions/:sessionId/images/:imageId/chunks - Upload image chunk
  router.post(
    '/:sessionId/images/:imageId/chunks',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId, imageId } = req.params;
        const requestData: UploadImageChunkRequest = req.body;

        logger.info('Uploading image chunk', {
          sessionId,
          imageId,
          chunkIndex: requestData.chunkIndex,
          chunkSize: requestData.chunkSize,
        });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException(
            `Session with ID '${sessionId}' not found`,
            'session',
            sessionId
          );
        }

        // Upload chunk
        const response = await imageService.uploadImageChunk(imageId, requestData);

        logger.info('Image chunk uploaded successfully', {
          sessionId,
          imageId,
          chunkIndex: requestData.chunkIndex,
        });

        res.json(response);
      } catch (error) {
        logger.error('Error uploading image chunk:', error);
        next(error);
      }
    }
  );

  // POST /sessions/:sessionId/images/:imageId/complete - Complete image upload
  router.post(
    '/:sessionId/images/:imageId/complete',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId, imageId } = req.params;
        const requestData: CompleteImageUploadRequest = { imageId };

        logger.info('Completing image upload', { sessionId, imageId });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException(
            `Session with ID '${sessionId}' not found`,
            'session',
            sessionId
          );
        }

        // Complete upload
        const response = await imageService.completeImageUpload(requestData);

        logger.info('Image upload completed successfully', {
          sessionId,
          imageId,
          fileName: response.imageAttachment.fileName,
        });

        res.json(response);
      } catch (error) {
        logger.error('Error completing image upload:', error);
        next(error);
      }
    }
  );

  // GET /sessions/:sessionId/images/:imageId - Get image attachment
  router.get(
    '/:sessionId/images/:imageId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId, imageId } = req.params;

        logger.info('Fetching image attachment', { sessionId, imageId });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException(
            `Session with ID '${sessionId}' not found`,
            'session',
            sessionId
          );
        }

        // Get image attachment
        const imageAttachment = await imageService.getImageAttachment(imageId);

        if (!imageAttachment) {
          throw new ResourceNotFoundException(
            `Image with ID '${imageId}' not found`,
            'image',
            imageId
          );
        }

        logger.info('Image attachment fetched successfully', { sessionId, imageId });
        res.json(imageAttachment);
      } catch (error) {
        logger.error('Error fetching image attachment:', error);
        next(error);
      }
    }
  );

  // GET /sessions/:sessionId/voice-settings - Get voice settings for a session
  router.get('/:sessionId/voice-settings', voiceController.getVoiceSettings.bind(voiceController));

  // PUT /sessions/:sessionId/voice-settings - Update voice settings for a session
  router.put(
    '/:sessionId/voice-settings',
    voiceController.updateVoiceSettings.bind(voiceController)
  );

  // GET /sessions/:sessionId - Get session details
  router.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      logger.info('Fetching session details', { sessionId });

      const session = await sessionService.getSession(sessionId);

      if (!session) {
        throw new ResourceNotFoundException(
          `Session with ID '${sessionId}' not found`,
          'session',
          sessionId
        );
      }

      logger.info('Session details fetched successfully', { sessionId });
      res.json(session);
    } catch (error) {
      logger.error('Error fetching session details:', error);
      next(error);
    }
  });

  return router;
}

// For backward compatibility - create default instance
const sessionService = new SessionService();
export const sessionRoutes = createSessionRoutes(sessionService);
