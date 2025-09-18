# Pitch Perfect - Prática de Apresentação Potenciada por IA

Pitch Perfect é um chatbot de grupo focal potenciado por IA que cria um ambiente simulado para profissionais praticarem e refinarem apresentações críticas. O sistema permite aos usuários receber feedback realista de personas de IA representando diferentes perspectivas de stakeholders (CEO, CTO, CIO, CFO, CPO) sem a sobrecarga organizacional de organizar grupos focais reais.

## 🏗️ Visão Geral da Arquitetura

```
Entrada do Usuário → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Model (Bedrock/OpenAI/Anthropic/Ollama)
```

### Recursos Principais

- **Simulação de Persona Potenciada por IA**: Múltiplas personas de IA respondem independentemente com prioridades distintas e estilos de comunicação
- **Ambiente de Chat Interativo**: Fluxo de conversa em tempo real com feedback imediato
- **Feedback Específico por Função**: Cada persona fornece respostas baseadas em perspectiva (CEO foca em estratégia, CFO em custos, etc.)
- **Processamento Sequencial**: Personas respondem uma após a outra para dinâmicas de reunião realistas
- **Gerenciamento de Sessão**: Conversas baseadas em sessão com limpeza automática e persistência de persona
- **Configuração de Persona Simplificada**: Descrições de persona em linguagem natural em vez de formulários complexos
- **Múltiplos Provedores de LLM**: Suporte para AWS Bedrock, OpenAI, Anthropic e modelos Ollama locais

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 20+ 
- npm 8+
- Docker (opcional, para containerização)
- AWS CLI (para deployment)

### Instalação

1. **Clonar o repositório**
   ```bash
   git clone <repository-url>
   cd ai-pitch-perfect
   ```

2. **Instalar dependências**
   ```bash
   npm run install:all
   ```

3. **Configurar variáveis de ambiente**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edite backend/.env com sua configuração
   
   # Frontend usará a configuração de proxy do Vite
   ```

4. **Construir pacote compartilhado**
   ```bash
   npm run build:shared
   ```

### Desenvolvimento

1. **Iniciar o servidor backend**
   ```bash
   npm run dev:backend
   ```
   Backend estará disponível em `http://localhost:3000`

2. **Iniciar o servidor de desenvolvimento frontend**
   ```bash
   npm run dev:frontend
   ```
   Frontend estará disponível em `http://localhost:3001`

3. **Testar a API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Estrutura do Projeto

```
ai-pitch-perfect/
├── shared/                 # Tipos TypeScript compartilhados e utilitários
│   ├── src/
│   │   ├── types/         # Definições de tipos comuns
│   │   ├── constants/     # Constantes da aplicação
│   │   └── utils/         # Funções utilitárias compartilhadas
├── backend/               # Servidor API Express.js
│   ├── src/
│   │   ├── controllers/   # Manipuladores de rotas da API
│   │   ├── services/      # Serviços de lógica de negócio
│   │   ├── middleware/    # Middleware do Express
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
- `npm run lint` - Lint de todos os pacotes

### Backend
- `npm run dev:backend` - Iniciar backend em modo de desenvolvimento
- `npm run build:backend` - Construir backend
- `npm run test:backend` - Executar testes do backend

### Frontend
- `npm run dev:frontend` - Iniciar servidor de desenvolvimento frontend
- `npm run build:frontend` - Construir frontend para produção
- `npm run test:frontend` - Executar testes do frontend

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

Configurar via variáveis de ambiente:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Modo de Desenvolvimento
No desenvolvimento, o sistema usa respostas simuladas para simular interações de IA sem requerer chaves de API.

## 🎭 Personas

O sistema inclui 5 personas executivas pré-definidas com customização simplificada e amigável:

1. **CEO** - Foco estratégico, vantagem competitiva, resultados de negócio
2. **CTO** - Viabilidade técnica, arquitetura, complexidade de implementação
3. **CFO** - Impacto financeiro, ROI, implicações orçamentárias
4. **CIO** - Integração de sistemas, segurança, infraestrutura de TI
5. **CPO** - Estratégia de produto, experiência do usuário, posicionamento de mercado

### Estrutura da Persona
Cada persona é definida por apenas 4 campos simples:
- **Nome**: Nome de exibição (ex. "Chief Executive Officer")
- **Função**: Identificador de função curto (ex. "CEO")
- **Detalhes**: Descrição em texto livre incluindo background, prioridades, preocupações e nível de influência
- **Seleção de Avatar**: Representação visual das opções de avatar disponíveis

### Customização de Persona
- **Editar Personas Padrão**: Modificar detalhes de qualquer persona padrão em linguagem natural
- **Criar Personas Customizadas**: Construir personas completamente customizadas com suas próprias descrições
- **Persistência de Sessão**: Todas as customizações de persona persistem através das sessões do navegador
- **Importar/Exportar**: Salvar e compartilhar configurações de persona via arquivos JSON
- **Interface Baseada em Azulejos**: Seleção visual de azulejos com capacidades abrangentes de edição

### Implementação Técnica
Cada persona mantém:
- Contexto de conversa isolado para respostas autênticas
- Processamento de linguagem natural do campo de detalhes para geração de prompts de IA
- Padrões de resposta específicos por função baseados em características descritas
- Processamento de resposta sequencial para dinâmicas de reunião realistas

## 🔒 Recursos de Segurança

- **Validação de Entrada**: Todas as entradas do usuário são validadas e sanitizadas
- **Isolamento de Sessão**: Cada sessão mantém contexto separado
- **Tratamento de Erros**: Tratamento elegante de erros com mensagens amigáveis ao usuário
- **Limitação de Taxa**: Proteção integrada contra abuso
- **HTTPS**: Todas as comunicações criptografadas em produção

## 📊 Monitoramento e Observabilidade

- **Logging Estruturado**: Logs formatados em JSON com Winston
- **Verificações de Saúde**: Monitoramento de saúde abrangente
- **Métricas**: Métricas de aplicação customizadas
- **Rastreamento de Erros**: Logging e rastreamento detalhado de erros

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
npm run deploy:dev
```

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

- **Tempo de Resposta**: < 3 segundos para respostas de persona
- **Disponibilidade**: 99.9% de disponibilidade da API
- **Concorrência**: Suporte a 1000+ usuários concorrentes
- **Processamento Sequencial**: Até 5 personas por sessão com fluxo de reunião realista

## 🤝 Contribuindo

1. Fazer fork do repositório
2. Criar branch de feature
3. Fazer suas mudanças
4. Adicionar testes
5. Submeter pull request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Para suporte e questões:
- Verifique a documentação em `/documents`
- Revise o banco de memória em `/memory-bank`
- Abra uma issue no GitHub