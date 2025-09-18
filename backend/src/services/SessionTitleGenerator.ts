// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Session,
  ConversationMessage,
  MessageSender,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { LLMService } from './LLMService';
import { SharedServices } from './SharedServices';

const logger = createLogger();

/**
 * SessionTitleGenerator creates descriptive titles for conversation sessions
 * Based on the first 5 items in conversation history
 */
export class SessionTitleGenerator {
  private llmService: LLMService;

  constructor() {
    this.llmService = SharedServices.getLLMService();
  }

  /**
   * Generate a title for a session based on first 5 conversation items
   */
  async generateSessionTitle(session: Session): Promise<string> {
    try {
      // Get first 5 conversation items
      const firstMessages = session.conversationHistory.slice(0, 5);
      
      if (firstMessages.length === 0) {
        return this.getDefaultTitle(session);
      }

      // If we have enough messages, use LLM to generate title
      if (firstMessages.length >= 3) {
        try {
          const llmTitle = await this.generateTitleWithLLM(firstMessages, session);
          if (llmTitle && llmTitle.length > 0) {
            return llmTitle;
          }
        } catch (error) {
          logger.warn('LLM title generation failed, falling back to rule-based', { error });
        }
      }

      // Fallback to rule-based title generation
      return this.generateRuleBasedTitle(firstMessages, session);

    } catch (error) {
      logger.error('Error generating session title:', error);
      return this.getDefaultTitle(session);
    }
  }

  /**
   * Generate title using LLM for more natural results
   */
  private async generateTitleWithLLM(
    messages: ConversationMessage[],
    _session: Session
  ): Promise<string> {
    const conversationContext = messages
      .map(msg => {
        const sender = msg.sender === MessageSender.USER ? 'User' : `${msg.personaId}`;
        return `${sender}: ${msg.content}`;
      })
      .join('\n');

    const prompt = `Based on the following conversation excerpt from a group chat session, generate a concise, descriptive title (maximum 50 characters) that captures the main topic or focus:

Context: This is a group chat conversation with multiple speakers.

Conversation:
${conversationContext}

Guidelines:
- Keep it under 50 characters
- Focus on the main topic, product, or business area discussed
- Make it clear and professional
- Avoid generic phrases like "chat" or "practice"
- Use action words when possible

Title:`;

    try {
      const response = await this.llmService.generateSimpleResponse(prompt, {
        maxTokens: 20,
        temperature: 0.3, // Lower temperature for more consistent titles
      });

      // Clean and validate the response
      const title = response
        .replace(/^(Title:\s*)/i, '') // Remove "Title:" prefix
        .replace(/["""'']/g, '') // Remove quotes
        .trim()
        .slice(0, 50); // Ensure max length

      return title;
    } catch (error) {
      logger.warn('LLM title generation failed:', error);
      throw error;
    }
  }

  /**
   * Rule-based title generation as fallback
   */
  private generateRuleBasedTitle(
    messages: ConversationMessage[], 
    session: Session
  ): string {
    // Find first user message
    const firstUserMessage = messages.find(msg => msg.sender === MessageSender.USER);
    
    if (!firstUserMessage) {
      return this.getDefaultTitle(session);
    }

    const content = firstUserMessage.content.toLowerCase();
    
    // Extract key business/product terms
    const businessTerms = this.extractBusinessTerms(content);
    const actionTerms = this.extractActionTerms(content);
    
    // Build title based on detected terms
    if (businessTerms.length > 0) {
      const mainTerm = businessTerms[0];
      const action = actionTerms.length > 0 ? actionTerms[0] : 'Group Chat';
      return this.capitalizeTitle(`${action} for ${mainTerm}`);
    }
    
    if (actionTerms.length > 0) {
      return this.capitalizeTitle(`${actionTerms[0]} Discussion`);
    }

    // Fallback to truncated first message
    const truncated = firstUserMessage.content
      .slice(0, 40)
      .replace(/[^\w\s-]/g, '')
      .trim();
    
    return truncated || this.getDefaultTitle(session);
  }

  /**
   * Extract business/product related terms
   */
  private extractBusinessTerms(content: string): string[] {
    const businessPatterns = [
      /\b(platform|solution|system|application|app|software|service|product|tool)\b/gi,
      /\b(startup|company|business|organization|enterprise)\b/gi,
      /\b(ai|artificial intelligence|machine learning|ml|automation)\b/gi,
      /\b(saas|paas|iaas|cloud|api|integration)\b/gi,
      /\b(mobile|web|desktop|dashboard|interface)\b/gi,
      /\b(education|healthcare|finance|retail|manufacturing)\b/gi,
      /\b(crm|erp|cms|database|analytics|reporting)\b/gi,
    ];

    const terms: string[] = [];
    for (const pattern of businessPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        terms.push(...matches.slice(0, 2)); // Max 2 terms per pattern
      }
    }

    return terms.slice(0, 3); // Max 3 terms total
  }

  /**
   * Extract action terms that indicate presentation intent
   */
  private extractActionTerms(content: string): string[] {
    const actionPatterns = [
      /\b(present|presenting|propose|introducing|launch|launching)\b/gi,
      /\b(demo|demonstrate|show|showcase|explain|describe)\b/gi,
      /\b(sell|selling|market|marketing|promote|promoting)\b/gi,
      /\b(discuss|discussing|review|reviewing|evaluate)\b/gi,
    ];

    const terms: string[] = [];
    for (const pattern of actionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        terms.push(matches[0]);
        break; // Only take first action term
      }
    }

    return terms;
  }

  /**
   * Capitalize title properly
   */
  private capitalizeTitle(title: string): string {
    return title.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get default title based on session type
   */
  private getDefaultTitle(session: Session): string {
    const date = new Date(session.createdAt);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `Conversation Session - ${timeStr}`;
  }

  /**
   * Update session title if needed (called when session has enough messages)
   */
  async updateSessionTitleIfNeeded(session: Session): Promise<string | null> {
    try {
      // Only generate title if:
      // 1. Session doesn't have a custom title, or has a default title
      // 2. Has at least 3 messages (user + 2 responses)
      // 3. Total messages is divisible by 5 (to avoid regenerating too often)
      
      const hasDefaultTitle = !session.title || 
        session.title.includes('Session') || 
        session.title.includes('Chat -');
        
      const hasEnoughMessages = session.conversationHistory.length >= 3;
      const shouldRegenerate = (session.conversationHistory.length % 5) === 0;

      if (hasDefaultTitle && hasEnoughMessages && shouldRegenerate) {
        const newTitle = await this.generateSessionTitle(session);
        
        if (newTitle !== session.title) {
          logger.info('Generated new session title', {
            sessionId: session.sessionId,
            oldTitle: session.title,
            newTitle,
            messageCount: session.conversationHistory.length,
          });
          
          return newTitle;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error updating session title:', error);
      return null;
    }
  }
}