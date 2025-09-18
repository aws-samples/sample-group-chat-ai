// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Session,
  PersonaContext,
  ConversationMessage,
  CreateSessionRequest,
  SendMessageRequest,
  PersonaResponse,
  SessionStatus,
  MessageSender,
  ResourceNotFoundException,
  ServiceException,
  DocumentLink,
  ConversationFlow,
  ConversationTurn,
  TurnType,
  CustomPersonaData,
  VoiceSettings,
  generateSessionId,
  generateMessageId,
  isSessionExpired,
  SESSION_CONFIG,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { PersonaManager } from './PersonaManager';
import { LLMService } from './LLMService';
import { ConversationOrchestrator } from './ConversationOrchestrator';
import { UserSessionStorage } from './UserSessionStorage';
import { SessionTitleGenerator } from './SessionTitleGenerator';
import { SharedServices } from './SharedServices';

const logger = createLogger();

export class SessionService {
  private sessions: Map<string, Session> = new Map();
  private personaManager: PersonaManager;
  private llmService: LLMService;
  private conversationOrchestrator: ConversationOrchestrator;
  private userSessionStorage: UserSessionStorage;
  private titleGenerator: SessionTitleGenerator;

  constructor() {
    this.personaManager = new PersonaManager();
    this.llmService = SharedServices.getLLMService();
    this.conversationOrchestrator = SharedServices.getConversationOrchestrator();
    this.userSessionStorage = new UserSessionStorage();
    this.titleGenerator = new SessionTitleGenerator();

    // Start cleanup process
    this.startCleanupProcess();
  }

  async createSession(request: CreateSessionRequest): Promise<Session> {
    try {
      const sessionId = generateSessionId();
      const now = Date.now();

      // Initialize persona contexts
      const personaContexts: Record<string, PersonaContext> = {};
      for (const personaId of request.selectedPersonas) {
        personaContexts[personaId] = {
          personaId,
          conversationHistory: [],
        };
      }

      // Store custom personas as a lookup map
      const customPersonas: Record<string, CustomPersonaData> = {};
      if (request.customPersonas) {
        for (const customPersona of request.customPersonas) {
          customPersonas[customPersona.personaId] = customPersona;
        }
      }

      // Initialize conversation flow
      const initialTurn: ConversationTurn = {
        turnId: `turn-${now}`,
        turnType: TurnType.SYSTEM_MESSAGE,
        participantId: 'system',
        timestamp: now,
      };

      const conversationFlow: ConversationFlow = {
        currentTurn: initialTurn,
        turnHistory: [initialTurn],
        agentDiscussionActive: false,
        maxAgentTurns: 3,
        currentAgentTurns: 0,
        pendingAgentResponses: [],
      };

      const session: Session = {
        sessionId,
        userId: request.userId, // Add user association
        title: undefined, // Will be generated after first messages
        
        conversationTopic: request.conversationTopic,
        activePersonas: request.selectedPersonas,
        conversationHistory: [],
        personaContexts,
        createdAt: now,
        lastActivity: now,
        status: SessionStatus.ACTIVE,
        businessContext: request.businessContext,
        conversationFlow,
        conversationLanguage: request.conversationLanguage,
        customPersonas: Object.keys(customPersonas).length > 0 ? customPersonas : undefined,
        voiceSettings: {
          enabled: true, // Voice synthesis enabled by default
          personaVoices: {},
          conversationLanguage: request.conversationLanguage,
          playbackSettings: {
            autoPlay: true,
            volume: 0.8, // 80% volume by default
            speed: 1.0, // Normal speed
          },
        },
        isResumable: true,
        totalMessages: 0,
      };

      this.sessions.set(sessionId, session);

      // Store in persistent storage if user is provided
      if (request.userId) {
        await this.userSessionStorage.storeUserSession(session);
      }

      logger.info('Session created', {
        sessionId,
        userId: request.userId,
        
        personaCount: request.selectedPersonas.length,
        customPersonaCount: request.customPersonas?.length || 0,
      });

      return session;
    } catch (error) {
      logger.error('Error creating session:', error);
      throw new ServiceException('Failed to create session', error as Error);
    }
  }

  async processMessage(sessionId: string, request: SendMessageRequest): Promise<PersonaResponse[]> {
    try {
      const session = this.getActiveSession(sessionId);

      // Create user message
      const userMessage: ConversationMessage = {
        messageId: generateMessageId(),
        sessionId,
        sender: MessageSender.USER,
        content: request.content,
        timestamp: Date.now(),
        imageAttachment: request.imageAttachment,
      };

      // Add to main conversation history
      session.conversationHistory.push(userMessage);

      // Add to each persona's context (maintaining shared conversation history)
      for (const personaId of session.activePersonas) {
        session.personaContexts[personaId].conversationHistory.push(userMessage);
      }

      // Use ConversationOrchestrator for intelligent routing and response generation
      const responses = await this.conversationOrchestrator.processMessage(
        session,
        request.content,
        request.directQuestionPersonaId,
        request.imageAttachment
      );

      // Add persona responses to conversation histories
      for (const response of responses) {
        const personaMessage: ConversationMessage = {
          messageId: generateMessageId(),
          sessionId,
          sender: MessageSender.PERSONA,
          content: response.content,
          timestamp: response.timestamp,
          personaId: response.personaId,
        };

        // Add to main conversation history (single source of truth for display)
        session.conversationHistory.push(personaMessage);

        // FIXED: Only add to the responding persona's own context (restore isolation)
        // Each persona should only see user messages + their own responses for consistency
        session.personaContexts[response.personaId].conversationHistory.push(personaMessage);

        // Update last response time for the responding persona
        session.personaContexts[response.personaId].lastResponse = response.timestamp;
      }

      // Update session activity and message count
      session.lastActivity = Date.now();
      session.totalMessages = session.conversationHistory.length;

      // Generate or update title if needed
      if (session.userId) {
        try {
          const newTitle = await this.titleGenerator.updateSessionTitleIfNeeded(session);
          if (newTitle) {
            session.title = newTitle;
            await this.userSessionStorage.updateSessionTitle(session.userId, sessionId, newTitle);
          }
          
          // Store updated session
          await this.userSessionStorage.storeUserSession(session);
        } catch (error) {
          logger.warn('Failed to update session title or storage:', error);
        }
      }

      logger.info('Message processed with orchestrator', {
        sessionId,
        responseCount: responses.length,
        orchestratorUsed: true,
        hasImage: !!request.imageAttachment,
        sessionTitle: session.title,
      });

      return responses;
    } catch (error) {
      logger.error('Error processing message:', error);
      throw new ServiceException('Failed to process message', error as Error);
    }
  }

  async processMessageStreaming(
    sessionId: string,
    request: SendMessageRequest,
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
    }
  ): Promise<void> {
    try {
      const session = this.getActiveSession(sessionId);

      // Create user message
      const userMessage: ConversationMessage = {
        messageId: generateMessageId(),
        sessionId,
        sender: MessageSender.USER,
        content: request.content,
        timestamp: Date.now(),
        imageAttachment: request.imageAttachment,
      };

      // Add to main conversation history
      session.conversationHistory.push(userMessage);

      // Add to each persona's context (maintaining shared conversation history)
      for (const personaId of session.activePersonas) {
        session.personaContexts[personaId].conversationHistory.push(userMessage);
      }

      // Use ConversationOrchestrator for intelligent routing and streaming responses
      await this.conversationOrchestrator.processMessageStreaming(
        session,
        request.content,
        {
          onPersonaStartTyping: callbacks.onPersonaStartTyping,
          onPersonaResponse: (response: PersonaResponse) => {
            // Add persona response to conversation histories
            const personaMessage: ConversationMessage = {
              messageId: generateMessageId(),
              sessionId,
              sender: MessageSender.PERSONA,
              content: response.content,
              timestamp: response.timestamp,
              personaId: response.personaId,
            };

            // Add to main conversation history (single source of truth for display)
            session.conversationHistory.push(personaMessage);

            // FIXED: Only add to the responding persona's own context (restore isolation)
            // Each persona should only see user messages + their own responses for consistency
            session.personaContexts[response.personaId].conversationHistory.push(personaMessage);

            // Update last response time for the responding persona
            session.personaContexts[response.personaId].lastResponse = response.timestamp;

            // Forward response to WebSocket
            callbacks.onPersonaResponse(response);
          },
          onPersonaAudio: callbacks.onPersonaAudio,
          onAllFinished: async (totalResponses: number) => {
            session.lastActivity = Date.now();
            session.totalMessages = session.conversationHistory.length;

            // Generate or update title if needed
            if (session.userId) {
              try {
                const newTitle = await this.titleGenerator.updateSessionTitleIfNeeded(session);
                if (newTitle) {
                  session.title = newTitle;
                  await this.userSessionStorage.updateSessionTitle(session.userId, sessionId, newTitle);
                }
                
                // Store updated session
                await this.userSessionStorage.storeUserSession(session);
              } catch (error) {
                logger.warn('Failed to update session title or storage in streaming:', error);
              }
            }

            callbacks.onAllFinished(totalResponses);

            logger.info('Streaming message processing completed with intelligent routing', {
              sessionId,
              totalResponses,
              hasImage: !!request.imageAttachment,
              sessionTitle: session.title,
            });
          },
          onError: callbacks.onError,
          onAudioError: callbacks.onAudioError,
        },
        request.directQuestionPersonaId,
        request.imageAttachment
      );

      logger.info('Started streaming message processing with intelligent routing', {
        sessionId,
        hasDirectPersona: !!request.directQuestionPersonaId,
        hasImage: !!request.imageAttachment,
      });
    } catch (error) {
      logger.error('Error in streaming message processing setup:', error);
      callbacks.onError('Processing error', 'Failed to start message processing');
    }
  }

  /**
   * Handle audio acknowledgment from frontend
   */
  async handleAudioAcknowledgment(
    sessionId: string,
    messageId: string,
    personaId: string
  ): Promise<void> {
    try {
      const session = this.getActiveSession(sessionId);

      logger.debug('Handling audio acknowledgment', {
        sessionId,
        messageId,
        personaId,
      });

      // FIXED: Need to handle combined text+audio queue properly
      // The ConversationOrchestrator needs callbacks for both text and audio delivery

      // Create WebSocket server access for all callbacks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webSocketServer = (global as { webSocketServer?: { getWebSocketController?: () => any } }).webSocketServer;
      const wsController = webSocketServer?.getWebSocketController?.();
      const wsManager = wsController?.getSessionWebSocketManager();

      if (!wsManager) {
        logger.error('WebSocket server not available for audio acknowledgment', { sessionId });
        return;
      }

      // Pass the audio acknowledgment to the orchestrator with proper callbacks
      await this.conversationOrchestrator.handleAudioAcknowledgment(
        sessionId,
        messageId,
        (
          nextMessageId: string,
          nextPersonaId: string,
          audioUrl: string,
          duration?: number,
          voiceId?: string
        ) => {
          // Send next audio via WebSocket
          logger.info('Next audio ready from queue, sending via WebSocket', {
            sessionId,
            nextMessageId,
            nextPersonaId,
          });

          wsManager.sendPersonaAudio(sessionId, {
            messageId: nextMessageId,
            personaId: nextPersonaId,
            audioUrl,
            duration,
            voiceId: voiceId || 'unknown',
          });
        },
        (errorMessageId: string, errorPersonaId: string, error: string) => {
          // Send audio error via WebSocket
          logger.error('Audio error from queue, sending via WebSocket', {
            sessionId,
            errorMessageId,
            errorPersonaId,
            error,
          });

          wsManager.sendAudioError(sessionId, {
            messageId: errorMessageId,
            personaId: errorPersonaId,
            error,
            timestamp: Date.now(),
          });
        },
        (response: PersonaResponse) => {
          // CRITICAL FIX: Send text response via WebSocket for combined queue
          logger.info('Text response ready from combined queue, sending via WebSocket', {
            sessionId,
            personaId: response.personaId,
            messageId: response.timestamp,
          });

          wsManager.sendPersonaResponse(sessionId, {
            personaId: response.personaId,
            personaName: response.personaName,
            personaRole: response.personaRole,
            content: response.content,
            timestamp: response.timestamp,
            messageId: `combined_text_${response.personaId}_${response.timestamp}`,
          });
        }
      );

      // Update session activity
      session.lastActivity = Date.now();
    } catch (error) {
      logger.error('Error handling audio acknowledgment:', {
        sessionId,
        messageId,
        personaId,
        error,
      });
      throw new ServiceException('Failed to handle audio acknowledgment', error as Error);
    }
  }

  private async generatePersonaResponseStreaming(
    session: Session,
    personaId: string,
    userMessage: string,
    _imageAttachment?: Record<string, unknown>
  ): Promise<PersonaResponse> {
    try {
      const persona = this.personaManager.getPersonaWithCustom(personaId, session.customPersonas);
      const personaContext = session.personaContexts[personaId];

      // Generate response using LLM with isolated context
      const response = await this.llmService.generatePersonaResponse(
        persona,
        personaContext.conversationHistory,
        userMessage
      );

      return {
        personaId,
        personaName: persona.name,
        personaRole: persona.role,
        content: response,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error generating streaming persona response:', { personaId, error });

      // Return fallback response
      const personaName = this.getPersonaName(personaId, session.customPersonas);
      const personaRole = this.getPersonaRole(personaId, session.customPersonas);

      return {
        personaId,
        personaName,
        personaRole,
        content:
          "I apologize, but I'm having trouble processing your message right now. Please try again.",
        timestamp: Date.now(),
      };
    }
  }

  async updateSessionPersonas(sessionId: string, newPersonas: string[]): Promise<Session> {
    try {
      const session = this.getActiveSession(sessionId);

      // Add new personas
      for (const personaId of newPersonas) {
        if (!session.personaContexts[personaId]) {
          session.personaContexts[personaId] = {
            personaId,
            conversationHistory: [
              ...session.conversationHistory.filter(
                msg => msg.sender === MessageSender.USER || msg.personaId === personaId
              ),
            ],
          };
        }
      }

      // Remove personas not in new list
      for (const personaId of session.activePersonas) {
        if (!newPersonas.includes(personaId)) {
          delete session.personaContexts[personaId];
        }
      }

      session.activePersonas = newPersonas;
      session.lastActivity = Date.now();

      logger.info('Session personas updated', { sessionId, newPersonas });

      return session;
    } catch (error) {
      logger.error('Error updating session personas:', error);
      throw new ServiceException('Failed to update session personas', error as Error);
    }
  }

  async updateVoiceSettings(sessionId: string, voiceSettings: VoiceSettings): Promise<Session> {
    try {
      const session = this.getActiveSession(sessionId);

      // Update voice settings
      session.voiceSettings = {
        ...voiceSettings,
      };

      session.lastActivity = Date.now();

      logger.info('Voice settings updated', {
        sessionId,
        enabled: voiceSettings.enabled,
        personaVoiceCount: Object.keys(voiceSettings.personaVoices).length,
      });

      return session;
    } catch (error) {
      logger.error('Error updating voice settings:', error);
      throw new ServiceException('Failed to update voice settings', error as Error);
    }
  }

  async resetSessionPersonas(sessionId: string): Promise<Session> {
    try {
      const session = this.getActiveSession(sessionId);

      // Clear custom personas from the session
      delete session.customPersonas;

      // Update last activity
      session.lastActivity = Date.now();

      logger.info('Session personas reset to defaults', { sessionId });

      return session;
    } catch (error) {
      logger.error('Error resetting session personas:', error);
      throw new ServiceException('Failed to reset session personas', error as Error);
    }
  }

  async generateSessionSummary(sessionId: string): Promise<{
    summary: string;
    keyInsights: string[];
    recommendations: string[];
  }> {
    try {
      const session = this.getActiveSession(sessionId);

      // Generate summary using LLM
      const summary = await this.llmService.generateSummary(session.conversationHistory);

      logger.info('Session summary generated', { sessionId });

      return summary;
    } catch (error) {
      logger.error('Error generating session summary:', error);
      throw new ServiceException('Failed to generate session summary', error as Error);
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new ResourceNotFoundException(
          `Session with ID '${sessionId}' not found`,
          'session',
          sessionId
        );
      }

      session.status = SessionStatus.ENDED;
      session.lastActivity = Date.now();
      session.totalMessages = session.conversationHistory.length;

      // Generate final title if not already set
      if (session.userId && session.conversationHistory.length >= 3) {
        try {
          if (!session.title || session.title.includes('Session')) {
            const finalTitle = await this.titleGenerator.generateSessionTitle(session);
            session.title = finalTitle;
          }
          
          // Final storage update
          await this.userSessionStorage.storeUserSession(session);
        } catch (error) {
          logger.warn('Failed to generate final title or update storage:', error);
        }
      }

      // Remove from active sessions after a delay to allow final requests
      setTimeout(() => {
        this.sessions.delete(sessionId);
        logger.info('Session removed from memory', { sessionId });
      }, 60000); // 1 minute delay

      logger.info('Session ended', { 
        sessionId, 
        userId: session.userId,
        finalTitle: session.title,
        totalMessages: session.totalMessages 
      });
    } catch (error) {
      logger.error('Error ending session:', error);
      throw new ServiceException('Failed to end session', error as Error);
    }
  }

  async addDocumentToSession(
    sessionId: string,
    documentData: {
      fileName: string;
      fileType: string;
      content: string;
      fileSize: number;
    }
  ): Promise<DocumentLink> {
    try {
      const session = this.getActiveSession(sessionId);

      const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const documentLink: DocumentLink = {
        documentId,
        sessionId,
        fileName: documentData.fileName,
        fileType: documentData.fileType,
        uploadedAt: Date.now(),
        content: documentData.content,
      };

      // Initialize documentLinks array if it doesn't exist
      if (!session.documentLinks) {
        session.documentLinks = [];
      }

      session.documentLinks.push(documentLink);
      session.lastActivity = Date.now();

      logger.info('Document added to session', {
        sessionId,
        documentId,
        fileName: documentData.fileName,
        fileSize: documentData.fileSize,
      });

      return documentLink;
    } catch (error) {
      logger.error('Error adding document to session:', error);
      throw new ServiceException('Failed to add document to session', error as Error);
    }
  }

  async getSessionDocuments(sessionId: string): Promise<DocumentLink[]> {
    try {
      const session = this.getActiveSession(sessionId);
      return session.documentLinks || [];
    } catch (error) {
      logger.error('Error getting session documents:', error);
      throw new ServiceException('Failed to get session documents', error as Error);
    }
  }

  async removeDocumentFromSession(sessionId: string, documentId: string): Promise<void> {
    try {
      const session = this.getActiveSession(sessionId);

      if (!session.documentLinks) {
        throw new ResourceNotFoundException(
          `Document with ID '${documentId}' not found`,
          'document',
          documentId
        );
      }

      const documentIndex = session.documentLinks.findIndex(doc => doc.documentId === documentId);

      if (documentIndex === -1) {
        throw new ResourceNotFoundException(
          `Document with ID '${documentId}' not found`,
          'document',
          documentId
        );
      }

      session.documentLinks.splice(documentIndex, 1);
      session.lastActivity = Date.now();

      logger.info('Document removed from session', { sessionId, documentId });
    } catch (error) {
      logger.error('Error removing document from session:', error);
      throw new ServiceException('Failed to remove document from session', error as Error);
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Restores a session to active memory for resuming
   */
  restoreSession(session: Session): void {
    this.sessions.set(session.sessionId, session);
    logger.info('Session restored to active memory', {
      sessionId: session.sessionId,
      messageCount: session.conversationHistory.length,
    });
  }

  getPersonaName(personaId: string, customPersonas?: Record<string, CustomPersonaData>): string {
    return this.personaManager.getPersonaNameWithCustom(personaId, customPersonas);
  }

  getPersonaRole(personaId: string, customPersonas?: Record<string, CustomPersonaData>): string {
    return this.personaManager.getPersonaRoleWithCustom(personaId, customPersonas);
  }

  getPersonaDescription(
    personaId: string,
    customPersonas?: Record<string, CustomPersonaData>
  ): string {
    return this.personaManager.getPersonaDescriptionWithCustom(personaId, customPersonas);
  }

  private getActiveSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.warn('Session not found', {
        sessionId,
        activeSessions: this.sessions.size,
        availableSessionIds: Array.from(this.sessions.keys()).slice(0, 5), // Log first 5 for debugging
      });
      throw new ResourceNotFoundException(
        `Session with ID '${sessionId}' not found. The session may have expired or the server may have been restarted.`,
        'session',
        sessionId
      );
    }

    if (session.status !== SessionStatus.ACTIVE) {
      logger.warn('Session not active', { sessionId, status: session.status });
      throw new ResourceNotFoundException(
        `Session with ID '${sessionId}' is not active (status: ${session.status})`,
        'session',
        sessionId
      );
    }

    if (isSessionExpired(session.lastActivity)) {
      session.status = SessionStatus.EXPIRED;
      logger.warn('Session expired', {
        sessionId,
        lastActivity: new Date(session.lastActivity).toISOString(),
        timeoutMinutes: SESSION_CONFIG.TIMEOUT_MINUTES,
      });
      throw new ResourceNotFoundException(
        `Session with ID '${sessionId}' has expired. Sessions expire after ${SESSION_CONFIG.TIMEOUT_MINUTES} minutes of inactivity.`,
        'session',
        sessionId
      );
    }

    return session;
  }

  private async generatePersonaResponse(
    session: Session,
    personaId: string,
    userMessage: string
  ): Promise<PersonaResponse> {
    try {
      const persona = this.personaManager.getPersona(personaId);
      const personaContext = session.personaContexts[personaId];

      // Generate response using LLM with isolated context
      const response = await this.llmService.generatePersonaResponse(
        persona,
        personaContext.conversationHistory,
        userMessage
      );

      return {
        personaId,
        personaName: persona.name,
        personaRole: persona.role,
        content: response,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error generating persona response:', { personaId, error });

      // Return fallback response
      return {
        personaId,
        personaName: this.personaManager.getPersonaName(personaId),
        personaRole: this.personaManager.getPersonaRole(personaId),
        content:
          "I apologize, but I'm having trouble processing your message right now. Please try again.",
        timestamp: Date.now(),
      };
    }
  }

  private startCleanupProcess(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(
      () => {
        // const now = Date.now();
        const expiredSessions: string[] = [];

        for (const [sessionId, session] of this.sessions.entries()) {
          if (isSessionExpired(session.lastActivity)) {
            session.status = SessionStatus.EXPIRED;
            expiredSessions.push(sessionId);
          }
        }

        // Remove expired sessions
        for (const sessionId of expiredSessions) {
          this.sessions.delete(sessionId);
          logger.info('Expired session cleaned up', { sessionId });
        }

        if (expiredSessions.length > 0) {
          logger.info('Session cleanup completed', {
            expiredCount: expiredSessions.length,
            activeCount: this.sessions.size,
          });
        }
      },
      5 * 60 * 1000
    ); // 5 minutes
  }
}
