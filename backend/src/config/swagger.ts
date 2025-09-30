// Copyright 2025 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT-0

import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Group Chat AI API',
      version: '1.0.0',
      description: 'AI Multi-Persona Conversation Orchestrator Backend API',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: '/',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Cognito authentication. You can get this token from your frontend application after logging in.'
        }
      },
      schemas: {
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'healthy'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds'
            },
            version: {
              type: 'string',
              example: '1.0.0'
            }
          }
        },
        DetailedHealthStatus: {
          allOf: [
            { $ref: '#/components/schemas/HealthStatus' },
            {
              type: 'object',
              properties: {
                memory: {
                  type: 'object',
                  properties: {
                    rss: { type: 'string', example: '64MB' },
                    heapTotal: { type: 'string', example: '32MB' },
                    heapUsed: { type: 'string', example: '16MB' },
                    external: { type: 'string', example: '8MB' }
                  }
                },
                environment: {
                  type: 'string',
                  example: 'development'
                }
              }
            }
          ]
        },
        Persona: {
          type: 'object',
          properties: {
            personaId: {
              type: 'string',
              description: 'Unique identifier for the persona'
            },
            name: {
              type: 'string',
              description: 'Display name of the persona'
            },
            role: {
              type: 'string',
              description: 'Role or job title of the persona'
            },
            description: {
              type: 'string',
              description: 'Detailed description of the persona'
            }
          }
        },
        PersonasResponse: {
          type: 'object',
          properties: {
            personas: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Persona'
              }
            }
          }
        },
        CreateSessionRequest: {
          type: 'object',
          required: ['title'],
          properties: {
            title: {
              type: 'string',
              description: 'Title for the conversation session',
              minLength: 1,
              maxLength: 200
            },
            personaIds: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of persona IDs to include in the session'
            }
          }
        },
        CreateSessionResponse: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Unique identifier for the created session'
            }
          }
        },
        SendMessageRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            message: {
              type: 'string',
              description: 'The message content to send',
              minLength: 1,
              maxLength: 4000
            }
          }
        },
        SendMessageResponse: {
          type: 'object',
          properties: {
            messageId: {
              type: 'string',
              description: 'Unique identifier for the sent message'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Human-readable error message'
            },
            statusCode: {
              type: 'number',
              description: 'HTTP status code'
            },
            timestamp: {
              type: 'number',
              description: 'Error timestamp'
            }
          }
        }
      },
      responses: {
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Personas',
        description: 'AI persona management'
      },
      {
        name: 'Sessions',
        description: 'Conversation session management'
      },
      {
        name: 'User Sessions',
        description: 'User session management'
      },
      {
        name: 'Voices',
        description: 'Text-to-speech voice management'
      }
    ],
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    './src/controllers/*.ts',
    './src/index.ts'
  ],
};

export const swaggerSpec = swaggerJSDoc(options);