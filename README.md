# Group Chat AI - Collaborative AI Conversations

> • 🇺🇸 **This document is also available in:** [English](#)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./docs/ar/README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./docs/de/README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./docs/es/README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./docs/fr/README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./docs/he/README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./docs/it/README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./docs/ja/README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./docs/ko/README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./docs/nl/README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./docs/pt/README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./docs/ru/README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./docs/sv/README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./docs/zh/README_zh.md)


---

Group Chat AI is an advanced collaborative platform that enables dynamic group conversations with multiple AI personas. The system facilitates meaningful discussions across diverse perspectives, allowing users to explore ideas, get feedback, and engage in multi-participant conversations with AI agents representing different roles and viewpoints.

## 🏗️ Architecture Overview

```
User Input → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### Key Features

- **Multi-Persona Conversations**: Engage with multiple AI personas simultaneously in group discussions
- **Dynamic Interaction Patterns**: Real-time conversation flow with natural turn-taking and responses
- **Diverse Perspectives**: Each persona brings unique viewpoints, expertise, and communication styles
- **Collaborative Problem Solving**: Work through complex topics with AI agents offering different approaches
- **Session Persistence**: Maintain conversation context and persona consistency across sessions
- **Flexible Persona Customization**: Create and modify AI personas with natural language descriptions
- **Multiple LLM Support**: Leverage various language models including AWS Bedrock, OpenAI, Anthropic, and Ollama

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm 8+
- Docker (optional for local development; required for AWS deployment, which builds the backend container image)
  - The backend runs on x86_64 (`linux/amd64`) Fargate, and the CDK stack builds its image for that platform whatever machine you deploy from. On an ARM machine (Apple silicon, Graviton), Docker must be able to build amd64 images. Docker Desktop can do this out of the box. On Linux, install QEMU emulation once with `docker run --privileged --rm tonistiigi/binfmt --install amd64`. The cross-architecture build is slower than a native one.
- AWS CLI (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   
   # Frontend will use Vite's proxy configuration
   ```

4. **Build shared package**
   ```bash
   npm run build:shared
   ```

### Development

1. **Start the backend server**
   ```bash
   npm run dev:backend
   ```
   Backend will be available at `http://localhost:3000`

2. **Start the frontend development server**
   ```bash
   npm run dev:frontend
   ```
   Frontend will be available at `http://localhost:3001`

3. **Test the API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Project Structure

```
group-chat-ai/
├── shared/                 # Shared TypeScript types and utilities
│   ├── src/
│   │   ├── types/         # Common type definitions
│   │   ├── constants/     # Application constants
│   │   └── utils/         # Shared utility functions
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── controllers/   # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Express middleware
│   │   ├── config/        # Configuration files
│   │   └── utils/         # Backend utilities
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Frontend utilities
├── infrastructure/        # AWS CDK infrastructure code
├── tests/                 # Test files
└── documents/             # Project documentation
```

## 🔧 Available Scripts

### Root Level
- `npm run install:all` - Install all dependencies
- `npm run build` - Build all packages
- `npm run test` - Run all tests
- `npm run lint` - Lint all packages

### Backend
- `npm run dev:backend` - Start backend in development mode
- `npm run build:backend` - Build backend
- `npm run test:backend` - Run backend tests

### Frontend
- `npm run dev:frontend` - Start frontend development server
- `npm run build:frontend` - Build frontend for production
- `npm run test:frontend` - Run frontend tests

### Personas & Internationalization
- `npm run personas:generate` - Generate English personas.json from shared definitions
- `npm run docs:translate` - Translate all documentation to supported languages
- `npm run docs:translate:single -- --lang es` - Translate to specific language

## 🌐 API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health information

### Personas
- `GET /personas` - Get all available personas
- `GET /personas/:personaId` - Get specific persona details

### Sessions
- `POST /sessions` - Create new conversation session
- `POST /sessions/:sessionId/messages` - Send message and get responses
- `PUT /sessions/:sessionId/personas` - Update session personas
- `GET /sessions/:sessionId/summary` - Get session summary
- `DELETE /sessions/:sessionId` - End session
- `GET /sessions/:sessionId` - Get session details

## 🤖 AI Integration

The system supports multiple LLM providers through a configurable interface:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Various models)
- **Ollama** (Local models)

Configure via environment variables:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Development Mode
In development, the system uses mock responses to simulate AI interactions without requiring API keys.

## 🎭 Personas

The system includes diverse AI personas that can be customized for various group conversation scenarios:

1. **Strategic Advisor** - High-level planning, vision, and strategic direction
2. **Technical Expert** - Deep technical knowledge, implementation details, and solutions
3. **Analyst** - Data-driven insights, research, and analytical perspectives  
4. **Creative Thinker** - Innovation, brainstorming, and out-of-the-box ideas
5. **Facilitator** - Discussion management, consensus building, and collaboration

### Persona Structure
Each persona is defined by just 4 simple fields:
- **Name**: Display name (e.g., "Strategic Advisor")
- **Role**: Short role identifier (e.g., "Strategist")
- **Details**: Free text description including background, priorities, concerns, and influence level
- **Avatar Selection**: Visual representation from available avatar options

### Persona Customization
- **Edit Default Personas**: Modify any default persona's details in natural language
- **Create Custom Personas**: Build completely custom personas with your own descriptions
- **Session Persistence**: All persona customizations persist throughout browser sessions
- **Import/Export**: Save and share persona configurations via JSON files
- **Tile-Based Interface**: Visual tile selection with comprehensive editing capabilities

### Technical Implementation
Each persona maintains:
- Isolated conversation context for authentic responses
- Natural language processing of details field for AI prompt generation
- Role-specific response patterns based on described characteristics
- Intelligent turn-taking for natural group conversation flow

## 🌐 Internationalization & Persona Management

### Persona Definition Workflow
1. **Source of Truth**: All persona definitions are maintained in `shared/src/personas/index.ts`
2. **Generation**: Run `npm run personas:generate` to create English `personas.json` translation file
3. **Translation**: Use existing translation scripts to generate localized persona files

### Persona Translation Process
```bash
# 1. Update persona definitions in shared package
vim shared/src/personas/index.ts

# 2. Generate English personas.json from shared definitions
npm run personas:generate

# 3. Translate personas to all supported languages
npm run docs:translate  # Translates all files including personas.json
# Or translate to specific language
npm run docs:translate:single -- --lang es

# 4. Rebuild shared package if needed
npm run build:shared
```

### Translation File Structure
- **Source**: `shared/src/personas/index.ts` (TypeScript definitions)
- **Generated**: `frontend/public/locales/en/personas.json` (English i18n)
- **Translated**: `frontend/public/locales/{lang}/personas.json` (Localized versions)

### Supported Languages
The system supports 14 languages for personas and documentation:
- 🇺🇸 English (en) - Source language
- 🇸🇦 العربية (ar) - Arabic
- 🇩🇪 Deutsch (de) - German
- 🇪🇸 Español (es) - Spanish
- 🇫🇷 Français (fr) - French
- 🇮🇱 עברית (he) - Hebrew
- 🇮🇹 Italiano (it) - Italian
- 🇯🇵 日本語 (ja) - Japanese
- 🇰🇷 한국어 (ko) - Korean
- 🇳🇱 Nederlands (nl) - Dutch
- 🇵🇹 Português (pt) - Portuguese
- 🇷🇺 Русский (ru) - Russian
- 🇸🇪 Svenska (sv) - Swedish
- 🇨🇳 中文 (zh) - Chinese

### Adding New Personas
1. Add persona definition to `shared/src/personas/index.ts`
2. Run `npm run personas:generate` to update English translations
3. Run translation scripts to generate localized versions
4. The new persona will be available in all supported languages

## 🔒 Security Features

- **Input Validation**: All user inputs are validated and sanitized
- **Session Isolation**: Each session maintains separate context
- **Error Handling**: Graceful error handling with user-friendly messages
- **Rate Limiting**: Built-in protection against abuse
  - REST API (`/api/*`): 300 requests per client IP per 15 minutes (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`).
  - WebSocket messages: 30 chat messages per minute per connection with a burst of 10 (`WS_MSG_RATE_LIMIT_MAX`, `WS_MSG_RATE_LIMIT_WINDOW_MS`, `WS_MSG_RATE_LIMIT_BURST`), and 60 per minute per user across all of that user's connections (`WS_USER_MSG_RATE_LIMIT_MAX`). An over-limit message is dropped before any model call and answered with an `error` frame. A connection that exceeds the limit 10 times in a minute is closed with code 4429.
  - WebSocket connections: at most 5 open connections per user (`WS_MAX_CONNECTIONS_PER_USER`) and 20 handshakes per client IP per minute (`WS_CONN_RATE_LIMIT_MAX`, `WS_CONN_RATE_LIMIT_WINDOW_MS`).
  - All limits are kept in memory in each backend instance. With more than one instance, each enforces its own limits; enforcing them across instances needs a shared store such as Redis or DynamoDB. See `backend/.env.example` for every setting.
- **HTTPS**: All communications encrypted in production

## 📊 Monitoring & Observability

- **Structured Logging**: JSON-formatted logs with Winston
- **Health Checks**: Comprehensive health monitoring
- **Metrics**: Custom application metrics
- **Error Tracking**: Detailed error logging and tracking

## 🚢 Deployment

### Docker
```bash
# Build backend image
cd backend
npm run docker:build

# Run container
npm run docker:run
```

### AWS Deployment
```bash
# Deploy infrastructure
cd infrastructure
npm run deploy:dev # replace :dev with staging or prod for those environments
```

### User accounts and self sign-up

By default the Cognito user pool does not allow self sign-up. Only an administrator can create users, and the hosted login page shows no "Sign up" link. That keeps a deployment from being open to anyone who finds its URL.

To create a user, take the `UserPoolId` stack output and run the command below. Cognito emails the user a temporary password, which they change at first sign-in.

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <UserPoolId> \
  --username user@example.com \
  --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true \
    Name=given_name,Value=Jane Name=family_name,Value=Doe
```

To let anyone with the URL register their own account, enable self sign-up with the `selfSignUpEnabled` CDK context flag. You can set it per deploy:

```bash
cd infrastructure
npm run deploy:dev -- -c selfSignUpEnabled=true
```

Or set `"selfSignUpEnabled": true` under `"context"` in `infrastructure/cdk.json`. Deploying again without the flag turns self sign-up back off. Existing users keep their accounts.

## ⚠️ Deployment Region Warning!
By default, the Routing Model for Bedrock is Anthropic Claude Haiku 5.5 (`us.anthropic.claude-haiku-5-5`). The Persona Model leverages Anthropic Claude Sonnet 5.5 (`us.anthropic.claude-sonnet-5-5`). Please ensure you are deploying to a region that supports both models, or configure alternative models.

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📈 Performance Targets

- **Response Time**: < 3 seconds for persona responses
- **Availability**: 99.9% API availability
- **Concurrency**: Support 1000+ concurrent users
- **Group Conversations**: Up to 5 personas per session with natural conversation flow

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

