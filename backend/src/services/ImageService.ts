// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  ImageAttachment,
  ChunkInfo,
  InitiateImageUploadRequest,
  InitiateImageUploadResponse,
  UploadImageChunkRequest,
  UploadImageChunkResponse,
  CompleteImageUploadRequest,
  CompleteImageUploadResponse,
  ValidationException,
  ResourceNotFoundException,
  ServiceException,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import Jimp from 'jimp';

const logger = createLogger();

interface ImageUploadSession {
  imageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  chunks: Map<number, Buffer>;
  uploadedChunks: Set<number>;
  createdAt: number;
  lastActivity: number;
}

export class ImageService {
  private uploadSessions: Map<string, ImageUploadSession> = new Map();
  private readonly MAX_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks to stay under 10MB API Gateway limit
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max file size
  private readonly UPLOAD_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ];

  constructor() {
    // Clean up expired upload sessions every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      5 * 60 * 1000
    );

    logger.info('ImageService initialized', {
      maxChunkSize: this.MAX_CHUNK_SIZE,
      maxFileSize: this.MAX_FILE_SIZE,
      supportedTypes: this.SUPPORTED_IMAGE_TYPES.length,
    });
  }

  async initiateImageUpload(
    request: InitiateImageUploadRequest
  ): Promise<InitiateImageUploadResponse> {
    try {
      // Validate request
      this.validateUploadRequest(request);

      const imageId = uuidv4();
      const totalChunks = Math.ceil(request.fileSize / this.MAX_CHUNK_SIZE);

      // Create upload session
      const uploadSession: ImageUploadSession = {
        imageId,
        fileName: request.fileName,
        fileType: request.fileType,
        fileSize: request.fileSize,
        totalChunks,
        chunks: new Map(),
        uploadedChunks: new Set(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.uploadSessions.set(imageId, uploadSession);

      logger.info('Image upload initiated', {
        imageId,
        fileName: request.fileName,
        fileSize: request.fileSize,
        totalChunks,
      });

      return {
        imageId,
        maxChunkSize: this.MAX_CHUNK_SIZE,
      };
    } catch (error) {
      logger.error('Error initiating image upload:', error);
      throw error;
    }
  }

  async uploadImageChunk(
    imageId: string,
    request: UploadImageChunkRequest
  ): Promise<UploadImageChunkResponse> {
    try {
      const uploadSession = this.uploadSessions.get(imageId);
      if (!uploadSession) {
        throw new ResourceNotFoundException(
          `Upload session not found for image ID: ${imageId}`,
          'imageUpload',
          imageId
        );
      }

      // Update last activity
      uploadSession.lastActivity = Date.now();

      // Validate chunk
      this.validateChunkRequest(uploadSession, request);

      // Decode base64 chunk data
      const chunkBuffer = Buffer.from(request.chunkData, 'base64');

      // Verify chunk size matches
      if (chunkBuffer.length !== request.chunkSize) {
        throw new ValidationException(
          `Chunk size mismatch. Expected: ${request.chunkSize}, Actual: ${chunkBuffer.length}`
        );
      }

      // Store chunk
      uploadSession.chunks.set(request.chunkIndex, chunkBuffer);
      uploadSession.uploadedChunks.add(request.chunkIndex);

      const chunkId = `${imageId}-chunk-${request.chunkIndex}`;

      logger.info('Image chunk uploaded', {
        imageId,
        chunkIndex: request.chunkIndex,
        chunkSize: request.chunkSize,
        totalUploaded: uploadSession.uploadedChunks.size,
        totalChunks: uploadSession.totalChunks,
      });

      return {
        chunkId,
        chunkIndex: request.chunkIndex,
        success: true,
      };
    } catch (error) {
      logger.error('Error uploading image chunk:', error);
      throw error;
    }
  }

  async completeImageUpload(
    request: CompleteImageUploadRequest
  ): Promise<CompleteImageUploadResponse> {
    try {
      const uploadSession = this.uploadSessions.get(request.imageId);
      if (!uploadSession) {
        throw new ResourceNotFoundException(
          `Upload session not found for image ID: ${request.imageId}`,
          'imageUpload',
          request.imageId
        );
      }

      // Verify all chunks are uploaded
      if (uploadSession.uploadedChunks.size !== uploadSession.totalChunks) {
        throw new ValidationException(
          `Incomplete upload. Expected ${uploadSession.totalChunks} chunks, received ${uploadSession.uploadedChunks.size}`
        );
      }

      // Reassemble image from chunks
      const imageBuffer = await this.reassembleImage(uploadSession);

      // Process image (create thumbnail, validate, etc.)
      const imageAttachment = await this.processImage(uploadSession, imageBuffer);

      // Clean up upload session
      this.uploadSessions.delete(request.imageId);

      logger.info('Image upload completed', {
        imageId: request.imageId,
        fileName: uploadSession.fileName,
        finalSize: imageBuffer.length,
        hasThumb: !!imageAttachment.thumbnailData,
      });

      return {
        imageId: request.imageId,
        imageAttachment,
        success: true,
      };
    } catch (error) {
      logger.error('Error completing image upload:', error);
      throw error;
    }
  }

  async getImageAttachment(_imageId: string): Promise<ImageAttachment | null> {
    // In a production system, this would retrieve from persistent storage
    // For now, we'll return null as images are processed immediately
    return null;
  }

  private validateUploadRequest(request: InitiateImageUploadRequest): void {
    if (!request.fileName || request.fileName.trim().length === 0) {
      throw new ValidationException('File name is required');
    }

    if (!request.fileType || !this.SUPPORTED_IMAGE_TYPES.includes(request.fileType.toLowerCase())) {
      throw new ValidationException(
        `Unsupported file type: ${request.fileType}. Supported types: ${this.SUPPORTED_IMAGE_TYPES.join(', ')}`
      );
    }

    if (request.fileSize <= 0) {
      throw new ValidationException('File size must be greater than 0');
    }

    if (request.fileSize > this.MAX_FILE_SIZE) {
      throw new ValidationException(
        `File size exceeds maximum limit of ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    if (request.totalChunks <= 0) {
      throw new ValidationException('Total chunks must be greater than 0');
    }

    const expectedChunks = Math.ceil(request.fileSize / this.MAX_CHUNK_SIZE);
    if (request.totalChunks !== expectedChunks) {
      throw new ValidationException(
        `Invalid chunk count. Expected: ${expectedChunks}, Provided: ${request.totalChunks}`
      );
    }
  }

  private validateChunkRequest(
    uploadSession: ImageUploadSession,
    request: UploadImageChunkRequest
  ): void {
    if (request.chunkIndex < 0 || request.chunkIndex >= uploadSession.totalChunks) {
      throw new ValidationException(
        `Invalid chunk index: ${request.chunkIndex}. Must be between 0 and ${uploadSession.totalChunks - 1}`
      );
    }

    if (uploadSession.uploadedChunks.has(request.chunkIndex)) {
      throw new ValidationException(`Chunk ${request.chunkIndex} has already been uploaded`);
    }

    if (request.chunkSize <= 0 || request.chunkSize > this.MAX_CHUNK_SIZE) {
      throw new ValidationException(
        `Invalid chunk size: ${request.chunkSize}. Must be between 1 and ${this.MAX_CHUNK_SIZE}`
      );
    }

    if (!request.chunkData || request.chunkData.length === 0) {
      throw new ValidationException('Chunk data is required');
    }
  }

  private async reassembleImage(uploadSession: ImageUploadSession): Promise<Buffer> {
    const chunks: Buffer[] = [];

    // Reassemble chunks in order
    for (let i = 0; i < uploadSession.totalChunks; i++) {
      const chunk = uploadSession.chunks.get(i);
      if (!chunk) {
        throw new ServiceException(`Missing chunk ${i} during reassembly`);
      }
      chunks.push(chunk);
    }

    // Manually concatenate buffers to avoid TypeScript type issues
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const resultArray = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      resultArray.set(new Uint8Array(chunk), offset);
      offset += chunk.length;
    }
    
    const imageBuffer = Buffer.from(resultArray);

    // Verify final size matches expected
    if (imageBuffer.length !== uploadSession.fileSize) {
      throw new ServiceException(
        `Reassembled image size mismatch. Expected: ${uploadSession.fileSize}, Actual: ${imageBuffer.length}`
      );
    }

    return imageBuffer;
  }

  private async processImage(
    uploadSession: ImageUploadSession,
    imageBuffer: Buffer
  ): Promise<ImageAttachment> {
    try {
      // Validate image format and get metadata using Jimp
      const image = await Jimp.read(imageBuffer);

      // Validate that image loaded successfully
      if (!image || image.getWidth() === 0 || image.getHeight() === 0) {
        throw new ValidationException('Invalid image format');
      }

      // Create thumbnail for UI display (max 200x200)
      const thumbnail = image.clone();
      thumbnail.scaleToFit(200, 200);
      const thumbnailBuffer = await thumbnail.quality(80).getBufferAsync(Jimp.MIME_JPEG);

      // Convert to base64 for storage and LLM processing
      const base64Data = imageBuffer.toString('base64');
      const thumbnailData = thumbnailBuffer.toString('base64');

      // Create chunk info for reference
      const chunks: ChunkInfo[] = [];
      for (let i = 0; i < uploadSession.totalChunks; i++) {
        chunks.push({
          chunkId: `${uploadSession.imageId}-chunk-${i}`,
          chunkIndex: i,
          totalChunks: uploadSession.totalChunks,
          chunkSize: uploadSession.chunks.get(i)?.length || 0,
          uploadedAt: Date.now(),
        });
      }

      const imageAttachment: ImageAttachment = {
        imageId: uploadSession.imageId,
        fileName: uploadSession.fileName,
        fileType: uploadSession.fileType,
        fileSize: uploadSession.fileSize,
        uploadedAt: Date.now(),
        chunks,
        isComplete: true,
        base64Data,
        thumbnailData,
      };

      logger.info('Image processed successfully', {
        imageId: uploadSession.imageId,
        format: image.getMIME(),
        width: image.getWidth(),
        height: image.getHeight(),
        thumbnailSize: thumbnailBuffer.length,
      });

      return imageAttachment;
    } catch (error) {
      logger.error('Error processing image:', error);
      throw new ServiceException('Failed to process image', error as Error);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [imageId, session] of this.uploadSessions.entries()) {
      if (now - session.lastActivity > this.UPLOAD_SESSION_TIMEOUT) {
        this.uploadSessions.delete(imageId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired upload sessions', {
        cleanedCount,
        remainingSessions: this.uploadSessions.size,
      });
    }
  }

  // Get upload session status (for debugging/monitoring)
  getUploadSessionStatus(imageId: string): Record<string, unknown> | undefined {
    const session = this.uploadSessions.get(imageId);
    if (!session) {
      return undefined;
    }

    return {
      imageId: session.imageId,
      fileName: session.fileName,
      fileType: session.fileType,
      fileSize: session.fileSize,
      totalChunks: session.totalChunks,
      uploadedChunks: session.uploadedChunks.size,
      progress: (session.uploadedChunks.size / session.totalChunks) * 100,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    };
  }
}
