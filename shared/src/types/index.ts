// Core domain types for Group Chat AI

export interface Session {
  sessionId: string;
  userId?: string; // User who owns this session
  title?: string; // Auto-generated title from conversation
  conversationTopic?: ConversationTopic;
  activePersonas: string[];
  conversationHistory: ConversationMessage[];
  personaContexts: Record<string, PersonaContext>;
  createdAt: number;
  lastActivity: number;
  status: SessionStatus;
  documentLinks?: DocumentLink[];
  businessContext?: BusinessContext;
  conversationFlow: ConversationFlow;
  customPersonas?: Record<string, CustomPersonaData>;
  voiceSettings?: VoiceSettings;
  conversationLanguage?: string; // Language for AI responses and voice synthesis
  isResumable?: boolean; // Whether session can be resumed
  totalMessages?: number; // Count of user + persona messages
  fileContexts?: Record<string, FileContext>; // fileId -> FileContext
  personaFileAssociations?: Record<string, string[]>; // personaId -> fileIds
  globalFileIds?: string[]; // Files available to all personas
}

export interface BusinessContext {
  industry: string;
  companySize: CompanySize;
  companyStage: CompanyStage;
  keyPriorities: string[];
  challenges: string[];
  stakeholders: StakeholderInfo[];
  budgetRange?: BudgetRange;
  timeline?: string;
  decisionMakingProcess?: string;
  additionalContext?: string;
}

export interface ConversationTopic {
  title: string;
  description: string; // Free text field for conversation topic details
}

export interface StakeholderInfo {
  role: string;
  influence: InfluenceLevel;
  priorities: string[];
  concerns: string[];
}

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise'
}

export enum CompanyStage {
  SEED = 'seed',
  EARLY = 'early',
  GROWTH = 'growth',
  MATURE = 'mature',
  ENTERPRISE = 'enterprise'
}

export enum InfluenceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  DECISION_MAKER = 'decision_maker'
}

export enum BudgetRange {
  UNDER_10K = 'under_10k',
  TEN_TO_50K = '10k_to_50k',
  FIFTY_TO_100K = '50k_to_100k',
  HUNDRED_TO_500K = '100k_to_500k',
  OVER_500K = 'over_500k'
}

export interface ConversationFlow {
  currentTurn: ConversationTurn;
  turnHistory: ConversationTurn[];
  agentDiscussionActive: boolean;
  maxAgentTurns: number;
  currentAgentTurns: number;
  lastUserMessage?: string;
  pendingAgentResponses: string[];
}

export interface ConversationTurn {
  turnId: string;
  turnType: TurnType;
  participantId: string;
  timestamp: number;
  messageId?: string;
}

export enum TurnType {
  USER_MESSAGE = 'user_message',
  AGENT_RESPONSE = 'agent_response',
  AGENT_DISCUSSION = 'agent_discussion',
  SYSTEM_MESSAGE = 'system_message'
}

export interface PersonaContext {
  personaId: string;
  conversationHistory: ConversationMessage[];
  lastResponse?: number;
}

export interface ConversationMessage {
  messageId: string;
  sessionId: string;
  sender: MessageSender;
  content: string;
  timestamp: number;
  personaId?: string;
  imageAttachment?: ImageAttachment;
}

export interface Persona {
  personaId: string;
  name: string;
  role: string;
  description: string;
  characteristics: string[];
  priorities: string[];
  communicationStyle: string;
  promptTemplate: string;
  
  // New fields for dynamic agent system
  expertiseKeywords: string[];
  responsePatterns: ResponsePattern[];
  interactionRules: InteractionRule[];
  customPromptTemplates?: string[];
  
  // Avatar support
  avatarId?: string;
  
  // Metadata for future custom personas
  createdBy?: string;
  isCustom: boolean;
  version: number;
  parentPersonaId?: string;
}

export interface ResponsePattern {
  patternId: string;
  name: string;
  template: string;
  conditions: string[];
  priority: number;
}

export interface InteractionRule {
  ruleId: string;
  name: string;
  condition: string;
  action: InteractionAction;
  priority: number;
}

export enum InteractionAction {
  REQUEST_FOLLOWUP = 'request_followup',
  SUGGEST_PERSONA = 'suggest_persona',
  END_CONVERSATION = 'end_conversation',
  CHALLENGE_POINT = 'challenge_point',
  SUPPORT_POINT = 'support_point'
}

export interface DocumentLink {
  documentId: string;
  sessionId: string;
  fileName: string;
  fileType: string;
  uploadedAt: number;
  content?: string;
}

// File context types for persona-isolated knowledge
export interface FileContext {
  fileId: string;
  sessionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: number;
  uploadedBy?: string;
  s3Key: string;
  extractedText?: string;
  chunks?: FileChunk[];
  associatedPersonas: string[]; // Empty array = global/shared
  tokenCount?: number;
  processingStatus: FileProcessingStatus;
  errorMessage?: string;
}

export interface FileChunk {
  chunkId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
}

export enum FileProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// File upload request/response types
export interface UploadFileRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  targetPersonas?: string[]; // If empty/undefined, file is shared globally
}

export interface UploadFileResponse {
  fileId: string;
  uploadUrl: string; // Presigned S3 URL
  expiresIn: number; // Seconds until URL expires
  s3Key: string;
}

export interface CompleteFileUploadRequest {
  fileId: string;
}

export interface CompleteFileUploadResponse {
  fileContext: FileContext;
  success: boolean;
  message?: string;
}

export interface UpdateFileAssociationsRequest {
  personaIds?: string[]; // undefined means keep current
  isGlobal?: boolean; // true = available to all personas
}

export interface UpdateFileAssociationsResponse {
  fileContext: FileContext;
  success: boolean;
}

export interface ListFilesResponse {
  files: FileContext[];
  total: number;
}

export interface ImageAttachment {
  imageId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: number;
  chunks?: ChunkInfo[];
  isComplete: boolean;
  base64Data?: string; // For LLM processing
  thumbnailData?: string; // For UI display
}

export interface ChunkInfo {
  chunkId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  uploadedAt: number;
}

export interface InitiateImageUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
}

export interface InitiateImageUploadResponse {
  imageId: string;
  uploadUrls?: string[]; // For direct S3 upload if implemented
  maxChunkSize: number;
}

export interface UploadImageChunkRequest {
  chunkIndex: number;
  chunkData: string; // Base64 encoded chunk
  chunkSize: number;
}

export interface UploadImageChunkResponse {
  chunkId: string;
  chunkIndex: number;
  success: boolean;
}

export interface CompleteImageUploadRequest {
  imageId: string;
}

export interface CompleteImageUploadResponse {
  imageId: string;
  imageAttachment: ImageAttachment;
  success: boolean;
}

// Enums

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  ENDED = 'ended'
}

export enum MessageSender {
  USER = 'user',
  PERSONA = 'persona'
}

// API Request/Response types
export interface CreateSessionRequest {
  selectedPersonas: string[];
  conversationTopic?: ConversationTopic;
  customPersonas?: CustomPersonaData[];
  businessContext?: BusinessContext;
  conversationLanguage?: string; // Language for AI responses and voice synthesis
  userId?: string; // User creating the session
}

export interface CustomPersonaData {
  personaId: string;
  name: string;
  role: string;
  details: string; // Free text field for all persona details
  avatarId?: string;
  isCustom: boolean;
  voiceId?: string; // Amazon Polly voice ID
}

export interface CreateSessionResponse {
  sessionId: string;
  activePersonas: PersonaInfo[];
  createdAt: number;
  userId?: string;
  title?: string;
}

export interface SendMessageRequest {
  content: string;
  directQuestionPersonaId?: string;
  imageAttachment?: ImageAttachment;
}

export interface SendMessageResponse {
  sessionId: string;
  responses: PersonaResponse[];
  timestamp: number;
}

export interface PersonaResponse {
  personaId: string;
  personaName: string;
  personaRole: string;
  content: string;
  timestamp: number;
  
  // New fields for agent system
  confidence?: number;
  suggestedFollowup?: boolean;
  suggestedPersonas?: string[];
  interactionMetadata?: InteractionMetadata;
}

export interface InteractionMetadata {
  responseType: ResponseType;
  expertiseMatch: number;
  conversationAction?: InteractionAction;
  reasoning?: string;
}

export enum ResponseType {
  DIRECT_ANSWER = 'direct_answer',
  FOLLOW_UP_QUESTION = 'follow_up_question',
  CHALLENGE = 'challenge',
  SUPPORT = 'support',
  REDIRECT = 'redirect'
}

export interface PersonaInfo {
  personaId: string;
  name: string;
  role: string;
  description: string;
}

export interface GetPersonasResponse {
  personas: PersonaInfo[];
}

export interface UpdateSessionPersonasRequest {
  activePersonas: string[];
}

export interface UpdateSessionPersonasResponse {
  sessionId: string;
  activePersonas: PersonaInfo[];
  updatedAt: number;
}

export interface ResetSessionPersonasRequest {
  // No body needed - just reset to defaults
}

export interface ResetSessionPersonasResponse {
  sessionId: string;
  message: string;
  updatedAt: number;
}

export interface SessionSummaryResponse {
  sessionId: string;
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  generatedAt: number;
}

// Error types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: number;
}

export class ValidationException extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationException';
  }
}

export class ResourceNotFoundException extends Error {
  constructor(message: string, public resourceType?: string, public resourceId?: string) {
    super(message);
    this.name = 'ResourceNotFoundException';
  }
}

export class ServiceException extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ServiceException';
  }
}

// Configuration types
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'bedrock' | 'ollama';
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  routingModel?: string; // Nova Pro for routing decisions
  routingProvider?: 'openai' | 'anthropic' | 'bedrock' | 'ollama';
  ollamaBaseUrl?: string; // Base URL for Ollama API, defaults to http://localhost:11434
}

export interface MultiModelConfig {
  routing: {
    provider: 'bedrock';
    model: string; // Nova Pro model ID
    temperature: number;
    maxTokens: number;
    timeout: number;
  };
  personas: {
    provider: 'openai' | 'anthropic' | 'bedrock';
    model: string; // Claude Sonnet 4 or other high-quality model
    temperature: number;
    maxTokens: number;
    timeout: number;
  };
}

export interface SessionConfig {
  maxConversationHistory: number;
  sessionTimeoutMinutes: number;
  maxActivePersonas: number;
  maxDocumentSize: number;
}

// Agent System Types
export interface RoutingDecision {
  selectedPersonas: string[];
  confidence: number;
  reasoning: string;
  conversationAction: ConversationAction;
}

export interface ConversationAction {
  action: ConversationActionType;
  targetPersona?: string;
  shouldContinue: boolean;
  reasoning?: string;
}

export enum ConversationActionType {
  ROUTE_TO_PERSONA = 'route_to_persona',
  MULTI_PERSONA_RESPONSE = 'multi_persona_response',
  END_CONVERSATION = 'end_conversation',
  REQUEST_CLARIFICATION = 'request_clarification'
}

export interface ContentAnalysis {
  keywords: string[];
  topics: string[];
  sentiment: number;
  complexity: number;
  expertiseAreas: ExpertiseArea[];
}

export interface ExpertiseArea {
  area: string;
  confidence: number;
  keywords: string[];
}

export interface AgentResponse {
  personaId: string;
  response: PersonaResponse;
  nextAction?: ConversationAction;
  confidence: number;
}

// WebSocket Message Types
export enum WebSocketMessageType {
  USER_MESSAGE = 'user_message',
  PERSONA_TYPING = 'persona_typing',
  PERSONA_RESPONSE = 'persona_response',
  PERSONA_AUDIO = 'persona_audio',
  AUDIO_ACKNOWLEDGMENT = 'audio_acknowledgment',
  ALL_PERSONAS_FINISHED = 'all_personas_finished',
  ERROR = 'error',
  AUDIO_ERROR = 'audio_error',
  CONNECTION_ESTABLISHED = 'connection_established'
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  sessionId: string;
  timestamp: number;
  data: any;
}

export interface UserMessageWebSocket {
  content: string;
  directQuestionPersonaId?: string;
  imageAttachment?: ImageAttachment;
}

export interface PersonaTypingMessage {
  personaId: string;
  personaName: string;
  isTyping: boolean;
}

export interface PersonaResponseWebSocket {
  personaId: string;
  personaName: string;
  personaRole: string;
  content: string;
  timestamp: number;
  messageId: string;
}

export interface AllPersonasFinishedMessage {
  totalResponses: number;
  timestamp: number;
}

export interface WebSocketErrorMessage {
  error: string;
  details?: string;
  message: string;
  timestamp: number;
}

export interface ConnectionEstablishedMessage {
  sessionId: string;
  timestamp: number;
  connectedAt: number;
}

// Voice-related interfaces
export interface VoiceSettings {
  enabled: boolean;
  personaVoices: Record<string, string>; // personaId -> voiceId
  playbackSettings: AudioPlaybackSettings;
  conversationLanguage?: string; // Override session default language
}

export interface AudioPlaybackSettings {
  autoPlay: boolean;
  volume: number; // 0.0 to 1.0
  speed: number; // 0.5 to 2.0
}

export interface PersonaAudioMessage {
  messageId: string;
  personaId: string;
  audioUrl: string;
  duration?: number; // in seconds
  voiceId: string;
}

export interface AudioErrorMessage {
  messageId: string;
  personaId: string;
  error: string;
  timestamp: number;
}

export interface AudioAcknowledgmentMessage {
  messageId: string;
  personaId: string;
  finished: boolean;
  timestamp?: number;
}

// Amazon Polly Neural Voice definitions
export interface PollyVoice {
  voiceId: string;
  name: string;
  gender: 'Male' | 'Female';
  language: string;
  languageCode: string;
  supportedEngines: string[];
  supportsNewscaster?: boolean;
}

export const POLLY_NEURAL_VOICES: PollyVoice[] = [
  // English (US)
  { voiceId: 'Danielle', name: 'Danielle', gender: 'Female', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Gregory', name: 'Gregory', gender: 'Male', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Ivy', name: 'Ivy', gender: 'Female', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Joanna', name: 'Joanna', gender: 'Female', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'], supportsNewscaster: true },
  { voiceId: 'Kendra', name: 'Kendra', gender: 'Female', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Kimberly', name: 'Kimberly', gender: 'Female', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Salli', name: 'Salli', gender: 'Female', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Joey', name: 'Joey', gender: 'Male', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Justin', name: 'Justin', gender: 'Male', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Kevin', name: 'Kevin', gender: 'Male', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Matthew', name: 'Matthew', gender: 'Male', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'], supportsNewscaster: true },
  { voiceId: 'Ruth', name: 'Ruth', gender: 'Female', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  { voiceId: 'Stephen', name: 'Stephen', gender: 'Male', language: 'English (US)', languageCode: 'en-US', supportedEngines: ['neural'] },
  
  // English (British)
  { voiceId: 'Amy', name: 'Amy', gender: 'Female', language: 'English (British)', languageCode: 'en-GB', supportedEngines: ['neural'], supportsNewscaster: true },
  { voiceId: 'Emma', name: 'Emma', gender: 'Female', language: 'English (British)', languageCode: 'en-GB', supportedEngines: ['neural'] },
  { voiceId: 'Brian', name: 'Brian', gender: 'Male', language: 'English (British)', languageCode: 'en-GB', supportedEngines: ['neural'] },
  { voiceId: 'Arthur', name: 'Arthur', gender: 'Male', language: 'English (British)', languageCode: 'en-GB', supportedEngines: ['neural'] },
  
  // Other English variants
  { voiceId: 'Olivia', name: 'Olivia', gender: 'Female', language: 'English (Australian)', languageCode: 'en-AU', supportedEngines: ['neural'] },
  { voiceId: 'Kajal', name: 'Kajal', gender: 'Female', language: 'English (Indian)', languageCode: 'en-IN', supportedEngines: ['neural'] },
  { voiceId: 'Niamh', name: 'Niamh', gender: 'Female', language: 'English (Irish)', languageCode: 'en-IE', supportedEngines: ['neural'] },
  { voiceId: 'Aria', name: 'Aria', gender: 'Female', language: 'English (New Zealand)', languageCode: 'en-NZ', supportedEngines: ['neural'] },
  { voiceId: 'Jasmine', name: 'Jasmine', gender: 'Female', language: 'English (Singaporean)', languageCode: 'en-SG', supportedEngines: ['neural'] },
  { voiceId: 'Ayanda', name: 'Ayanda', gender: 'Female', language: 'English (South African)', languageCode: 'en-ZA', supportedEngines: ['neural'] },
  
  // Spanish
  { voiceId: 'Lupe', name: 'Lupe', gender: 'Female', language: 'Spanish (US)', languageCode: 'es-US', supportedEngines: ['neural'] },
  { voiceId: 'Pedro', name: 'Pedro', gender: 'Male', language: 'Spanish (US)', languageCode: 'es-US', supportedEngines: ['neural'] },
  { voiceId: 'Lucia', name: 'Lucia', gender: 'Female', language: 'Spanish (Spain)', languageCode: 'es-ES', supportedEngines: ['neural'] },
  { voiceId: 'Sergio', name: 'Sergio', gender: 'Male', language: 'Spanish (Spain)', languageCode: 'es-ES', supportedEngines: ['neural'] },
  
  // French
  { voiceId: 'Lea', name: 'Lea', gender: 'Female', language: 'French', languageCode: 'fr-FR', supportedEngines: ['neural'] },
  { voiceId: 'Mathieu', name: 'Mathieu', gender: 'Male', language: 'French', languageCode: 'fr-FR', supportedEngines: ['neural'] },
  { voiceId: 'Gabrielle', name: 'Gabrielle', gender: 'Female', language: 'French (Canadian)', languageCode: 'fr-CA', supportedEngines: ['neural'] },
  { voiceId: 'Liam', name: 'Liam', gender: 'Male', language: 'French (Canadian)', languageCode: 'fr-CA', supportedEngines: ['neural'] },
  
  // German
  { voiceId: 'Vicki', name: 'Vicki', gender: 'Female', language: 'German', languageCode: 'de-DE', supportedEngines: ['neural'] },
  { voiceId: 'Daniel', name: 'Daniel', gender: 'Male', language: 'German', languageCode: 'de-DE', supportedEngines: ['neural'] },
  { voiceId: 'Hannah', name: 'Hannah', gender: 'Female', language: 'German (Austrian)', languageCode: 'de-AT', supportedEngines: ['neural'] },
  
  // Portuguese
  { voiceId: 'Camila', name: 'Camila', gender: 'Female', language: 'Portuguese (Brazilian)', languageCode: 'pt-BR', supportedEngines: ['neural'] },
  { voiceId: 'Thiago', name: 'Thiago', gender: 'Male', language: 'Portuguese (Brazilian)', languageCode: 'pt-BR', supportedEngines: ['neural'] },
  { voiceId: 'Ines', name: 'Ines', gender: 'Female', language: 'Portuguese (European)', languageCode: 'pt-PT', supportedEngines: ['neural'] },
  
  // Italian
  { voiceId: 'Bianca', name: 'Bianca', gender: 'Female', language: 'Italian', languageCode: 'it-IT', supportedEngines: ['neural'] },
  { voiceId: 'Adriano', name: 'Adriano', gender: 'Male', language: 'Italian', languageCode: 'it-IT', supportedEngines: ['neural'] },
  
  // Japanese
  { voiceId: 'Kazuha', name: 'Kazuha', gender: 'Female', language: 'Japanese', languageCode: 'ja-JP', supportedEngines: ['neural'] },
  { voiceId: 'Tomoko', name: 'Tomoko', gender: 'Female', language: 'Japanese', languageCode: 'ja-JP', supportedEngines: ['neural'] },
  { voiceId: 'Takumi', name: 'Takumi', gender: 'Male', language: 'Japanese', languageCode: 'ja-JP', supportedEngines: ['neural'] },
  
  // Korean
  { voiceId: 'Seoyeon', name: 'Seoyeon', gender: 'Female', language: 'Korean', languageCode: 'ko-KR', supportedEngines: ['neural'] },
  
  // Chinese
  { voiceId: 'Zhiyu', name: 'Zhiyu', gender: 'Female', language: 'Chinese (Mandarin)', languageCode: 'zh-CN', supportedEngines: ['neural'] },
  
  // Arabic
  { voiceId: 'Zayd', name: 'Zayd', gender: 'Male', language: 'Arabic', languageCode: 'ar-AE', supportedEngines: ['neural'] },
  { voiceId: 'Hala', name: 'Hala', gender: 'Female', language: 'Arabic', languageCode: 'ar-AE', supportedEngines: ['neural'] },
  
  // Russian
  { voiceId: 'Tatyana', name: 'Tatyana', gender: 'Female', language: 'Russian', languageCode: 'ru-RU', supportedEngines: ['neural'] },
  
  // Swedish
  { voiceId: 'Elin', name: 'Elin', gender: 'Female', language: 'Swedish', languageCode: 'sv-SE', supportedEngines: ['neural'] }
];

// Default voice assignments for personas
export const DEFAULT_PERSONA_VOICES: Record<string, string> = {
  // Female personas
  'persona_1': 'Joanna',    
  'persona_2': 'Kajal',     
  'persona_8': 'Amy',       
  'persona_9': 'Danielle',  
  'persona_11': 'Emma',     
  'persona_13': 'Kimberly', 
  'persona_14': 'Olivia',   
  'persona_15': 'Ruth',     
  
  // Male personas
  'persona_3': 'Matthew',   // Alexander Chen (CFO)
  'persona_4': 'Brian',     // James Whitfield (CIO) - British
  'persona_5': 'Gregory',   // Sebastian Kumar (CPO)
  'persona_6': 'Joey',      // Dominic Thorne (COO)
  'persona_7': 'Stephen',   // Marcus Rivera (CMO)
  'persona_10': 'Arthur',   // Richard Ainsworth (CRO) - British
  'persona_12': 'Brian',    // Christopher Blackburn (CLO) - British (shared with persona_4)
  'persona_16': 'Gregory'   // Blake Leets (CISO) (shared with persona_5)
};

// Executive personas that can use newscaster style
export const NEWSCASTER_STYLE_PERSONAS = ['persona_1', 'persona_3', 'persona_8']; // CEO, CFO, CHRO

// Language-to-voice mapping for conversation language support
export const VOICES_BY_LANGUAGE: Record<string, PollyVoice[]> = {
  'en': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('en-')),
  'es': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('es-')),
  'fr': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('fr-')),
  'de': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('de-')),
  'pt': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('pt-')),
  'it': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('it-')),
  'ja': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('ja-')),
  'ko': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('ko-')),
  'zh': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('zh-')),
  'ar': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('ar-')),
  'ru': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('ru-')),
  'sv': POLLY_NEURAL_VOICES.filter(v => v.languageCode.startsWith('sv-')),
};

// Language-specific persona voice mappings (fallback to English if language not supported)
export const DEFAULT_PERSONA_VOICES_BY_LANGUAGE: Record<string, Record<string, string>> = {
  'en': DEFAULT_PERSONA_VOICES,
  // Other languages will use English voices as fallback until proper voices are verified and added
};

// Supported conversation languages (matching i18n supported languages)
export const SUPPORTED_CONVERSATION_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
];

// User session management types
export interface UserSession {
  sessionId: string;
  userId: string;
  title: string;
  createdAt: number;
  lastActivity: number;
  status: SessionStatus;
  totalMessages: number;
  preview?: string; // First user message or truncated content
}

export interface GetUserSessionsRequest {
  userId: string;
  limit?: number;
  offset?: number;
  status?: SessionStatus;
}

export interface GetUserSessionsResponse {
  sessions: UserSession[];
  total: number;
  hasMore: boolean;
}

export interface ResumeSessionRequest {
  sessionId: string;
  userId: string;
}

export interface ResumeSessionResponse {
  session: Session;
  canResume: boolean;
  reason?: string;
}

// Utility types
export type PersonaId = string;
export type SessionId = string;
export type MessageId = string;
export type DocumentId = string;
export type UserId = string;
export type FileId = string;

// Type guards

export function isValidSessionStatus(value: string): value is SessionStatus {
  return Object.values(SessionStatus).includes(value as SessionStatus);
}

export function isValidMessageSender(value: string): value is MessageSender {
  return Object.values(MessageSender).includes(value as MessageSender);
}
