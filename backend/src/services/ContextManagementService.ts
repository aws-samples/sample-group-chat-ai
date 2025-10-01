// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { FileContext, FileChunk, ConversationMessage, Session } from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';

const logger = createLogger();

export interface ContextBudget {
  totalTokens: number;
  conversationTokens: number;
  fileContextTokens: number;
  systemPromptTokens: number;
  available: number;
}

export interface SelectedFileContext {
  fileId: string;
  fileName: string;
  chunks: FileChunk[];
  totalTokens: number;
}

export class ContextManagementService {
  // Token budget allocation (percentages)
  private readonly CONVERSATION_ALLOCATION = 0.5; // 50% for conversation history
  private readonly FILE_CONTEXT_ALLOCATION = 0.3; // 30% for file context
  private readonly SYSTEM_PROMPT_ALLOCATION = 0.2; // 20% for system prompts

  // Model context limits
  private readonly DEFAULT_CONTEXT_LIMIT = 200000; // Claude 3/4 context window
  private readonly CHARS_PER_TOKEN = 4; // Rough estimate

  /**
   * Calculate current context usage
   */
  calculateContextUsage(
    conversationHistory: ConversationMessage[],
    fileContexts: FileContext[],
    systemPromptLength: number
  ): ContextBudget {
    const totalTokens = this.DEFAULT_CONTEXT_LIMIT;

    // Calculate conversation tokens
    const conversationText = conversationHistory.map((msg) => msg.content).join(' ');
    const conversationTokens = this.estimateTokenCount(conversationText);

    // Calculate file context tokens
    const fileContextTokens = fileContexts.reduce((sum, file) => sum + (file.tokenCount || 0), 0);

    // Calculate system prompt tokens
    const systemPromptTokens = this.estimateTokenCount(systemPromptLength.toString());

    // Calculate available tokens
    const usedTokens = conversationTokens + fileContextTokens + systemPromptTokens;
    const available = Math.max(0, totalTokens - usedTokens);

    logger.debug('Context usage calculated', {
      totalTokens,
      conversationTokens,
      fileContextTokens,
      systemPromptTokens,
      available,
      usagePercentage: ((usedTokens / totalTokens) * 100).toFixed(2) + '%',
    });

    return {
      totalTokens,
      conversationTokens,
      fileContextTokens,
      systemPromptTokens,
      available,
    };
  }

  /**
   * Select relevant file context for a persona based on token budget
   */
  async selectFileContextForPersona(
    session: Session,
    personaId: string,
    conversationHistory: ConversationMessage[],
    systemPromptLength: number
  ): Promise<SelectedFileContext[]> {
    try {
      // Get files available to this persona
      const availableFiles = this.getPersonaFiles(session, personaId);

      if (availableFiles.length === 0) {
        logger.debug('No files available for persona', { personaId });
        return [];
      }

      // Calculate conversation token usage
      const conversationText = conversationHistory.map((msg) => msg.content).join(' ');
      const conversationTokens = this.estimateTokenCount(conversationText);
      const systemPromptTokens = this.estimateTokenCount(systemPromptLength.toString());

      // Calculate available file context budget
      const maxFileTokens = Math.floor(this.DEFAULT_CONTEXT_LIMIT * this.FILE_CONTEXT_ALLOCATION);
      const usedTokens = conversationTokens + systemPromptTokens;
      const remainingBudget = Math.max(0, maxFileTokens - usedTokens);

      logger.debug('File context budget calculated', {
        personaId,
        maxFileTokens,
        usedTokens,
        remainingBudget,
      });

      // If no budget, return empty
      if (remainingBudget <= 0) {
        logger.warn('No token budget available for file context', {
          personaId,
          usedTokens,
        });
        return [];
      }

      // Select and chunk files to fit within budget
      return this.selectFilesWithinBudget(availableFiles, remainingBudget);
    } catch (error) {
      logger.error('Error selecting file context for persona', {
        personaId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Select files and chunks within token budget
   */
  private selectFilesWithinBudget(
    files: FileContext[],
    tokenBudget: number
  ): SelectedFileContext[] {
    const selectedFiles: SelectedFileContext[] = [];
    let remainingBudget = tokenBudget;

    // Sort files by recency (most recent first)
    const sortedFiles = files.sort((a, b) => b.uploadedAt - a.uploadedAt);

    for (const file of sortedFiles) {
      if (remainingBudget <= 0) {
        break;
      }

      // Skip files with no chunks or processing failed
      if (!file.chunks || file.chunks.length === 0) {
        continue;
      }

      const selectedChunks: FileChunk[] = [];
      let fileTokenCount = 0;

      // Select chunks from this file that fit in remaining budget
      for (const chunk of file.chunks) {
        if (remainingBudget - chunk.tokenCount >= 0) {
          selectedChunks.push(chunk);
          fileTokenCount += chunk.tokenCount;
          remainingBudget -= chunk.tokenCount;
        } else {
          // Partial chunk won't be useful, stop here
          break;
        }
      }

      if (selectedChunks.length > 0) {
        selectedFiles.push({
          fileId: file.fileId,
          fileName: file.fileName,
          chunks: selectedChunks,
          totalTokens: fileTokenCount,
        });

        logger.debug('File selected for context', {
          fileId: file.fileId,
          fileName: file.fileName,
          chunksSelected: selectedChunks.length,
          totalChunks: file.chunks.length,
          tokensUsed: fileTokenCount,
        });
      }
    }

    logger.info('File context selection complete', {
      totalFilesAvailable: files.length,
      filesSelected: selectedFiles.length,
      tokensUsed: tokenBudget - remainingBudget,
      tokenBudget,
    });

    return selectedFiles;
  }

  /**
   * Get files available to a specific persona
   */
  private getPersonaFiles(session: Session, personaId: string): FileContext[] {
    if (!session.fileContexts) {
      return [];
    }

    const files = Object.values(session.fileContexts);

    // Return files that are either:
    // 1. Global (empty associatedPersonas array)
    // 2. Specifically assigned to this persona
    return files.filter(
      (file) =>
        file.associatedPersonas.length === 0 || file.associatedPersonas.includes(personaId)
    );
  }

  /**
   * Format file context for inclusion in prompt
   */
  formatFileContextForPrompt(selectedFiles: SelectedFileContext[]): string {
    if (selectedFiles.length === 0) {
      return '';
    }

    let contextText = '\n\n--- CONTEXTUAL KNOWLEDGE FROM UPLOADED FILES ---\n\n';

    for (const file of selectedFiles) {
      contextText += `\n### File: ${file.fileName}\n\n`;

      for (const chunk of file.chunks) {
        contextText += `${chunk.content}\n\n`;
      }
    }

    contextText += '\n--- END OF FILE CONTEXT ---\n\n';

    return contextText;
  }

  /**
   * Check if adding file context would exceed budget
   */
  canAddFileContext(
    session: Session,
    newFileTokenCount: number,
    personaId?: string
  ): {
    canAdd: boolean;
    reason?: string;
    currentUsage: number;
    maxAllowed: number;
  } {
    const maxFileTokens = Math.floor(this.DEFAULT_CONTEXT_LIMIT * this.FILE_CONTEXT_ALLOCATION);

    // Calculate current file context usage
    let currentFileTokens = 0;

    if (session.fileContexts) {
      const relevantFiles = personaId
        ? this.getPersonaFiles(session, personaId)
        : Object.values(session.fileContexts);

      currentFileTokens = relevantFiles.reduce((sum, file) => sum + (file.tokenCount || 0), 0);
    }

    const projectedTotal = currentFileTokens + newFileTokenCount;
    const canAdd = projectedTotal <= maxFileTokens;

    const result = {
      canAdd,
      reason: canAdd
        ? undefined
        : `Adding this file would exceed file context budget (${projectedTotal} > ${maxFileTokens} tokens)`,
      currentUsage: currentFileTokens,
      maxAllowed: maxFileTokens,
    };

    logger.debug('File context budget check', {
      personaId,
      newFileTokenCount,
      currentFileTokens,
      maxFileTokens,
      canAdd,
    });

    return result;
  }

  /**
   * Estimate token count from text
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Get context usage statistics
   */
  getContextStats(session: Session, personaId?: string): {
    totalFiles: number;
    totalTokens: number;
    filesByPersona: Record<string, number>;
    globalFiles: number;
  } {
    if (!session.fileContexts) {
      return {
        totalFiles: 0,
        totalTokens: 0,
        filesByPersona: {},
        globalFiles: 0,
      };
    }

    const files = Object.values(session.fileContexts);
    const totalTokens = files.reduce((sum, file) => sum + (file.tokenCount || 0), 0);

    const globalFiles = files.filter((f) => f.associatedPersonas.length === 0).length;

    const filesByPersona: Record<string, number> = {};
    files.forEach((file) => {
      file.associatedPersonas.forEach((pId) => {
        filesByPersona[pId] = (filesByPersona[pId] || 0) + 1;
      });
    });

    return {
      totalFiles: files.length,
      totalTokens,
      filesByPersona,
      globalFiles,
    };
  }
}
