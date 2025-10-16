# Group Chat AI - Arquitetura do Sistema

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./ARCHITECTURE_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./ARCHITECTURE_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./ARCHITECTURE_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./ARCHITECTURE_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./ARCHITECTURE_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./ARCHITECTURE_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./ARCHITECTURE_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](#)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## Visão Geral

Group Chat AI é uma plataforma sofisticada de IA conversacional em tempo real que permite aos usuários participar de discussões colaborativas com múltiplas personas de IA. O sistema utiliza serviços da nuvem AWS para entregar uma solução escalável, segura e performática com interações de voz e texto em tempo real para conversas em grupo.

## Diagramas de Arquitetura

### Arquitetura de Sistema de Alto Nível
![Group Chat AI System Architecture](ARCHITECTURE.png)

## Componentes do Sistema

### 1. Camada Frontend

#### **CloudFront Distribution**
- **Propósito**: Rede de entrega de conteúdo global para performance otimizada
- **Recursos**:
  - Cache de assets estáticos (build da aplicação React)
  - Roteamento de requisições API para ALB backend
  - Proxy de conexões WebSocket para comunicação em tempo real
  - Geo-restrição e políticas de segurança
  - Suporte a domínio customizado com certificados ACM

#### **S3 Static Hosting**
- **Propósito**: Serve os artefatos de build da aplicação React
- **Conteúdo**:
  - Bundles HTML, CSS, JavaScript
  - Assets estáticos (imagens, fontes, arquivos de localização)
  - Arquivos de configuração dinâmica (config.json para configurações específicas do ambiente)

#### **React Frontend Application**
- **Tecnologia**: React 18 com TypeScript, sistema de build Vite
- **Recursos**:
  - Comunicação WebSocket em tempo real
  - Capacidades de entrada/saída de voz
  - Internacionalização multi-idioma
  - Design responsivo com componentes de UI modernos
  - Upload e processamento de imagens

### 2. Autenticação e Autorização

#### **Amazon Cognito User Pool**
- **Propósito**: Autenticação e gerenciamento de usuários centralizado
- **Recursos**:
  - Integração OAuth 2.0 / OpenID Connect
  - Registro e verificação baseados em email
  - Políticas de senha e recuperação de conta
  - Integração com frontend via fluxo OIDC

#### **User Pool Client**
- **Configuração**:
  - Fluxo Authorization Code Grant
  - URLs de callback para ambientes de desenvolvimento e produção
  - Escopos: openid, email, profile
  - Períodos de validade de token otimizados para segurança

### 3. Infraestrutura de Rede

#### **VPC (Virtual Private Cloud)**
- **Design**: Implantação Multi-AZ para alta disponibilidade
- **Subnets**:
  - **Subnets Públicas**: Hospedam ALB e NAT Gateway
  - **Subnets Privadas**: Hospedam tarefas ECS Fargate para segurança

#### **Application Load Balancer (ALB)**
- **Propósito**: Distribuição de tráfego HTTP/HTTPS e terminação SSL
- **Segurança**: **CRÍTICO - ALB aceita tráfego APENAS de faixas de IP do CloudFront**
- **Recursos**:
  - Verificações de saúde para serviços ECS
  - Roteamento baseado em caminho (/api/* → backend, /ws/* → WebSocket)
  - Grupos de segurança configurados com listas de prefixos gerenciadas do CloudFront
  - Log de acesso para S3
  - **Todo o tráfego do usuário (HTTP/WebSocket) deve fluir através do CloudFront**

### 4. Serviços Backend (ECS Fargate)

#### **Express.js Application Server**
- **Runtime**: Node.js 20 com TypeScript
- **Arquitetura**: Design orientado a microsserviços
- **Componentes Principais**:
  - Endpoints de API REST para gerenciamento de sessão
  - Servidor WebSocket para comunicação em tempo real
  - Middleware para logging, tratamento de erros e segurança

#### **Componentes de Serviços Principais**

##### **ConversationOrchestrator**
- **Propósito**: Coordenador central para conversas de IA
- **Responsabilidades**:
  - Roteamento de mensagens e seleção de persona
  - Gerenciamento de fila de áudio para fluxo natural de conversa
  - Streaming de resposta em tempo real
  - Gerenciamento de conversa iterativa

##### **PersonaManager & PersonaAgent**
- **Propósito**: Gerencia definições e comportamentos de personas de IA
- **Recursos**:
  - Criação e gerenciamento de personas customizadas
  - Contextos de conversa específicos por persona
  - Seleção dinâmica de persona baseada em análise de conteúdo

##### **RoutingAgent**
- **Propósito**: Roteamento inteligente de mensagens do usuário para personas apropriadas
- **Tecnologia**: Usa Amazon Bedrock para tomada de decisão
- **Recursos**:
  - Análise de conteúdo e pontuação de relevância de persona
  - Lógica de continuação de conversa
  - Orquestração de interação multi-persona

##### **SessionService**
- **Propósito**: Gerencia sessões de usuário e estado de conversa
- **Recursos**:
  - Gerenciamento de ciclo de vida de sessão
  - Persistência de histórico de conversa
  - Customizações específicas do usuário

##### **WebSocket Management**
- **Componentes**: WebSocketServer, WebSocketController, SessionWebSocketManager
- **Recursos**:
  - Comunicação bidirecional em tempo real
  - Conexões WebSocket específicas por sessão
  - Protocolos de streaming de áudio e confirmação

### 5. Integração de Serviços AI/ML

#### **Amazon Bedrock**
- **Modelos**: Claude 4 (anthropic.claude-sonnet-4-5-20250929-v1:0)
- **Uso**:
  - Geração de conversa para personas de IA
  - Análise de conteúdo e decisões de roteamento
  - Geração de resposta consciente do contexto
- **Configuração**: Via Parameter Store para configurações específicas do ambiente

#### **Amazon Polly**
- **Propósito**: Conversão de texto para fala para interações de voz
- **Recursos**:
  - Múltiplas opções de voz com atribuições específicas por persona
  - Estilo de fala de apresentador de notícias para certas personas
  - Síntese de áudio em streaming
  - Seleção de voz consciente do idioma

### 6. Configuração e Monitoramento

#### **AWS Systems Manager Parameter Store**
- **Propósito**: Gerenciamento de configuração centralizado
- **Parâmetros**:
  - Configurações de modelo LLM e provedor
  - Detalhes de configuração do Cognito
  - Configurações específicas do ambiente

#### **CloudWatch Logs & Metrics**
- **Recursos**:
  - Logging centralizado para todos os serviços
  - Métricas de performance e monitoramento
  - Rastreamento de erros e alertas
  - Métricas customizadas para uso de serviços de IA

## Padrões de Fluxo de Dados

### 1. Fluxo de Autenticação do Usuário
```
Usuário → CloudFront → Cognito User Pool → OAuth Flow → JWT Token → Chamadas API
```

### 2. Fluxo de Conversa em Tempo Real
```
Mensagem do Usuário → WebSocket (via CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Resposta → Polly → Stream de Áudio → WebSocket (via CloudFront) → Usuário
```

### 3. Pipeline de Processamento de IA
```
Entrada do Usuário → Análise de Conteúdo → Seleção de Persona → Construção de Contexto → Requisição LLM → Geração de Resposta → Síntese de Áudio → Gerenciamento de Fila → Entrega
```

## Arquitetura de Segurança

### Segurança de Rede
- **Integração WAF**: Web Application Firewall integrado ao CloudFront
- **Segurança VPC**: Subnets privadas para serviços backend
- **Grupos de Segurança**: Controle de acesso de menor privilégio
- **Restrições ALB**: Limitações de faixa de IP do CloudFront

### Segurança de Dados
- **Criptografia em Trânsito**: HTTPS/TLS em todos os lugares
- **Criptografia em Repouso**: Criptografia S3 e Parameter Store
- **Gerenciamento de Segredos**: Parameter Store para configuração sensível
- **Controle de Acesso**: Funções IAM com permissões mínimas

### Segurança de Aplicação
- **Autenticação**: OAuth 2.0/OIDC baseado em Cognito
- **Autorização**: Validação de token JWT
- **Validação de Entrada**: Validação abrangente de requisições
- **Limitação de Taxa**: Limites de conexão API e WebSocket

## Escalabilidade e Performance

### Auto Scaling
- **Serviço ECS**: Auto scaling baseado em CPU e memória (1-10 tarefas)
- **ALB**: Scaling automático baseado em tráfego
- **CloudFront**: Localizações de borda globais para CDN

### Otimizações de Performance
- **Cache**: Cache CloudFront para assets estáticos
- **Streaming de Áudio**: URLs de dados Base64 para reprodução imediata
- **Pool de Conexões**: Gerenciamento eficiente de conexões WebSocket
- **Carregamento Lazy**: Inicialização de serviço sob demanda

### Alta Disponibilidade
- **Implantação Multi-AZ**: VPC abrange múltiplas zonas de disponibilidade
- **Verificações de Saúde**: Monitoramento de saúde ALB para serviços ECS
- **Degradação Graciosa**: Mecanismos de fallback para falhas de serviço

## Resumo da Stack Tecnológica

### Frontend
- **Framework**: React 18 com TypeScript
- **Ferramenta de Build**: Vite
- **Estilização**: CSS moderno com design responsivo
- **Gerenciamento de Estado**: React Context API
- **Autenticação**: OIDC Client
- **Tempo Real**: WebSocket API

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Linguagem**: TypeScript
- **WebSocket**: biblioteca ws
- **Logging**: Winston
- **Testes**: Jest

### Infraestrutura
- **Orquestração**: AWS CDK (TypeScript)
- **Computação**: ECS Fargate
- **Armazenamento**: S3
- **CDN**: CloudFront
- **Banco de Dados**: Gerenciamento de estado em memória
- **Configuração**: Parameter Store

### AI/ML
- **LLM**: Amazon Bedrock (Claude 4)
- **TTS**: Amazon Polly
- **Análise de Conteúdo**: Serviço customizado com integração LLM

## Arquitetura de Implantação

### Estratégia de Ambiente
- **Desenvolvimento**: Desenvolvimento local com backend na porta 3000
- **Produção**: Infraestrutura implantada via CDK com CloudFront

### Pipeline CI/CD
- **Frontend**: Build Vite → Implantação S3 → Invalidação CloudFront
- **Backend**: Build Docker → ECR → Atualização de serviço ECS
- **Infraestrutura**: CDK diff → Deploy → Verificação

### Gerenciamento de Configuração
- **Variáveis de Ambiente**: Configuração a nível de container
- **Segredos**: Integração Parameter Store
- **Feature Flags**: Habilitação baseada em ambiente

## Monitoramento e Observabilidade

### Estratégia de Logging
- **Centralizado**: Todos os logs fluem para CloudWatch
- **Estruturado**: Entradas de log formatadas em JSON
- **Correlação**: IDs de requisição para rastreamento
- **Níveis**: Classificação Debug, Info, Warn, Error

### Métricas e Alarmes
- **Métricas de Aplicação**: Tempos de resposta, taxas de erro
- **Métricas de Infraestrutura**: Utilização de CPU, memória, rede
- **Métricas de Negócio**: Taxas de conclusão de conversa, uso de persona
- **Alarmes Customizados**: Detecção proativa de problemas

### Monitoramento de Saúde
- **Endpoints de Saúde**: /health para status do serviço
- **Verificações de Dependência**: Conectividade de serviços externos
- **Degradação Graciosa**: Monitoramento de comportamento de fallback

## Considerações Futuras de Arquitetura

### Melhorias de Escalabilidade
- **Integração de Banco de Dados**: Considerar RDS para armazenamento persistente
- **Camada de Cache**: Redis/ElastiCache para estado de sessão
- **Microsserviços**: Maior decomposição de serviços

### Melhorias AI/ML
- **Fine-tuning de Modelo**: Treinamento de modelo customizado
- **Testes A/B**: Comparação de múltiplos modelos
- **Analytics de Conversa**: Insights avançados de uso

### Melhorias de Segurança
- **Regras WAF**: Proteção aprimorada contra ataques
- **API Gateway**: Considerar migração para recursos avançados
- **Conformidade**: Considerações SOC 2, GDPR

Esta arquitetura fornece uma base robusta, escalável e segura para a plataforma Group Chat AI, mantendo flexibilidade para futuras melhorias e crescimento.