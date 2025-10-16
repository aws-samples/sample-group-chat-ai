// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { FileContext, FileProcessingStatus } from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger();

export class FileStorageService {
  private s3Client: S3Client;
  private dynamoDbClient: DynamoDBClient;
  private bucketName: string;
  private tableName: string;
  private presignedUrlExpiration: number = 900; // 15 minutes

  constructor() {
    const region = process.env.AWS_REGION || 'us-west-2';
    this.bucketName = process.env.FILE_STORAGE_BUCKET || '';
    this.tableName = process.env.FILE_METADATA_TABLE || '';

    if (!this.bucketName) {
      throw new Error('FILE_STORAGE_BUCKET environment variable is not set');
    }

    if (!this.tableName) {
      throw new Error('FILE_METADATA_TABLE environment variable is not set');
    }

    this.s3Client = new S3Client({ region });
    this.dynamoDbClient = new DynamoDBClient({ region });

    logger.info('FileStorageService initialized', {
      bucketName: this.bucketName,
      tableName: this.tableName,
    });
  }

  /**
   * Generate a presigned URL for file upload
   */
  async generateUploadUrl(
    sessionId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    targetPersonas?: string[]
  ): Promise<{
    fileId: string;
    uploadUrl: string;
    s3Key: string;
    expiresIn: number;
  }> {
    try {
      const fileId = uuidv4();
      const s3Key = `sessions/${sessionId}/files/${fileId}/${fileName}`;

      logger.info('Generating presigned upload URL', {
        sessionId,
        fileId,
        fileName,
        fileType,
        fileSize,
      });

      // Create presigned URL for PUT operation
      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: this.presignedUrlExpiration,
      });

      // Store initial file metadata in DynamoDB
      const fileContext: FileContext = {
        fileId,
        sessionId,
        fileName,
        fileType,
        fileSize,
        uploadedAt: Date.now(),
        s3Key,
        associatedPersonas: targetPersonas || [],
        processingStatus: FileProcessingStatus.PENDING,
        tokenCount: 0,
      };

      await this.saveFileMetadata(fileContext);

      logger.info('Presigned URL generated successfully', {
        sessionId,
        fileId,
        expiresIn: this.presignedUrlExpiration,
      });

      return {
        fileId,
        uploadUrl,
        s3Key,
        expiresIn: this.presignedUrlExpiration,
      };
    } catch (error) {
      logger.error('Error generating upload URL', {
        sessionId,
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Download file from S3
   */
  async downloadFile(s3Key: string): Promise<Buffer> {
    try {
      logger.info('Downloading file from S3', { s3Key });

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('No file content received from S3');
      }

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      logger.info('File downloaded successfully', {
        s3Key,
        size: buffer.length,
      });

      return buffer;
    } catch (error) {
      logger.error('Error downloading file from S3', {
        s3Key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(s3Key: string): Promise<void> {
    try {
      logger.info('Deleting file from S3', { s3Key });

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);

      logger.info('File deleted successfully from S3', { s3Key });
    } catch (error) {
      logger.error('Error deleting file from S3', {
        s3Key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Save file metadata to DynamoDB
   */
  async saveFileMetadata(fileContext: FileContext): Promise<void> {
    try {
      logger.info('Saving file metadata', {
        fileId: fileContext.fileId,
        sessionId: fileContext.sessionId,
      });

      // Set TTL to 90 days from now
      const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60;

      const item = {
        ...fileContext,
        ttl,
      };

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(item, { removeUndefinedValues: true }),
      });

      await this.dynamoDbClient.send(command);

      logger.info('File metadata saved successfully', {
        fileId: fileContext.fileId,
      });
    } catch (error) {
      logger.error('Error saving file metadata', {
        fileId: fileContext.fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get file metadata from DynamoDB
   */
  async getFileMetadata(sessionId: string, fileId: string): Promise<FileContext | null> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ sessionId, fileId }),
      });

      const response = await this.dynamoDbClient.send(command);

      if (!response.Item) {
        return null;
      }

      return unmarshall(response.Item) as FileContext;
    } catch (error) {
      logger.error('Error getting file metadata', {
        sessionId,
        fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List all files for a session
   */
  async listSessionFiles(sessionId: string): Promise<FileContext[]> {
    try {
      logger.info('Listing files for session', { sessionId });

      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'sessionId = :sessionId',
        ExpressionAttributeValues: marshall({
          ':sessionId': sessionId,
        }),
      });

      const response = await this.dynamoDbClient.send(command);

      const files = (response.Items || []).map((item) => unmarshall(item) as FileContext);

      logger.info('Files retrieved successfully', {
        sessionId,
        count: files.length,
      });

      return files;
    } catch (error) {
      logger.error('Error listing session files', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update file processing status
   */
  async updateFileStatus(
    sessionId: string,
    fileId: string,
    status: FileProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      logger.info('Updating file status', { sessionId, fileId, status });

      const updateExpression = errorMessage
        ? 'SET processingStatus = :status, errorMessage = :error'
        : 'SET processingStatus = :status';

      const expressionAttributeValues = errorMessage
        ? { ':status': status, ':error': errorMessage }
        : { ':status': status };

      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ sessionId, fileId }),
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
      });

      await this.dynamoDbClient.send(command);

      logger.info('File status updated successfully', {
        sessionId,
        fileId,
        status,
      });
    } catch (error) {
      logger.error('Error updating file status', {
        sessionId,
        fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update file persona associations
   */
  async updateFileAssociations(
    sessionId: string,
    fileId: string,
    personaIds: string[]
  ): Promise<void> {
    try {
      logger.info('Updating file associations', {
        sessionId,
        fileId,
        personaIds,
      });

      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ sessionId, fileId }),
        UpdateExpression: 'SET associatedPersonas = :personas',
        ExpressionAttributeValues: marshall({
          ':personas': personaIds,
        }),
      });

      await this.dynamoDbClient.send(command);

      logger.info('File associations updated successfully', {
        sessionId,
        fileId,
      });
    } catch (error) {
      logger.error('Error updating file associations', {
        sessionId,
        fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete file metadata from DynamoDB
   */
  async deleteFileMetadata(sessionId: string, fileId: string): Promise<void> {
    try {
      logger.info('Deleting file metadata', { sessionId, fileId });

      const command = new DeleteItemCommand({
        TableName: this.tableName,
        Key: marshall({ sessionId, fileId }),
      });

      await this.dynamoDbClient.send(command);

      logger.info('File metadata deleted successfully', {
        sessionId,
        fileId,
      });
    } catch (error) {
      logger.error('Error deleting file metadata', {
        sessionId,
        fileId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get files associated with a specific persona
   */
  async getPersonaFiles(sessionId: string, personaId: string): Promise<FileContext[]> {
    try {
      const allFiles = await this.listSessionFiles(sessionId);

      // Filter files that are either global (empty associatedPersonas) or include this persona
      const personaFiles = allFiles.filter(
        (file) =>
          file.associatedPersonas.length === 0 || file.associatedPersonas.includes(personaId)
      );

      logger.info('Persona files retrieved', {
        sessionId,
        personaId,
        count: personaFiles.length,
      });

      return personaFiles;
    } catch (error) {
      logger.error('Error getting persona files', {
        sessionId,
        personaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
