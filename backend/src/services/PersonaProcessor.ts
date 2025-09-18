// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Persona,
  ConversationMessage,
  
  PersonaResponse,
  AgentResponse,
  ConversationAction,
  ConversationActionType,
  InteractionAction,
  ResponseType,
  InteractionMetadata,
  ContentAnalysis,
  Session,
  ImageAttachment,
  ResponsePattern,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { LLMRequestManager } from './LLMRequestManager';

const logger = createLogger();

export class PersonaProcessor {
  private persona: Persona;
  private llmRequestManager: LLMRequestManager;

  constructor(persona: Persona, llmRequestManager: LLMRequestManager) {
    this.persona = persona;
    this.llmRequestManager = llmRequestManager;
  }

  async generateResponse(
    conversationHistory: ConversationMessage[],
    userMessage: string,
     
    contentAnalysis: ContentAnalysis,
    sessionContext?: Session,
    otherActivePersonas?: Array<{
      personaId: string;
      name: string;
      role: string;
      description: string;
    }>,
    imageAttachment?: ImageAttachment,
    routingMode: 'parallel' | 'iterative' = 'iterative'
  ): Promise<AgentResponse> {
    try {
      // eslint-disable-next-line no-console
      console.log('Generating persona response', {
        personaId: this.persona.personaId,
        messageLength: userMessage.length,
      });

      // Determine response type based on content analysis and persona rules
      const responseType = this.determineResponseType(contentAnalysis, conversationHistory);

      // Generate the actual response content
      const responseContent = await this.generateResponseContent(
        conversationHistory,
        userMessage,
        responseType,
        contentAnalysis,
        sessionContext,
        otherActivePersonas,
        imageAttachment,
        routingMode
      );

      // Calculate confidence based on expertise match
      const confidence = this.calculateConfidence(contentAnalysis);

      // Determine next conversation action
      const nextAction = this.determineNextAction(
        responseType,
        contentAnalysis,
        conversationHistory
      );

      // Create interaction metadata
      const interactionMetadata: InteractionMetadata = {
        responseType,
        expertiseMatch: confidence,
        conversationAction:
          nextAction?.action === ConversationActionType.ROUTE_TO_PERSONA
            ? InteractionAction.SUGGEST_PERSONA
            : undefined,
        reasoning: `Response generated based on ${responseType} pattern with ${(confidence * 100).toFixed(1)}% expertise match`,
      };

      // Build the persona response
      const personaResponse: PersonaResponse = {
        personaId: this.persona.personaId,
        personaName: this.persona.name,
        personaRole: this.persona.role,
        content: responseContent,
        timestamp: Date.now(),
        confidence,
        suggestedFollowup: this.shouldSuggestFollowup(responseType, contentAnalysis),
        suggestedPersonas: this.suggestOtherPersonas(contentAnalysis),
        interactionMetadata,
      };

      const agentResponse: AgentResponse = {
        personaId: this.persona.personaId,
        response: personaResponse,
        nextAction,
        confidence,
      };

      logger.info('Persona response generated successfully', {
        personaId: this.persona.personaId,
        responseType,
        confidence,
        hasNextAction: !!nextAction,
      });

      return agentResponse;
    } catch (error) {
      logger.error('Error generating persona response', {
        personaId: this.persona.personaId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return fallback response
      return this.createFallbackResponse();
    }
  }

  private determineResponseType(
    contentAnalysis: ContentAnalysis,
    conversationHistory: ConversationMessage[]
  ): ResponseType {
    // Check interaction rules first
    for (const rule of this.persona.interactionRules) {
      if (this.evaluateRuleCondition(rule.condition, contentAnalysis, conversationHistory)) {
        switch (rule.action) {
          case InteractionAction.CHALLENGE_POINT:
            return ResponseType.CHALLENGE;
          case InteractionAction.SUPPORT_POINT:
            return ResponseType.SUPPORT;
          case InteractionAction.REQUEST_FOLLOWUP:
            return ResponseType.FOLLOW_UP_QUESTION;
          case InteractionAction.SUGGEST_PERSONA:
            return ResponseType.REDIRECT;
        }
      }
    }

    // Default response type based on content analysis
    if (contentAnalysis.sentiment < -0.3) {
      return ResponseType.CHALLENGE;
    } else if (contentAnalysis.complexity > 0.7) {
      return ResponseType.FOLLOW_UP_QUESTION;
    } else if (this.hasHighExpertiseMatch(contentAnalysis)) {
      return ResponseType.DIRECT_ANSWER;
    } else {
      return ResponseType.REDIRECT;
    }
  }

  private async generateResponseContent(
    conversationHistory: ConversationMessage[],
    userMessage: string,
     
    responseType: ResponseType,
    contentAnalysis: ContentAnalysis,
    session?: Session,
    otherActivePersonas?: Array<{
      personaId: string;
      name: string;
      role: string;
      description: string;
    }>,
    imageAttachment?: ImageAttachment,
    routingMode: 'parallel' | 'iterative' = 'iterative'
  ): Promise<string> {
    // Find matching response pattern
    const matchingPattern = this.findMatchingResponsePattern(responseType, contentAnalysis);

    if (matchingPattern) {
      // Use custom response pattern
      const customPrompt = this.buildCustomPrompt(
        matchingPattern,
        conversationHistory,
        userMessage,
        contentAnalysis
      );

      return await this.llmRequestManager.generatePersonaResponseWithScenario(
        this.persona,
        conversationHistory,
        customPrompt,
        session?.conversationTopic,
        otherActivePersonas,
        imageAttachment,
        routingMode,
        session?.conversationLanguage || session?.voiceSettings?.conversationLanguage
      );
    } else {
      // Use default LLM request manager with group chat scenario
      return await this.llmRequestManager.generatePersonaResponseWithScenario(
        this.persona,
        conversationHistory,
        userMessage,
        session?.conversationTopic,
        otherActivePersonas,
        imageAttachment,
        routingMode,
        session?.conversationLanguage || session?.voiceSettings?.conversationLanguage
      );
    }
  }

  private calculateConfidence(contentAnalysis: ContentAnalysis): number {
    let confidence = 0;

    // Base confidence on expertise area matches
    for (const expertiseArea of contentAnalysis.expertiseAreas) {
      const keywordMatches = this.countKeywordMatches(
        expertiseArea.keywords,
        this.persona.expertiseKeywords
      );

      if (keywordMatches > 0) {
        confidence += expertiseArea.confidence * (keywordMatches / expertiseArea.keywords.length);
      }
    }

    // Boost confidence for priority alignment
    const priorityAlignment = this.checkPriorityAlignment(
      contentAnalysis.topics,
      this.persona.priorities
    );
    confidence += priorityAlignment * 0.3;

    return Math.min(confidence, 1.0);
  }

  private determineNextAction(
    responseType: ResponseType,
    contentAnalysis: ContentAnalysis,
    conversationHistory: ConversationMessage[]
  ): ConversationAction | undefined {
    // Check if this persona should suggest continuing the conversation
    if (responseType === ResponseType.FOLLOW_UP_QUESTION) {
      return {
        action: ConversationActionType.ROUTE_TO_PERSONA,
        targetPersona: this.persona.personaId,
        shouldContinue: true,
        reasoning: 'Follow-up question requires continued engagement',
      };
    }

    // Check if should redirect to another persona
    if (responseType === ResponseType.REDIRECT) {
      const suggestedPersonas = this.suggestOtherPersonas(contentAnalysis);
      if (suggestedPersonas.length > 0) {
        return {
          action: ConversationActionType.ROUTE_TO_PERSONA,
          targetPersona: suggestedPersonas[0],
          shouldContinue: true,
          reasoning: `Content better suited for ${suggestedPersonas[0]} expertise`,
        };
      }
    }

    // Check if conversation should end
    if (this.shouldEndConversation(contentAnalysis, conversationHistory)) {
      return {
        action: ConversationActionType.END_CONVERSATION,
        shouldContinue: false,
        reasoning: 'Natural conversation endpoint reached',
      };
    }

    return undefined;
  }

  private findMatchingResponsePattern(
    responseType: ResponseType,
    contentAnalysis: ContentAnalysis
  ): ResponsePattern | null {
    // Find response patterns that match the current context
    for (const pattern of this.persona.responsePatterns) {
      if (this.evaluatePatternConditions(pattern.conditions, responseType, contentAnalysis)) {
        return pattern;
      }
    }
    return null;
  }

  private buildCustomPrompt(
    pattern: ResponsePattern,
    conversationHistory: ConversationMessage[],
    userMessage: string,
     
    contentAnalysis: ContentAnalysis
  ): string {
    // Replace template variables in the pattern
    let prompt = pattern.template;

    // Replace common variables
    prompt = prompt.replace('{userMessage}', userMessage);
    prompt = prompt.replace('{personaRole}', this.persona.role);
    prompt = prompt.replace(
      '{expertise}',
      contentAnalysis.expertiseAreas.map(e => e.area).join(', ')
    );

    return prompt;
  }

  private evaluateRuleCondition(
    condition: string,
    contentAnalysis: ContentAnalysis,
    _conversationHistory: ConversationMessage[]
  ): boolean {
    // Simple condition evaluation - can be enhanced with a proper expression parser
    if (condition.includes('sentiment < ')) {
      const threshold = parseFloat(condition.split('sentiment < ')[1]);
      return contentAnalysis.sentiment < threshold;
    }

    if (condition.includes('complexity > ')) {
      const threshold = parseFloat(condition.split('complexity > ')[1]);
      return contentAnalysis.complexity > threshold;
    }

    if (condition.includes('keywords contains ')) {
      const keyword = condition.split('keywords contains ')[1].replace(/['"]/g, '');
      return contentAnalysis.keywords.includes(keyword.toLowerCase());
    }

    return false;
  }

  private evaluatePatternConditions(
    conditions: string[],
    responseType: ResponseType,
    contentAnalysis: ContentAnalysis
  ): boolean {
    for (const condition of conditions) {
      if (condition === responseType) {return true;}

      // Check other condition types
      if (condition.includes('expertise:')) {
        const expertiseArea = condition.split('expertise:')[1];
        return contentAnalysis.expertiseAreas.some(area => area.area === expertiseArea);
      }
    }
    return false;
  }

  private hasHighExpertiseMatch(contentAnalysis: ContentAnalysis): boolean {
    return contentAnalysis.expertiseAreas.some(area => {
      const keywordMatches = this.countKeywordMatches(
        area.keywords,
        this.persona.expertiseKeywords
      );
      return keywordMatches > 0 && area.confidence > 0.5;
    });
  }

  private shouldSuggestFollowup(
    responseType: ResponseType,
    contentAnalysis: ContentAnalysis
  ): boolean {
    return (
      responseType === ResponseType.FOLLOW_UP_QUESTION ||
      (responseType === ResponseType.DIRECT_ANSWER && contentAnalysis.complexity > 0.6)
    );
  }

  private suggestOtherPersonas(contentAnalysis: ContentAnalysis): string[] {
    const suggestions: string[] = [];

    // Simple mapping of expertise areas to persona IDs (using generic IDs)
    const expertiseToPersona: Record<string, string> = {
      strategy: 'persona_1', // CEO
      technology: 'persona_2', // CTO
      finance: 'persona_3', // CFO
      operations: 'persona_6', // COO
      product: 'persona_5', // CPO
    };

    for (const expertiseArea of contentAnalysis.expertiseAreas) {
      const suggestedPersona = expertiseToPersona[expertiseArea.area];
      if (
        suggestedPersona &&
        suggestedPersona !== this.persona.personaId &&
        !suggestions.includes(suggestedPersona)
      ) {
        suggestions.push(suggestedPersona);
      }
    }

    return suggestions.slice(0, 2); // Limit to 2 suggestions
  }

  private shouldEndConversation(
    contentAnalysis: ContentAnalysis,
    conversationHistory: ConversationMessage[]
  ): boolean {
    // Simple heuristics for ending conversation
    const recentMessages = conversationHistory.slice(-6); // Last 6 messages
    const userMessages = recentMessages.filter(msg => msg.sender === 'user');

    // End if user seems satisfied (positive sentiment and simple response)
    return (
      contentAnalysis.sentiment > 0.5 && contentAnalysis.complexity < 0.3 && userMessages.length > 2
    );
  }

  private countKeywordMatches(keywords1: string[], keywords2: string[]): number {
    let matches = 0;
    for (const keyword1 of keywords1) {
      for (const keyword2 of keywords2) {
        if (
          keyword1.toLowerCase().includes(keyword2.toLowerCase()) ||
          keyword2.toLowerCase().includes(keyword1.toLowerCase())
        ) {
          matches++;
          break;
        }
      }
    }
    return matches;
  }

  private checkPriorityAlignment(topics: string[], priorities: string[]): number {
    let alignmentScore = 0;

    for (const topic of topics) {
      for (const priority of priorities) {
        if (priority.toLowerCase().includes(topic) || topic.includes(priority.toLowerCase())) {
          alignmentScore += 0.2;
        }
      }
    }

    return Math.min(alignmentScore, 1.0);
  }

  private createFallbackResponse(): AgentResponse {
    const fallbackResponse: PersonaResponse = {
      personaId: this.persona.personaId,
      personaName: this.persona.name,
      personaRole: this.persona.role,
      content:
        "I apologize, but I'm having trouble processing your message right now. Could you please rephrase your question?",
      timestamp: Date.now(),
      confidence: 0.1,
      interactionMetadata: {
        responseType: ResponseType.DIRECT_ANSWER,
        expertiseMatch: 0.1,
        reasoning: 'Fallback response due to processing error',
      },
    };

    return {
      personaId: this.persona.personaId,
      response: fallbackResponse,
      confidence: 0.1,
    };
  }

  // Getter methods for persona information
  getPersonaId(): string {
    return this.persona.personaId;
  }

  getPersona(): Persona {
    return this.persona;
  }

  updatePersona(updatedPersona: Persona): void {
    this.persona = updatedPersona;
    logger.info('Persona updated', { personaId: this.persona.personaId });
  }
}
