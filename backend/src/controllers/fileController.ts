// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { Router, Request, Response, NextFunction } from 'express';
import {
  UploadFileRequest,
  UploadFileResponse,
  CompleteFileUploadRequest,
  CompleteFileUploadResponse,
  UpdateFileAssociationsRequest,
  UpdateFileAssociationsResponse,
  ListFilesResponse,
  FileProcessingStatus,
  ValidationException,
  ResourceNotFoundException,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { FileStorageService } from '../services/FileStorageService';
import { FileProcessingService } from '../services/FileProcessingService';
import { ContextManagementService } from '../services/ContextManagementService';
import { SessionService } from '../services/SessionService';

const logger = createLogger();

export function createFileRoutes(sessionService: SessionService) {
  const router = Router();
  const fileStorageService = new FileStorageService();
  const fileProcessingService = new FileProcessingService();
  const contextManagementService = new ContextManagementService();

  /**
   * POST /api/sessions/:sessionId/files/initiate
   * Initiate file upload - get presigned URL
   */
  router.post(
    '/:sessionId/files/initiate',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId } = req.params;
        const uploadRequest: UploadFileRequest = req.body;

        logger.info('Initiating file upload', {
          sessionId,
          fileName: uploadRequest.fileName,
          fileType: uploadRequest.fileType,
          fileSize: uploadRequest.fileSize,
        });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException('Session not found', 'Session', sessionId);
        }

        // Validate file type
        if (!FileProcessingService.isFileTypeSupported(uploadRequest.fileType)) {
          throw new ValidationException(
            `Unsupported file type: ${uploadRequest.fileType}. Supported types: ${FileProcessingService.getSupportedMimeTypes().join(', ')}`
          );
        }

        // Validate file size (25MB limit)
        const maxFileSize = 25 * 1024 * 1024; // 25MB
        if (uploadRequest.fileSize > maxFileSize) {
          throw new ValidationException(
            `File size exceeds limit of 25MB (${uploadRequest.fileSize} bytes)`
          );
        }

        // Estimate token count (rough estimate before processing)
        const estimatedTokens = Math.ceil(uploadRequest.fileSize / 4);

        // Check if file context would exceed budget
        const budgetCheck = contextManagementService.canAddFileContext(
          session,
          estimatedTokens,
          uploadRequest.targetPersonas?.[0]
        );

        if (!budgetCheck.canAdd) {
          throw new ValidationException(
            budgetCheck.reason || 'File would exceed context budget'
          );
        }

        // Generate presigned URL
        const uploadResult = await fileStorageService.generateUploadUrl(
          sessionId,
          uploadRequest.fileName,
          uploadRequest.fileType,
          uploadRequest.fileSize,
          uploadRequest.targetPersonas
        );

        const response: UploadFileResponse = {
          fileId: uploadResult.fileId,
          uploadUrl: uploadResult.uploadUrl,
          expiresIn: uploadResult.expiresIn,
          s3Key: uploadResult.s3Key,
        };

        logger.info('File upload initiated successfully', {
          sessionId,
          fileId: uploadResult.fileId,
        });

        res.status(200).json(response);
      } catch (error) {
        logger.error('Error initiating file upload', {
          sessionId: req.params.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      }
    }
  );

  /**
   * POST /api/sessions/:sessionId/files/:fileId/complete
   * Complete file upload - trigger processing
   */
  router.post(
    '/:sessionId/files/:fileId/complete',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId, fileId } = req.params;

        logger.info('Completing file upload', { sessionId, fileId });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException('Session not found', 'Session', sessionId);
        }

        // Get file metadata
        const fileMetadata = await fileStorageService.getFileMetadata(sessionId, fileId);
        if (!fileMetadata) {
          throw new ResourceNotFoundException('File metadata not found', 'File', fileId);
        }

        // Check if file exists in S3
        const fileExists = await fileStorageService.fileExists(fileMetadata.s3Key);
        if (!fileExists) {
          throw new ResourceNotFoundException('File not found in storage', 'File', fileId);
        }

        // Update status to processing
        await fileStorageService.updateFileStatus(
          sessionId,
          fileId,
          FileProcessingStatus.PROCESSING
        );

        try {
          // Download file from S3
          const fileBuffer = await fileStorageService.downloadFile(fileMetadata.s3Key);

          // Process file
          const processedResult = await fileProcessingService.processFile(
            fileBuffer,
            fileMetadata.fileName,
            fileMetadata.fileType
          );

          // Update file metadata with processed results
          fileMetadata.extractedText = processedResult.extractedText;
          fileMetadata.chunks = processedResult.chunks;
          fileMetadata.tokenCount = processedResult.tokenCount;
          fileMetadata.processingStatus = FileProcessingStatus.COMPLETED;

          await fileStorageService.saveFileMetadata(fileMetadata);

          // Update session with file context
          if (!session.fileContexts) {
            session.fileContexts = {};
          }
          session.fileContexts[fileId] = fileMetadata;

          // Update persona file associations
          if (fileMetadata.associatedPersonas.length === 0) {
            // Global file - add to globalFileIds
            if (!session.globalFileIds) {
              session.globalFileIds = [];
            }
            if (!session.globalFileIds.includes(fileId)) {
              session.globalFileIds.push(fileId);
            }
          } else {
            // Persona-specific file
            if (!session.personaFileAssociations) {
              session.personaFileAssociations = {};
            }
            fileMetadata.associatedPersonas.forEach((personaId) => {
              if (!session.personaFileAssociations![personaId]) {
                session.personaFileAssociations![personaId] = [];
              }
              if (!session.personaFileAssociations![personaId].includes(fileId)) {
                session.personaFileAssociations![personaId].push(fileId);
              }
            });
          }

          // Save updated session
          await sessionService.updateSession(session);

          logger.info('File processing completed successfully', {
            sessionId,
            fileId,
            tokenCount: processedResult.tokenCount,
            chunks: processedResult.chunks.length,
          });

          const response: CompleteFileUploadResponse = {
            fileContext: fileMetadata,
            success: true,
            message: 'File processed successfully',
          };

          res.status(200).json(response);
        } catch (processingError) {
          // Update status to failed
          const errorMessage =
            processingError instanceof Error ? processingError.message : 'Processing failed';

          await fileStorageService.updateFileStatus(
            sessionId,
            fileId,
            FileProcessingStatus.FAILED,
            errorMessage
          );

          throw processingError;
        }
      } catch (error) {
        logger.error('Error completing file upload', {
          sessionId: req.params.sessionId,
          fileId: req.params.fileId,
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      }
    }
  );

  /**
   * GET /api/sessions/:sessionId/files
   * List all files for session (optionally filter by persona)
   */
  router.get(
    '/:sessionId/files',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId } = req.params;
        const { personaId } = req.query;

        logger.info('Listing session files', { sessionId, personaId });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException('Session not found', 'Session', sessionId);
        }

        // Get files
        let files;
        if (personaId) {
          files = await fileStorageService.getPersonaFiles(sessionId, personaId as string);
        } else {
          files = await fileStorageService.listSessionFiles(sessionId);
        }

        const response: ListFilesResponse = {
          files,
          total: files.length,
        };

        logger.info('Files retrieved successfully', {
          sessionId,
          personaId,
          count: files.length,
        });

        res.status(200).json(response);
      } catch (error) {
        logger.error('Error listing files', {
          sessionId: req.params.sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      }
    }
  );

  /**
   * DELETE /api/sessions/:sessionId/files/:fileId
   * Delete file
   */
  router.delete(
    '/:sessionId/files/:fileId',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId, fileId } = req.params;

        logger.info('Deleting file', { sessionId, fileId });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException('Session not found', 'Session', sessionId);
        }

        // Get file metadata
        const fileMetadata = await fileStorageService.getFileMetadata(sessionId, fileId);
        if (!fileMetadata) {
          throw new ResourceNotFoundException('File not found', 'File', fileId);
        }

        // Delete from S3
        await fileStorageService.deleteFile(fileMetadata.s3Key);

        // Delete metadata from DynamoDB
        await fileStorageService.deleteFileMetadata(sessionId, fileId);

        // Remove from session
        if (session.fileContexts && session.fileContexts[fileId]) {
          delete session.fileContexts[fileId];
        }

        if (session.globalFileIds) {
          session.globalFileIds = session.globalFileIds.filter((id) => id !== fileId);
        }

        if (session.personaFileAssociations) {
          Object.keys(session.personaFileAssociations).forEach((personaId) => {
            session.personaFileAssociations![personaId] = session.personaFileAssociations![
              personaId
            ].filter((id) => id !== fileId);
          });
        }

        await sessionService.updateSession(session);

        logger.info('File deleted successfully', { sessionId, fileId });

        res.status(200).json({
          success: true,
          message: 'File deleted successfully',
        });
      } catch (error) {
        logger.error('Error deleting file', {
          sessionId: req.params.sessionId,
          fileId: req.params.fileId,
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      }
    }
  );

  /**
   * PATCH /api/sessions/:sessionId/files/:fileId/associations
   * Update file persona associations
   */
  router.patch(
    '/:sessionId/files/:fileId/associations',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { sessionId, fileId } = req.params;
        const updateRequest: UpdateFileAssociationsRequest = req.body;

        logger.info('Updating file associations', {
          sessionId,
          fileId,
          personaIds: updateRequest.personaIds,
          isGlobal: updateRequest.isGlobal,
        });

        // Validate session exists
        const session = await sessionService.getSession(sessionId);
        if (!session) {
          throw new ResourceNotFoundException('Session not found', 'Session', sessionId);
        }

        // Get file metadata
        const fileMetadata = await fileStorageService.getFileMetadata(sessionId, fileId);
        if (!fileMetadata) {
          throw new ResourceNotFoundException('File not found', 'File', fileId);
        }

        // Update associations
        const newPersonaIds = updateRequest.isGlobal
          ? []
          : updateRequest.personaIds || fileMetadata.associatedPersonas;

        await fileStorageService.updateFileAssociations(sessionId, fileId, newPersonaIds);

        // Update session
        if (session.fileContexts && session.fileContexts[fileId]) {
          session.fileContexts[fileId].associatedPersonas = newPersonaIds;
        }

        // Update global/persona associations
        if (newPersonaIds.length === 0) {
          // Now global
          if (!session.globalFileIds) {
            session.globalFileIds = [];
          }
          if (!session.globalFileIds.includes(fileId)) {
            session.globalFileIds.push(fileId);
          }

          // Remove from persona associations
          if (session.personaFileAssociations) {
            Object.keys(session.personaFileAssociations).forEach((personaId) => {
              session.personaFileAssociations![personaId] = session.personaFileAssociations![
                personaId
              ].filter((id) => id !== fileId);
            });
          }
        } else {
          // Persona-specific
          if (session.globalFileIds) {
            session.globalFileIds = session.globalFileIds.filter((id) => id !== fileId);
          }

          if (!session.personaFileAssociations) {
            session.personaFileAssociations = {};
          }

          // Clear old associations
          Object.keys(session.personaFileAssociations).forEach((personaId) => {
            session.personaFileAssociations![personaId] = session.personaFileAssociations![
              personaId
            ].filter((id) => id !== fileId);
          });

          // Add new associations
          newPersonaIds.forEach((personaId) => {
            if (!session.personaFileAssociations![personaId]) {
              session.personaFileAssociations![personaId] = [];
            }
            if (!session.personaFileAssociations![personaId].includes(fileId)) {
              session.personaFileAssociations![personaId].push(fileId);
            }
          });
        }

        await sessionService.updateSession(session);

        fileMetadata.associatedPersonas = newPersonaIds;

        logger.info('File associations updated successfully', {
          sessionId,
          fileId,
          newAssociations: newPersonaIds,
        });

        const response: UpdateFileAssociationsResponse = {
          fileContext: fileMetadata,
          success: true,
        };

        res.status(200).json(response);
      } catch (error) {
        logger.error('Error updating file associations', {
          sessionId: req.params.sessionId,
          fileId: req.params.fileId,
          error: error instanceof Error ? error.message : String(error),
        });
        next(error);
      }
    }
  );

  return router;
}
