// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { FileChunk } from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';

const logger = createLogger();

export interface ProcessedFileResult {
  extractedText: string;
  chunks: FileChunk[];
  tokenCount: number;
}

export class FileProcessingService {
  private readonly CHUNK_SIZE = 2000; // Target tokens per chunk
  private readonly CHUNK_OVERLAP = 200; // Overlap tokens between chunks
  private readonly CHARS_PER_TOKEN = 4; // Rough estimate: 1 token ≈ 4 characters

  /**
   * Process a file buffer and extract text content
   */
  async processFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<ProcessedFileResult> {
    try {
      logger.info('Processing file', { fileName, mimeType, size: fileBuffer.length });

      let extractedText: string;

      // Extract text based on file type
      if (mimeType === 'application/pdf') {
        extractedText = await this.extractPdfText(fileBuffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel'
      ) {
        extractedText = await this.extractExcelText(fileBuffer);
      } else if (mimeType === 'text/csv') {
        extractedText = await this.extractCsvText(fileBuffer);
      } else if (mimeType === 'application/json') {
        extractedText = await this.extractJsonText(fileBuffer);
      } else if (mimeType.startsWith('text/')) {
        extractedText = fileBuffer.toString('utf-8');
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Clean and normalize text
      extractedText = this.cleanText(extractedText);

      // Chunk the text
      const chunks = this.chunkText(extractedText);

      // Calculate total token count
      const tokenCount = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);

      logger.info('File processing complete', {
        fileName,
        extractedTextLength: extractedText.length,
        chunksCount: chunks.length,
        tokenCount,
      });

      return {
        extractedText,
        chunks,
        tokenCount,
      };
    } catch (error) {
      logger.error('Error processing file', {
        fileName,
        mimeType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   */
  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      logger.error('Error extracting PDF text', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to extract text from PDF file');
    }
  }

  /**
   * Extract text from Excel file
   */
  private async extractExcelText(buffer: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let text = '';

      workbook.SheetNames.forEach((sheetName: string, index: number) => {
        const worksheet = workbook.Sheets[sheetName];
        text += `\n\n--- Sheet: ${sheetName} ---\n\n`;
        text += XLSX.utils.sheet_to_txt(worksheet);
      });

      return text;
    } catch (error) {
      logger.error('Error extracting Excel text', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to extract text from Excel file');
    }
  }

  /**
   * Extract text from CSV file
   */
  private async extractCsvText(buffer: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_txt(firstSheet);
    } catch (error) {
      logger.error('Error extracting CSV text', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to extract text from CSV file');
    }
  }

  /**
   * Extract text from JSON file
   */
  private async extractJsonText(buffer: Buffer): Promise<string> {
    try {
      const jsonData = JSON.parse(buffer.toString('utf-8'));
      return JSON.stringify(jsonData, null, 2);
    } catch (error) {
      logger.error('Error extracting JSON text', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to extract text from JSON file');
    }
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanText(text: string): string {
    return (
      text
        // Remove excessive whitespace
        .replace(/\s+/g, ' ')
        // Remove null bytes
        .replace(/\0/g, '')
        // Trim
        .trim()
    );
  }

  /**
   * Chunk text into smaller segments with overlap
   */
  private chunkText(text: string): FileChunk[] {
    const chunks: FileChunk[] = [];
    const targetChars = this.CHUNK_SIZE * this.CHARS_PER_TOKEN;
    const overlapChars = this.CHUNK_OVERLAP * this.CHARS_PER_TOKEN;

    let startOffset = 0;
    let chunkIndex = 0;

    while (startOffset < text.length) {
      // Calculate end offset for this chunk
      let endOffset = Math.min(startOffset + targetChars, text.length);

      // Try to end at a sentence boundary if possible
      if (endOffset < text.length) {
        const sentenceEnd = text.lastIndexOf('.', endOffset);
        const paragraphEnd = text.lastIndexOf('\n', endOffset);
        const boundaryIndex = Math.max(sentenceEnd, paragraphEnd);

        if (boundaryIndex > startOffset + targetChars / 2) {
          endOffset = boundaryIndex + 1;
        }
      }

      // Extract chunk content
      const content = text.substring(startOffset, endOffset).trim();

      if (content.length > 0) {
        const tokenCount = this.estimateTokenCount(content);

        chunks.push({
          chunkId: `chunk_${chunkIndex}`,
          chunkIndex,
          content,
          tokenCount,
          startOffset,
          endOffset,
        });

        chunkIndex++;
      }

      // Move to next chunk with overlap
      startOffset = endOffset - overlapChars;

      // Ensure we make progress
      const lastChunkOffset = chunks.length > 0 ? chunks[chunks.length - 1].startOffset : -1;
      if (startOffset <= lastChunkOffset) {
        startOffset = endOffset;
      }
    }

    logger.debug('Text chunking complete', {
      totalChunks: chunks.length,
      totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
    });

    return chunks;
  }

  /**
   * Estimate token count from text
   * Using rough estimate: 1 token ≈ 4 characters
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Get supported MIME types
   */
  static getSupportedMimeTypes(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
      'text/markdown',
      'application/json',
    ];
  }

  /**
   * Validate file type
   */
  static isFileTypeSupported(mimeType: string): boolean {
    return this.getSupportedMimeTypes().includes(mimeType);
  }

  /**
   * Get file extension from MIME type
   */
  static getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-excel': '.xls',
      'text/csv': '.csv',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'application/json': '.json',
    };

    return mimeToExt[mimeType] || '';
  }
}
