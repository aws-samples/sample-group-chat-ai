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
- Docker (optional, for containerization)
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

## ⚠️ Deployment Region Warning!
By default, the Routing Model for Bedrock is OpenAI gpt-oss:20b (`openai.gpt-oss-20b-1:0`). The Persona Model leverages Anthropic Claude 4 Sonnet (`anthropic.claude-sonnet-4-20250514-v1:0`). Please ensure you are deploying to a region that supports both models, or configure alternative models.

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

