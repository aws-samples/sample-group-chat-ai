// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import {
  Persona,
  ConversationMessage,
  
  MessageSender,
  LLMConfig,
  ServiceException,
  withTimeout,
  ConversationTopic,
  ImageAttachment,
} from '@group-chat-ai/shared';
import { createLogger } from '../config/logger';
import { ModelConfig } from '../config/ModelConfig';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import axios from 'axios';

const logger = createLogger();

export class LLMService {
  private config: LLMConfig;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private bedrockClient?: BedrockRuntimeClient;
  private configLoaded: Promise<void>;
  private modelConfig: ModelConfig;

  constructor() {
    this.modelConfig = ModelConfig.getInstance();

    // Initialize with defaults first - models will be loaded from ModelConfig
    this.config = {
      provider: 'bedrock',
      model: '', // Will be loaded from ModelConfig
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
      timeout: parseInt(process.env.LLM_TIMEOUT || '10000'),
      routingModel: '', // Will be loaded from ModelConfig
      routingProvider: 'bedrock',
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    };

    // Load configuration from ModelConfig and Parameter Store asynchronously
    this.configLoaded = this.loadConfigFromModelConfig();

    // Initialize clients based on provider (will be updated after config loads)
    this.initializeClients();

    logger.info('LLM Service initialized', {
      provider: this.config.provider,
      model: this.config.model,
      routingModel: this.config.routingModel,
    });
  }

  /**
   * Load configuration from ModelConfig (centralized)
   */
  private async loadConfigFromModelConfig(): Promise<void> {
    try {
      // Get model configuration from centralized ModelConfig
      const modelDefaults = await this.modelConfig.getFullConfig();

      // Update config with models from ModelConfig
      this.config.model = modelDefaults.personaModel;
      this.config.routingModel = modelDefaults.routingModel;
      this.config.provider = modelDefaults.personaProvider as 'bedrock' | 'openai' | 'anthropic' | 'ollama';
      this.config.routingProvider = modelDefaults.routingProvider as 'bedrock' | 'openai' | 'anthropic' | 'ollama';

      logger.info('LLM configuration loaded from ModelConfig', {
        provider: this.config.provider,
        model: this.config.model,
        routingProvider: this.config.routingProvider,
        routingModel: this.config.routingModel,
      });

      // Re-initialize clients with updated configuration
      this.initializeClients();

    } catch (error) {
      logger.error('Failed to load configuration from ModelConfig, using basic defaults', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Ensure configuration is loaded before proceeding
   */
  private async ensureConfigLoaded(): Promise<void> {
    await this.configLoaded;
  }

  private initializeClients(): void {
    try {
      // Initialize the primary LLM client
      switch (this.config.provider) {
        case 'openai':
          if (!process.env.OPENAI_API_KEY) {
            logger.warn('OpenAI API key not found, will use mock responses');
            break;
          }
          this.openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
          break;

        case 'anthropic':
          if (!process.env.ANTHROPIC_API_KEY) {
            logger.warn('Anthropic API key not found, will use mock responses');
            break;
          }
          this.anthropicClient = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });
          break;

        case 'bedrock':
          this.bedrockClient = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || 'us-west-2',
            credentials: process.env.AWS_ACCESS_KEY_ID
              ? {
                  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
                }
              : undefined, // Use default credential chain if not provided
          });
          break;

        case 'ollama':
          // Ollama doesn't require client initialization, just validate the base URL
          if (!this.config.ollamaBaseUrl) {
            logger.warn('Ollama base URL not specified, defaulting to http://localhost:11434');
            this.config.ollamaBaseUrl = 'http://localhost:11434';
          }

          logger.info('Ollama provider initialized', { baseUrl: this.config.ollamaBaseUrl });
          break;

        default:
          logger.warn(`Unknown LLM provider: ${this.config.provider}, will use mock responses`);
      }

      // Always initialize Bedrock client if routing provider is bedrock, regardless of primary provider
      if (this.config.routingProvider === 'bedrock' && !this.bedrockClient) {
        this.bedrockClient = new BedrockRuntimeClient({
          region: process.env.AWS_REGION || 'us-west-2',
          credentials: process.env.AWS_ACCESS_KEY_ID
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
              }
            : undefined, // Use default credential chain if not provided
        });
        logger.info('Bedrock client initialized for routing');
      }
    } catch (error) {
      logger.error('Error initializing LLM clients:', error);
      logger.warn('Falling back to mock responses');
    }
  }

  async generatePersonaResponse(
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
    conversationLanguage?: string
  ): Promise<string> {
    try {
      // Ensure configuration is loaded from Parameter Store
      await this.ensureConfigLoaded();
      // Build persona mapping for context generation (includes current persona)
      const personaMapping = new Map<string, string>();
      personaMapping.set(persona.personaId, persona.name);

      if (otherActivePersonas) {
        otherActivePersonas.forEach(p => {
          personaMapping.set(p.personaId, p.name);
        });
      }

      // Build context from conversation history with persona names (not IDs)
      const context = this.buildConversationContext(conversationHistory, personaMapping);

      // Create persona-specific prompt with persona awareness and image context
      const prompt = this.buildPersonaPrompt(
        persona,
        context,
        userMessage,
        conversationTopic,
        otherActivePersonas,
        imageAttachment,
        conversationLanguage
      );

      // Generate response with timeout (use vision-capable call if image present)
      const response = await withTimeout(
        imageAttachment ? this.callLLMWithVision(prompt, imageAttachment) : this.callLLM(prompt),
        this.config.timeout
      );

      logger.info('Persona response generated', {
        personaId: persona.personaId,
        responseLength: response.length,
        otherPersonasCount: otherActivePersonas?.length || 0,
      });

      return response;
    } catch (error) {
      logger.error('Error generating persona response:', {
        personaId: persona.personaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ServiceException('Failed to generate persona response', error as Error);
    }
  }

  async generateSummary(conversationHistory: ConversationMessage[]): Promise<{
    summary: string;
    keyInsights: string[];
    recommendations: string[];
  }> {
    try {
      const context = this.buildConversationContext(conversationHistory);

      const prompt = `
You are an expert presentation coach analyzing a group chats. The user group Chatted their AI that conversed with the user.

Analyze the following conversation from a presentation coaching perspective:

${context}

Provide a focused analysis that helps the presenter understand how their convsertation went and what to improve. Format your response as JSON with the following structure:

{
  "summary": "Brief meeting context (1-2 sentences about who was present and the conversation type), then focus primarily on how the presentation went overall. What was the presenter's main message? How did the executives respond? What was the overall reception and engagement level?",
  "keyInsights": [
    "What aspects of the presentation resonated well with the personas",
    "What concerns or objections were raised by the personas", 
    "Which personas were most/least engaged and why",
    "Key themes in the feedback (technical feasibility, financial concerns, strategic alignment, etc.)",
    "Presenter's strongest and weakest moments during the conversation"
  ],
  "recommendations": [
    "Specific, actionable improvements the presenter should make",
    "Areas to strengthen before the next presentation",
    "Follow-up information or data they should prepare",
    "Presentation delivery or structure improvements",
    "How to better address the concerns that were raised"
  ]
}

Focus on presentation performance analysis rather than just summarizing what was discussed. Help the presenter understand what worked, what didn't, and how to improve for their next conversation.
`;

      const response = await withTimeout(
        this.callLLM(prompt),
        this.config.timeout * 2 // Double timeout for summary generation
      );

      // Parse JSON response - handle both raw JSON and markdown-wrapped JSON
      let cleanedResponse = response.trim();

      // Remove markdown code block formatting if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse
          .replace(/^```json\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse
          .replace(/^```\s*/, '')
          .replace(/\s*```$/, '')
          .trim();
      }

      const parsed = JSON.parse(cleanedResponse);

      logger.info('Session summary generated', {
        summaryLength: parsed.summary?.length,
        insightCount: parsed.keyInsights?.length,
        recommendationCount: parsed.recommendations?.length,
      });

      return {
        summary: parsed.summary || 'Summary generation failed',
        keyInsights: parsed.keyInsights || [],
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      logger.error('Error generating session summary:', error);

      // Return fallback summary
      return {
        summary:
          'This conversation covered various aspects of your group converstion multiple personas.',
        keyInsights: [
          'Multiple stakeholder perspectives were represented',
          'Various concerns and questions were raised',
          'The discussion covered strategic, technical, and financial aspects',
        ],
        recommendations: [
          'Review the feedback from each persona',
          'Address the specific concerns raised',
          'Refine your conversation based on the insights provided',
        ],
      };
    }
  }

  private buildConversationContext(
    conversationHistory: ConversationMessage[],
    personaMapping?: Map<string, string>
  ): string {
    if (conversationHistory.length === 0) {
      return 'No previous conversation.';
    }

    // Group messages to separate historical conversation from current turn
    const messages = conversationHistory.map(msg => {
      let senderName = 'Unknown';

      if (msg.sender === MessageSender.USER) {
        senderName = 'User';
      } else if (msg.personaId) {
        // Use persona name if mapping is provided, otherwise use formatted persona ID
        if (personaMapping && personaMapping.has(msg.personaId)) {
          senderName = personaMapping.get(msg.personaId)!;
        } else {
          senderName = msg.personaId.charAt(0).toUpperCase() + msg.personaId.slice(1);
        }
      }

      return {
        sender: senderName,
        content: msg.content,
        timestamp: msg.timestamp,
        isUser: msg.sender === MessageSender.USER,
      };
    });

    // Find the most recent user message to identify current turn vs historical
    let currentTurnStartIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isUser) {
        currentTurnStartIndex = i;
        break;
      }
    }

    let contextStr = '';

    // Add historical conversation (everything before the current user message)
    if (currentTurnStartIndex > 0) {
      contextStr += '=== PREVIOUS CONVERSATION HISTORY ===\n';
      const historicalMessages = messages.slice(0, currentTurnStartIndex);
      historicalMessages.forEach(msg => {
        contextStr += `${msg.sender}: ${msg.content}\n\n`;
      });
      contextStr += '\n';
    }

    // Add current turn information
    if (currentTurnStartIndex >= 0) {
      const currentUserMessage = messages[currentTurnStartIndex];
      contextStr += `=== CURRENT USER REQUEST ===\n`;
      contextStr += `${currentUserMessage.sender}: "${currentUserMessage.content}"\n\n`;

      // Add responses so far in this turn (if any)
      const currentTurnResponses = messages.slice(currentTurnStartIndex + 1);
      if (currentTurnResponses.length > 0) {
        contextStr += `=== RESPONSES SO FAR IN THIS TURN ===\n`;
        currentTurnResponses.forEach(msg => {
          contextStr += `- ${msg.sender}: "${msg.content}"\n`;
        });
        contextStr += '\n';
      }
    }

    return contextStr.trim();
  }

  private buildPersonaPrompt(
    persona: Persona,
    context: string,
    userMessage: string,
    conversationTopic?: ConversationTopic,
    otherActivePersonas?: Array<{
      personaId: string;
      name: string;
      role: string;
      description: string;
    }>,
    imageAttachment?: ImageAttachment,
    conversationLanguage?: string
  ): string {

    // Format the scenario if provided
    const conversationTopicStr = conversationTopic ? this.formatConversationTopic(conversationTopic) : '';

    // Build meeting participants section for persona awareness
    const meetingParticipantsStr = this.buildMeetingParticipantsSection(
      persona,
      otherActivePersonas
    );

    // Build image context section if image is present
    const imageContextStr = imageAttachment ? this.buildImageContextSection(imageAttachment) : '';

    // Build language instruction
    const languageInstruction = conversationLanguage && conversationLanguage !== 'en' 
      ? `LANGUAGE REQUIREMENT: You MUST respond in ${this.getLanguageName(conversationLanguage)} language. All of your response should be written in ${this.getLanguageName(conversationLanguage)}, not English.

` 
      : '';

    return `
${persona.promptTemplate}


${languageInstruction}${meetingParticipantsStr}

${
  conversationTopicStr
    ? `Conversation Topic:
${conversationTopicStr}

`
    : ''
}${imageContextStr}CONVERSATION HISTORY:
${context}

LATEST MESSAGE: "${userMessage}"

Please respond as ${persona.name} (${persona.role}) with a thoughtful, realistic response that:
1. Reflects the perspective and priorities described in your profile above
2. Asks relevant follow-up questions if appropriate
3. Provides constructive feedback or concerns
4. Keeps the response concise (2-3 sentences maximum)
5. Be aware of who else is present in this meeting and can reference them appropriately
${conversationTopicStr ? '6. Consider the specific conversation topic context provided above' : ''}${imageAttachment ? '7. Analyze and comment on any image provided - this could be a slide, document, or visual aid' : ''}${conversationLanguage && conversationLanguage !== 'en' ? `8. CRITICAL: Respond entirely in ${this.getLanguageName(conversationLanguage)} language` : ''}

IMPORTANT: If you see "RESPONSES SO FAR IN THIS TURN" above, these are responses from other meeting participants to the SAME user request. You should acknowledge and build upon these responses where appropriate, rather than waiting for others to respond.

Your response:`;
  }

  private formatConversationTopic(conversationTopic: ConversationTopic): string {
    if (!conversationTopic) {return '';}

    return `CONVERSATION TOPIC: "${conversationTopic.title || 'Not specified'}"

${conversationTopic.description || 'No topic details provided'}`;
  }

  private getLanguageName(languageCode: string): string {
    const languageNames: Record<string, string> = {
      'es': 'Spanish',
      'fr': 'French', 
      'de': 'German',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'pt': 'Portuguese',
      'it': 'Italian',
      'ru': 'Russian',
      'ko': 'Korean',
      'ar': 'Arabic',
      'sv': 'Swedish',
    };
    return languageNames[languageCode] || 'English';
  }

  private buildMeetingParticipantsSection(
    currentPersona: Persona,
    otherActivePersonas?: Array<{
      personaId: string;
      name: string;
      role: string;
      description: string;
    }>
  ): string {
    if (!otherActivePersonas || otherActivePersonas.length === 0) {
      return 'MEETING CONTEXT:\nYou are participating in this presentation review session.';
    }

    // Filter out the current persona from the list
    const otherParticipants = otherActivePersonas.filter(
      p => p.personaId !== currentPersona.personaId
    );

    if (otherParticipants.length === 0) {
      return 'MEETING CONTEXT:\nYou are participating in this presentation review session.';
    }

    let participantsSection =
      'MEETING PARTICIPANTS:\nYou are in a meeting room with the following other executives:\n';

    otherParticipants.forEach(participant => {
      // Use full description for persona awareness (especially important for custom personas)
      participantsSection += `- ${participant.name} (${participant.role}): ${participant.description}\n`;
    });

    participantsSection +=
      '\nYou should be aware of who else is present and can reference them appropriately in your responses.';

    return participantsSection;
  }

  private buildImageContextSection(imageAttachment: ImageAttachment): string {
    if (!imageAttachment) {return '';}

    return `
IMAGE CONTEXT:
The presenter has shared an image: "${imageAttachment.fileName}"
This image is part of their presentation and may contain:
- Slides with key points or data
- Charts, graphs, or visualizations
- Documents or reference materials
- Diagrams or architectural drawings
- Screenshots or examples

Please analyze this image in the context of your role and provide relevant feedback.

`;
  }


  private async callLLM(prompt: string): Promise<string> {
    // Use mock responses in development or when clients aren't initialized
    // if (process.env.NODE_ENV === 'development' || !this.hasValidClient()) {
    //   return this.generateMockResponse(prompt);
    // }

    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAI(prompt);
      case 'anthropic':
        return this.callAnthropic(prompt);
      case 'bedrock':
        return this.callBedrock(prompt);
      case 'ollama':
        return this.callOllama(prompt);
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }

  private async callLLMWithVision(prompt: string, imageAttachment: ImageAttachment): Promise<string> {
    // Only Bedrock Claude 4 Sonnet and OpenAI GPT-4V support vision
    switch (this.config.provider) {
      case 'openai':
        return this.callOpenAIWithVision(prompt, imageAttachment);
      case 'anthropic':
        return this.callAnthropicWithVision(prompt, imageAttachment);
      case 'bedrock':
        return this.callBedrockWithVision(prompt, imageAttachment);
      case 'ollama':
        return this.callOllamaWithVision(prompt, imageAttachment);
      default:
        // Fallback to text-only if vision not supported
        logger.warn(
          `Vision not supported for provider: ${this.config.provider}, falling back to text-only`
        );
        return this.callLLM(
          prompt +
            '\n\n[Note: An image was provided but cannot be analyzed with current configuration]'
        );
    }
  }

  private hasValidClient(): boolean {
    switch (this.config.provider) {
      case 'openai':
        return !!this.openaiClient;
      case 'anthropic':
        return !!this.anthropicClient;
      case 'bedrock':
        return !!this.bedrockClient;
      case 'ollama':
        return !!this.config.ollamaBaseUrl;
      default:
        return false;
    }
  }

  private async generateMockResponse(prompt: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Extract persona role from prompt for more realistic responses
    const roleMatch = prompt.match(/You are a (Chief \w+ Officer)/);
    const role = roleMatch ? roleMatch[1] : 'Executive';

    const mockResponses = [
      `That's an interesting approach. Can you elaborate on how this aligns with our strategic objectives and what the expected ROI timeline looks like?`,
      `I have some concerns about the implementation complexity. What are the key technical risks we should be aware of, and how do you plan to mitigate them?`,
      `The financial projections seem optimistic. Can you walk me through the underlying assumptions and provide a sensitivity analysis?`,
      `How does this proposal differentiate us from competitors, and what's our go-to-market strategy?`,
      `I'm curious about the scalability aspects. How will this solution perform as we grow, and what are the infrastructure requirements?`,
      `What are the compliance and security implications of this approach, particularly regarding data privacy and regulatory requirements?`,
      `The user experience seems central to success here. How have you validated these assumptions with actual users or customers?`,
      `Can you provide more details on the resource requirements and timeline for implementation?`,
    ];

    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    logger.info('Generated mock LLM response', {
      role,
      responseLength: response.length,
    });

    return response;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response received from OpenAI');
      }

      logger.info('OpenAI response generated', {
        model: this.config.model,
        tokensUsed: completion.usage?.total_tokens,
        responseLength: response.length,
      });

      return response.trim();
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new ServiceException('OpenAI API call failed', error as Error);
    }
  }

  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const completion = await this.anthropicClient.completions.create({
        model: this.config.model || 'claude-2',
        prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
        max_tokens_to_sample: this.config.maxTokens,
        temperature: this.config.temperature,
        stop_sequences: ['\n\nHuman:'],
      });

      const response = completion.completion;
      if (!response) {
        throw new Error('No response received from Anthropic');
      }

      logger.info('Anthropic response generated', {
        model: this.config.model,
        responseLength: response.length,
      });

      return response.trim();
    } catch (error) {
      logger.error('Anthropic API error:', error);
      throw new ServiceException('Anthropic API call failed', error as Error);
    }
  }

  private async callBedrock(prompt: string): Promise<string> {
    if (!this.bedrockClient) {
      throw new Error('Bedrock client not initialized');
    }

    try {
      // Use Claude 4 Sonnet as specified in requirements
      const modelId = this.config.model;

      const command = new ConverseCommand({
        modelId,
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt,
              },
            ],
          },
        ],
        inferenceConfig: {
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        },
      });

      logger.info('Sending Bedrock request', {
        modelId,
        region: this.bedrockClient.config.region,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        promptLength: prompt.length,
      });

      const response = await this.bedrockClient.send(command);

      logger.info('Bedrock raw response structure', {
        modelId,
        hasOutput: !!response.output,
        hasMessage: !!response.output?.message,
        hasContent: !!response.output?.message?.content,
        contentLength: response.output?.message?.content?.length || 0,
        stopReason: response.stopReason,
        usage: response.usage,
      });

      if (!response.output) {
        logger.error('Bedrock response missing output field', {
          modelId,
          fullResponse: JSON.stringify(response, null, 2),
        });
        throw new Error('No output received from Bedrock Converse API');
      }

      // Handle both simple text responses and reasoning model responses
      let content: string | undefined;
      const messageContent = response.output.message?.content;

      if (!messageContent || !Array.isArray(messageContent)) {
        logger.error('Bedrock response missing content array', {
          modelId,
          hasMessage: !!response.output.message,
          hasContent: !!messageContent,
          contentType: typeof messageContent,
          fullOutput: JSON.stringify(response.output, null, 2),
        });
        throw new Error('No content array in Bedrock response');
      }

      // Extract content from the response, prioritizing text over reasoning
      for (const item of messageContent) {
        // First priority: direct text content
        if (item.text && typeof item.text === 'string') {
          content = item.text;
          break; // Use the first text content found
        }
        // Second priority: reasoning content (fallback)
        if (!content && item.reasoningContent?.reasoningText?.text) {
          content = item.reasoningContent.reasoningText.text;
          logger.debug('Using reasoning content as fallback', {
            modelId,
            reasoningLength: content.length,
          });
        }
      }

      if (!content) {
        logger.error('Bedrock response missing text content', {
          modelId,
          hasMessage: !!response.output.message,
          hasContent: !!messageContent,
          contentArray: messageContent,
          fullOutput: JSON.stringify(response.output, null, 2),
        });
        throw new Error('No text content found in Bedrock response');
      }

      logger.info('Bedrock response generated successfully', {
        modelId,
        tokensUsed: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
        responseLength: content.length,
      });

      return content.trim();
    } catch (error) {
      // Enhanced error logging with full AWS SDK error details
      logger.error('Bedrock API error - Full diagnostic information', {
        modelId: this.config.model,
        region: this.bedrockClient?.config?.region,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorName: (error as any).name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorCode: (error as any).Code || (error as any).code,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorMessage: (error as any).message,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        errorType: (error as any).__type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        httpStatusCode: (error as any).$metadata?.httpStatusCode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requestId: (error as any).$metadata?.requestId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attempts: (error as any).$metadata?.attempts,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        totalRetryDelay: (error as any).$metadata?.totalRetryDelay,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw new ServiceException('Bedrock API call failed', error as Error);
    }
  }

  private async callBedrockWithVision(prompt: string, imageAttachment: ImageAttachment): Promise<string> {
    if (!this.bedrockClient) {
      throw new Error('Bedrock client not initialized');
    }

    try {
      // Use Claude 4 Sonnet which supports vision
      const modelId = this.config.model;

      // Prepare content with both text and image
      const content = [
        {
          text: prompt,
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any[];

      // Add image if base64 data is available
      if (imageAttachment.base64Data && typeof imageAttachment.base64Data === 'string') {
        content.push({
          image: {
            format: this.getImageFormat(imageAttachment.fileType),
            source: {
              bytes: imageAttachment.base64Data,
            },
          },
        });
      }

      const command = new ConverseCommand({
        modelId,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
        inferenceConfig: {
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature,
        },
      });

      const response = await this.bedrockClient.send(command);

      if (!response.output) {
        throw new Error('No output received from Bedrock Converse API');
      }

      const responseContent = response.output.message?.content?.[0]?.text;

      if (!responseContent) {
        throw new Error('No content in Bedrock response');
      }

      logger.info('Bedrock vision response generated', {
        modelId,
        tokensUsed: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
        responseLength: responseContent.length,
        imageFileName: imageAttachment.fileName,
      });

      return responseContent.trim();
    } catch (error) {
      logger.error('Bedrock vision API error:', error);
      // Fallback to text-only if vision fails
      logger.warn('Falling back to text-only response due to vision error');
      return this.callBedrock(
        prompt +
          '\n\n[Note: An image was provided but could not be analyzed due to technical issues]'
      );
    }
  }

  private async callOpenAIWithVision(prompt: string, imageAttachment: ImageAttachment): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ];

      // Add image if base64 data is available
      if (imageAttachment.base64Data) {
        messages[0].content.push({
          type: 'image_url',
          image_url: {
            url: `data:${imageAttachment.fileType};base64,${imageAttachment.base64Data}`,
          },
        });
      }

      const completion = await this.openaiClient.chat.completions.create({
        model: 'gpt-4-vision-preview', // Use vision-capable model
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response received from OpenAI Vision');
      }

      logger.info('OpenAI vision response generated', {
        model: 'gpt-4-vision-preview',
        tokensUsed: completion.usage?.total_tokens,
        responseLength: response.length,
        imageFileName: imageAttachment.fileName,
      });

      return response.trim();
    } catch (error) {
      logger.error('OpenAI Vision API error:', error);
      // Fallback to text-only if vision fails
      logger.warn('Falling back to text-only response due to vision error');
      return this.callOpenAI(
        prompt +
          '\n\n[Note: An image was provided but could not be analyzed due to technical issues]'
      );
    }
  }

  private async callAnthropicWithVision(prompt: string, _imageAttachment: ImageAttachment): Promise<string> {
    // Anthropic Claude via direct API doesn't support vision in the same way
    // Fall back to text-only for now
    logger.warn('Anthropic direct API vision not implemented, falling back to text-only');
    return this.callAnthropic(
      prompt +
        '\n\n[Note: An image was provided but cannot be analyzed with current Anthropic configuration]'
    );
  }

  private getImageFormat(mimeType: string): string {
    switch (mimeType.toLowerCase()) {
      case 'image/jpeg':
      case 'image/jpg':
        return 'jpeg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpeg'; // Default fallback
    }
  }

  /**
   * Generate a routing decision using the routing model
   */
  async generateRoutingDecision(prompt: string): Promise<string> {
    try {
      // Ensure configuration is loaded from Parameter Store
      await this.ensureConfigLoaded();
      // Use the routing model configuration
      const routingTemp = parseFloat(process.env.ROUTING_TEMPERATURE || '0.3');
      const routingTokens = parseInt(process.env.ROUTING_MAX_TOKENS || '300');
      const routingTimeout = parseInt(process.env.ROUTING_TIMEOUT || '8000');

      // Call appropriate provider with routing-specific configuration
      const response = await withTimeout(
        this.callRoutingModel(prompt, routingTemp, routingTokens),
        routingTimeout
      );

      logger.info('Routing decision generated', {
        model: this.config.routingModel,
        provider: this.config.routingProvider,
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      logger.error('Error generating routing decision:', error);
      throw new ServiceException('Failed to generate routing decision', error as Error);
    }
  }

  /**
   * Call routing model based on configured provider
   */
  private async callRoutingModel(
    prompt: string,
    temperature: number = 0.3,
    maxTokens: number = 300
  ): Promise<string> {
    // Determine the routing provider to use
    const provider = this.config.routingProvider || 'bedrock';

    // Call the appropriate provider based on routing configuration
    if ((provider as string) === 'openai') {
      // Use OpenAI for routing
      if (!this.openaiClient) {
        throw new Error('OpenAI client not initialized for routing');
      }

      try {
        // Make sure we have a valid model for OpenAI
        const openaiModel = this.config.routingModel || 'gpt-3.5-turbo';

        const completion = await this.openaiClient.chat.completions.create({
          model: openaiModel as string, // Type assertion for model string
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: temperature,
          max_tokens: maxTokens,
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error('No response received from OpenAI routing');
        }

        return response.trim();
      } catch (error) {
        logger.error('OpenAI routing error:', error);
        throw new ServiceException('OpenAI routing call failed', error as Error);
      }
    } else if ((provider as string) === 'anthropic') {
      // Use Anthropic for routing
      if (!this.anthropicClient) {
        throw new Error('Anthropic client not initialized for routing');
      }

      try {
        // Make sure we have a valid model for Anthropic
        const anthropicModel = this.config.routingModel || 'claude-2';

        const completion = await this.anthropicClient.completions.create({
          model: anthropicModel as string, // Type assertion for model string
          prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
          max_tokens_to_sample: maxTokens,
          temperature: temperature,
          stop_sequences: ['\n\nHuman:'],
        });

        const response = completion.completion;
        if (!response) {
          throw new Error('No response received from Anthropic routing');
        }

        return response.trim();
      } catch (error) {
        logger.error('Anthropic routing error:', error);
        throw new ServiceException('Anthropic routing call failed', error as Error);
      }
    } else if ((provider as string) === 'ollama') {
      // Use Ollama for routing
      if (!this.config.ollamaBaseUrl) {
        throw new Error('Ollama base URL not configured for routing');
      }

      try {
        const url = `${this.config.ollamaBaseUrl}/api/generate`;

        // Make sure we have a valid model for Ollama
        const ollamaModel = this.config.routingModel || 'gemma:2b';

        const response = await axios.post(url, {
          model: ollamaModel,
          prompt: prompt,
          temperature: temperature,
          max_tokens: maxTokens,
          stream: false,
        });

        if (!response.data || !response.data.response) {
          throw new Error('No response content received from Ollama for routing');
        }

        const content = response.data.response;

        logger.info('Ollama routing response generated', {
          model: ollamaModel,
          responseLength: content.length,
        });

        return content.trim();
      } catch (error: unknown) {
        const err = error as { response?: { data?: unknown } };
        logger.error('Ollama routing API error:', err?.response?.data || error);
        throw new ServiceException('Ollama routing call failed', error as Error);
      }
    } else {
      // Default: Use Bedrock for routing
      if (!this.bedrockClient) {
        throw new Error('Bedrock client not initialized for routing');
      }

      try {
        const routingModelId = this.config.routingModel;
        
        const command = new ConverseCommand({
          modelId: routingModelId,
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          inferenceConfig: {
            maxTokens: maxTokens,
            temperature: temperature,
          },
        });

        logger.info('Sending Bedrock routing request', {
          modelId: routingModelId,
          region: this.bedrockClient.config.region,
          maxTokens: maxTokens,
          temperature: temperature,
          promptLength: prompt.length,
          promptPrefix: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        });

        const response = await this.bedrockClient.send(command);

        logger.info('Bedrock routing raw response structure', {
          modelId: routingModelId,
          hasOutput: !!response.output,
          hasMessage: !!response.output?.message,
          hasContent: !!response.output?.message?.content,
          contentLength: response.output?.message?.content?.length || 0,
          stopReason: response.stopReason,
          usage: response.usage,
        });

        if (!response.output?.message?.content || !Array.isArray(response.output.message.content)) {
          logger.error('Bedrock routing response missing content array', {
            modelId: routingModelId,
            hasOutput: !!response.output,
            hasMessage: !!response.output?.message,
            hasContent: !!response.output?.message?.content,
            contentType: typeof response.output?.message?.content,
            fullOutput: JSON.stringify(response.output, null, 2),
          });
          throw new Error('No content array in Bedrock routing response');
        }

        // Extract content from the response, prioritizing text over reasoning (same logic as callBedrock)
        let content: string | undefined;
        const messageContent = response.output.message.content;

        for (const item of messageContent) {
          // First priority: direct text content
          if (item.text && typeof item.text === 'string') {
            content = item.text;
            break; // Use the first text content found
          }
          // Second priority: reasoning content (fallback)
          if (!content && item.reasoningContent?.reasoningText?.text) {
            content = item.reasoningContent.reasoningText.text;
            logger.debug('Using reasoning content as fallback in routing', {
              modelId: routingModelId,
              reasoningLength: content.length,
            });
          }
        }

        if (!content) {
          logger.error('Bedrock routing response missing text content', {
            modelId: routingModelId,
            hasMessage: !!response.output?.message,
            hasContent: !!messageContent,
            contentArray: messageContent,
            fullOutput: JSON.stringify(response.output, null, 2),
          });
          throw new Error('No text content found in Bedrock routing response');
        }

        logger.info('Bedrock routing response generated successfully', {
          modelId: routingModelId,
          tokensUsed: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
          responseLength: content.length,
        });

        return content.trim();
      } catch (error) {
        // Enhanced routing error logging with full AWS SDK error details
        logger.error('Bedrock routing API error - Full diagnostic information', {
          modelId: this.config.routingModel,
          region: this.bedrockClient?.config?.region,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          errorName: (error as any).name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          errorCode: (error as any).Code || (error as any).code,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          errorMessage: (error as any).message,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          errorType: (error as any).__type,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          httpStatusCode: (error as any).$metadata?.httpStatusCode,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          requestId: (error as any).$metadata?.requestId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          attempts: (error as any).$metadata?.attempts,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          totalRetryDelay: (error as any).$metadata?.totalRetryDelay,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        });
        throw new ServiceException('Bedrock routing call failed', error as Error);
      }
    }
  }

  /**
   * Health check for routing model
   */
  async routingHealthCheck(): Promise<boolean> {
    try {
      const testPrompt = 'Respond with "OK" if you are functioning correctly.';
      const response = await this.generateRoutingDecision(testPrompt);
      return response.toLowerCase().includes('ok');
    } catch (error) {
      logger.error('Routing model health check failed:', error);
      return false;
    }
  }

  /**
   * Update the routing model configuration
   */
  updateRoutingConfig(config: {
    model?: string;
    provider?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }): void {
    if (config.model) {this.config.routingModel = config.model;}
    if (config.provider && config.provider === 'bedrock') {this.config.routingProvider = 'bedrock';}

    logger.info('Routing configuration updated', {
      routingModel: this.config.routingModel,
      routingProvider: this.config.routingProvider,
    });
  }

  private async callOllama(prompt: string): Promise<string> {
    if (!this.config.ollamaBaseUrl) {
      throw new Error('Ollama base URL not configured');
    }

    try {
      const url = `${this.config.ollamaBaseUrl}/api/generate`;

      const response = await axios.post(url, {
        model: this.config.model,
        prompt: prompt,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false,
      });

      if (!response.data || !response.data.response) {
        throw new Error('No response content received from Ollama');
      }

      const content = response.data.response;

      logger.info('Ollama response generated', {
        model: this.config.model,
        responseLength: content.length,
      });

      return content.trim();
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } };
      logger.error('Ollama API error:', err?.response?.data || error);
      throw new ServiceException('Ollama API call failed', error as Error);
    }
  }

  private async callOllamaWithVision(prompt: string, imageAttachment: ImageAttachment): Promise<string> {
    if (!this.config.ollamaBaseUrl) {
      throw new Error('Ollama base URL not configured');
    }

    try {
      const url = `${this.config.ollamaBaseUrl}/api/generate`;

      // Check if the model has vision capabilities
      // Model names like 'llava', 'llava-13b', 'bakllava' typically support vision
      const hasVisionCapabilities =
        this.config.model.toLowerCase().includes('llava') ||
        this.config.model.toLowerCase().includes('bakllava') ||
        this.config.model.toLowerCase().includes('vision');

      if (!hasVisionCapabilities) {
        logger.warn(
          `Ollama model ${this.config.model} may not support vision capabilities, attempting anyway`
        );
      }

      // Format image for Ollama which expects base64-encoded images
      let messages = [];

      if (imageAttachment.base64Data) {
        // Create multimodal messages format
        messages = [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image',
                image: imageAttachment.base64Data,
              },
            ],
          },
        ];
      } else {
        logger.warn('No image data available for vision processing');
        return this.callOllama(
          prompt + '\n\n[Note: An image was referenced but no image data was available]'
        );
      }

      const response = await axios.post(url, {
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: false,
      });

      if (!response.data || !response.data.response) {
        throw new Error('No response content received from Ollama');
      }

      const content = response.data.response;

      logger.info('Ollama vision response generated', {
        model: this.config.model,
        responseLength: content.length,
        imageFileName: imageAttachment.fileName,
      });

      return content.trim();
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } };
      logger.error('Ollama vision API error:', err?.response?.data || error);

      // Fallback to text-only if vision fails
      logger.warn('Falling back to text-only response due to vision error');
      return this.callOllama(
        prompt +
          '\n\n[Note: An image was provided but could not be analyzed due to technical issues]'
      );
    }
  }

  /**
   * Generate a simple response for utility purposes (like title generation)
   */
  async generateSimpleResponse(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    try {
      const config = {
        ...this.config,
        maxTokens: options.maxTokens || 50,
        temperature: options.temperature || 0.3,
      };

      switch (config.provider) {
        case 'bedrock':
          return this.callBedrockSimple(prompt, config);
        case 'openai':
          return this.callOpenAISimple(prompt, config);
        case 'anthropic':
          return this.callAnthropicSimple(prompt, config);
        case 'ollama':
          return this.callOllamaSimple(prompt, config);
        default:
          throw new ServiceException(`Unsupported LLM provider: ${config.provider}`);
      }
    } catch (error) {
      logger.error('Error generating simple response:', error);
      throw new ServiceException('Failed to generate response', error as Error);
    }
  }

  private async callBedrockSimple(
    prompt: string, 
    config: { model: string; temperature: number; maxTokens: number }
  ): Promise<string> {
    const command = new ConverseCommand({
      modelId: config.model,
      messages: [{
        role: 'user',
        content: [{ text: prompt }],
      }],
      inferenceConfig: {
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
    });

    const response = await this.bedrockClient!.send(command);
    const content = response.output?.message?.content?.[0]?.text;
    
    if (!content) {
      throw new Error('No response content received from Bedrock');
    }

    return content.trim();
  }

  private async callOpenAISimple(
    prompt: string, 
    config: { model: string; temperature: number; maxTokens: number }
  ): Promise<string> {
    const response = await this.openaiClient!.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content received from OpenAI');
    }

    return content.trim();
  }

  private async callAnthropicSimple(
    prompt: string, 
    config: { model: string; temperature: number; maxTokens: number }
  ): Promise<string> {
    const completion = await this.anthropicClient!.completions.create({
      model: config.model,
      prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
      temperature: config.temperature,
      max_tokens_to_sample: config.maxTokens,
      stop_sequences: ['\n\nHuman:'],
    });

    if (!completion.completion) {
      throw new Error('No response content received from Anthropic');
    }

    return completion.completion.trim();
  }

  private async callOllamaSimple(
    prompt: string, 
    config: { model: string; temperature: number; maxTokens: number; ollamaBaseUrl?: string }
  ): Promise<string> {
    const response = await axios.post(`${config.ollamaBaseUrl || 'http://localhost:11434'}/api/generate`, {
      model: config.model,
      prompt,
      stream: false,
      options: {
        temperature: config.temperature,
        num_predict: config.maxTokens,
      },
    });

    if (!response.data || !response.data.response) {
      throw new Error('No response content received from Ollama');
    }

    return response.data.response.trim();
  }
}
