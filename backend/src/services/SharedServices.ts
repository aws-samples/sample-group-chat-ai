// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import { LLMService } from './LLMService';
import { ConversationOrchestrator } from './ConversationOrchestrator';
import { RoutingProcessor } from './RoutingProcessor';
import { ContentAnalysisService } from './ContentAnalysisService';

/**
 * Shared service instances to prevent duplicate initialization
 */
class SharedServices {
  private static _llmService: LLMService;
  private static _conversationOrchestrator: ConversationOrchestrator;
  private static _routingProcessor: RoutingProcessor;
  private static _contentAnalysisService: ContentAnalysisService;

  /**
   * Get shared LLMService instance
   */
  static getLLMService(): LLMService {
    if (!this._llmService) {
      this._llmService = new LLMService();
    }
    return this._llmService;
  }

  /**
   * Get shared ConversationOrchestrator instance
   */
  static getConversationOrchestrator(): ConversationOrchestrator {
    if (!this._conversationOrchestrator) {
      this._conversationOrchestrator = new ConversationOrchestrator();
    }
    return this._conversationOrchestrator;
  }

  /**
   * Get shared RoutingProcessor instance
   */
  static getRoutingProcessor(): RoutingProcessor {
    if (!this._routingProcessor) {
      // Use shared LLMService
      this._routingProcessor = new RoutingProcessor(this.getLLMService());
    }
    return this._routingProcessor;
  }

  /**
   * Get shared ContentAnalysisService instance
   */
  static getContentAnalysisService(): ContentAnalysisService {
    if (!this._contentAnalysisService) {
      this._contentAnalysisService = new ContentAnalysisService();
    }
    return this._contentAnalysisService;
  }

  /**
   * Reset all services (for testing)
   */
  static reset(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._llmService = undefined as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._conversationOrchestrator = undefined as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._routingProcessor = undefined as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._contentAnalysisService = undefined as any;
  }
}

export { SharedServices };