// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Session,
  ConversationMessage,
  PersonaResponse,
  RoutingDecision,
  ConversationAction,
  ConversationActionType,
  ContentAnalysis,
  AgentResponse,
  Persona,
  MessageSender,
  ImageAttachment,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { ContentAnalysisService } from './ContentAnalysisService';
import { PersonaProcessor } from './PersonaProcessor';
import { PersonaManager } from './PersonaManager';
import { LLMRequestManager } from './LLMRequestManager';
import { RoutingProcessor } from './RoutingProcessor';
import { PollyService } from './PollyService';
import { SharedServices } from './SharedServices';

const logger = createLogger();

interface QueuedResponseItem {
  messageId: string;
  personaId: string;
  personaName: string;
  personaRole: string;
  textContent: string;
  audioUrl?: string;
  duration?: number;
  voiceId?: string;
  timestamp: number;
  hasAudio: boolean;
}

export class ConversationOrchestrator {
  private contentAnalysisService: ContentAnalysisService;
  private personaManager: PersonaManager;
  private llmRequestManager: LLMRequestManager;
  private routingAgent: RoutingProcessor;
  private pollyService: PollyService;
  private activeAgents: Map<string, PersonaProcessor> = new Map();
  private audioQueues: Map<string, QueuedResponseItem[]> = new Map(); // sessionId -> queue
  private currentlyPlayingAudio: Map<string, string> = new Map(); // sessionId -> messageId

  constructor() {
    this.contentAnalysisService = SharedServices.getContentAnalysisService();
    this.personaManager = new PersonaManager();
    this.llmRequestManager = new LLMRequestManager();
    this.routingAgent = SharedServices.getRoutingProcessor();

    // Initialize Polly service with configuration
    this.pollyService = new PollyService({
      region: process.env.AWS_REGION || 'us-west-2',
      enableStreaming: true,
      cacheAudioMinutes: 60,
    });
  }

  async processMessage(
    session: Session,
    userMessage: string,
    directQuestionPersonaId?: string,
    imageAttachment?: ImageAttachment
  ): Promise<PersonaResponse[]> {
    try {
      logger.debug('Processing message with conversation orchestrator', {
        sessionId: session.sessionId,
        messageLength: userMessage.length,
        activePersonas: session.activePersonas.length,
        directQuestion: !!directQuestionPersonaId,
        hasImage: !!imageAttachment,
      });

      // Analyze the content of the user message
      const contentAnalysis = this.contentAnalysisService.analyzeContent(
        userMessage
      );

      // Determine routing decision
      const routingDecision = await this.determineRouting(
        session,
        userMessage,
        contentAnalysis,
        directQuestionPersonaId
      );

      logger.debug('Routing decision made', {
        sessionId: session.sessionId,
        selectedPersonas: routingDecision.selectedPersonas,
        confidence: routingDecision.confidence,
        action: routingDecision.conversationAction.action,
      });

      // Generate responses from selected personas
      const agentResponses = await this.generateAgentResponses(
        session,
        userMessage,
        contentAnalysis,
        routingDecision.selectedPersonas,
        imageAttachment
      );

      // Process agent responses and determine next actions
      const personaResponses = agentResponses.map(agentResponse => agentResponse.response);

      // Determine if conversation should continue and with whom
      const nextAction = await this.determineNextConversationAction(
        session,
        agentResponses,
        contentAnalysis
      );

      logger.info('Conversation orchestration completed', {
        sessionId: session.sessionId,
        responseCount: personaResponses.length,
        nextAction: nextAction?.action,
      });

      return personaResponses;
    } catch (error) {
      logger.error('Error in conversation orchestration', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return fallback response
      return this.createFallbackResponses(session);
    }
  }

  async processMessageStreaming(
    session: Session,
    userMessage: string,
    callbacks: {
      onPersonaStartTyping: (personaId: string, personaName: string) => void;
      onPersonaResponse: (response: PersonaResponse) => void;
      onPersonaAudio: (
        messageId: string,
        personaId: string,
        audioUrl: string,
        duration?: number,
        voiceId?: string
      ) => void;
      onAllFinished: (totalResponses: number) => void;
      onError: (error: string, details: string) => void;
      onAudioError: (messageId: string, personaId: string, error: string) => void;
    },
    directQuestionPersonaId?: string,
    imageAttachment?: ImageAttachment
  ): Promise<void> {
    try {
      logger.info('Processing streaming message with iterative routing', {
        sessionId: session.sessionId,
        messageLength: userMessage.length,
        activePersonas: session.activePersonas.length,
        directQuestion: !!directQuestionPersonaId,
        hasImage: !!imageAttachment,
      });

      // Analyze the content of the user message
      const contentAnalysis = this.contentAnalysisService.analyzeContent(
        userMessage
      );

      // Start iterative routing flow
      await this.processIterativeRouting(
        session,
        userMessage,
        contentAnalysis,
        callbacks,
        directQuestionPersonaId,
        imageAttachment
      );

      logger.info('Iterative routing conversation orchestration completed', {
        sessionId: session.sessionId,
        totalActivePersonas: session.activePersonas.length,
      });
    } catch (error) {
      logger.error('Error in iterative routing conversation orchestration', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      callbacks.onError(
        'Conversation processing error',
        'An error occurred while processing your message with iterative routing'
      );
    }
  }

  private async processIterativeRouting(
    session: Session,
    userMessage: string,
    contentAnalysis: ContentAnalysis,
    callbacks: {
      onPersonaStartTyping: (personaId: string, personaName: string) => void;
      onPersonaResponse: (response: PersonaResponse) => void;
      onAllFinished: (totalResponses: number) => void;
      onError: (error: string, details: string) => void;
    },
    directQuestionPersonaId?: string,
    imageAttachment?: ImageAttachment
  ): Promise<void> {
    const agentResponses: AgentResponse[] = [];
    let totalResponses = 0;
    const maxIterations = 20; // Prevent infinite loops
    let currentIteration = 0;

    // Collect information about all active personas for persona awareness
    const allActivePersonasInfo = this.collectActivePersonasInfo(session);

    // Step 1: Determine initial routing decision
    const initialRoutingDecision = await this.determineRouting(
      session,
      userMessage,
      contentAnalysis,
      directQuestionPersonaId
    );

    logger.info('Initial routing decision for iterative flow', {
      sessionId: session.sessionId,
      selectedPersonas: initialRoutingDecision.selectedPersonas,
      confidence: initialRoutingDecision.confidence,
      reasoning: initialRoutingDecision.reasoning,
    });

    // Check if no personas should respond initially
    if (initialRoutingDecision.selectedPersonas.length === 0) {
      logger.info('No initial persona selected to respond', {
        sessionId: session.sessionId,
        action: initialRoutingDecision.conversationAction.action,
        reasoning: initialRoutingDecision.reasoning,
      });

      callbacks.onAllFinished(0);
      return;
    }

    // Step 2: Start iterative routing loop
    let currentPersonaId = initialRoutingDecision.selectedPersonas[0]; // Start with first persona
    let shouldContinue = true;

    while (shouldContinue && currentIteration < maxIterations) {
      currentIteration++;

      const personaName = this.getPersonaName(currentPersonaId, session.customPersonas);

      logger.info('Iterative routing - persona responding', {
        sessionId: session.sessionId,
        iteration: currentIteration,
        personaId: currentPersonaId,
        personaName,
        totalResponsesSoFar: totalResponses,
      });

      // CRITICAL FIX: Only send typing indicator if no audio is currently playing
      const isAudioCurrentlyPlaying = this.currentlyPlayingAudio.has(session.sessionId);

      if (!isAudioCurrentlyPlaying) {
        callbacks.onPersonaStartTyping(currentPersonaId, personaName);
        logger.debug('Typing indicator sent - no audio currently playing', {
          sessionId: session.sessionId,
          personaId: currentPersonaId,
        });
      } else {
        const currentlyPlayingMessageId = this.currentlyPlayingAudio.get(session.sessionId);
        logger.debug('Typing indicator suppressed - audio currently playing', {
          sessionId: session.sessionId,
          personaId: currentPersonaId,
          currentlyPlayingMessageId,
        });
      }

      try {
        // CRITICAL FIX: Create enhanced conversation history BEFORE generating response
        // This ensures current persona sees all previous responses from this turn
        const enhancedHistoryForCurrentPersona = this.createIterativeConversationHistory(
          session.personaContexts[currentPersonaId].conversationHistory,
          userMessage,
          agentResponses,
          session.sessionId
        );

        // Generate response for current persona with enhanced history
        const agent = await this.getOrCreatePersonaAgent(currentPersonaId, session);

        logger.info('Generating iterative response with complete turn history', {
          sessionId: session.sessionId,
          personaId: currentPersonaId,
          iteration: currentIteration,
          previousResponsesInTurn: agentResponses.length,
          historyLength: enhancedHistoryForCurrentPersona.length,
        });

        const agentResponse = await agent.generateResponse(
          enhancedHistoryForCurrentPersona,
          userMessage,
            contentAnalysis,
          session,
          allActivePersonasInfo,
          imageAttachment,
          'iterative'
        );

        // CRITICAL FIX: Immediately update session conversation history BEFORE continuing
        // This ensures the next persona has access to this persona's response
        const personaMessage: ConversationMessage = {
          messageId: `msg_${Date.now()}_${agentResponse.personaId}_iter${currentIteration}`,
          sessionId: session.sessionId,
          sender: MessageSender.PERSONA,
          content: agentResponse.response.content,
          timestamp: agentResponse.response.timestamp,
          personaId: agentResponse.personaId,
        };

        // Add to main conversation history (single source of truth for display)
        session.conversationHistory.push(personaMessage);

        // FIXED: Only add to the responding persona's own context (restore isolation)
        // Each persona should only see user messages + their own responses for consistency
        session.personaContexts[agentResponse.personaId].conversationHistory.push(personaMessage);

        // Update last response time for the responding persona
        session.personaContexts[agentResponse.personaId].lastResponse =
          agentResponse.response.timestamp;

        // Add to responses
        agentResponses.push(agentResponse);
        totalResponses++;

        // CRITICAL FIX: Always send text immediately, then handle audio separately
        // This ensures all personas get their text responses delivered
        callbacks.onPersonaResponse(agentResponse.response);

        // Generate and queue audio if voice is enabled
        if ('onPersonaAudio' in callbacks && 'onAudioError' in callbacks) {
          const audioCallbacks = callbacks as {
            onPersonaAudio: (messageId: string, personaId: string, audioUrl: string, duration?: number, voiceId?: string) => void;
            onAudioError: (messageId: string, personaId: string, error: string) => void;
          };

          if (currentIteration === 1) {
            // First persona - generate and send audio immediately (not queued)
            this.generateAndSendAudio(
              session,
              agentResponse.response,
              audioCallbacks.onPersonaAudio,
              audioCallbacks.onAudioError
            ).catch(error => {
              logger.error('Failed to generate audio for first persona', {
                sessionId: session.sessionId,
                personaId: agentResponse.personaId,
                error: error instanceof Error ? error.message : String(error),
              });
            });
          } else {
            // Subsequent personas - queue only audio (text already sent above)
            logger.info('Queuing audio for subsequent persona', {
              sessionId: session.sessionId,
              iteration: currentIteration,
              personaId: agentResponse.personaId,
            });

            await this.queueAudioOnly(
              session,
              agentResponse.response,
              audioCallbacks.onPersonaAudio,
              audioCallbacks.onAudioError
            );
          }
        }

        logger.info('Iterative routing - conversation history updated synchronously', {
          sessionId: session.sessionId,
          iteration: currentIteration,
          personaId: currentPersonaId,
          conversationHistoryLength: session.conversationHistory.length,
          totalResponses,
        });

        logger.info('Iterative routing - persona response generated', {
          sessionId: session.sessionId,
          iteration: currentIteration,
          personaId: currentPersonaId,
          confidence: agentResponse.confidence,
          totalResponses,
        });

        // Step 3: Use routing agent to determine if discussion should continue
        // CRITICAL FIX: Pass full session to ensure routing agent has complete conversation history
        const conversationContext = this.buildConversationContext(
          userMessage,
          session,
          agentResponses
        );
        const lastAgentResponses = agentResponses.slice(-3).map(r => r.response.content); // Last 3 responses

        const interactionDecision = await this.routingAgent.determineAgentInteraction(
          session,
          lastAgentResponses,
          conversationContext
        );

        logger.info('Iterative routing - interaction decision', {
          sessionId: session.sessionId,
          iteration: currentIteration,
          shouldContinue: interactionDecision.shouldContinueDiscussion,
          nextSpeaker: interactionDecision.nextSpeaker,
          reasoning: interactionDecision.reasoning,
        });

        // Step 4: Decide whether to continue and who should speak next
        if (interactionDecision.shouldContinueDiscussion && interactionDecision.nextSpeaker) {
          // Validate that the next speaker is an active persona
          if (session.activePersonas.includes(interactionDecision.nextSpeaker)) {
            currentPersonaId = interactionDecision.nextSpeaker;
            shouldContinue = true;

            logger.info('Iterative routing - continuing with next persona', {
              sessionId: session.sessionId,
              nextPersona: currentPersonaId,
              discussionTopic: interactionDecision.discussionTopic,
            });
          } else {
            logger.warn('Iterative routing - next speaker not in active personas', {
              sessionId: session.sessionId,
              nextSpeaker: interactionDecision.nextSpeaker,
              activePersonas: session.activePersonas,
            });
            shouldContinue = false;
          }
        } else {
          // Routing agent decided to end discussion
          shouldContinue = false;

          logger.info('Iterative routing - ending discussion', {
            sessionId: session.sessionId,
            reason: interactionDecision.reasoning,
            totalIterations: currentIteration,
            totalResponses,
          });
        }
      } catch (error) {
        logger.error('Error in iterative routing iteration', {
          sessionId: session.sessionId,
          iteration: currentIteration,
          personaId: currentPersonaId,
          error: error instanceof Error ? error.message : String(error),
        });

        callbacks.onError(
          `Persona ${personaName} error`,
          `Failed to generate response: ${error instanceof Error ? error.message : String(error)}`
        );

        // Continue to next iteration or end
        shouldContinue = false;
      }
    }

    // Check if we hit max iterations
    if (currentIteration >= maxIterations) {
      logger.warn('Iterative routing - reached max iterations', {
        sessionId: session.sessionId,
        maxIterations,
        totalResponses,
      });
    }

    // Finish the conversation
    callbacks.onAllFinished(totalResponses);

    logger.info('Iterative routing conversation completed', {
      sessionId: session.sessionId,
      totalIterations: currentIteration,
      totalResponses,
      naturalCompletion: currentIteration < maxIterations,
    });
  }

  private buildConversationContext(
    userMessage: string,
    session: Session,
    agentResponses: AgentResponse[]
  ): string {
    let context = `User's message: "${userMessage}"\n\n`;

    // CRITICAL FIX: Include complete conversation history for routing agent context
    if (session.conversationHistory.length > 0) {
      context += 'Complete conversation history:\n';

      // Get recent conversation history (last 10 messages to avoid token limits)
      const recentHistory = session.conversationHistory.slice(-10);

      recentHistory.forEach((message, index) => {
        const sender =
          message.sender === MessageSender.USER
            ? 'User'
            : message.personaId
              ? message.personaId.toUpperCase()
              : 'Persona';
        context += `${index + 1}. ${sender}: ${message.content}\n`;
      });

      context += '\n';
    }

    // Add current turn responses if any
    if (agentResponses.length > 0) {
      context += 'Current turn responses so far:\n';
      agentResponses.forEach((response, index) => {
        context += `${index + 1}. ${response.response.personaName}: ${response.response.content}\n`;
      });
      context += '\n';
    }

    logger.debug('Built conversation context for routing agent', {
      sessionId: session.sessionId,
      historyLength: session.conversationHistory.length,
      currentTurnResponses: agentResponses.length,
      contextLength: context.length,
    });

    return context;
  }

  private async generateStreamingAgentResponses(
    session: Session,
    userMessage: string,
    contentAnalysis: ContentAnalysis,
    selectedPersonas: string[],
    callbacks: {
      onPersonaStartTyping: (personaId: string, personaName: string) => void;
      onPersonaResponse: (response: PersonaResponse) => void;
      onAllFinished: (totalResponses: number) => void;
      onError: (error: string, details: string) => void;
    },
    imageAttachment?: ImageAttachment,
    directQuestionPersonaId?: string
  ): Promise<void> {
    const agentResponses: AgentResponse[] = [];
    let completedResponses = 0;
    const totalExpectedResponses = selectedPersonas.length;

    // Collect information about all active personas for persona awareness
    const allActivePersonasInfo = this.collectActivePersonasInfo(session);

    // Create streaming response promises for each selected persona
    const responsePromises: Promise<void>[] = [];

    for (let i = 0; i < selectedPersonas.length; i++) {
      const personaId = selectedPersonas[i];
      const personaName = this.getPersonaName(personaId, session.customPersonas);

      // Send typing indicator immediately
      callbacks.onPersonaStartTyping(personaId, personaName);

      // Create streaming response promise
      const responsePromise = this.generateSingleStreamingResponse(
        session,
        personaId,
        userMessage,
        contentAnalysis,
        allActivePersonasInfo,
        agentResponses,
        i,
        imageAttachment
      )
        .then(agentResponse => {
          // Add to responses array for sequential persona awareness
          agentResponses.push(agentResponse);

          // Send the response immediately
          callbacks.onPersonaResponse(agentResponse.response);

          completedResponses++;

          // Check if all personas have finished
          if (completedResponses === totalExpectedResponses) {
            callbacks.onAllFinished(completedResponses);

            logger.info('All streaming responses completed with intelligent routing', {
              sessionId: session.sessionId,
              totalResponses: completedResponses,
              selectedPersonas: selectedPersonas,
              hasImage: !!imageAttachment,
            });
          }
        })
        .catch(error => {
          logger.error('Error in streaming persona response', {
            sessionId: session.sessionId,
            personaId,
            error,
          });

          // Send error for this specific persona
          callbacks.onError(
            `Persona ${personaName} error`,
            `Failed to generate response: ${error.message}`
          );

          completedResponses++;

          // Still check if all personas have finished (including failed ones)
          if (completedResponses === totalExpectedResponses) {
            callbacks.onAllFinished(completedResponses);
          }
        });

      responsePromises.push(responsePromise);
    }

    logger.info('Started streaming responses for intelligently selected personas', {
      sessionId: session.sessionId,
      selectedPersonas: selectedPersonas,
      totalActivePersonas: session.activePersonas.length,
      expectedResponses: totalExpectedResponses,
      hasDirectPersona: !!directQuestionPersonaId,
      hasImage: !!imageAttachment,
    });
  }

  private async generateSingleStreamingResponse(
    session: Session,
    personaId: string,
    userMessage: string,
    contentAnalysis: ContentAnalysis,
    allActivePersonasInfo: Array<{
      personaId: string;
      name: string;
      role: string;
      description: string;
    }>,
    previousResponses: AgentResponse[],
    sequencePosition: number,
    imageAttachment?: ImageAttachment
  ): Promise<AgentResponse> {
    // Get or create persona agent
    const agent = await this.getOrCreatePersonaAgent(personaId, session);

    // Get persona-specific conversation history
    const personaContext = session.personaContexts[personaId];

    // Create enhanced conversation history that includes previous personas' responses from this turn
    const enhancedHistory = this.createEnhancedConversationHistory(
      personaContext.conversationHistory,
      userMessage,
      previousResponses,
      sequencePosition
    );

    logger.info('Generating streaming response with intelligent routing', {
      sessionId: session.sessionId,
      personaId,
      sequencePosition: sequencePosition + 1,
      totalSelectedPersonas: previousResponses.length + 1,
      otherPersonasCount: allActivePersonasInfo.length - 1,
      hasImage: !!imageAttachment,
    });

    // Generate response with enhanced context, persona awareness, and image
    const agentResponse = await agent.generateResponse(
      enhancedHistory,
      userMessage,
      
      contentAnalysis,
      session,
      allActivePersonasInfo,
      imageAttachment
    );

    logger.info('Streaming response generated with intelligent routing', {
      sessionId: session.sessionId,
      personaId,
      sequencePosition: sequencePosition + 1,
      confidence: agentResponse.confidence,
    });

    return agentResponse;
  }

  private getPersonaName(personaId: string, customPersonas?: Record<string, unknown>): string {
    try {
      if (customPersonas?.[personaId]) {
        const customPersona = customPersonas[personaId] as { name?: string };
        return customPersona?.name || personaId;
      }

      const persona = this.personaManager.getPersona(personaId);
      return persona.name;
    } catch (error) {
      logger.warn('Could not get persona name', { personaId, error });
      return personaId;
    }
  }

  private async determineRouting(
    session: Session,
    userMessage: string,
    contentAnalysis: ContentAnalysis,
    directQuestionPersonaId?: string
  ): Promise<RoutingDecision> {
    try {
      // Get all active personas (using custom personas if available)
      const activePersonas = session.activePersonas.map(personaId =>
        this.personaManager.getPersonaWithCustom(personaId, session.customPersonas)
      );

      // Use Nova Pro RoutingAgent for intelligent routing
      const routingDecision = await this.routingAgent.determineRouting(
        session,
        userMessage,
        contentAnalysis,
        activePersonas,
        directQuestionPersonaId
      );

      logger.info('Nova Pro routing completed', {
        sessionId: session.sessionId,
        selectedPersonas: routingDecision.selectedPersonas,
        confidence: routingDecision.confidence,
      });

      return routingDecision;
    } catch (error) {
      logger.error('🚨 ROUTING PROCESSOR FAILED - falling back to content analysis', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
        fullErrorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });

      // Fallback to original content analysis routing
      logger.warn('🔄 Using fallback content analysis routing due to RoutingProcessor failure', {
        sessionId: session.sessionId,
      });
      return this.fallbackContentAnalysisRouting(
        session,
        userMessage,
        contentAnalysis,
        directQuestionPersonaId
      );
    }
  }

  private async fallbackContentAnalysisRouting(
    session: Session,
    userMessage: string,
    contentAnalysis: ContentAnalysis,
    directQuestionPersonaId?: string
  ): Promise<RoutingDecision> {
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

    // Get all active personas (using custom personas if available)
    const activePersonas = session.activePersonas.map(personaId =>
      this.personaManager.getPersonaWithCustom(personaId, session.customPersonas)
    );

    // Determine persona relevance based on content analysis
    const personaRelevance = this.contentAnalysisService.determinePersonaRelevance(
      contentAnalysis,
      activePersonas
    );

    // Apply routing logic
    const routingResult = this.applyRoutingLogic(personaRelevance, contentAnalysis, session);

    return routingResult;
  }

  private applyRoutingLogic(
    personaRelevance: Array<{ personaId: string; relevance: number; reasoning: string }>,
    contentAnalysis: ContentAnalysis,
    session: Session
  ): RoutingDecision {
    const sortedPersonas = personaRelevance.sort((a, b) => b.relevance - a.relevance);

    // Determine how many personas should respond
    const topRelevance = sortedPersonas[0]?.relevance || 0;
    const selectedPersonas: string[] = [];

    if (topRelevance > 0.7) {
      // High confidence - single persona response
      selectedPersonas.push(sortedPersonas[0].personaId);
    } else if (topRelevance > 0.4) {
      // Medium confidence - primary persona plus potentially one more
      selectedPersonas.push(sortedPersonas[0].personaId);

      // Add second persona if their relevance is also significant
      if (sortedPersonas[1] && sortedPersonas[1].relevance > 0.3) {
        selectedPersonas.push(sortedPersonas[1].personaId);
      }
    } else {
      // Low confidence - multiple perspectives might be helpful
      // Select top 2-3 personas with reasonable relevance
      for (let i = 0; i < Math.min(3, sortedPersonas.length); i++) {
        if (sortedPersonas[i].relevance > 0.2) {
          selectedPersonas.push(sortedPersonas[i].personaId);
        }
      }
    }

    // Ensure at least one persona responds
    if (selectedPersonas.length === 0 && session.activePersonas.length > 0) {
      selectedPersonas.push(session.activePersonas[0]);
    }

    // Determine conversation action
    const conversationAction = this.determineConversationAction(
      selectedPersonas,
      contentAnalysis,
      topRelevance
    );

    return {
      selectedPersonas,
      confidence: topRelevance,
      reasoning: `Selected ${selectedPersonas.length} persona(s) based on content analysis. Top relevance: ${(topRelevance * 100).toFixed(1)}%`,
      conversationAction,
    };
  }

  private determineConversationAction(
    selectedPersonas: string[],
    contentAnalysis: ContentAnalysis,
    confidence: number
  ): ConversationAction {
    if (selectedPersonas.length === 1) {
      return {
        action: ConversationActionType.ROUTE_TO_PERSONA,
        targetPersona: selectedPersonas[0],
        shouldContinue: true,
        reasoning: `Single persona response with ${(confidence * 100).toFixed(1)}% confidence`,
      };
    } else if (selectedPersonas.length > 1) {
      return {
        action: ConversationActionType.MULTI_PERSONA_RESPONSE,
        shouldContinue: true,
        reasoning: `Multiple personas responding due to distributed expertise needs`,
      };
    } else {
      return {
        action: ConversationActionType.REQUEST_CLARIFICATION,
        shouldContinue: true,
        reasoning: 'Unable to determine appropriate persona for response',
      };
    }
  }

  private async generateAgentResponses(
    session: Session,
    userMessage: string,
    contentAnalysis: ContentAnalysis,
    selectedPersonas: string[],
    imageAttachment?: ImageAttachment
  ): Promise<AgentResponse[]> {
    const agentResponses: AgentResponse[] = [];

    // Collect information about all active personas for persona awareness
    const allActivePersonasInfo = this.collectActivePersonasInfo(session);

    // Generate responses sequentially so each persona can see previous responses
    for (let i = 0; i < selectedPersonas.length; i++) {
      const personaId = selectedPersonas[i];

      // Get or create persona agent
      const agent = await this.getOrCreatePersonaAgent(personaId, session);

      // Get persona-specific conversation history
      const personaContext = session.personaContexts[personaId];

      // Create enhanced conversation history that includes previous personas' responses from this turn
      const enhancedHistory = this.createEnhancedConversationHistory(
        personaContext.conversationHistory,
        userMessage,
        agentResponses,
        i
      );

      logger.info('Generating sequential response with persona awareness', {
        sessionId: session.sessionId,
        personaId,
        sequencePosition: i + 1,
        totalPersonas: selectedPersonas.length,
        previousResponses: agentResponses.length,
        otherPersonasCount: allActivePersonasInfo.length - 1,
        hasImage: !!imageAttachment,
      });

      // Generate response with enhanced context, persona awareness, and image
      const agentResponse = await agent.generateResponse(
        enhancedHistory,
        userMessage,
        contentAnalysis,
        session,
        allActivePersonasInfo,
        imageAttachment
      );

      agentResponses.push(agentResponse);

      logger.info('Sequential response generated with persona awareness', {
        sessionId: session.sessionId,
        personaId,
        sequencePosition: i + 1,
        confidence: agentResponse.confidence,
      });
    }

    logger.info('All sequential agent responses generated with persona awareness', {
      sessionId: session.sessionId,
      responseCount: agentResponses.length,
      personas: selectedPersonas,
      personaAwarenessEnabled: true,
      imageProcessed: !!imageAttachment,
    });

    return agentResponses;
  }

  private async getOrCreatePersonaAgent(
    personaId: string,
    session?: Session
  ): Promise<PersonaProcessor> {
    // Create cache key that includes session info for custom personas
    const cacheKey = session?.customPersonas?.[personaId]
      ? `${personaId}_custom_${session.sessionId}`
      : personaId;

    // Check if agent already exists with this specific configuration
    if (this.activeAgents.has(cacheKey)) {
      return this.activeAgents.get(cacheKey)!;
    }

    // Create new agent using custom persona if available
    const persona = session
      ? this.personaManager.getPersonaWithCustom(personaId, session.customPersonas)
      : this.personaManager.getPersona(personaId);
    const agent = new PersonaProcessor(persona, this.llmRequestManager);

    // Cache the agent with the specific configuration key
    this.activeAgents.set(cacheKey, agent);

    logger.info('Created new persona agent', {
      personaId,
      isCustom: persona.isCustom,
      cacheKey,
      sessionId: session?.sessionId,
    });

    return agent;
  }

  private async determineNextConversationAction(
    session: Session,
    agentResponses: AgentResponse[],
    _contentAnalysis: ContentAnalysis
  ): Promise<ConversationAction | undefined> {
    // Analyze agent responses to determine next action
    const nextActions = agentResponses
      .map(response => response.nextAction)
      .filter(action => action !== undefined) as ConversationAction[];

    if (nextActions.length === 0) {
      return undefined;
    }

    // Priority order for actions
    const actionPriority = {
      [ConversationActionType.END_CONVERSATION]: 4,
      [ConversationActionType.ROUTE_TO_PERSONA]: 3,
      [ConversationActionType.MULTI_PERSONA_RESPONSE]: 2,
      [ConversationActionType.REQUEST_CLARIFICATION]: 1,
    };

    // Select the highest priority action
    const prioritizedAction = nextActions.reduce((highest, current) => {
      const currentPriority = actionPriority[current.action] || 0;
      const highestPriority = actionPriority[highest.action] || 0;

      return currentPriority > highestPriority ? current : highest;
    });

    logger.info('Next conversation action determined', {
      sessionId: session.sessionId,
      action: prioritizedAction.action,
      targetPersona: prioritizedAction.targetPersona,
    });

    return prioritizedAction;
  }

  private createIterativeConversationHistory(
    originalHistory: ConversationMessage[],
    currentUserMessage: string,
    previousResponses: AgentResponse[],
    sessionId: string
  ): ConversationMessage[] {
    // Start with the original persona-specific conversation history
    const enhancedHistory = [...originalHistory];

    // Add the current user message if it's not already in the history
    const userMessage: ConversationMessage = {
      messageId: `msg_${Date.now()}_user_iterative`,
      sessionId: sessionId,
      sender: MessageSender.USER,
      content: currentUserMessage,
      timestamp: Date.now(),
    };

    // Check if this user message is already in history (to avoid duplication)
    const hasCurrentMessage = enhancedHistory.some(
      msg => msg.sender === MessageSender.USER && msg.content === currentUserMessage
    );

    if (!hasCurrentMessage) {
      enhancedHistory.push(userMessage);
    }

  // TEMPORARY CONTEXT SHARING: Add previous responses from current turn for LLM context only
  // These messages are NOT stored in persistent session data - only used for this LLM call
  for (let i = 0; i < previousResponses.length; i++) {
    const previousResponse = previousResponses[i];
    if (previousResponse) {
      const tempResponseMessage: ConversationMessage = {
        messageId: `temp_${Date.now()}_${previousResponse.personaId}_iter_${i}`, // TEMP prefix
        sessionId: sessionId,
        sender: MessageSender.PERSONA,
        content: previousResponse.response.content,
        timestamp: previousResponse.response.timestamp,
        personaId: previousResponse.personaId,
      };

      enhancedHistory.push(tempResponseMessage); // Only for this LLM call
    }
  }

    logger.debug('Iterative conversation history created for persona', {
      sessionId: sessionId,
      originalHistoryLength: originalHistory.length,
      enhancedHistoryLength: enhancedHistory.length,
      previousResponsesFromThisTurn: previousResponses.length,
      userMessageAdded: !hasCurrentMessage,
    });

    return enhancedHistory;
  }

  private createEnhancedConversationHistory(
    originalHistory: ConversationMessage[],
    currentUserMessage: string,
    previousResponses: AgentResponse[],
    currentPersonaIndex: number
  ): ConversationMessage[] {
    // Start with the original persona-specific conversation history
    const enhancedHistory = [...originalHistory];

    // Add the current user message if it's not already in the history
    const currentUserMessageId = `msg_${Date.now()}_user`;
    const userMessage: ConversationMessage = {
      messageId: currentUserMessageId,
      sessionId: enhancedHistory[0]?.sessionId || 'unknown',
      sender: MessageSender.USER,
      content: currentUserMessage,
      timestamp: Date.now(),
    };

    // Check if this user message is already in history (to avoid duplication)
    const hasCurrentMessage = enhancedHistory.some(
      msg => msg.sender === MessageSender.USER && msg.content === currentUserMessage
    );

    if (!hasCurrentMessage) {
      enhancedHistory.push(userMessage);
    }

    // Add previous personas' responses from this turn so the current persona can see them
    for (let i = 0; i < currentPersonaIndex; i++) {
      const previousResponse = previousResponses[i];
      if (previousResponse) {
        const responseMessage: ConversationMessage = {
          messageId: `msg_${Date.now()}_${previousResponse.personaId}_${i}`,
          sessionId: enhancedHistory[0]?.sessionId || 'unknown',
          sender: MessageSender.PERSONA,
          content: previousResponse.response.content,
          timestamp: previousResponse.response.timestamp,
          personaId: previousResponse.personaId,
        };

        enhancedHistory.push(responseMessage);
      }
    }

    logger.debug('Enhanced conversation history created', {
      originalHistoryLength: originalHistory.length,
      enhancedHistoryLength: enhancedHistory.length,
      previousResponsesIncluded: currentPersonaIndex,
      currentPersonaIndex,
    });

    return enhancedHistory;
  }

  private createFallbackResponses(session: Session): PersonaResponse[] {
    // Create a fallback response from the first active persona
    const fallbackPersonaId = session.activePersonas[0] || 'persona_1';
    const fallbackPersona = this.personaManager.getPersona(fallbackPersonaId);

    return [
      {
        personaId: fallbackPersonaId,
        personaName: fallbackPersona.name,
        personaRole: fallbackPersona.role,
        content:
          "I apologize, but I'm having some technical difficulties processing your message. Could you please try rephrasing your question?",
        timestamp: Date.now(),
        confidence: 0.1,
      },
    ];
  }

  // Method to handle persona interactions (for future inter-persona communication)
  async facilitatePersonaInteraction(
    session: Session,
    initiatingPersonaId: string,
    targetPersonaId: string,
    interactionContext: string
  ): Promise<PersonaResponse | null> {
    try {
      logger.info('Facilitating persona interaction', {
        sessionId: session.sessionId,
        from: initiatingPersonaId,
        to: targetPersonaId,
      });

      // Get target persona agent
      const targetAgent = await this.getOrCreatePersonaAgent(targetPersonaId);

      // Create interaction message
      const interactionMessage = `${this.personaManager.getPersonaName(initiatingPersonaId)} would like your perspective on: ${interactionContext}`;

      // Analyze the interaction context
      const contentAnalysis = this.contentAnalysisService.analyzeContent(
        interactionContext
      );

      // Generate response from target persona
      const agentResponse = await targetAgent.generateResponse(
        session.personaContexts[targetPersonaId].conversationHistory,
        interactionMessage,
        contentAnalysis,
        session
      );

      logger.info('Persona interaction completed', {
        sessionId: session.sessionId,
        from: initiatingPersonaId,
        to: targetPersonaId,
      });

      return agentResponse.response;
    } catch (error) {
      logger.error('Error facilitating persona interaction', {
        sessionId: session.sessionId,
        from: initiatingPersonaId,
        to: targetPersonaId,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }

  // Cleanup method to remove inactive agents
  cleanupInactiveAgents(): void {
    // This could be enhanced to remove agents that haven't been used recently
    logger.info('Agent cleanup completed', {
      activeAgentCount: this.activeAgents.size,
    });
  }

  // Method to update persona definitions (for future dynamic persona support)
  updatePersona(personaId: string, updatedPersona: Persona): void {
    const agent = this.activeAgents.get(personaId);
    if (agent) {
      agent.updatePersona(updatedPersona);
      logger.info('Persona updated in orchestrator', { personaId });
    }
  }

  private collectActivePersonasInfo(
    session: Session
  ): Array<{ personaId: string; name: string; role: string; description: string }> {
    const activePersonasInfo: Array<{
      personaId: string;
      name: string;
      role: string;
      description: string;
    }> = [];

    for (const personaId of session.activePersonas) {
      try {
        // Get persona information (with custom persona support)
        const persona = this.personaManager.getPersonaWithCustom(personaId, session.customPersonas);

        activePersonasInfo.push({
          personaId: persona.personaId,
          name: persona.name,
          role: persona.role,
          description: persona.description,
        });

        logger.debug('Collected persona info for awareness', {
          sessionId: session.sessionId,
          personaId: persona.personaId,
          name: persona.name,
          role: persona.role,
          isCustom: persona.isCustom,
        });
      } catch (error) {
        logger.warn('Failed to collect persona info for awareness', {
          sessionId: session.sessionId,
          personaId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Collected active personas info for awareness', {
      sessionId: session.sessionId,
      totalPersonas: activePersonasInfo.length,
      personaIds: activePersonasInfo.map(p => p.personaId),
    });

    return activePersonasInfo;
  }

  /**
   * Queue only audio for subsequent personas (text already sent)
   */
  private async queueAudioOnly(
    session: Session,
    response: PersonaResponse,
    onPersonaAudio: (
      messageId: string,
      personaId: string,
      audioUrl: string,
      duration?: number,
      voiceId?: string
    ) => void,
    onAudioError: (messageId: string, personaId: string, error: string) => void
  ): Promise<void> {
    // Check if voice is enabled for this session
    if (!session.voiceSettings?.enabled) {
      logger.debug('Voice not enabled for session', { sessionId: session.sessionId });
      return;
    }

    try {
      // FIXED: Complete voice selection logic for custom personas (consistent with generateAndSendAudio)
      let voiceId: string;
      let voiceSource: string;

      // Priority 1: Check explicit voice settings override
      if (session.voiceSettings?.personaVoices?.[response.personaId]) {
        voiceId = session.voiceSettings.personaVoices[response.personaId];
        voiceSource = 'voice_settings_override';
      }
      // Priority 2: Check custom persona assigned voice (CRITICAL FIX!)
      else if (session.customPersonas?.[response.personaId]?.voiceId) {
        voiceId = session.customPersonas[response.personaId].voiceId!;
        voiceSource = 'custom_persona_default';
      }
      // Priority 3: Fall back to system default (language-aware)
      else {
        const conversationLanguage = session.conversationLanguage || session.voiceSettings?.conversationLanguage || 'en';
        voiceId = this.pollyService.getVoiceForPersonaAndLanguage(response.personaId, conversationLanguage);
        voiceSource = `system_default_${conversationLanguage}`;
      }

      logger.debug('Voice selected for queued audio', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        voiceId,
        source: voiceSource,
        isCustomPersona: !!session.customPersonas?.[response.personaId],
      });

      const useNewscasterStyle = this.pollyService.shouldUseNewscasterStyle(
        response.personaId,
        voiceId
      );

      logger.info('Generating audio for queued response', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        voiceId,
        useNewscasterStyle,
      });

      const audioResult = await this.pollyService.synthesizeWithStreaming(
        response.content,
        voiceId,
        response.personaId,
        useNewscasterStyle
      );

      const audioUrl = `data:${audioResult.contentType};base64,${audioResult.audioBase64}`;

      // Create audio queue item
      const audioItem: QueuedResponseItem = {
        messageId: `audio_${response.personaId}_${response.timestamp}`,
        personaId: response.personaId,
        personaName: response.personaName,
        personaRole: response.personaRole,
        textContent: response.content,
        audioUrl,
        duration: audioResult.duration,
        voiceId,
        timestamp: response.timestamp,
        hasAudio: true,
      };

      // Add to queue and process
      await this.queueAudio(session.sessionId, audioItem, onPersonaAudio, onAudioError);

      logger.info('Audio queued successfully', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        voiceId,
        duration: audioResult.duration,
      });
    } catch (error) {
      logger.error('Error queuing audio response', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        error: error instanceof Error ? error.message : String(error),
      });

      onAudioError(
        `audio_${response.personaId}_${response.timestamp}`,
        response.personaId,
        `Failed to generate audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate and queue audio for persona response
   */
  private async generateAndSendAudio(
    session: Session,
    response: PersonaResponse,
    onPersonaAudio: (
      messageId: string,
      personaId: string,
      audioUrl: string,
      duration?: number,
      voiceId?: string
    ) => void,
    onAudioError: (messageId: string, personaId: string, error: string) => void
  ): Promise<void> {
    // Check if voice is enabled for this session
    if (!session.voiceSettings?.enabled) {
      logger.debug('Voice not enabled for session', { sessionId: session.sessionId });
      return;
    }

    try {
      // FIXED: Complete voice selection logic for custom personas
      let voiceId: string;
      let voiceSource: string;

      // Log voice selection process for monitoring
      logger.info('Voice selection debug info', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        voiceSettingsEnabled: session.voiceSettings?.enabled,
        availablePersonaVoices: session.voiceSettings?.personaVoices
          ? Object.keys(session.voiceSettings.personaVoices)
          : [],
        personaVoiceAssignments: session.voiceSettings?.personaVoices,
        isCustomPersona: !!session.customPersonas?.[response.personaId],
        customPersonaVoiceId: session.customPersonas?.[response.personaId]?.voiceId,
        customPersonaData: session.customPersonas?.[response.personaId],
        allCustomPersonas: session.customPersonas ? Object.keys(session.customPersonas) : [],
      });

      // Priority 1: Check explicit voice settings override
      if (session.voiceSettings?.personaVoices?.[response.personaId]) {
        voiceId = session.voiceSettings.personaVoices[response.personaId];
        voiceSource = 'voice_settings_override';
      }
      // Priority 2: Check custom persona assigned voice (CRITICAL FIX!)
      else if (session.customPersonas?.[response.personaId]?.voiceId) {
        voiceId = session.customPersonas[response.personaId].voiceId!;
        voiceSource = 'custom_persona_default';
      }
      // Priority 3: Fall back to system default (language-aware)
      else {
        const conversationLanguage = session.conversationLanguage || session.voiceSettings?.conversationLanguage || 'en';
        voiceId = this.pollyService.getVoiceForPersonaAndLanguage(response.personaId, conversationLanguage);
        voiceSource = `system_default_${conversationLanguage}`;
      }

      logger.info('Voice selected for persona', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        voiceId,
        source: voiceSource,
        isCustomPersona: !!session.customPersonas?.[response.personaId],
      });

      // Check if persona should use newscaster style
      const useNewscasterStyle = this.pollyService.shouldUseNewscasterStyle(
        response.personaId,
        voiceId
      );

      logger.info('Generating audio for persona response', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        voiceId,
        useNewscasterStyle,
        textLength: response.content.length,
        customVoiceAssigned: !!session.voiceSettings.personaVoices[response.personaId],
      });

      // Generate audio with streaming
      const audioResult = await this.pollyService.synthesizeWithStreaming(
        response.content,
        voiceId,
        response.personaId,
        useNewscasterStyle
      );

      // Convert buffer to base64 data URL for streaming
      const audioUrl = `data:${audioResult.contentType};base64,${audioResult.audioBase64}`;

      // Create audio queue item
      const audioItem: QueuedResponseItem = {
        messageId: `audio_${response.personaId}_${response.timestamp}`,
        personaId: response.personaId,
        personaName: response.personaName,
        personaRole: response.personaRole,
        textContent: response.content,
        audioUrl,
        duration: audioResult.duration,
        voiceId,
        timestamp: response.timestamp,
        hasAudio: true,
      };

      // Add to queue and process
      await this.queueAudio(session.sessionId, audioItem, onPersonaAudio, onAudioError);

      logger.info('Audio generated and queued successfully', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        voiceId,
        duration: audioResult.duration,
        audioSize: audioResult.audioBuffer.length,
      });
    } catch (error) {
      logger.error('Error generating persona audio', {
        sessionId: session.sessionId,
        personaId: response.personaId,
        error: error instanceof Error ? error.message : String(error),
      });

      onAudioError(
        `audio_${response.personaId}_${response.timestamp}`,
        response.personaId,
        `Failed to generate audio: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Queue audio and process if ready
   */
  private async queueAudio(
    sessionId: string,
    audioItem: QueuedResponseItem,
    onPersonaAudio: (
      messageId: string,
      personaId: string,
      audioUrl: string,
      duration?: number,
      voiceId?: string
    ) => void,
    onAudioError: (messageId: string, personaId: string, error: string) => void
  ): Promise<void> {
    // Initialize queue if it doesn't exist
    if (!this.audioQueues.has(sessionId)) {
      this.audioQueues.set(sessionId, []);
    }

    // Add to queue
    const queue = this.audioQueues.get(sessionId)!;
    queue.push(audioItem);

    logger.info('Audio queued', {
      sessionId,
      messageId: audioItem.messageId,
      personaId: audioItem.personaId,
      queuePosition: queue.length,
      isCurrentlyPlaying: this.currentlyPlayingAudio.has(sessionId),
    });

    // Process queue if nothing is currently playing
    if (!this.currentlyPlayingAudio.has(sessionId)) {
      await this.processAudioQueue(sessionId, onPersonaAudio, onAudioError);
    }
  }

  /**
   * Process the audio queue for a session
   */
  private async processAudioQueue(
    sessionId: string,
    onPersonaAudio: (
      messageId: string,
      personaId: string,
      audioUrl: string,
      duration?: number,
      voiceId?: string
    ) => void,
    onAudioError: (messageId: string, personaId: string, error: string) => void
  ): Promise<void> {
    const queue = this.audioQueues.get(sessionId);
    if (!queue || queue.length === 0) {
      return;
    }

    // Get next audio item
    const audioItem = queue.shift()!;

    // Mark as currently playing
    this.currentlyPlayingAudio.set(sessionId, audioItem.messageId);

    logger.info('Processing audio from queue', {
      sessionId,
      messageId: audioItem.messageId,
      personaId: audioItem.personaId,
      remainingInQueue: queue.length,
    });

    try {
      // Send audio to frontend
      onPersonaAudio(
        audioItem.messageId,
        audioItem.personaId,
        audioItem.audioUrl || '',
        audioItem.duration,
        audioItem.voiceId || 'unknown'
      );

      logger.info('Audio sent to frontend', {
        sessionId,
        messageId: audioItem.messageId,
        personaId: audioItem.personaId,
        duration: audioItem.duration,
      });

      // Note: We wait for acknowledgment from frontend before processing next item
      // The acknowledgment is handled in handleAudioAcknowledgment method
    } catch (error) {
      logger.error('Error sending queued audio', {
        sessionId,
        messageId: audioItem.messageId,
        personaId: audioItem.personaId,
        error: error instanceof Error ? error.message : String(error),
      });

      onAudioError(
        audioItem.messageId,
        audioItem.personaId,
        `Failed to send audio: ${error instanceof Error ? error.message : String(error)}`
      );

      // Clear currently playing and continue with next
      this.currentlyPlayingAudio.delete(sessionId);
      await this.processAudioQueue(sessionId, onPersonaAudio, onAudioError);
    }
  }

  /**
   * Handle audio acknowledgment from frontend
   */
  async handleAudioAcknowledgment(
    sessionId: string,
    messageId: string,
    onPersonaAudio: (
      messageId: string,
      personaId: string,
      audioUrl: string,
      duration?: number,
      voiceId?: string
    ) => void,
    onAudioError: (messageId: string, personaId: string, error: string) => void,
    _onPersonaResponse?: (response: PersonaResponse) => void
  ): Promise<void> {
    const currentlyPlaying = this.currentlyPlayingAudio.get(sessionId);

    if (currentlyPlaying === messageId) {
      logger.info('Audio acknowledgment received', {
        sessionId,
        messageId,
        remainingInQueue: this.audioQueues.get(sessionId)?.length || 0,
      });

      // Clear currently playing
      this.currentlyPlayingAudio.delete(sessionId);

      // Process the audio-only queue (since we removed combined text+audio queuing)
      await this.processAudioQueue(sessionId, onPersonaAudio, onAudioError);
    } else {
      logger.warn('Audio acknowledgment for unexpected message', {
        sessionId,
        expectedMessageId: currentlyPlaying,
        receivedMessageId: messageId,
      });
    }
  }

  /**
   * Clear audio queue for a session
   */
  clearAudioQueue(sessionId: string): void {
    logger.info('Clearing audio queue', {
      sessionId,
      queueLength: this.audioQueues.get(sessionId)?.length || 0,
      wasPlaying: this.currentlyPlayingAudio.has(sessionId),
    });

    this.audioQueues.delete(sessionId);
    this.currentlyPlayingAudio.delete(sessionId);
  }

  /**
   * Get available Polly voices
   */
  getAvailableVoices(): Array<{
    voiceId: string;
    name: string;
    gender: string;
    language: string;
    supportsNewscaster: boolean;
  }> {
    return this.pollyService.getAvailableVoices();
  }

  /**
   * Generate voice preview
   */
  async generateVoicePreview(
    text: string,
    voiceId: string,
    personaId?: string
  ): Promise<{
    audioUrl: string;
    duration?: number;
    voiceId: string;
    useNewscasterStyle: boolean;
  }> {
    try {
      // Determine if we should use newscaster style
      const useNewscasterStyle = personaId
        ? this.pollyService.shouldUseNewscasterStyle(personaId, voiceId)
        : false;

      // Generate audio using PollyService
      const audioResult = await this.pollyService.synthesizeWithStreaming(
        text,
        voiceId,
        personaId,
        useNewscasterStyle
      );

      // Convert to data URL
      const audioUrl = `data:${audioResult.contentType};base64,${audioResult.audioBase64}`;

      return {
        audioUrl,
        duration: audioResult.duration,
        voiceId,
        useNewscasterStyle,
      };
    } catch (error) {
      logger.error('Error generating voice preview in orchestrator', {
        error: error instanceof Error ? error.message : String(error),
        voiceId,
        personaId,
      });
      throw error;
    }
  }

  // Method to get orchestrator statistics
  getStatistics(): {
    activeAgentCount: number;
    activePersonas: string[];
  } {
    return {
      activeAgentCount: this.activeAgents.size,
      activePersonas: Array.from(this.activeAgents.keys()),
    };
  }
}
