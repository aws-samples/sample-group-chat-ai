# Group Chat AI - Systeemarchitectuur

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./ARCHITECTURE_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./ARCHITECTURE_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./ARCHITECTURE_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./ARCHITECTURE_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./ARCHITECTURE_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./ARCHITECTURE_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](#)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## Overzicht

Group Chat AI is een geavanceerd real-time conversationeel AI-platform dat gebruikers in staat stelt om deel te nemen aan collaboratieve discussies met meerdere AI-persona's. Het systeem maakt gebruik van AWS cloud services om een schaalbare, veilige en performante oplossing te leveren met real-time spraak- en tekstinteracties voor groepsgesprekken.

## Architectuurdiagrammen

### High-Level Systeemarchitectuur
![Group Chat AI System Architecture](ARCHITECTURE.png)

## Systeemcomponenten

### 1. Frontend Laag

#### **CloudFront Distribution**
- **Doel**: Wereldwijd content delivery network voor optimale prestaties
- **Functies**:
  - Caching van statische assets (React applicatie build)
  - API request routing naar backend ALB
  - WebSocket verbinding proxying voor real-time communicatie
  - Geo-restrictie en beveiligingsbeleid
  - Aangepast domein ondersteuning met ACM certificaten

#### **S3 Static Hosting**
- **Doel**: Serveert de React applicatie build artefacten
- **Inhoud**:
  - HTML, CSS, JavaScript bundles
  - Statische assets (afbeeldingen, lettertypen, lokalisatiebestanden)
  - Dynamische configuratiebestanden (config.json voor omgevingsspecifieke instellingen)

#### **React Frontend Application**
- **Technologie**: React 18 met TypeScript, Vite build systeem
- **Functies**:
  - Real-time WebSocket communicatie
  - Spraak input/output mogelijkheden
  - Meertalige internationalisatie
  - Responsief ontwerp met moderne UI componenten
  - Afbeelding upload en verwerking

### 2. Authenticatie & Autorisatie

#### **Amazon Cognito User Pool**
- **Doel**: Gecentraliseerde gebruikersauthenticatie en -beheer
- **Functies**:
  - OAuth 2.0 / OpenID Connect integratie
  - E-mail gebaseerde registratie en verificatie
  - Wachtwoordbeleid en accountherstel
  - Integratie met frontend via OIDC flow

#### **User Pool Client**
- **Configuratie**:
  - Authorization Code Grant flow
  - Callback URLs voor ontwikkelings- en productieomgevingen
  - Scopes: openid, email, profile
  - Token geldigheidsperiodes geoptimaliseerd voor beveiliging

### 3. Netwerkinfrastructuur

#### **VPC (Virtual Private Cloud)**
- **Ontwerp**: Multi-AZ deployment voor hoge beschikbaarheid
- **Subnets**:
  - **Publieke Subnets**: Hosten ALB en NAT Gateway
  - **Private Subnets**: Hosten ECS Fargate tasks voor beveiliging

#### **Application Load Balancer (ALB)**
- **Doel**: HTTP/HTTPS verkeer distributie en SSL terminatie
- **Beveiliging**: **KRITIEK - ALB accepteert verkeer ALLEEN van CloudFront IP-bereiken**
- **Functies**:
  - Health checks voor ECS services
  - Pad-gebaseerde routing (/api/* → backend, /ws/* → WebSocket)
  - Security groups geconfigureerd met CloudFront beheerde prefix lijsten
  - Access logging naar S3
  - **Al het gebruikersverkeer (HTTP/WebSocket) moet door CloudFront stromen**

### 4. Backend Services (ECS Fargate)

#### **Express.js Application Server**
- **Runtime**: Node.js 20 met TypeScript
- **Architectuur**: Microservices-georiënteerd ontwerp
- **Kerncomponenten**:
  - REST API endpoints voor sessiebeheer
  - WebSocket server voor real-time communicatie
  - Middleware voor logging, error handling en beveiliging

#### **Kern Service Componenten**

##### **ConversationOrchestrator**
- **Doel**: Centrale coördinator voor AI-gesprekken
- **Verantwoordelijkheden**:
  - Bericht routing en persona selectie
  - Audio queue management voor natuurlijke gespreksflow
  - Real-time response streaming
  - Iteratief gespreksbeheer

##### **PersonaManager & PersonaAgent**
- **Doel**: Beheert AI persona definities en gedragingen
- **Functies**:
  - Aangepaste persona creatie en beheer
  - Persona-specifieke gesprekscontexten
  - Dynamische persona selectie gebaseerd op inhoudsanalyse

##### **RoutingAgent**
- **Doel**: Intelligente routing van gebruikersberichten naar juiste persona's
- **Technologie**: Gebruikt Amazon Bedrock voor besluitvorming
- **Functies**:
  - Inhoudsanalyse en persona relevantie scoring
  - Gespreksvoortzetting logica
  - Multi-persona interactie orkestratie

##### **SessionService**
- **Doel**: Beheert gebruikerssessies en gespreksstatus
- **Functies**:
  - Sessie lifecycle management
  - Gespreksgeschiedenis persistentie
  - Gebruikersspecifieke aanpassingen

##### **WebSocket Management**
- **Componenten**: WebSocketServer, WebSocketController, SessionWebSocketManager
- **Functies**:
  - Real-time bidirectionele communicatie
  - Sessie-specifieke WebSocket verbindingen
  - Audio streaming en acknowledgment protocollen

### 5. AI/ML Services Integratie

#### **Amazon Bedrock**
- **Modellen**: Claude 4 (anthropic.claude-sonnet-4-5-20250929-v1:0)
- **Gebruik**:
  - Gespreksgeneratie voor AI persona's
  - Inhoudsanalyse en routing beslissingen
  - Context-bewuste response generatie
- **Configuratie**: Via Parameter Store voor omgevingsspecifieke instellingen

#### **Amazon Polly**
- **Doel**: Text-to-speech conversie voor spraakinteracties
- **Functies**:
  - Meerdere stemopties met persona-specifieke toewijzingen
  - Nieuwslezer spreekstijl voor bepaalde persona's
  - Streaming audio synthese
  - Taal-bewuste stemselectie

### 6. Configuratie & Monitoring

#### **AWS Systems Manager Parameter Store**
- **Doel**: Gecentraliseerd configuratiebeheer
- **Parameters**:
  - LLM model en provider instellingen
  - Cognito configuratie details
  - Omgevingsspecifieke instellingen

#### **CloudWatch Logs & Metrics**
- **Functies**:
  - Gecentraliseerde logging voor alle services
  - Prestatiemetrieken en monitoring
  - Error tracking en alerting
  - Aangepaste metrieken voor AI service gebruik

## Data Flow Patronen

### 1. Gebruikersauthenticatie Flow
```
Gebruiker → CloudFront → Cognito User Pool → OAuth Flow → JWT Token → API Calls
```

### 2. Real-time Gesprek Flow
```
Gebruikersbericht → WebSocket (via CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Response → Polly → Audio Stream → WebSocket (via CloudFront) → Gebruiker
```

### 3. AI Verwerkingspipeline
```
Gebruikersinput → Inhoudsanalyse → Persona Selectie → Context Opbouw → LLM Request → Response Generatie → Audio Synthese → Queue Management → Levering
```

## Beveiligingsarchitectuur

### Netwerkbeveiliging
- **WAF Integratie**: CloudFront-geïntegreerde Web Application Firewall
- **VPC Beveiliging**: Private subnets voor backend services
- **Security Groups**: Least-privilege toegangscontrole
- **ALB Restricties**: CloudFront IP-bereik beperkingen

### Databeveiliging
- **Encryptie in Transit**: HTTPS/TLS overal
- **Encryptie at Rest**: S3 en Parameter Store encryptie
- **Secrets Management**: Parameter Store voor gevoelige configuratie
- **Toegangscontrole**: IAM rollen met minimale permissies

### Applicatiebeveiliging
- **Authenticatie**: Cognito-gebaseerde OAuth 2.0/OIDC
- **Autorisatie**: JWT token validatie
- **Input Validatie**: Uitgebreide request validatie
- **Rate Limiting**: API en WebSocket verbindingslimieten

## Schaalbaarheid & Prestaties

### Auto Scaling
- **ECS Service**: CPU en geheugen-gebaseerde auto scaling (1-10 tasks)
- **ALB**: Automatische schaling gebaseerd op verkeer
- **CloudFront**: Wereldwijde edge locaties voor CDN

### Prestatie Optimalisaties
- **Caching**: CloudFront caching voor statische assets
- **Audio Streaming**: Base64 data URLs voor onmiddellijke afspeling
- **Connection Pooling**: Efficiënt WebSocket verbindingsbeheer
- **Lazy Loading**: On-demand service initialisatie

### Hoge Beschikbaarheid
- **Multi-AZ Deployment**: VPC beslaat meerdere availability zones
- **Health Checks**: ALB health monitoring voor ECS services
- **Graceful Degradation**: Fallback mechanismen voor service failures

## Technologie Stack Samenvatting

### Frontend
- **Framework**: React 18 met TypeScript
- **Build Tool**: Vite
- **Styling**: Moderne CSS met responsief ontwerp
- **State Management**: React Context API
- **Authenticatie**: OIDC Client
- **Real-time**: WebSocket API

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Taal**: TypeScript
- **WebSocket**: ws library
- **Logging**: Winston
- **Testing**: Jest

### Infrastructuur
- **Orkestratie**: AWS CDK (TypeScript)
- **Compute**: ECS Fargate
- **Storage**: S3
- **CDN**: CloudFront
- **Database**: In-memory state management
- **Configuratie**: Parameter Store

### AI/ML
- **LLM**: Amazon Bedrock (Claude 4)
- **TTS**: Amazon Polly
- **Inhoudsanalyse**: Aangepaste service met LLM integratie

## Deployment Architectuur

### Omgevingsstrategie
- **Ontwikkeling**: Lokale ontwikkeling met backend poort 3000
- **Productie**: CDK-gedeployde infrastructuur met CloudFront

### CI/CD Pipeline
- **Frontend**: Vite build → S3 deployment → CloudFront invalidation
- **Backend**: Docker build → ECR → ECS service update
- **Infrastructuur**: CDK diff → Deploy → Verificatie

### Configuratiebeheer
- **Omgevingsvariabelen**: Container-niveau configuratie
- **Secrets**: Parameter Store integratie
- **Feature Flags**: Omgeving-gebaseerde activering

## Monitoring & Observability

### Logging Strategie
- **Gecentraliseerd**: Alle logs stromen naar CloudWatch
- **Gestructureerd**: JSON-geformatteerde log entries
- **Correlatie**: Request IDs voor tracing
- **Niveaus**: Debug, Info, Warn, Error classificatie

### Metrieken & Alarmen
- **Applicatie Metrieken**: Response tijden, error rates
- **Infrastructuur Metrieken**: CPU, geheugen, netwerkgebruik
- **Business Metrieken**: Gespreksvoltooiingspercentages, persona gebruik
- **Aangepaste Alarmen**: Proactieve probleemdetectie

### Health Monitoring
- **Health Endpoints**: /health voor service status
- **Dependency Checks**: Externe service connectiviteit
- **Graceful Degradation**: Fallback gedrag monitoring

## Toekomstige Architectuur Overwegingen

### Schaalbaarheidsverbeteringen
- **Database Integratie**: Overweeg RDS voor persistente opslag
- **Caching Laag**: Redis/ElastiCache voor sessie state
- **Microservices**: Verdere service decompositie

### AI/ML Verbeteringen
- **Model Fine-tuning**: Aangepaste model training
- **A/B Testing**: Meerdere model vergelijking
- **Gesprek Analytics**: Geavanceerde gebruiksinzichten

### Beveiligingsverbeteringen
- **WAF Rules**: Verbeterde aanvalsbescherming
- **API Gateway**: Overweeg migratie voor geavanceerde functies
- **Compliance**: SOC 2, GDPR overwegingen

Deze architectuur biedt een robuuste, schaalbare en veilige basis voor het Group Chat AI platform terwijl flexibiliteit wordt behouden voor toekomstige verbeteringen en groei.