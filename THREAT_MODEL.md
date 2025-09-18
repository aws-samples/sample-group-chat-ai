


> • 🇺🇸 **This document is also available in:** [English](#)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./docs/ar/THREAT_MODEL_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./docs/de/THREAT_MODEL_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./docs/es/THREAT_MODEL_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./docs/fr/THREAT_MODEL_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./docs/he/THREAT_MODEL_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./docs/it/THREAT_MODEL_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./docs/ja/THREAT_MODEL_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./docs/ko/THREAT_MODEL_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./docs/nl/THREAT_MODEL_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./docs/pt/THREAT_MODEL_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./docs/ru/THREAT_MODEL_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./docs/sv/THREAT_MODEL_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./docs/zh/THREAT_MODEL_zh.md)

<!--
 Copyright 2025 Amazon.com, Inc. or its affiliates.
 SPDX-License-Identifier: MIT-0
-->

# Group Chat AI
## Application Info
This is a real-time conversational AI platform enabling users to practice presentations with multiple AI personas. Features include WebSocket communication, voice synthesis, image uploads, custom persona creation, and AWS Bedrock integration for LLM processing.

## Architecture
### Introduction
**Group Chat Architecture Overview:**

1. **Frontend Layer**: React application served via Amazon CloudFront with S3 static hosting, supporting real-time WebSocket connections and image uploads
2. **Authentication**: Amazon Cognito User Pool with OAuth 2.0/OIDC for secure user management
3. **Network Security**: VPC architecture with ALB restricted to CloudFront IP ranges, private subnets for backend services
4. **Backend Services**: ECS Fargate hosting Express.js server with WebSocket support, ConversationOrchestrator, PersonaManager, and SessionService
5. **AI Integration**: Amazon Bedrock for LLM processing (Claude models), AWS Polly for voice synthesis with persona-specific voices
6. **Configuration**: Parameter Store for centralized configuration, CloudWatch for comprehensive monitoring and logging

## Dataflow
### Introduction
#### Entities:

| Entity | Description |
|-|-|
| User | Individual practicing presentations with AI personas |
| React Frontend | Web application with real-time chat and voice capabilities |
| CloudFront | CDN serving frontend and proxying API/WebSocket requests |
| Amazon Cognito | User authentication and session management |
| ALB | Application Load Balancer with CloudFront IP restrictions |
| ECS Backend | Express.js server with WebSocket and AI orchestration |
| Amazon Bedrock | LLM service for AI persona responses |
| Amazon Polly | Text-to-speech service for voice synthesis |
| Parameter Store | Configuration management service |

#### Data flows:

| Flow ID | Description | Source | Target | Assets |
|-|-|-|-|-|
| DF1 | User authentication flow | User | Amazon Cognito | User credentials, JWT tokens |
| DF2 | Frontend application access | User | CloudFront | HTTP requests, static assets |
| DF3 | Real-time communication | User | ECS Backend | WebSocket connections, chat messages |
| DF4 | API request routing | CloudFront | ALB | Authenticated API requests |
| DF5 | AI conversation processing | ECS Backend | Amazon Bedrock | User prompts, persona responses |
| DF6 | Voice synthesis requests | ECS Backend | Amazon Polly | Text content, audio streams |
| DF7 | Image upload and analysis | User | ECS Backend | Image files, analysis results |
| DF8 | Configuration retrieval | ECS Backend | Parameter Store | Application configuration |
| DF9 | Session state management | ECS Backend | In-Memory Store | User sessions, conversation history |

#### Trust boundaries:

| Boundary ID | Purpose | Source | Target |
|-|-|-|-|
| TB1 | Internet/CDN boundary | User | CloudFront |
| TB2 | CDN/Load Balancer boundary | CloudFront | ALB |
| TB3 | Load Balancer/Application boundary | ALB | ECS Backend |
| TB4 | Application/AI Services boundary | ECS Backend | Amazon Bedrock |
| TB5 | Application/Voice Services boundary | ECS Backend | Amazon Polly |
| TB6 | Application/Configuration boundary | ECS Backend | Parameter Store |
| TB7 | User session isolation boundary | User Session A | User Session B |

#### Threat sources:

| Category | Description | Examples |
|-|-|-|
| External Attackers | Unauthorized users attempting system access | Web attackers, API abusers |
| Malicious Users | Authenticated users with malicious intent | Prompt injection attackers, data exfiltration attempts |
| Compromised Accounts | Legitimate accounts under attacker control | Session hijackers, credential stuffers |
| AI Model Threats | Threats targeting AI/LLM components | Model manipulation, prompt injection |
| Infrastructure Threats | Threats to underlying AWS services | Service disruption, configuration tampering |

## Assumptions

| Assumption Number | Assumption | Linked Threats | Linked Mitigations | Comments |
| --- | --- | --- | --- | --- |
| <a name="A-0005"></a>A-0005 | Sensitive configuration data does not contain hardcoded secrets or credentials | [**T-0008**](#T-0008): An internal actor can deny making inappropriate requests to AI persona, which leads to lack of accountability for system abuse, resulting in reduced accountability of audit logs and compliance records<br/>[**T-0009**](#T-0009): A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses |  |  |
| <a name="A-0004"></a>A-0004 | Application undergoes regular security testing and vulnerability assessments | [**T-0003**](#T-0003): A malicious user with valid session credentials can access other users' conversation sessions, which leads to unauthorized data disclosure and privacy violation, resulting in reduced confidentiality of user conversations and session data<br/>[**T-0006**](#T-0006): An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data<br/>[**T-0007**](#T-0007): A malicious user can abuse the voice synthesis service with excess requests, which leads to resource exhaustion and increased costs, resulting in reduced availability of Voice Service<br/>[**T-0008**](#T-0008): An internal actor can deny making inappropriate requests to AI persona, which leads to lack of accountability for system abuse, resulting in reduced accountability of audit logs and compliance records<br/>[**T-0009**](#T-0009): A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses |  |  |
| <a name="A-0003"></a>A-0003 | Amazon Bedrock and Polly services have built-in security controls against abuse |  |  |  |
| <a name="A-0002"></a>A-0002 | CloudFront IP restrictions are properly configured to prevent ALB bypass |  |  |  |
| <a name="A-0001"></a>A-0001 | AWS infrastructure security controls are properly configured and maintained | [**T-0001**](#T-0001): A malicious user with authenticated access to the system can inject malicious prompts into AI persona conversations, which leads to manipulation of AI responses and potential system compromise, resulting in reduced confidentiality and\/or integrity of AI persona responses and conversation data<br/>[**T-0002**](#T-0002): An external attacker can bypass CloudFront and directly access the ALB, which leads to unauthorized API access and potential system compromise, resulting in reduced confidentiality, integrity and\/or availability of backend services and user data<br/>[**T-0004**](#T-0004): An external threat actor can flood the system with WebSocket connection requests, which leads to service degredation and denial of service, resulting in reduced availability of WebSocket service and backend API service<br/>[**T-0005**](#T-0005): A malicious user can upload malicious images containing executable code or malware, which leads to potential code execution or system compromise, resulting in reduced integrity and\/or availability of image processing service and backend infrastructure<br/>[**T-0006**](#T-0006): An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data |  |  |

## Threats

| Threat Number | Threat | Mitigations | Assumptions | Status | Priority | STRIDE | Comments |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a name="T-0009"></a>T-0009 | A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses | [**M-0008**](#M-0008): Use JWT tokens with appropriate expiration and validation<br/>[**M-0010**](#M-0010): Implement proper error handling to prevent information disclosure<br/>[**M-0007**](#M-0007): Implement comprehensive logging and monitoring for security events<br/>[**M-0003**](#M-0003): Enforce strict session isolation and implement proper authorization checks | [**A-0005**](#A-0005): Sensitive configuration data does not contain hardcoded secrets or credentials<br/>[**A-0004**](#A-0004): Application undergoes regular security testing and vulnerability assessments |  Resolved | Medium |  |  |
| <a name="T-0008"></a>T-0008 | An internal actor can deny making inappropriate requests to AI persona, which leads to lack of accountability for system abuse, resulting in reduced accountability of audit logs and compliance records | [**M-0008**](#M-0008): Use JWT tokens with appropriate expiration and validation<br/>[**M-0010**](#M-0010): Implement proper error handling to prevent information disclosure<br/>[**M-0003**](#M-0003): Enforce strict session isolation and implement proper authorization checks | [**A-0005**](#A-0005): Sensitive configuration data does not contain hardcoded secrets or credentials<br/>[**A-0004**](#A-0004): Application undergoes regular security testing and vulnerability assessments |  Resolved | Low |  |  |
| <a name="T-0007"></a>T-0007 | A malicious user can abuse the voice synthesis service with excess requests, which leads to resource exhaustion and increased costs, resulting in reduced availability of Voice Service | [**M-0004**](#M-0004): Implement rate limiting on API endpoints and WebSocket connections | [**A-0004**](#A-0004): Application undergoes regular security testing and vulnerability assessments |  Resolved | Medium |  |  |
| <a name="T-0006"></a>T-0006 | An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data | [**M-0008**](#M-0008): Use JWT tokens with appropriate expiration and validation<br/>[**M-0006**](#M-0006): Use AWS WAF with CloudFront to protect against common web attacks<br/>[**M-0003**](#M-0003): Enforce strict session isolation and implement proper authorization checks<br/>[**M-0010**](#M-0010): Implement proper error handling to prevent information disclosure | [**A-0004**](#A-0004): Application undergoes regular security testing and vulnerability assessments<br/>[**A-0001**](#A-0001): AWS infrastructure security controls are properly configured and maintained |  Resolved | Medium |  |  |
| <a name="T-0005"></a>T-0005 | A malicious user can upload malicious images containing executable code or malware, which leads to potential code execution or system compromise, resulting in reduced integrity and\/or availability of image processing service and backend infrastructure | [**M-0005**](#M-0005): Validate and sanitize image uploads with file type and size restrictions | [**A-0001**](#A-0001): AWS infrastructure security controls are properly configured and maintained |  Resolved | Medium |  |  |
| <a name="T-0004"></a>T-0004 | An external threat actor can flood the system with WebSocket connection requests, which leads to service degredation and denial of service, resulting in reduced availability of WebSocket service and backend API service | [**M-0004**](#M-0004): Implement rate limiting on API endpoints and WebSocket connections | [**A-0001**](#A-0001): AWS infrastructure security controls are properly configured and maintained |  Resolved | Medium |  |  |
| <a name="T-0003"></a>T-0003 | A malicious user with valid session credentials can access other users' conversation sessions, which leads to unauthorized data disclosure and privacy violation, resulting in reduced confidentiality of user conversations and session data | [**M-0008**](#M-0008): Use JWT tokens with appropriate expiration and validation<br/>[**M-0006**](#M-0006): Use AWS WAF with CloudFront to protect against common web attacks | [**A-0004**](#A-0004): Application undergoes regular security testing and vulnerability assessments |  Resolved | Medium |  |  |
| <a name="T-0002"></a>T-0002 | An external attacker can bypass CloudFront and directly access the ALB, which leads to unauthorized API access and potential system compromise, resulting in reduced confidentiality, integrity and\/or availability of backend services and user data | [**M-0009**](#M-0009): Restrict ALB access to CloudFront IP ranges only | [**A-0001**](#A-0001): AWS infrastructure security controls are properly configured and maintained |  Resolved | Medium |  |  |
| <a name="T-0001"></a>T-0001 | A malicious user with authenticated access to the system can inject malicious prompts into AI persona conversations, which leads to manipulation of AI responses and potential system compromise, resulting in reduced confidentiality and\/or integrity of AI persona responses and conversation data | [**M-0002**](#M-0002): Use parameterized prompts and prompt isolation to prevent AI prompt injection<br/>[**M-0001**](#M-0001): Implement comprehensive input validation and sanitization for all user inputs<br/>[**M-0008**](#M-0008): Use JWT tokens with appropriate expiration and validation | [**A-0001**](#A-0001): AWS infrastructure security controls are properly configured and maintained |  Resolved | High |  |  |

## Mitigations

| Mitigation Number | Mitigation | Threats Mitigating | Assumptions | Status | Comments |
| --- | --- | --- | --- | --- | --- |
| <a name="M-0010"></a>M-0010 | Implement proper error handling to prevent information disclosure | [**T-0006**](#T-0006): An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data<br/>[**T-0008**](#T-0008): An internal actor can deny making inappropriate requests to AI persona, which leads to lack of accountability for system abuse, resulting in reduced accountability of audit logs and compliance records<br/>[**T-0009**](#T-0009): A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses |  | Resolved |  |
| <a name="M-0009"></a>M-0009 | Restrict ALB access to CloudFront IP ranges only | [**T-0002**](#T-0002): An external attacker can bypass CloudFront and directly access the ALB, which leads to unauthorized API access and potential system compromise, resulting in reduced confidentiality, integrity and\/or availability of backend services and user data |  | Resolved |  |
| <a name="M-0008"></a>M-0008 | Use JWT tokens with appropriate expiration and validation | [**T-0001**](#T-0001): A malicious user with authenticated access to the system can inject malicious prompts into AI persona conversations, which leads to manipulation of AI responses and potential system compromise, resulting in reduced confidentiality and\/or integrity of AI persona responses and conversation data<br/>[**T-0003**](#T-0003): A malicious user with valid session credentials can access other users' conversation sessions, which leads to unauthorized data disclosure and privacy violation, resulting in reduced confidentiality of user conversations and session data<br/>[**T-0006**](#T-0006): An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data<br/>[**T-0008**](#T-0008): An internal actor can deny making inappropriate requests to AI persona, which leads to lack of accountability for system abuse, resulting in reduced accountability of audit logs and compliance records<br/>[**T-0009**](#T-0009): A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses |  | Resolved |  |
| <a name="M-0007"></a>M-0007 | Implement comprehensive logging and monitoring for security events | [**T-0009**](#T-0009): A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses |  | Resolved |  |
| <a name="M-0006"></a>M-0006 | Use AWS WAF with CloudFront to protect against common web attacks | [**T-0003**](#T-0003): A malicious user with valid session credentials can access other users' conversation sessions, which leads to unauthorized data disclosure and privacy violation, resulting in reduced confidentiality of user conversations and session data<br/>[**T-0006**](#T-0006): An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data |  | Resolved |  |
| <a name="M-0005"></a>M-0005 | Validate and sanitize image uploads with file type and size restrictions | [**T-0005**](#T-0005): A malicious user can upload malicious images containing executable code or malware, which leads to potential code execution or system compromise, resulting in reduced integrity and\/or availability of image processing service and backend infrastructure |  | Resolved |  |
| <a name="M-0004"></a>M-0004 | Implement rate limiting on API endpoints and WebSocket connections | [**T-0004**](#T-0004): An external threat actor can flood the system with WebSocket connection requests, which leads to service degredation and denial of service, resulting in reduced availability of WebSocket service and backend API service<br/>[**T-0007**](#T-0007): A malicious user can abuse the voice synthesis service with excess requests, which leads to resource exhaustion and increased costs, resulting in reduced availability of Voice Service |  | Resolved |  |
| <a name="M-0003"></a>M-0003 | Enforce strict session isolation and implement proper authorization checks | [**T-0006**](#T-0006): An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data<br/>[**T-0008**](#T-0008): An internal actor can deny making inappropriate requests to AI persona, which leads to lack of accountability for system abuse, resulting in reduced accountability of audit logs and compliance records<br/>[**T-0009**](#T-0009): A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses |  | Resolved |  |
| <a name="M-0002"></a>M-0002 | Use parameterized prompts and prompt isolation to prevent AI prompt injection | [**T-0001**](#T-0001): A malicious user with authenticated access to the system can inject malicious prompts into AI persona conversations, which leads to manipulation of AI responses and potential system compromise, resulting in reduced confidentiality and\/or integrity of AI persona responses and conversation data |  | Resolved |  |
| <a name="M-0001"></a>M-0001 | Implement comprehensive input validation and sanitization for all user inputs | [**T-0001**](#T-0001): A malicious user with authenticated access to the system can inject malicious prompts into AI persona conversations, which leads to manipulation of AI responses and potential system compromise, resulting in reduced confidentiality and\/or integrity of AI persona responses and conversation data |  | Resolved |  |

## Impacted Assets

| Assets Number | Asset | Related Threats |
| --- | --- | --- |
| AS-0001 | conversation history | [**T-0009**](#T-0009): A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses |
| AS-0002 | persona responses | [**T-0009**](#T-0009): A malicious user with system access can manipulate conversation history or persona responses, which leads to data tampering and loss of conversation integrity, resulting in reduced integrity of conversation history and persona responses |
| AS-0003 | audit logs | [**T-0008**](#T-0008): An internal actor can deny making inappropriate requests to AI persona, which leads to lack of accountability for system abuse, resulting in reduced accountability of audit logs and compliance records |
| AS-0004 | compliance records | [**T-0008**](#T-0008): An internal actor can deny making inappropriate requests to AI persona, which leads to lack of accountability for system abuse, resulting in reduced accountability of audit logs and compliance records |
| AS-0005 | Voice Service | [**T-0007**](#T-0007): A malicious user can abuse the voice synthesis service with excess requests, which leads to resource exhaustion and increased costs, resulting in reduced availability of Voice Service |
| AS-0006 | user accounts | [**T-0006**](#T-0006): An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data |
| AS-0007 | conversation data | [**T-0006**](#T-0006): An external threat actor with stolen or compromised JWT Tokens can impersonate legitimate users, which leads to unauthorized access to user accounts and data, resulting in reduced confidentiality and\/or integrity of user accounts and conversation data<br/>[**T-0001**](#T-0001): A malicious user with authenticated access to the system can inject malicious prompts into AI persona conversations, which leads to manipulation of AI responses and potential system compromise, resulting in reduced confidentiality and\/or integrity of AI persona responses and conversation data |
| AS-0008 | image processing service | [**T-0005**](#T-0005): A malicious user can upload malicious images containing executable code or malware, which leads to potential code execution or system compromise, resulting in reduced integrity and\/or availability of image processing service and backend infrastructure |
| AS-0009 | backend infrastructure | [**T-0005**](#T-0005): A malicious user can upload malicious images containing executable code or malware, which leads to potential code execution or system compromise, resulting in reduced integrity and\/or availability of image processing service and backend infrastructure |
| AS-0010 | WebSocket service | [**T-0004**](#T-0004): An external threat actor can flood the system with WebSocket connection requests, which leads to service degredation and denial of service, resulting in reduced availability of WebSocket service and backend API service |
| AS-0011 | backend API service | [**T-0004**](#T-0004): An external threat actor can flood the system with WebSocket connection requests, which leads to service degredation and denial of service, resulting in reduced availability of WebSocket service and backend API service |
| AS-0012 | user conversations | [**T-0003**](#T-0003): A malicious user with valid session credentials can access other users' conversation sessions, which leads to unauthorized data disclosure and privacy violation, resulting in reduced confidentiality of user conversations and session data |
| AS-0013 | session data | [**T-0003**](#T-0003): A malicious user with valid session credentials can access other users' conversation sessions, which leads to unauthorized data disclosure and privacy violation, resulting in reduced confidentiality of user conversations and session data |
| AS-0014 | backend services | [**T-0002**](#T-0002): An external attacker can bypass CloudFront and directly access the ALB, which leads to unauthorized API access and potential system compromise, resulting in reduced confidentiality, integrity and\/or availability of backend services and user data |
| AS-0015 | user data | [**T-0002**](#T-0002): An external attacker can bypass CloudFront and directly access the ALB, which leads to unauthorized API access and potential system compromise, resulting in reduced confidentiality, integrity and\/or availability of backend services and user data |
| AS-0016 | AI persona responses | [**T-0001**](#T-0001): A malicious user with authenticated access to the system can inject malicious prompts into AI persona conversations, which leads to manipulation of AI responses and potential system compromise, resulting in reduced confidentiality and\/or integrity of AI persona responses and conversation data |

