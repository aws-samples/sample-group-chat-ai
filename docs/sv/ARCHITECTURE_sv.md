# Group Chat AI - Systemarkitektur

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
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](#)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## Översikt

Group Chat AI är en sofistikerad realtids-AI-plattform för konversationer som gör det möjligt för användare att delta i kollaborativa diskussioner med flera AI-personas. Systemet utnyttjar AWS molntjänster för att leverera en skalbar, säker och högpresterande lösning med realtidsinteraktioner via röst och text för gruppkonversationer.

## Arkitekturdiagram

### Systemarkitektur på hög nivå
![Group Chat AI System Architecture](ARCHITECTURE.png)

## Systemkomponenter

### 1. Frontend-lager

#### **CloudFront Distribution**
- **Syfte**: Globalt innehållsleveransnätverk för optimal prestanda
- **Funktioner**:
  - Cachning av statiska tillgångar (React-applikationsbygge)
  - API-förfrågningsrouting till backend ALB
  - WebSocket-anslutningsproxy för realtidskommunikation
  - Geo-restriktion och säkerhetspolicyer
  - Anpassat domänstöd med ACM-certifikat

#### **S3 Static Hosting**
- **Syfte**: Serverar React-applikationens byggartefakter
- **Innehåll**:
  - HTML, CSS, JavaScript-buntar
  - Statiska tillgångar (bilder, typsnitt, lokaliseringsfiler)
  - Dynamiska konfigurationsfiler (config.json för miljöspecifika inställningar)

#### **React Frontend Application**
- **Teknik**: React 18 med TypeScript, Vite byggsystem
- **Funktioner**:
  - Realtids WebSocket-kommunikation
  - Röstinmatning/utmatningskapacitet
  - Flerspråkig internationalisering
  - Responsiv design med moderna UI-komponenter
  - Bilduppladdning och bearbetning

### 2. Autentisering & Auktorisering

#### **Amazon Cognito User Pool**
- **Syfte**: Centraliserad användarautentisering och hantering
- **Funktioner**:
  - OAuth 2.0 / OpenID Connect-integration
  - E-postbaserad registrering och verifiering
  - Lösenordspolicyer och kontoåterställning
  - Integration med frontend via OIDC-flöde

#### **User Pool Client**
- **Konfiguration**:
  - Authorization Code Grant-flöde
  - Callback-URL:er för utvecklings- och produktionsmiljöer
  - Scope: openid, email, profile
  - Token-giltighetsperioder optimerade för säkerhet

### 3. Nätverksinfrastruktur

#### **VPC (Virtual Private Cloud)**
- **Design**: Multi-AZ-distribution för hög tillgänglighet
- **Subnät**:
  - **Publika subnät**: Värd för ALB och NAT Gateway
  - **Privata subnät**: Värd för ECS Fargate-uppgifter för säkerhet

#### **Application Load Balancer (ALB)**
- **Syfte**: HTTP/HTTPS-trafikdistribution och SSL-terminering
- **Säkerhet**: **KRITISKT - ALB accepterar trafik ENDAST från CloudFront IP-intervall**
- **Funktioner**:
  - Hälsokontroller för ECS-tjänster
  - Sökvägsbaserad routing (/api/* → backend, /ws/* → WebSocket)
  - Säkerhetsgrupper konfigurerade med CloudFront-hanterade prefixlistor
  - Åtkomstloggning till S3
  - **All användartrafik (HTTP/WebSocket) måste flöda genom CloudFront**

### 4. Backend-tjänster (ECS Fargate)

#### **Express.js Application Server**
- **Runtime**: Node.js 20 med TypeScript
- **Arkitektur**: Mikrotjänstorienterad design
- **Kärnkomponenter**:
  - REST API-endpoints för sessionshantering
  - WebSocket-server för realtidskommunikation
  - Middleware för loggning, felhantering och säkerhet

#### **Kärnservicekomponenter**

##### **ConversationOrchestrator**
- **Syfte**: Central koordinator för AI-konversationer
- **Ansvarsområden**:
  - Meddelanderouting och persona-val
  - Ljudköhantering för naturligt konversationsflöde
  - Realtidsresponsströmning
  - Iterativ konversationshantering

##### **PersonaManager & PersonaAgent**
- **Syfte**: Hanterar AI-personadefinitioner och beteenden
- **Funktioner**:
  - Anpassad persona-skapande och hantering
  - Persona-specifika konversationskontexter
  - Dynamiskt persona-val baserat på innehållsanalys

##### **RoutingAgent**
- **Syfte**: Intelligent routing av användarmeddelanden till lämpliga personas
- **Teknik**: Använder Amazon Bedrock för beslutsfattande
- **Funktioner**:
  - Innehållsanalys och persona-relevanspoängsättning
  - Konversationsfortsättningslogik
  - Multi-persona-interaktionsorkestrering

##### **SessionService**
- **Syfte**: Hanterar användarsessioner och konversationstillstånd
- **Funktioner**:
  - Sessionslivscykelhantering
  - Konversationshistorikpersistens
  - Användarspecifika anpassningar

##### **WebSocket Management**
- **Komponenter**: WebSocketServer, WebSocketController, SessionWebSocketManager
- **Funktioner**:
  - Realtids dubbelriktad kommunikation
  - Sessionsspecifika WebSocket-anslutningar
  - Ljudströmning och bekräftelseprotokoll

### 5. AI/ML-tjänstintegration

#### **Amazon Bedrock**
- **Modeller**: Claude 4 (us.anthropic.claude-sonnet-4-20250514-v1:0)
- **Användning**:
  - Konversationsgenerering för AI-personas
  - Innehållsanalys och routingbeslut
  - Kontextmedveten responsgenerering
- **Konfiguration**: Via Parameter Store för miljöspecifika inställningar

#### **Amazon Polly**
- **Syfte**: Text-till-tal-konvertering för röstinteraktioner
- **Funktioner**:
  - Flera röstalternativ med persona-specifika tilldelningar
  - Nyhetsuppläsarstil för vissa personas
  - Strömljudsyntes
  - Språkmedvetet röstval

### 6. Konfiguration & Övervakning

#### **AWS Systems Manager Parameter Store**
- **Syfte**: Centraliserad konfigurationshantering
- **Parametrar**:
  - LLM-modell och leverantörsinställningar
  - Cognito-konfigurationsdetaljer
  - Miljöspecifika inställningar

#### **CloudWatch Logs & Metrics**
- **Funktioner**:
  - Centraliserad loggning för alla tjänster
  - Prestandamått och övervakning
  - Felspårning och varningar
  - Anpassade mått för AI-tjänstanvändning

## Dataflödesmönster

### 1. Användarautentiseringsflöde
```
Användare → CloudFront → Cognito User Pool → OAuth-flöde → JWT Token → API-anrop
```

### 2. Realtidskonversationsflöde
```
Användarmeddelande → WebSocket (via CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Respons → Polly → Ljudström → WebSocket (via CloudFront) → Användare
```

### 3. AI-bearbetningspipeline
```
Användarinmatning → Innehållsanalys → Persona-val → Kontextbyggande → LLM-förfrågan → Responsgenerering → Ljudsyntes → Köhantering → Leverans
```

## Säkerhetsarkitektur

### Nätverkssäkerhet
- **WAF-integration**: CloudFront-integrerad Web Application Firewall
- **VPC-säkerhet**: Privata subnät för backend-tjänster
- **Säkerhetsgrupper**: Åtkomstkontroll med minsta privilegium
- **ALB-restriktioner**: CloudFront IP-intervallbegränsningar

### Datasäkerhet
- **Kryptering under transport**: HTTPS/TLS överallt
- **Kryptering i vila**: S3 och Parameter Store-kryptering
- **Hemlighetshantering**: Parameter Store för känslig konfiguration
- **Åtkomstkontroll**: IAM-roller med minimala behörigheter

### Applikationssäkerhet
- **Autentisering**: Cognito-baserad OAuth 2.0/OIDC
- **Auktorisering**: JWT token-validering
- **Inmatningsvalidering**: Omfattande förfrågningsvalidering
- **Hastighetsbegränsning**: API och WebSocket-anslutningsgränser

## Skalbarhet & Prestanda

### Automatisk skalning
- **ECS Service**: CPU och minnesbaserad automatisk skalning (1-10 uppgifter)
- **ALB**: Automatisk skalning baserad på trafik
- **CloudFront**: Globala edge-platser för CDN

### Prestandaoptimeringar
- **Cachning**: CloudFront-cachning för statiska tillgångar
- **Ljudströmning**: Base64 data-URL:er för omedelbar uppspelning
- **Anslutningspoolning**: Effektiv WebSocket-anslutningshantering
- **Lazy Loading**: On-demand-tjänstinitialisering

### Hög tillgänglighet
- **Multi-AZ-distribution**: VPC sträcker sig över flera tillgänglighetszoner
- **Hälsokontroller**: ALB-hälsoövervakning för ECS-tjänster
- **Graciös degradering**: Reservmekanismer för tjänstfel

## Sammanfattning av teknikstack

### Frontend
- **Ramverk**: React 18 med TypeScript
- **Byggverktyg**: Vite
- **Styling**: Modern CSS med responsiv design
- **Tillståndshantering**: React Context API
- **Autentisering**: OIDC Client
- **Realtid**: WebSocket API

### Backend
- **Runtime**: Node.js 20
- **Ramverk**: Express.js
- **Språk**: TypeScript
- **WebSocket**: ws-bibliotek
- **Loggning**: Winston
- **Testning**: Jest

### Infrastruktur
- **Orkestrering**: AWS CDK (TypeScript)
- **Beräkning**: ECS Fargate
- **Lagring**: S3
- **CDN**: CloudFront
- **Databas**: In-memory tillståndshantering
- **Konfiguration**: Parameter Store

### AI/ML
- **LLM**: Amazon Bedrock (Claude 4)
- **TTS**: Amazon Polly
- **Innehållsanalys**: Anpassad tjänst med LLM-integration

## Distributionsarkitektur

### Miljöstrategi
- **Utveckling**: Lokal utveckling med backend-port 3000
- **Produktion**: CDK-distribuerad infrastruktur med CloudFront

### CI/CD Pipeline
- **Frontend**: Vite-byggnad → S3-distribution → CloudFront-invalidering
- **Backend**: Docker-byggnad → ECR → ECS-tjänstuppdatering
- **Infrastruktur**: CDK diff → Deploy → Verifiering

### Konfigurationshantering
- **Miljövariabler**: Konfiguration på containernivå
- **Hemligheter**: Parameter Store-integration
- **Funktionsflaggor**: Miljöbaserad aktivering

## Övervakning & Observerbarhet

### Loggningsstrategi
- **Centraliserad**: Alla loggar flödar till CloudWatch
- **Strukturerad**: JSON-formaterade loggposter
- **Korrelation**: Förfrågnings-ID:n för spårning
- **Nivåer**: Debug, Info, Warn, Error-klassificering

### Mått & Larm
- **Applikationsmått**: Svarstider, felfrekvenser
- **Infrastrukturmått**: CPU, minne, nätverksanvändning
- **Affärsmått**: Konversationsavslutningsfrekvenser, persona-användning
- **Anpassade larm**: Proaktiv problemdetektering

### Hälsoövervakning
- **Hälsoendpoints**: /health för tjänststatus
- **Beroendekontroller**: Extern tjänstanslutning
- **Graciös degradering**: Övervakning av reservbeteende

## Framtida arkitekturövervägandens

### Skalbarhetförbättringar
- **Databasintegration**: Överväg RDS för persistent lagring
- **Cachningslager**: Redis/ElastiCache för sessionstillstånd
- **Mikrotjänster**: Ytterligare tjänstdekomposition

### AI/ML-förbättringar
- **Modellfinjustering**: Anpassad modellträning
- **A/B-testning**: Jämförelse av flera modeller
- **Konversationsanalys**: Avancerade användningsinsikter

### Säkerhetsförbättringar
- **WAF-regler**: Förbättrat attackskydd
- **API Gateway**: Överväg migration för avancerade funktioner
- **Efterlevnad**: SOC 2, GDPR-överväganden

Denna arkitektur tillhandahåller en robust, skalbar och säker grund för Group Chat AI-plattformen samtidigt som den bibehåller flexibilitet för framtida förbättringar och tillväxt.