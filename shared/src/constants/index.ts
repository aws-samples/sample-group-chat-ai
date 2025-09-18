// Application constants for Group Chat AI

export const SESSION_CONFIG = {
  TIMEOUT_MINUTES: 30,
  MAX_CONVERSATION_HISTORY: 100,
  MAX_ACTIVE_PERSONAS: 15,
  MAX_DOCUMENT_SIZE_MB: 10,
  CLEANUP_INTERVAL_MINUTES: 5
} as const;

export const API_CONFIG = {
  MAX_RESPONSE_TIME_MS: 3000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  REQUEST_TIMEOUT_MS: 30000
} as const;

export const LLM_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 500,
  DEFAULT_TIMEOUT_MS: 10000,
  PARALLEL_CALL_TIMEOUT_MS: 15000
} as const;


export const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_PERSONA: 'Invalid persona selected',
    MESSAGE_TOO_LONG: 'Message exceeds maximum length',
    TOO_MANY_PERSONAS: `Cannot select more than ${SESSION_CONFIG.MAX_ACTIVE_PERSONAS} personas`,
    EMPTY_MESSAGE: 'Message cannot be empty'
  },
  SESSION: {
    NOT_FOUND: 'Session not found',
    EXPIRED: 'Session has expired',
    ALREADY_ENDED: 'Session has already ended',
    CREATION_FAILED: 'Failed to create session'
  },
  SERVICE: {
    LLM_TIMEOUT: 'AI service timeout - please try again',
    LLM_ERROR: 'AI service error - please try again',
    INTERNAL_ERROR: 'Internal server error',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable'
  }
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const DOCUMENT_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  TXT: 'text/plain',
  MD: 'text/markdown'
} as const;

export const UI_CONFIG = {
  TYPING_INDICATOR_DELAY_MS: 500,
  MESSAGE_ANIMATION_DURATION_MS: 300,
  AUTO_SCROLL_DELAY_MS: 100,
  DEBOUNCE_DELAY_MS: 300
} as const;

// Validation constants
export const VALIDATION_LIMITS = {
  MESSAGE_MAX_LENGTH: 2000,
  SESSION_ID_LENGTH: 36,
  PERSONA_ID_MAX_LENGTH: 50,
  DOCUMENT_NAME_MAX_LENGTH: 255
} as const;


// Default conversation topic
export const DEFAULT_CONVERSATION_TOPIC = {
  title: 'Collaborative Problem Solving Session',
  description: `A group discussion focused on exploring innovative solutions to complex challenges through diverse perspectives and collaborative thinking.

CONTEXT:
- Participants: Multiple AI personas with different expertise and viewpoints
- Format: Open collaborative discussion encouraging diverse perspectives
- Objective: Generate creative solutions through group intelligence and diverse thinking

DISCUSSION GOALS:
- Explore multiple approaches to the problem from different angles
- Build on each other's ideas and create synergistic solutions
- Address potential challenges and implementation considerations
- Foster creative thinking and innovative problem-solving

COLLABORATION FRAMEWORK:
- Encourage respectful dialogue and active listening
- Build consensus while respecting different viewpoints
- Generate actionable insights through group dynamics
- Maintain focus on constructive and solution-oriented discussion

ADDITIONAL CONTEXT:
Each participant brings unique expertise and perspective. The goal is to leverage collective intelligence for better outcomes than any individual could achieve alone.`
} as const;
