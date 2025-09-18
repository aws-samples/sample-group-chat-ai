
> • 🇺🇸 **This document is also available in:** [English](../THREAT_MODEL.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./THREAT_MODEL_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./THREAT_MODEL_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./THREAT_MODEL_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./THREAT_MODEL_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./THREAT_MODEL_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./THREAT_MODEL_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./THREAT_MODEL_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./THREAT_MODEL_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./THREAT_MODEL_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](#)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./THREAT_MODEL_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./THREAT_MODEL_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./THREAT_MODEL_zh.md)

<!--
 Copyright 2025 Amazon.com, Inc. or its affiliates.
 SPDX-License-Identifier: MIT-0
-->

# Group Chat AI
## Informações da Aplicação
Esta é uma plataforma de IA conversacional em tempo real que permite aos usuários praticar apresentações com múltiplas personas de IA. As funcionalidades incluem comunicação WebSocket, síntese de voz, upload de imagens, criação de personas personalizadas e integração com AWS Bedrock para processamento de LLM.

## Arquitetura
### Introdução
**Visão Geral da Arquitetura do Group Chat:**

1. **Camada Frontend**: Aplicação React servida via Amazon CloudFront com hospedagem estática S3, suportando conexões WebSocket em tempo real e uploads de imagem
2. **Autenticação**: Amazon Cognito User Pool com OAuth 2.0/OIDC para gerenciamento seguro de usuários
3. **Segurança de Rede**: Arquitetura VPC com ALB restrito aos intervalos de IP do CloudFront, sub-redes privadas para serviços backend
4. **Serviços Backend**: ECS Fargate hospedando servidor Express.js com suporte WebSocket, ConversationOrchestrator, PersonaManager e SessionService
5. **Integração de IA**: Amazon Bedrock para processamento LLM (modelos Claude), AWS Polly para síntese de voz com vozes específicas por persona
6. **Configuração**: Parameter Store para configuração centralizada, CloudWatch para monitoramento e logging abrangentes

## Fluxo de Dados
### Introdução
#### Entidades:

| Entidade | Descrição |
|-|-|
| User | Indivíduo praticando apresentações com personas de IA |
| React Frontend | Aplicação web com chat em tempo real e capacidades de voz |
| CloudFront | CDN servindo frontend e fazendo proxy de requisições API/WebSocket |
| Amazon Cognito | Autenticação de usuário e gerenciamento de sessão |
| ALB | Application Load Balancer com restrições de IP do CloudFront |
| ECS Backend | Servidor Express.js com WebSocket e orquestração de IA |
| Amazon Bedrock | Serviço LLM para respostas de personas de IA |
| Amazon Polly | Serviço de texto para fala para síntese de voz |
| Parameter Store | Serviço de gerenciamento de configuração |

#### Fluxos de dados:

| ID do Fluxo | Descrição | Origem | Destino | Ativos |
|-|-|-|-|-|
| DF1 | Fluxo de autenticação do usuário | User | Amazon Cognito | Credenciais do usuário, tokens JWT |
| DF2 | Acesso à aplicação frontend | User | CloudFront | Requisições HTTP, ativos estáticos |
| DF3 | Comunicação em tempo real | User | ECS Backend | Conexões WebSocket, mensagens de chat |
| DF4 | Roteamento de requisições API | CloudFront | ALB | Requisições API autenticadas |
| DF5 | Processamento de conversação de IA | ECS Backend | Amazon Bedrock | Prompts do usuário, respostas de personas |
| DF6 | Requisições de síntese de voz | ECS Backend | Amazon Polly | Conteúdo de texto, streams de áudio |
| DF7 | Upload e análise de imagem | User | ECS Backend | Arquivos de imagem, resultados de análise |
| DF8 | Recuperação de configuração | ECS Backend | Parameter Store | Configuração da aplicação |
| DF9 | Gerenciamento de estado de sessão | ECS Backend | In-Memory Store | Sessões de usuário, histórico de conversação |

#### Limites de confiança:

| ID do Limite | Propósito | Origem | Destino |
|-|-|-|-|
| TB1 | Limite Internet/CDN | User | CloudFront |
| TB2 | Limite CDN/Load Balancer | CloudFront | ALB |
| TB3 | Limite Load Balancer/Aplicação | ALB | ECS Backend |
| TB4 | Limite Aplicação/Serviços de IA | ECS Backend | Amazon Bedrock |
| TB5 | Limite Aplicação/Serviços de Voz | ECS Backend | Amazon Polly |
| TB6 | Limite Aplicação/Configuração | ECS Backend | Parameter Store |
| TB7 | Limite de isolamento de sessão de usuário | User Session A | User Session B |

#### Fontes de ameaças:

| Categoria | Descrição | Exemplos |
|-|-|-|
| Atacantes Externos | Usuários não autorizados tentando acesso ao sistema | Atacantes web, abusadores de API |
| Usuários Maliciosos | Usuários autenticados com intenção maliciosa | Atacantes de injeção de prompt, tentativas de exfiltração de dados |
| Contas Comprometidas | Contas legítimas sob controle de atacantes | Sequestradores de sessão, atacantes de força bruta de credenciais |
| Ameaças de Modelo de IA | Ameaças direcionadas a componentes de IA/LLM | Manipulação de modelo, injeção de prompt |
| Ameaças de Infraestrutura | Ameaças aos serviços AWS subjacentes | Interrupção de serviço, adulteração de configuração |

## Premissas

| Número da Premissa | Premissa | Ameaças Vinculadas | Mitigações Vinculadas | Comentários |
| --- | --- | --- | --- | --- |
| <a name="A-0005"></a>A-0005 | Dados de configuração sensíveis não contêm segredos ou credenciais codificados | [**T-0008**](#T-0008): Um ator interno pode negar fazer requisições inadequadas para persona de IA, o que leva à falta de responsabilização pelo abuso do sistema, resultando em responsabilização reduzida de logs de auditoria e registros de conformidade<br/>[**T-0009**](#T-0009): Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas |  |  |
| <a name="A-0004"></a>A-0004 | A aplicação passa por testes de segurança regulares e avaliações de vulnerabilidade | [**T-0003**](#T-0003): Um usuário malicioso com credenciais de sessão válidas pode acessar sessões de conversação de outros usuários, o que leva à divulgação não autorizada de dados e violação de privacidade, resultando em confidencialidade reduzida de conversações de usuários e dados de sessão<br/>[**T-0006**](#T-0006): Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação<br/>[**T-0007**](#T-0007): Um usuário malicioso pode abusar do serviço de síntese de voz com requisições excessivas, o que leva ao esgotamento de recursos e aumento de custos, resultando em disponibilidade reduzida do Voice Service<br/>[**T-0008**](#T-0008): Um ator interno pode negar fazer requisições inadequadas para persona de IA, o que leva à falta de responsabilização pelo abuso do sistema, resultando em responsabilização reduzida de logs de auditoria e registros de conformidade<br/>[**T-0009**](#T-0009): Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas |  |  |
| <a name="A-0003"></a>A-0003 | Os serviços Amazon Bedrock e Polly possuem controles de segurança integrados contra abuso |  |  |  |
| <a name="A-0002"></a>A-0002 | As restrições de IP do CloudFront estão configuradas adequadamente para prevenir bypass do ALB |  |  |  |
| <a name="A-0001"></a>A-0001 | Os controles de segurança da infraestrutura AWS estão configurados e mantidos adequadamente | [**T-0001**](#T-0001): Um usuário malicioso com acesso autenticado ao sistema pode injetar prompts maliciosos em conversações de personas de IA, o que leva à manipulação de respostas de IA e potencial comprometimento do sistema, resultando em confidencialidade e/ou integridade reduzidas de respostas de personas de IA e dados de conversação<br/>[**T-0002**](#T-0002): Um atacante externo pode contornar o CloudFront e acessar diretamente o ALB, o que leva ao acesso não autorizado à API e potencial comprometimento do sistema, resultando em confidencialidade, integridade e/ou disponibilidade reduzidas de serviços backend e dados de usuários<br/>[**T-0004**](#T-0004): Um ator de ameaça externo pode inundar o sistema com requisições de conexão WebSocket, o que leva à degradação do serviço e negação de serviço, resultando em disponibilidade reduzida do serviço WebSocket e serviço de API backend<br/>[**T-0005**](#T-0005): Um usuário malicioso pode fazer upload de imagens maliciosas contendo código executável ou malware, o que leva à potencial execução de código ou comprometimento do sistema, resultando em integridade e/ou disponibilidade reduzidas do serviço de processamento de imagem e infraestrutura backend<br/>[**T-0006**](#T-0006): Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação |  |  |

## Ameaças

| Número da Ameaça | Ameaça | Mitigações | Premissas | Status | Prioridade | STRIDE | Comentários |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a name="T-0009"></a>T-0009 | Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas | [**M-0008**](#M-0008): Usar tokens JWT com expiração e validação apropriadas<br/>[**M-0010**](#M-0010): Implementar tratamento adequado de erros para prevenir divulgação de informações<br/>[**M-0007**](#M-0007): Implementar logging e monitoramento abrangentes para eventos de segurança<br/>[**M-0003**](#M-0003): Aplicar isolamento rigoroso de sessão e implementar verificações adequadas de autorização | [**A-0005**](#A-0005): Dados de configuração sensíveis não contêm segredos ou credenciais codificados<br/>[**A-0004**](#A-0004): A aplicação passa por testes de segurança regulares e avaliações de vulnerabilidade |  Resolvido | Médio |  |  |
| <a name="T-0008"></a>T-0008 | Um ator interno pode negar fazer requisições inadequadas para persona de IA, o que leva à falta de responsabilização pelo abuso do sistema, resultando em responsabilização reduzida de logs de auditoria e registros de conformidade | [**M-0008**](#M-0008): Usar tokens JWT com expiração e validação apropriadas<br/>[**M-0010**](#M-0010): Implementar tratamento adequado de erros para prevenir divulgação de informações<br/>[**M-0003**](#M-0003): Aplicar isolamento rigoroso de sessão e implementar verificações adequadas de autorização | [**A-0005**](#A-0005): Dados de configuração sensíveis não contêm segredos ou credenciais codificados<br/>[**A-0004**](#A-0004): A aplicação passa por testes de segurança regulares e avaliações de vulnerabilidade |  Resolvido | Baixo |  |  |
| <a name="T-0007"></a>T-0007 | Um usuário malicioso pode abusar do serviço de síntese de voz com requisições excessivas, o que leva ao esgotamento de recursos e aumento de custos, resultando em disponibilidade reduzida do Voice Service | [**M-0004**](#M-0004): Implementar limitação de taxa em endpoints de API e conexões WebSocket | [**A-0004**](#A-0004): A aplicação passa por testes de segurança regulares e avaliações de vulnerabilidade |  Resolvido | Médio |  |  |
| <a name="T-0006"></a>T-0006 | Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação | [**M-0008**](#M-0008): Usar tokens JWT com expiração e validação apropriadas<br/>[**M-0006**](#M-0006): Usar AWS WAF com CloudFront para proteger contra ataques web comuns<br/>[**M-0003**](#M-0003): Aplicar isolamento rigoroso de sessão e implementar verificações adequadas de autorização<br/>[**M-0010**](#M-0010): Implementar tratamento adequado de erros para prevenir divulgação de informações | [**A-0004**](#A-0004): A aplicação passa por testes de segurança regulares e avaliações de vulnerabilidade<br/>[**A-0001**](#A-0001): Os controles de segurança da infraestrutura AWS estão configurados e mantidos adequadamente |  Resolvido | Médio |  |  |
| <a name="T-0005"></a>T-0005 | Um usuário malicioso pode fazer upload de imagens maliciosas contendo código executável ou malware, o que leva à potencial execução de código ou comprometimento do sistema, resultando em integridade e/ou disponibilidade reduzidas do serviço de processamento de imagem e infraestrutura backend | [**M-0005**](#M-0005): Validar e sanitizar uploads de imagem com restrições de tipo de arquivo e tamanho | [**A-0001**](#A-0001): Os controles de segurança da infraestrutura AWS estão configurados e mantidos adequadamente |  Resolvido | Médio |  |  |
| <a name="T-0004"></a>T-0004 | Um ator de ameaça externo pode inundar o sistema com requisições de conexão WebSocket, o que leva à degradação do serviço e negação de serviço, resultando em disponibilidade reduzida do serviço WebSocket e serviço de API backend | [**M-0004**](#M-0004): Implementar limitação de taxa em endpoints de API e conexões WebSocket | [**A-0001**](#A-0001): Os controles de segurança da infraestrutura AWS estão configurados e mantidos adequadamente |  Resolvido | Médio |  |  |
| <a name="T-0003"></a>T-0003 | Um usuário malicioso com credenciais de sessão válidas pode acessar sessões de conversação de outros usuários, o que leva à divulgação não autorizada de dados e violação de privacidade, resultando em confidencialidade reduzida de conversações de usuários e dados de sessão | [**M-0008**](#M-0008): Usar tokens JWT com expiração e validação apropriadas<br/>[**M-0006**](#M-0006): Usar AWS WAF com CloudFront para proteger contra ataques web comuns | [**A-0004**](#A-0004): A aplicação passa por testes de segurança regulares e avaliações de vulnerabilidade |  Resolvido | Médio |  |  |
| <a name="T-0002"></a>T-0002 | Um atacante externo pode contornar o CloudFront e acessar diretamente o ALB, o que leva ao acesso não autorizado à API e potencial comprometimento do sistema, resultando em confidencialidade, integridade e/ou disponibilidade reduzidas de serviços backend e dados de usuários | [**M-0009**](#M-0009): Restringir acesso ao ALB apenas aos intervalos de IP do CloudFront | [**A-0001**](#A-0001): Os controles de segurança da infraestrutura AWS estão configurados e mantidos adequadamente |  Resolvido | Médio |  |  |
| <a name="T-0001"></a>T-0001 | Um usuário malicioso com acesso autenticado ao sistema pode injetar prompts maliciosos em conversações de personas de IA, o que leva à manipulação de respostas de IA e potencial comprometimento do sistema, resultando em confidencialidade e/ou integridade reduzidas de respostas de personas de IA e dados de conversação | [**M-0002**](#M-0002): Usar prompts parametrizados e isolamento de prompt para prevenir injeção de prompt de IA<br/>[**M-0001**](#M-0001): Implementar validação e sanitização abrangentes de entrada para todas as entradas de usuário<br/>[**M-0008**](#M-0008): Usar tokens JWT com expiração e validação apropriadas | [**A-0001**](#A-0001): Os controles de segurança da infraestrutura AWS estão configurados e mantidos adequadamente |  Resolvido | Alto |  |  |

## Mitigações

| Número da Mitigação | Mitigação | Ameaças Mitigadas | Premissas | Status | Comentários |
| --- | --- | --- | --- | --- | --- |
| <a name="M-0010"></a>M-0010 | Implementar tratamento adequado de erros para prevenir divulgação de informações | [**T-0006**](#T-0006): Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação<br/>[**T-0008**](#T-0008): Um ator interno pode negar fazer requisições inadequadas para persona de IA, o que leva à falta de responsabilização pelo abuso do sistema, resultando em responsabilização reduzida de logs de auditoria e registros de conformidade<br/>[**T-0009**](#T-0009): Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas |  | Resolvido |  |
| <a name="M-0009"></a>M-0009 | Restringir acesso ao ALB apenas aos intervalos de IP do CloudFront | [**T-0002**](#T-0002): Um atacante externo pode contornar o CloudFront e acessar diretamente o ALB, o que leva ao acesso não autorizado à API e potencial comprometimento do sistema, resultando em confidencialidade, integridade e/ou disponibilidade reduzidas de serviços backend e dados de usuários |  | Resolvido |  |
| <a name="M-0008"></a>M-0008 | Usar tokens JWT com expiração e validação apropriadas | [**T-0001**](#T-0001): Um usuário malicioso com acesso autenticado ao sistema pode injetar prompts maliciosos em conversações de personas de IA, o que leva à manipulação de respostas de IA e potencial comprometimento do sistema, resultando em confidencialidade e/ou integridade reduzidas de respostas de personas de IA e dados de conversação<br/>[**T-0003**](#T-0003): Um usuário malicioso com credenciais de sessão válidas pode acessar sessões de conversação de outros usuários, o que leva à divulgação não autorizada de dados e violação de privacidade, resultando em confidencialidade reduzida de conversações de usuários e dados de sessão<br/>[**T-0006**](#T-0006): Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação<br/>[**T-0008**](#T-0008): Um ator interno pode negar fazer requisições inadequadas para persona de IA, o que leva à falta de responsabilização pelo abuso do sistema, resultando em responsabilização reduzida de logs de auditoria e registros de conformidade<br/>[**T-0009**](#T-0009): Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas |  | Resolvido |  |
| <a name="M-0007"></a>M-0007 | Implementar logging e monitoramento abrangentes para eventos de segurança | [**T-0009**](#T-0009): Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas |  | Resolvido |  |
| <a name="M-0006"></a>M-0006 | Usar AWS WAF com CloudFront para proteger contra ataques web comuns | [**T-0003**](#T-0003): Um usuário malicioso com credenciais de sessão válidas pode acessar sessões de conversação de outros usuários, o que leva à divulgação não autorizada de dados e violação de privacidade, resultando em confidencialidade reduzida de conversações de usuários e dados de sessão<br/>[**T-0006**](#T-0006): Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação |  | Resolvido |  |
| <a name="M-0005"></a>M-0005 | Validar e sanitizar uploads de imagem com restrições de tipo de arquivo e tamanho | [**T-0005**](#T-0005): Um usuário malicioso pode fazer upload de imagens maliciosas contendo código executável ou malware, o que leva à potencial execução de código ou comprometimento do sistema, resultando em integridade e/ou disponibilidade reduzidas do serviço de processamento de imagem e infraestrutura backend |  | Resolvido |  |
| <a name="M-0004"></a>M-0004 | Implementar limitação de taxa em endpoints de API e conexões WebSocket | [**T-0004**](#T-0004): Um ator de ameaça externo pode inundar o sistema com requisições de conexão WebSocket, o que leva à degradação do serviço e negação de serviço, resultando em disponibilidade reduzida do serviço WebSocket e serviço de API backend<br/>[**T-0007**](#T-0007): Um usuário malicioso pode abusar do serviço de síntese de voz com requisições excessivas, o que leva ao esgotamento de recursos e aumento de custos, resultando em disponibilidade reduzida do Voice Service |  | Resolvido |  |
| <a name="M-0003"></a>M-0003 | Aplicar isolamento rigoroso de sessão e implementar verificações adequadas de autorização | [**T-0006**](#T-0006): Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação<br/>[**T-0008**](#T-0008): Um ator interno pode negar fazer requisições inadequadas para persona de IA, o que leva à falta de responsabilização pelo abuso do sistema, resultando em responsabilização reduzida de logs de auditoria e registros de conformidade<br/>[**T-0009**](#T-0009): Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas |  | Resolvido |  |
| <a name="M-0002"></a>M-0002 | Usar prompts parametrizados e isolamento de prompt para prevenir injeção de prompt de IA | [**T-0001**](#T-0001): Um usuário malicioso com acesso autenticado ao sistema pode injetar prompts maliciosos em conversações de personas de IA, o que leva à manipulação de respostas de IA e potencial comprometimento do sistema, resultando em confidencialidade e/ou integridade reduzidas de respostas de personas de IA e dados de conversação |  | Resolvido |  |
| <a name="M-0001"></a>M-0001 | Implementar validação e sanitização abrangentes de entrada para todas as entradas de usuário | [**T-0001**](#T-0001): Um usuário malicioso com acesso autenticado ao sistema pode injetar prompts maliciosos em conversações de personas de IA, o que leva à manipulação de respostas de IA e potencial comprometimento do sistema, resultando em confidencialidade e/ou integridade reduzidas de respostas de personas de IA e dados de conversação |  | Resolvido |  |

## Ativos Impactados

| Número dos Ativos | Ativo | Ameaças Relacionadas |
| --- | --- | --- |
| AS-0001 | histórico de conversação | [**T-0009**](#T-0009): Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas |
| AS-0002 | respostas de personas | [**T-0009**](#T-0009): Um usuário malicioso com acesso ao sistema pode manipular histórico de conversação ou respostas de personas, o que leva à adulteração de dados e perda de integridade da conversação, resultando em integridade reduzida do histórico de conversação e respostas de personas |
| AS-0003 | logs de auditoria | [**T-0008**](#T-0008): Um ator interno pode negar fazer requisições inadequadas para persona de IA, o que leva à falta de responsabilização pelo abuso do sistema, resultando em responsabilização reduzida de logs de auditoria e registros de conformidade |
| AS-0004 | registros de conformidade | [**T-0008**](#T-0008): Um ator interno pode negar fazer requisições inadequadas para persona de IA, o que leva à falta de responsabilização pelo abuso do sistema, resultando em responsabilização reduzida de logs de auditoria e registros de conformidade |
| AS-0005 | Voice Service | [**T-0007**](#T-0007): Um usuário malicioso pode abusar do serviço de síntese de voz com requisições excessivas, o que leva ao esgotamento de recursos e aumento de custos, resultando em disponibilidade reduzida do Voice Service |
| AS-0006 | contas de usuários | [**T-0006**](#T-0006): Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação |
| AS-0007 | dados de conversação | [**T-0006**](#T-0006): Um ator de ameaça externo com JWT Tokens roubados ou comprometidos pode se passar por usuários legítimos, o que leva ao acesso não autorizado a contas de usuários e dados, resultando em confidencialidade e/ou integridade reduzidas de contas de usuários e dados de conversação<br/>[**T-0001**](#T-0001): Um usuário malicioso com acesso autenticado ao sistema pode injetar prompts maliciosos em conversações de personas de IA, o que leva à manipulação de respostas de IA e potencial comprometimento do sistema, resultando em confidencialidade e/ou integridade reduzidas de respostas de personas de IA e dados de conversação |
| AS-0008 | serviço de processamento de imagem | [**T-0005**](#T-0005): Um usuário malicioso pode fazer upload de imagens maliciosas contendo código executável ou malware, o que leva à potencial execução de código ou comprometimento do sistema, resultando em integridade e/ou disponibilidade reduzidas do serviço de processamento de imagem e infraestrutura backend |
| AS-0009 | infraestrutura backend | [**T-0005**](#T-0005): Um usuário malicioso pode fazer upload de imagens maliciosas contendo código executável ou malware, o que leva à potencial execução de código ou comprometimento do sistema, resultando em integridade e/ou disponibilidade reduzidas do serviço de processamento de imagem e infraestrutura backend |
| AS-0010 | serviço WebSocket | [**T-0004**](#T-0004): Um ator de ameaça externo pode inundar o sistema com requisições de conexão WebSocket, o que leva à degradação do serviço e negação de serviço, resultando em disponibilidade reduzida do serviço WebSocket e serviço de API backend |
| AS-0011 | serviço de API backend | [**T-0004**](#T-0004): Um ator de ameaça externo pode inundar o sistema com requisições de conexão WebSocket, o que leva à degradação do serviço e negação de serviço, resultando em disponibilidade reduzida do serviço WebSocket e serviço de API backend |
| AS-0012 | conversações de usuários | [**T-0003**](#T-0003): Um usuário malicioso com credenciais de sessão válidas pode acessar sessões de conversação de outros usuários, o que leva à divulgação não autorizada de dados e violação de privacidade, resultando em confidencialidade reduzida de conversações de usuários e dados de sessão |
| AS-0013 | dados de sessão | [**T-0003**](#T-0003): Um usuário malicioso com credenciais de sessão válidas pode acessar sessões de conversação de outros usuários, o que leva à divulgação não autorizada de dados e violação de privacidade, resultando em confidencialidade reduzida de conversações de usuários e dados de sessão |
| AS-0014 | serviços backend | [**T-0002**](#T-0002): Um atacante externo pode contornar o CloudFront e acessar diretamente o ALB, o que leva ao acesso não autorizado à API e potencial comprometimento do sistema, resultando em confidencialidade, integridade e/ou disponibilidade reduzidas de serviços backend e dados de usuários |
| AS-0015 | dados de usuários | [**T-0002**](#T-0002): Um atacante externo pode contornar o CloudFront e acessar diretamente o ALB, o que leva ao acesso não autorizado à API e potencial comprometimento do sistema, resultando em confidencialidade, integridade e/ou disponibilidade reduzidas de serviços backend e dados de usuários |
| AS-0016 | respostas de personas de IA | [**T-0001**](#T-0001): Um usuário malicioso com acesso autenticado ao sistema pode injetar prompts maliciosos em conversações de personas de IA, o que leva à manipulação de respostas de IA e potencial comprometimento do sistema, resultando em confidencialidade e/ou integridade reduzidas de respostas de personas de IA e dados de conversação |