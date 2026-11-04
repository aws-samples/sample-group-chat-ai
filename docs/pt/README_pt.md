# Group Chat AI - Conversas Colaborativas com IA

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](#)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


O Group Chat AI é uma plataforma colaborativa avançada que permite conversas dinâmicas em grupo com múltiplas personas de IA. O sistema facilita discussões significativas através de perspectivas diversas, permitindo aos usuários explorar ideias, obter feedback e participar de conversas com múltiplos participantes com agentes de IA representando diferentes papéis e pontos de vista.

## 🏗️ Visão Geral da Arquitetura

```
Entrada do Usuário → React Frontend → API Gateway → ConversationOrchestrator
                                                      ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### Principais Funcionalidades

- **Conversas Multi-Persona**: Interaja com múltiplas personas de IA simultaneamente em discussões em grupo
- **Padrões de Interação Dinâmica**: Fluxo de conversa em tempo real com alternância natural de turnos e respostas
- **Perspectivas Diversas**: Cada persona traz pontos de vista únicos, expertise e estilos de comunicação
- **Resolução Colaborativa de Problemas**: Trabalhe através de tópicos complexos com agentes de IA oferecendo diferentes abordagens
- **Persistência de Sessão**: Mantenha o contexto da conversa e consistência das personas através das sessões
- **Personalização Flexível de Personas**: Crie e modifique personas de IA com descrições em linguagem natural
- **Suporte a Múltiplos LLM**: Aproveite vários modelos de linguagem incluindo AWS Bedrock, OpenAI, Anthropic e Ollama

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 20+ 
- npm 8+
- Docker (opcional, para containerização)
- AWS CLI (para deployment)

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **Instale as dependências**
   ```bash
   npm run install:all
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edite backend/.env com sua configuração
   
   # Frontend usará a configuração de proxy do Vite
   ```

4. **Construa o pacote compartilhado**
   ```bash
   npm run build:shared
   ```

### Desenvolvimento

1. **Inicie o servidor backend**
   ```bash
   npm run dev:backend
   ```
   Backend estará disponível em `http://localhost:3000`

2. **Inicie o servidor de desenvolvimento frontend**
   ```bash
   npm run dev:frontend
   ```
   Frontend estará disponível em `http://localhost:3001`

3. **Teste a API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Estrutura do Projeto

```
group-chat-ai/
├── shared/                 # Tipos TypeScript compartilhados e utilitários
│   ├── src/
│   │   ├── types/         # Definições de tipos comuns
│   │   ├── constants/     # Constantes da aplicação
│   │   └── utils/         # Funções utilitárias compartilhadas
├── backend/               # Servidor API Express.js
│   ├── src/
│   │   ├── controllers/   # Manipuladores de rotas da API
│   │   ├── services/      # Serviços de lógica de negócio
│   │   ├── middleware/    # Middleware Express
│   │   ├── config/        # Arquivos de configuração
│   │   └── utils/         # Utilitários do backend
├── frontend/              # Aplicação React
│   ├── src/
│   │   ├── components/    # Componentes React reutilizáveis
│   │   ├── pages/         # Componentes de página
│   │   ├── services/      # Camada de serviço da API
│   │   ├── hooks/         # Hooks React customizados
│   │   └── utils/         # Utilitários do frontend
├── infrastructure/        # Código de infraestrutura AWS CDK
├── tests/                 # Arquivos de teste
└── documents/             # Documentação do projeto
```

## 🔧 Scripts Disponíveis

### Nível Raiz
- `npm run install:all` - Instalar todas as dependências
- `npm run build` - Construir todos os pacotes
- `npm run test` - Executar todos os testes
- `npm run lint` - Fazer lint de todos os pacotes

### Backend
- `npm run dev:backend` - Iniciar backend em modo de desenvolvimento
- `npm run build:backend` - Construir backend
- `npm run test:backend` - Executar testes do backend

### Frontend
- `npm run dev:frontend` - Iniciar servidor de desenvolvimento frontend
- `npm run build:frontend` - Construir frontend para produção
- `npm run test:frontend` - Executar testes do frontend

### Personas e Internacionalização
- `npm run personas:generate` - Gerar personas.json em inglês a partir das definições compartilhadas
- `npm run docs:translate` - Traduzir toda a documentação para idiomas suportados
- `npm run docs:translate:single -- --lang es` - Traduzir para idioma específico

## 🌐 Endpoints da API

### Verificação de Saúde
- `GET /health` - Verificação básica de saúde
- `GET /health/detailed` - Informações detalhadas de saúde

### Personas
- `GET /personas` - Obter todas as personas disponíveis
- `GET /personas/:personaId` - Obter detalhes de persona específica

### Sessões
- `POST /sessions` - Criar nova sessão de conversa
- `POST /sessions/:sessionId/messages` - Enviar mensagem e obter respostas
- `PUT /sessions/:sessionId/personas` - Atualizar personas da sessão
- `GET /sessions/:sessionId/summary` - Obter resumo da sessão
- `DELETE /sessions/:sessionId` - Encerrar sessão
- `GET /sessions/:sessionId` - Obter detalhes da sessão

## 🤖 Integração com IA

O sistema suporta múltiplos provedores de LLM através de uma interface configurável:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Vários modelos)
- **Ollama** (Modelos locais)

Configure através de variáveis de ambiente:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Modo de Desenvolvimento
No desenvolvimento, o sistema usa respostas simuladas para simular interações de IA sem exigir chaves de API.

## 🎭 Personas

O sistema inclui personas de IA diversas que podem ser personalizadas para vários cenários de conversa em grupo:

1. **Consultor Estratégico** - Planejamento de alto nível, visão e direção estratégica
2. **Especialista Técnico** - Conhecimento técnico profundo, detalhes de implementação e soluções
3. **Analista** - Insights baseados em dados, pesquisa e perspectivas analíticas  
4. **Pensador Criativo** - Inovação, brainstorming e ideias fora da caixa
5. **Facilitador** - Gestão de discussões, construção de consenso e colaboração

### Estrutura da Persona
Cada persona é definida por apenas 4 campos simples:
- **Nome**: Nome de exibição (ex: "Consultor Estratégico")
- **Papel**: Identificador curto do papel (ex: "Estrategista")
- **Detalhes**: Descrição em texto livre incluindo histórico, prioridades, preocupações e nível de influência
- **Seleção de Avatar**: Representação visual das opções de avatar disponíveis

### Personalização de Personas
- **Editar Personas Padrão**: Modifique os detalhes de qualquer persona padrão em linguagem natural
- **Criar Personas Personalizadas**: Construa personas completamente personalizadas com suas próprias descrições
- **Persistência de Sessão**: Todas as personalizações de personas persistem durante as sessões do navegador
- **Importar/Exportar**: Salve e compartilhe configurações de personas via arquivos JSON
- **Interface Baseada em Blocos**: Seleção visual de blocos com capacidades abrangentes de edição

### Implementação Técnica
Cada persona mantém:
- Contexto de conversa isolado para respostas autênticas
- Processamento de linguagem natural do campo de detalhes para geração de prompts de IA
- Padrões de resposta específicos do papel baseados nas características descritas
- Alternância inteligente de turnos para fluxo natural de conversa em grupo

## 🌐 Internacionalização e Gestão de Personas

### Fluxo de Definição de Personas
1. **Fonte da Verdade**: Todas as definições de personas são mantidas em `shared/src/personas/index.ts`
2. **Geração**: Execute `npm run personas:generate` para criar arquivo de tradução `personas.json` em inglês
3. **Tradução**: Use scripts de tradução existentes para gerar arquivos de personas localizados

### Processo de Tradução de Personas
```bash
# 1. Atualize definições de personas no pacote compartilhado
vim shared/src/personas/index.ts

# 2. Gere personas.json em inglês a partir das definições compartilhadas
npm run personas:generate

# 3. Traduza personas para todos os idiomas suportados
npm run docs:translate  # Traduz todos os arquivos incluindo personas.json
# Ou traduza para idioma específico
npm run docs:translate:single -- --lang es

# 4. Reconstrua o pacote compartilhado se necessário
npm run build:shared
```

### Estrutura do Arquivo de Tradução
- **Fonte**: `shared/src/personas/index.ts` (Definições TypeScript)
- **Gerado**: `frontend/public/locales/en/personas.json` (i18n em inglês)
- **Traduzido**: `frontend/public/locales/{lang}/personas.json` (Versões localizadas)

### Idiomas Suportados
O sistema suporta 14 idiomas para personas e documentação:
- 🇺🇸 English (en) - Idioma fonte
- 🇸🇦 العربية (ar) - Árabe
- 🇩🇪 Deutsch (de) - Alemão
- 🇪🇸 Español (es) - Espanhol
- 🇫🇷 Français (fr) - Francês
- 🇮🇱 עברית (he) - Hebraico
- 🇮🇹 Italiano (it) - Italiano
- 🇯🇵 日本語 (ja) - Japonês
- 🇰🇷 한국어 (ko) - Coreano
- 🇳🇱 Nederlands (nl) - Holandês
- 🇵🇹 Português (pt) - Português
- 🇷🇺 Русский (ru) - Russo
- 🇸🇪 Svenska (sv) - Sueco
- 🇨🇳 中文 (zh) - Chinês

### Adicionando Novas Personas
1. Adicione definição de persona a `shared/src/personas/index.ts`
2. Execute `npm run personas:generate` para atualizar traduções em inglês
3. Execute scripts de tradução para gerar versões localizadas
4. A nova persona estará disponível em todos os idiomas suportados

## 🔒 Funcionalidades de Segurança

- **Validação de Entrada**: Todas as entradas do usuário são validadas e sanitizadas
- **Isolamento de Sessão**: Cada sessão mantém contexto separado
- **Tratamento de Erros**: Tratamento gracioso de erros com mensagens amigáveis ao usuário
- **Limitação de Taxa**: Proteção integrada contra abuso
- **HTTPS**: Todas as comunicações criptografadas em produção

## 📊 Monitoramento e Observabilidade

- **Log Estruturado**: Logs formatados em JSON com Winston
- **Verificações de Saúde**: Monitoramento abrangente de saúde
- **Métricas**: Métricas personalizadas da aplicação
- **Rastreamento de Erros**: Log detalhado e rastreamento de erros

## 🚢 Deployment

### Docker
```bash
# Construir imagem do backend
cd backend
npm run docker:build

# Executar container
npm run docker:run
```

### Deployment AWS
```bash
# Fazer deploy da infraestrutura
cd infrastructure
npm run deploy:dev # substitua :dev por staging ou prod para esses ambientes
```

## ⚠️ Aviso sobre Região de Deployment!
Por padrão, o Modelo de Roteamento para Bedrock é Anthropic Claude Haiku 5.5 (`us.anthropic.claude-haiku-5-5`). O Modelo de Persona aproveita Anthropic Claude Sonnet 5.5 (`us.anthropic.claude-sonnet-5-5`). Por favor, certifique-se de que está fazendo deploy em uma região que suporta ambos os modelos, ou configure modelos alternativos.

## 🧪 Testes

### Testes Unitários
```bash
npm run test
```

### Testes de Integração
```bash
npm run test:integration
```

### Testes E2E
```bash
npm run test:e2e
```

## 📈 Metas de Performance

- **Tempo de Resposta**: < 3 segundos para respostas de personas
- **Disponibilidade**: 99.9% de disponibilidade da API
- **Concorrência**: Suporte a 1000+ usuários simultâneos
- **Conversas em Grupo**: Até 5 personas por sessão com fluxo natural de conversa

## 🤝 Contribuindo

1. Faça fork do repositório
2. Crie uma branch de funcionalidade
3. Faça suas alterações
4. Adicione testes
5. Envie um pull request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.