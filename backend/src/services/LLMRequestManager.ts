// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { createLogger } from '../config/logger';
import { LLMService } from './LLMService';
import { SharedServices } from './SharedServices';
import { Persona, ConversationMessage,  BusinessContext, ConversationTopic, ImageAttachment } from '@group-chat-ai/shared';

const logger = createLogger();

interface QueuedRequest {
  id: string;
  persona: Persona;
  conversationHistory: ConversationMessage[];
  userMessage: string;
  businessContext?: BusinessContext;
  conversationTopic?: ConversationTopic;
  otherActivePersonas?: Array<{
    personaId: string;
    name: string;
    role: string;
    description: string;
  }>;
  imageAttachment?: ImageAttachment;
  conversationLanguage?: string;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
  routingMode: 'parallel' | 'iterative';
}

export class LLMRequestManager {
  private llmService: LLMService;
  private requestQueue: QueuedRequest[] = [];
  private isProcessing: boolean = false;
  private maxConcurrentRequests: number = 2; // Limit concurrent requests
  private requestDelay: number = 1000; // 1 second delay between requests
  private activeRequests: number = 0;

  constructor() {
    this.llmService = SharedServices.getLLMService();
  }

  async generatePersonaResponse(
    persona: Persona,
    conversationHistory: ConversationMessage[],
    userMessage: string
  ): Promise<string> {
    return this.generatePersonaResponseWithScenario(
      persona,
      conversationHistory,
      userMessage,
    );
  }

  async generatePersonaResponseWithScenario(
    persona: Persona,
    conversationHistory: ConversationMessage[],
    userMessage: string,
     
    conversationTopic?: ConversationTopic,
    otherActivePersonas?: Array<{
      personaId: string;
      name: string;
      role: string;
      description: string;
    }>,
    imageAttachment?: ImageAttachment,
    routingMode: 'parallel' | 'iterative' = 'parallel',
    conversationLanguage?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const queuedRequest: QueuedRequest = {
        id: requestId,
        persona,
        conversationHistory,
        userMessage,
        conversationTopic,
        otherActivePersonas,
        imageAttachment,
        conversationLanguage,
        resolve,
        reject,
        timestamp: Date.now(),
        routingMode, // Use the passed routing mode parameter
      };

      this.requestQueue.push(queuedRequest);

      logger.info('LLM request queued', {
        requestId,
        personaId: persona.personaId,
        queueLength: this.requestQueue.length,
        otherPersonasCount: otherActivePersonas?.length || 0,
        hasImage: !!imageAttachment,
      });

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    logger.info('Starting LLM request queue processing', {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
    });

    while (this.requestQueue.length > 0 || this.activeRequests > 0) {
      // CRITICAL FIX: Check if we have iterative routing requests
      const hasIterativeRequests = this.requestQueue.some(req => req.routingMode === 'iterative');

      // Force sequential processing for iterative routing to prevent race conditions
      const effectiveConcurrencyLimit = hasIterativeRequests ? 1 : this.maxConcurrentRequests;

      logger.debug('Queue processing mode determined', {
        hasIterativeRequests,
        effectiveConcurrencyLimit,
        queueLength: this.requestQueue.length,
        activeRequests: this.activeRequests,
      });

      // Process requests up to the effective concurrent limit
      while (this.activeRequests < effectiveConcurrencyLimit && this.requestQueue.length > 0) {
        const request = this.requestQueue.shift()!;

        logger.info('Processing request with routing mode', {
          requestId: request.id,
          personaId: request.persona.personaId,
          routingMode: request.routingMode,
          effectiveConcurrencyLimit,
        });

        this.processRequest(request);
      }

      // Wait before checking again
      if (this.requestQueue.length > 0 || this.activeRequests > 0) {
        await this.sleep(this.requestDelay);
      }
    }

    this.isProcessing = false;
    logger.info('LLM request queue processing completed');
  }

  private async processRequest(request: QueuedRequest): Promise<void> {
    this.activeRequests++;

    try {
      logger.info('Processing LLM request', {
        requestId: request.id,
        personaId: request.persona.personaId,
        activeRequests: this.activeRequests,
      });

      const response = await this.llmService.generatePersonaResponse(
        request.persona,
        request.conversationHistory,
        request.userMessage,
        request.conversationTopic,
        request.otherActivePersonas,
        request.imageAttachment,
        request.conversationLanguage
      );

      request.resolve(response);

      logger.info('LLM request completed successfully', {
        requestId: request.id,
        personaId: request.persona.personaId,
        responseLength: response.length,
      });
    } catch (error) {
      logger.error('LLM request failed', {
        requestId: request.id,
        personaId: request.persona.personaId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Check if it's a throttling error and implement exponential backoff
      if (this.isThrottlingError(error)) {
        logger.warn('Throttling detected, implementing backoff', {
          requestId: request.id,
          personaId: request.persona.personaId,
        });

        // Put the request back in the queue with a delay
        setTimeout(() => {
          this.requestQueue.unshift(request);
          if (!this.isProcessing) {
            this.processQueue();
          }
        }, this.calculateBackoffDelay());
      } else {
        request.reject(error as Error);
      }
    } finally {
      this.activeRequests--;
    }
  }

  private isThrottlingError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }
    
    const err = error as {
      name?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number };
    };
    return !!(
      (typeof err.name === 'string' && err.name === 'ThrottlingException') ||
      (typeof err.message === 'string' && err.message.includes('Too many tokens')) ||
      (typeof err.message === 'string' && err.message.includes('throttl')) ||
      (err.$metadata && typeof err.$metadata === 'object' && err.$metadata.httpStatusCode === 429)
    );
  }

  private calculateBackoffDelay(): number {
    // Exponential backoff: 2s, 4s, 8s, max 30s
    const baseDelay = 2000;
    const maxDelay = 30000;
    const backoffMultiplier = Math.min(Math.pow(2, this.activeRequests), maxDelay / baseDelay);
    return Math.min(baseDelay * backoffMultiplier, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to get queue statistics
  getQueueStats(): {
    queueLength: number;
    activeRequests: number;
    isProcessing: boolean;
  } {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      isProcessing: this.isProcessing,
    };
  }

  // Method to clear the queue (for cleanup)
  clearQueue(): void {
    const clearedRequests = this.requestQueue.length;

    // Reject all pending requests
    this.requestQueue.forEach(request => {
      request.reject(new Error('Request queue cleared'));
    });

    this.requestQueue = [];

    logger.info('LLM request queue cleared', { clearedRequests });
  }
}
