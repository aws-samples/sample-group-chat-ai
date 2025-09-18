// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Session,
  ConversationMessage,
  BusinessContext,
  RoutingDecision,
  ConversationActionType,
  ContentAnalysis,
  Persona,
  ServiceException,
  withTimeout,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { ModelConfig } from '../config/ModelConfig';
import { LLMService } from './LLMService';

const logger = createLogger();

export class RoutingProcessor {
  private llmService: LLMService;
  private routingModel: string = '';
  private temperature: number;
  private maxTokens: number;
  private timeout: number;
  private modelConfig: ModelConfig;

  constructor(llmService?: LLMService) {
    this.llmService = llmService || new LLMService();
    this.modelConfig = ModelConfig.getInstance();

    // Load routing model from ModelConfig (no hardcoded fallback)
    this.loadRoutingModel().catch(error => {
      logger.error('Failed to initialize routing model', error);
    });

    // Other routing configuration from environment
    this.temperature = parseFloat(process.env.ROUTING_TEMPERATURE || '0.3');
    this.maxTokens = parseInt(process.env.ROUTING_MAX_TOKENS || '300');
    this.timeout = parseInt(process.env.ROUTING_TIMEOUT || '8000');

    // Update LLM service with any environment-specific configurations
    if (process.env.ROUTING_MODEL || process.env.ROUTING_PROVIDER) {
      this.llmService.updateRoutingConfig({
        model: process.env.ROUTING_MODEL,
        provider: process.env.ROUTING_PROVIDER,
      });
    }

    logger.info('Routing Agent initialized', {
      model: this.routingModel,
      temperature: this.temperature,
    });
  }

  private async loadRoutingModel(): Promise<void> {
    try {
      this.routingModel = await this.modelConfig.getRoutingModel();
    } catch (error) {
      logger.error('Failed to load routing model from ModelConfig', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't set a fallback - let it fail if ModelConfig is broken
      this.routingModel = '';
    }
  }

  async determineRouting(
    session: Session,
    userMessage: string,
    contentAnalysis: ContentAnalysis,
    availablePersonas: Persona[],
    directQuestionPersonaId?: string
  ): Promise<RoutingDecision> {
    logger.info('🔀 RoutingProcessor.determineRouting called', {
      sessionId: session.sessionId,
      userMessage: userMessage.substring(0, 100),
      directQuestionPersonaId,
      activePersonas: session.activePersonas,
      availablePersonasCount: availablePersonas.length,
    });

    try {
      // If user directly asked a specific persona
      if (directQuestionPersonaId && session.activePersonas.includes(directQuestionPersonaId)) {
        return {
          selectedPersonas: [directQuestionPersonaId],
          confidence: 1.0,
          reasoning: 'Direct question to specific persona',
          conversationAction: {
            action: ConversationActionType.ROUTE_TO_PERSONA,
            targetPersona: directQuestionPersonaId,
            shouldContinue: true,
            reasoning: 'User directly addressed this persona',
          },
        };
      }

      // Use Routing Model for intelligent routing
      const routingPrompt = this.buildRoutingPrompt(
        session,
        userMessage,
        contentAnalysis,
        availablePersonas
      );

      const routingResponse = await withTimeout(this.callRoutingModel(routingPrompt), this.timeout);

      const routingDecision = this.parseRoutingResponse(routingResponse, session.activePersonas);

      logger.info('Routing Model routing decision made', {
        sessionId: session.sessionId,
        selectedPersonas: routingDecision.selectedPersonas,
        confidence: routingDecision.confidence,
        action: routingDecision.conversationAction.action,
      });

      return routingDecision;
    } catch (error) {
      logger.error('Error in Routing Model routing', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback to simple routing logic
      return this.fallbackRouting(session, contentAnalysis, availablePersonas);
    }
  }

  async determineAgentInteraction(
    session: Session,
    lastAgentResponses: string[],
    conversationContext: string
  ): Promise<{
    shouldContinueDiscussion: boolean;
    nextSpeaker?: string;
    discussionTopic?: string;
    reasoning: string;
  }> {
    logger.info('🤖 RoutingProcessor.determineAgentInteraction called', {
      sessionId: session.sessionId,
      activePersonas: session.activePersonas,
      lastAgentResponsesCount: lastAgentResponses.length,
      conversationTurns: session.conversationFlow.currentAgentTurns,
    });

    try {
      const interactionPrompt = this.buildInteractionPrompt(
        session,
        lastAgentResponses,
        conversationContext
      );

      const interactionResponse = await withTimeout(
        this.callRoutingModel(interactionPrompt),
        this.timeout
      );

      const decision = this.parseInteractionResponse(interactionResponse, session.activePersonas);

      logger.info('Agent interaction decision made', {
        sessionId: session.sessionId,
        shouldContinue: decision.shouldContinueDiscussion,
        nextSpeaker: decision.nextSpeaker,
        activePersonas: session.activePersonas,
      });

      return decision;
    } catch (error) {
      logger.error('Error in agent interaction decision', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fallback: end discussion and return to user
      return {
        shouldContinueDiscussion: false,
        reasoning: 'Error in interaction analysis, returning to user',
      };
    }
  }

  private buildRoutingPrompt(
    session: Session,
    userMessage: string,
    contentAnalysis: ContentAnalysis,
    availablePersonas: Persona[]
  ): string {
    const businessContextStr = session.businessContext
      ? this.formatBusinessContext(session.businessContext)
      : 'No specific business context provided';

    const conversationHistoryStr = this.formatConversationHistory(session.conversationHistory);

    const personasStr = availablePersonas
      .filter(p => session.activePersonas.includes(p.personaId))
      .map(
        p =>
          `- ${p.personaId}: ${p.name} (${p.role}) - Expertise: ${p.expertiseKeywords.join(', ')}`
      )
      .join('\n');

    return `You are an intelligent routing agent for an AI professional meeting and simulated group chat system. Your job is to determine which personas should respond to the user's message based on their expertise and the conversation context. This can include group chat practice, meeting preparation, presentation rehearsals, and other professional scenarios.

BUSINESS CONTEXT:
${businessContextStr}

AVAILABLE PERSONAS:
${personasStr}

CONVERSATION HISTORY:
${conversationHistoryStr}

USER'S LATEST MESSAGE: "${userMessage}"

ROUTING PRINCIPLES:
1. Select persona(s) based on expertise relevance to the user's question
2. Multiple personas are appropriate when the question spans different domains (e.g., strategy + budget + technology)
3. Each persona should only provide their unique perspective - no repetition or overlap
4. Quality over quantity - only include personas who add distinct value
5. Ensure roles that were specifically requested by the user have a chance to respond
6. For meeting scenarios, include personas who would typically participate in such meetings
7. For presentation preparation, include personas relevant to both content creation and delivery

ANALYSIS FRAMEWORK:
- Does this question require ONE expert's perspective? → Select 1 persona
- Does this question span multiple domains? → Select relevant personas for each domain
- Did the user ask for "everyone's thoughts" or "all perspectives"? → Select multiple personas
- Is this a meeting scenario requiring collaborative input? → Select relevant meeting participants
- Is this related to presentation preparation or delivery? → Select personas with relevant expertise
- Is this a follow-up that needs the same expertise as before? → Select same persona

Examples of GOOD multi-persona routing:
- "What's our go-to-market strategy and budget?" → CEO (strategy) + CFO (budget)
- "How feasible is this technically and what are the business implications?" → CTO (technical) + CEO (business)
- "I'd like everyone's perspective on this proposal" → ALL personas
- "Let's prepare for our quarterly board meeting" → CEO + CFO + COO (key meeting participants)
- "Help me create slides for my sales presentation" → Sales Director + Marketing Manager + Design Lead

Examples of SINGLE persona routing:
- "What's our budget for Q2?" → CFO only
- "How do we implement this feature?" → CTO only
- "What's our competitive positioning?" → CEO only
- "How should I handle questions during my presentation?" → Communications Director only
- "What's the best way to structure a status update meeting?" → Project Manager only

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no reasoning outside the JSON, no additional text.

Respond with this exact JSON format:
{
  "selectedPersonas": "persona1",
  "confidence": 0.85,
  "conversationAction": "route_to_persona",
  "reasoning": "Question spans strategy and budget domains, requiring both CEO and CFO perspectives"
}

Rules:
- selectedPersonas: MUST be a single persona ID from the active personas list
- confidence: Number between 0.0 and 1.0
- conversationAction: MUST be exactly "route_to_persona" OR "return_to_user"
- reasoning: Brief explanation of your choice

RESPOND WITH ONLY JSON - NO OTHER TEXT.`;
  }

  private buildInteractionPrompt(
    session: Session,
    lastAgentResponses: string[],
    conversationContext: string
  ): string {
    const agentResponsesStr = lastAgentResponses
      .map((response, index) => `Agent ${index + 1}: ${response}`)
      .join('\n\n');

    const activePersonasStr = session.activePersonas.join(', ');

    // Extract which personas have already spoken in this turn
    // const spokenpersonas = lastAgentResponses.map((_, index) => `Agent ${index + 1}`);
    // const _remainingPersonas = session.activePersonas.filter(
    //   persona => !spokenpersonas.some(spoken => spoken.toLowerCase().includes(persona))
    // );

    return `You are managing a multi-agent discussion between professional personas in a practice session for pitches, meetings, or presentations.

ACTIVE PERSONAS (you can ONLY select from these): ${activePersonasStr}

CONVERSATION CONTEXT:
${conversationContext}

RECENT AGENT RESPONSES:
${agentResponsesStr}

CURRENT DISCUSSION TURNS: ${session.conversationFlow.currentAgentTurns}/${session.conversationFlow.maxAgentTurns}

CRITICAL RULES:
1. Each persona can only speak ONCE per user turn - NO REPETITION
2. If this was a multi-domain question, allow relevant personas to provide their unique perspective
3. Return to user once all relevant personas have spoken OR after any single persona if question is domain-specific
4. NEVER allow the same persona to speak twice in one turn

DECISION FRAMEWORK:
- Single domain question (e.g., "What's our budget?") → 1 persona speaks → Return to user
- Multi-domain question (e.g., "Strategy and budget for Q2?") → Multiple personas speak once each → Return to user
- Meeting scenario (e.g., "Let's discuss the quarterly report") → Multiple personas contribute based on expertise
- Presentation preparation (e.g., "Help me prepare slides for the board") → Relevant personas offer input
- Follow-up or clarification → Usually return to user for their next question

ANALYSIS:
1. Was the user's original question multi-domain requiring multiple perspectives?
2. Have all relevant personas for those domains already spoken?
3. Is this a meeting or presentation scenario that requires diverse input?
4. Is there a genuine need for additional perspective, or should we return to user?

IMPORTANT: You can ONLY select nextSpeaker from these active personas: ${activePersonasStr}
Do NOT suggest personas that are not in this list.
NEVER suggest a persona that has already spoken in this turn.

Examples of GOOD continuation:
- User asked "What's our go-to-market strategy and budget?" → CEO spoke about strategy → Continue with CFO for budget
- User asked "Technical feasibility and business impact?" → CTO spoke about tech → Continue with CEO for business
- User asked "Can we do a round of introductions and hear from everyone" → All personas should get a chance to answer
- User asked "Help me prepare for our client meeting next week" → Sales lead spoke → Continue with Product Manager
- User asked "How should we structure our presentation to investors?" → CEO spoke → Continue with CFO for financial aspects

Examples of when to END (return to user):
- User asked "What's our Q2 budget?" → CFO responded → END (single domain question answered)
- User asked strategy + budget → Both CEO and CFO have spoken → END (multi-domain question fully addressed)
- User asked for meeting preparation advice → All relevant departments provided input → END (comprehensive advice given)
- User asked for presentation feedback → Key personas gave their perspective → END (sufficient feedback provided)
- Any persona has given a complete answer to a single-domain question → END

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no reasoning outside the JSON, no additional text.

Respond with this exact JSON format:
{
  "shouldContinueDiscussion": false,
  "nextSpeaker": null,
  "discussionTopic": null,
  "reasoning": "All relevant personas have provided their perspectives, returning to user"
}

Rules:
- shouldContinueDiscussion: MUST be true or false
- nextSpeaker: MUST be one of: ${activePersonasStr} OR null
- discussionTopic: String or null
- reasoning: Brief explanation of your decision

RESPOND WITH ONLY JSON - NO OTHER TEXT.`;
  }

  private async callRoutingModel(prompt: string): Promise<string> {
    // Ensure routing model is loaded
    if (!this.routingModel) {
      await this.loadRoutingModel();
    }

    logger.info('📞 RoutingProcessor.callRoutingModel starting', {
      routingModel: this.routingModel,
      promptLength: prompt.length,
    });

    try {
      logger.debug('Starting routing model call', {
        routingModel: this.routingModel,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        timeout: this.timeout,
        promptLength: prompt.length,
        promptPrefix: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
      });

      // Use LLMService to make the routing model call
      const result = await this.llmService.generateRoutingDecision(prompt);

      logger.info('Routing model call completed successfully', {
        routingModel: this.routingModel,
        responseLength: result.length,
        responsePrefix: result.substring(0, 100) + (result.length > 100 ? '...' : ''),
      });

      return result;
    } catch (error) {
      // Enhanced routing processor error logging
      logger.error('Routing Model API error - Enhanced diagnostic information', {
        routingModel: this.routingModel,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        timeout: this.timeout,
        promptLength: prompt.length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorName: (error as any).name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMessage: (error as any).message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorStack: (error as any).stack,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorCause: (error as any).cause,
        isServiceException: error instanceof ServiceException,
        fullErrorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw new ServiceException('Routing Model routing call failed', error as Error);
    }
  }

  private parseRoutingResponse(response: string, activePersonas: string[]): RoutingDecision {
    try {
      const parsed = this.extractAndParseJSON(response);

      // Get only one persona, prioritizing the first valid one from the response
      let targetPersona: string | undefined;
      if (parsed.selectedPersonas) {
        // If it's an array, take the first valid persona
        if (Array.isArray(parsed.selectedPersonas)) {
          targetPersona = parsed.selectedPersonas.find((p: string) => activePersonas.includes(p));
        }
        // If it's a string, use it if valid
        else if (
          typeof parsed.selectedPersonas === 'string' &&
          activePersonas.includes(parsed.selectedPersonas)
        ) {
          targetPersona = parsed.selectedPersonas;
        }
      }

      // Ensure we have a persona (fallback to first active persona if needed)
      if (!targetPersona && activePersonas.length > 0) {
        targetPersona = activePersonas[0];
      }

      // Restrict conversation actions to only ROUTE_TO_PERSONA or return_to_user (maps to END_CONVERSATION)
      let action: ConversationActionType;
      if (parsed.conversationAction === 'return_to_user') {
        action = ConversationActionType.END_CONVERSATION;
      } else {
        action = ConversationActionType.ROUTE_TO_PERSONA;
      }

      // Type-safe access to parsed properties
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
      const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : 'Routing Model routing decision';

      return {
        selectedPersonas: targetPersona ? [targetPersona] : [],
        confidence: Math.max(0, Math.min(1, confidence)),
        reasoning,
        conversationAction: {
          action,
          targetPersona,
          shouldContinue: action !== ConversationActionType.END_CONVERSATION,
          reasoning,
        },
      };
    } catch (error) {
      logger.error('Error parsing Routing Model routing response:', {
        error: error instanceof Error ? error.message : String(error),
        response: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
      });

      // Return fallback decision
      return {
        selectedPersonas: activePersonas.slice(0, 1),
        confidence: 0.3,
        reasoning: 'Fallback routing due to parsing error',
        conversationAction: {
          action: ConversationActionType.ROUTE_TO_PERSONA,
          targetPersona: activePersonas[0],
          shouldContinue: true,
          reasoning: 'Fallback routing due to parsing error',
        },
      };
    }
  }

  private parseInteractionResponse(
    response: string,
    activePersonas: string[]
  ): {
    shouldContinueDiscussion: boolean;
    nextSpeaker?: string;
    discussionTopic?: string;
    reasoning: string;
  } {
    try {
      const parsed = this.extractAndParseJSON(response);

      // Type-safe access to parsed properties
      const shouldContinueDiscussion = typeof parsed.shouldContinueDiscussion === 'boolean' ? parsed.shouldContinueDiscussion : false;
      const discussionTopic = typeof parsed.discussionTopic === 'string' ? parsed.discussionTopic : undefined;
      const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : 'Routing Model interaction decision';
      
      // Validate that nextSpeaker is in active personas
      let nextSpeaker = typeof parsed.nextSpeaker === 'string' ? parsed.nextSpeaker : undefined;
      if (nextSpeaker && !activePersonas.includes(nextSpeaker)) {
        logger.warn('Routing Model suggested inactive persona, setting to undefined', {
          suggestedSpeaker: nextSpeaker,
          activePersonas: activePersonas,
        });
        nextSpeaker = undefined;
      }

      return {
        shouldContinueDiscussion,
        nextSpeaker,
        discussionTopic,
        reasoning,
      };
    } catch (error) {
      logger.error('Error parsing Routing Model interaction response:', {
        error: error instanceof Error ? error.message : String(error),
        response: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
      });

      return {
        shouldContinueDiscussion: false,
        reasoning: 'Fallback decision due to parsing error',
      };
    }
  }

  private fallbackRouting(
    session: Session,
    _contentAnalysis: ContentAnalysis,
    _availablePersonas: Persona[]
  ): RoutingDecision {
    logger.info('Using fallback routing logic', { sessionId: session.sessionId });

    // Simple fallback: select first active persona
    const selectedPersona =
      session.activePersonas.length > 0 ? session.activePersonas[0] : undefined;

    // Use END_CONVERSATION (return_to_user) if no personas are available
    const action = selectedPersona
      ? ConversationActionType.ROUTE_TO_PERSONA
      : ConversationActionType.END_CONVERSATION;

    return {
      selectedPersonas: selectedPersona ? [selectedPersona] : [],
      confidence: 0.4,
      reasoning: 'Fallback routing - Routing Model unavailable',
      conversationAction: {
        action,
        targetPersona: selectedPersona,
        shouldContinue: action !== ConversationActionType.END_CONVERSATION,
        reasoning: 'Fallback routing - Routing Model unavailable',
      },
    };
  }

  private formatBusinessContext(context: BusinessContext): string {
    return `
Industry: ${context.industry}
Company Size: ${context.companySize}
Company Stage: ${context.companyStage}
Key Priorities: ${context.keyPriorities.join(', ')}
Challenges: ${context.challenges.join(', ')}
Budget Range: ${context.budgetRange || 'Not specified'}
Timeline: ${context.timeline || 'Not specified'}
Additional Context: ${context.additionalContext || 'None'}`;
  }

  private formatConversationHistory(history: ConversationMessage[]): string {
    if (history.length === 0) {
      return 'No previous conversation';
    }

    // Get last 5 messages for context
    const recentHistory = history.slice(-5);

    return recentHistory
      .map(msg => {
        const sender = msg.sender === 'user' ? 'User' : `${msg.personaId?.toUpperCase()}`;
        return `${sender}: ${msg.content}`;
      })
      .join('\n');
  }

  // Method to update Routing Model configuration
  updateConfiguration(config: {
    model?: string;
    provider?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }): void {
    // Update both local reference and LLM service
    if (config.model) {
      this.routingModel = config.model;
      this.llmService.updateRoutingConfig({ model: config.model });
    }

    // Update provider in LLM service if specified
    if (config.provider) {
      this.llmService.updateRoutingConfig({ provider: config.provider });
    }

    if (config.temperature !== undefined) {this.temperature = config.temperature;}
    if (config.maxTokens !== undefined) {this.maxTokens = config.maxTokens;}
    if (config.timeout !== undefined) {this.timeout = config.timeout;}

    logger.info('Routing Agent configuration updated', {
      model: this.routingModel,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      timeout: this.timeout,
    });
  }

  /**
   * Extract and parse JSON from a response that might contain additional text or reasoning content
   */
  private extractAndParseJSON(response: string): Record<string, unknown> {
    // First, try to parse as-is (for clean JSON responses)
    try {
      return JSON.parse(response.trim());
    } catch (directParseError) {
      // Ignore parse errors and continue
      logger.info('Direct JSON parsing failed, attempting structured extraction', {
        responseStart: response.substring(0, 100),
        error: directParseError instanceof Error ? directParseError.message : String(directParseError),
      });
    }

    // Handle Bedrock responses with structured content arrays
    try {
      const parsedResponse = JSON.parse(response);
      
      // Check for contentArray structure (from error log format)
      if (parsedResponse.contentArray && Array.isArray(parsedResponse.contentArray)) {
        // First pass: look for actual text content (prioritize over reasoning)
        for (const item of parsedResponse.contentArray) {
          if (item.text && typeof item.text === 'string') {
            logger.info('Found text content in contentArray, extracting JSON');
            return this.extractJSONFromText(item.text);
          }
        }

        // Second pass: fall back to reasoning content if no text found
        for (const item of parsedResponse.contentArray) {
          if (item.reasoningContent?.reasoningText?.text) {
            logger.info('No text content found, falling back to reasoning content');
            const reasoningText = item.reasoningContent.reasoningText.text;
            return this.extractJSONFromText(reasoningText);
          }
        }
      }

      // Handle OpenAI/Bedrock reasoning models with message.content structure
      if (parsedResponse.message && parsedResponse.message.content) {
        const content = parsedResponse.message.content;
        if (Array.isArray(content)) {
          // First pass: look for actual text content (prioritize over reasoning)
          for (const item of content) {
            if (item.text && typeof item.text === 'string') {
              logger.info('Found text content in message.content, extracting JSON');
              return this.extractJSONFromText(item.text);
            }
          }

          // Second pass: fall back to reasoning content if no text found
          for (const item of content) {
            if (item.reasoningContent?.reasoningText?.text) {
              logger.info('No text content in message.content, falling back to reasoning content');
              const reasoningText = item.reasoningContent.reasoningText.text;
              return this.extractJSONFromText(reasoningText);
            }
          }
        }
      }

      // Handle direct content array (alternative structure)
      if (parsedResponse.content && Array.isArray(parsedResponse.content)) {
        // First pass: look for actual text content (prioritize over reasoning)
        for (const item of parsedResponse.content) {
          if (item.text && typeof item.text === 'string') {
            return this.extractJSONFromText(item.text);
          }
        }

        // Second pass: fall back to reasoning content if no text found
        for (const item of parsedResponse.content) {
          if (item.reasoningContent?.reasoningText?.text) {
            const reasoningText = item.reasoningContent.reasoningText.text;
            return this.extractJSONFromText(reasoningText);
          }
        }
      }
    } catch (error) {
      // Continue with other extraction methods
      logger.error('Structured content parsing failed, trying text extraction', {
        error: error instanceof Error ? error.message : String(error),
        responsePrefix: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
    }

    return this.extractJSONFromText(response);
  }

  /**
   * Extract JSON from text content using various patterns
   */
  private extractJSONFromText(text: string): Record<string, unknown> {

    // Look for JSON object patterns in the text
    const jsonPatterns = [
      // Standard JSON object
      /\{[\s\S]*\}/,
      // JSON object wrapped in code blocks
      /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i,
      // JSON object after some explanatory text
      /(?:here's|here is|response:|answer:)?\s*\{[\s\S]*\}/i,
    ];

    for (const pattern of jsonPatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          // Use the captured group if available, otherwise use the full match
          const jsonText = match[1] || match[0];
          return JSON.parse(jsonText.trim());
        } catch (parseError) {
          // Continue to next pattern
          logger.info('JSON pattern failed, trying next pattern', {
            pattern: pattern.source,
            text: (match[1] || match[0])?.substring(0, 50) + '...',
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
          continue;
        }
      }
    }

    // If no JSON patterns work, try to find the first and last braces
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      try {
        const potentialJson = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(potentialJson);
      } catch (finalError) {
        // Final attempt failed
        logger.warn('Final JSON extraction attempt failed', {
          potentialJson: text.substring(firstBrace, lastBrace + 1)?.substring(0, 100) + '...',
          error: finalError instanceof Error ? finalError.message : String(finalError),
        });
      }
    }

    // If all attempts fail, throw an error with helpful context
    throw new Error(
      `Failed to extract valid JSON from text. Text starts with: "${text.substring(0, 50)}..."`
    );
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Use the LLM service's routing health check
      return await this.llmService.routingHealthCheck();
    } catch (error) {
      logger.error('Routing Model health check failed:', error);
      return false;
    }
  }
}
