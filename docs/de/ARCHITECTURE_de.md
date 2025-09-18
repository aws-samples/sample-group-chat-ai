# Group Chat AI - Systemarchitektur

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](#)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./ARCHITECTURE_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./ARCHITECTURE_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./ARCHITECTURE_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./ARCHITECTURE_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./ARCHITECTURE_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./ARCHITECTURE_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## Überblick

Group Chat AI ist eine hochentwickelte Echtzeit-Konversations-KI-Plattform, die es Benutzern ermöglicht, sich an kollaborativen Diskussionen mit mehreren KI-Personas zu beteiligen. Das System nutzt AWS-Cloud-Services, um eine skalierbare, sichere und leistungsstarke Lösung mit Echtzeit-Sprach- und Textinteraktionen für Gruppengespräche bereitzustellen.

## Architekturdiagramme

### High-Level-Systemarchitektur
![Group Chat AI System Architecture](ARCHITECTURE.png)

## Systemkomponenten

### 1. Frontend-Schicht

#### **CloudFront Distribution**
- **Zweck**: Globales Content Delivery Network für optimale Leistung
- **Features**:
  - Caching statischer Assets (React-Anwendungs-Build)
  - API-Request-Routing zum Backend-ALB
  - WebSocket-Verbindungs-Proxying für Echtzeitkommunikation
  - Geo-Beschränkungen und Sicherheitsrichtlinien
  - Custom Domain-Unterstützung mit ACM-Zertifikaten

#### **S3 Static Hosting**
- **Zweck**: Stellt die React-Anwendungs-Build-Artefakte bereit
- **Inhalt**:
  - HTML-, CSS-, JavaScript-Bundles
  - Statische Assets (Bilder, Schriftarten, Lokalisierungsdateien)
  - Dynamische Konfigurationsdateien (config.json für umgebungsspezifische Einstellungen)

#### **React Frontend Application**
- **Technologie**: React 18 mit TypeScript, Vite-Build-System
- **Features**:
  - Echtzeit-WebSocket-Kommunikation
  - Spracheingabe-/-ausgabe-Funktionen
  - Mehrsprachige Internationalisierung
  - Responsive Design mit modernen UI-Komponenten
  - Bild-Upload und -Verarbeitung

### 2. Authentifizierung & Autorisierung

#### **Amazon Cognito User Pool**
- **Zweck**: Zentralisierte Benutzerauthentifizierung und -verwaltung
- **Features**:
  - OAuth 2.0 / OpenID Connect-Integration
  - E-Mail-basierte Registrierung und Verifizierung
  - Passwort-Richtlinien und Kontowiederherstellung
  - Integration mit Frontend über OIDC-Flow

#### **User Pool Client**
- **Konfiguration**:
  - Authorization Code Grant Flow
  - Callback-URLs für Entwicklungs- und Produktionsumgebungen
  - Scopes: openid, email, profile
  - Token-Gültigkeitszeiträume für Sicherheit optimiert

### 3. Netzwerkinfrastruktur

#### **VPC (Virtual Private Cloud)**
- **Design**: Multi-AZ-Deployment für hohe Verfügbarkeit
- **Subnetze**:
  - **Öffentliche Subnetze**: Hosten ALB und NAT Gateway
  - **Private Subnetze**: Hosten ECS Fargate-Tasks für Sicherheit

#### **Application Load Balancer (ALB)**
- **Zweck**: HTTP/HTTPS-Traffic-Verteilung und SSL-Terminierung
- **Sicherheit**: **KRITISCH - ALB akzeptiert Traffic NUR von CloudFront-IP-Bereichen**
- **Features**:
  - Health Checks für ECS-Services
  - Pfad-basiertes Routing (/api/* → Backend, /ws/* → WebSocket)
  - Sicherheitsgruppen konfiguriert mit CloudFront-verwalteten Präfixlisten
  - Access Logging zu S3
  - **Sämtlicher Benutzer-Traffic (HTTP/WebSocket) muss durch CloudFront fließen**

### 4. Backend-Services (ECS Fargate)

#### **Express.js Application Server**
- **Runtime**: Node.js 20 mit TypeScript
- **Architektur**: Microservices-orientiertes Design
- **Kernkomponenten**:
  - REST-API-Endpunkte für Session-Management
  - WebSocket-Server für Echtzeitkommunikation
  - Middleware für Logging, Fehlerbehandlung und Sicherheit

#### **Kern-Service-Komponenten**

##### **ConversationOrchestrator**
- **Zweck**: Zentraler Koordinator für KI-Gespräche
- **Verantwortlichkeiten**:
  - Nachrichten-Routing und Persona-Auswahl
  - Audio-Queue-Management für natürlichen Gesprächsfluss
  - Echtzeit-Response-Streaming
  - Iteratives Gesprächsmanagement

##### **PersonaManager & PersonaAgent**
- **Zweck**: Verwaltet KI-Persona-Definitionen und -Verhalten
- **Features**:
  - Benutzerdefinierte Persona-Erstellung und -Verwaltung
  - Persona-spezifische Gesprächskontexte
  - Dynamische Persona-Auswahl basierend auf Inhaltsanalyse

##### **RoutingAgent**
- **Zweck**: Intelligentes Routing von Benutzernachrichten zu geeigneten Personas
- **Technologie**: Verwendet Amazon Bedrock für Entscheidungsfindung
- **Features**:
  - Inhaltsanalyse und Persona-Relevanz-Bewertung
  - Gesprächsfortsetzungslogik
  - Multi-Persona-Interaktions-Orchestrierung

##### **SessionService**
- **Zweck**: Verwaltet Benutzersessions und Gesprächszustände
- **Features**:
  - Session-Lifecycle-Management
  - Gesprächshistorie-Persistierung
  - Benutzerspezifische Anpassungen

##### **WebSocket Management**
- **Komponenten**: WebSocketServer, WebSocketController, SessionWebSocketManager
- **Features**:
  - Echtzeit-bidirektionale Kommunikation
  - Session-spezifische WebSocket-Verbindungen
  - Audio-Streaming und Bestätigungsprotokolle

### 5. AI/ML-Services-Integration

#### **Amazon Bedrock**
- **Modelle**: Claude 4 (us.anthropic.claude-sonnet-4-20250514-v1:0)
- **Verwendung**:
  - Gesprächsgenerierung für KI-Personas
  - Inhaltsanalyse und Routing-Entscheidungen
  - Kontextbewusste Response-Generierung
- **Konfiguration**: Über Parameter Store für umgebungsspezifische Einstellungen

#### **Amazon Polly**
- **Zweck**: Text-zu-Sprache-Konvertierung für Sprachinteraktionen
- **Features**:
  - Mehrere Stimmoptionen mit persona-spezifischen Zuweisungen
  - Nachrichtensprecher-Sprechstil für bestimmte Personas
  - Streaming-Audio-Synthese
  - Sprachbewusste Stimmauswahl

### 6. Konfiguration & Monitoring

#### **AWS Systems Manager Parameter Store**
- **Zweck**: Zentralisiertes Konfigurationsmanagement
- **Parameter**:
  - LLM-Modell- und Provider-Einstellungen
  - Cognito-Konfigurationsdetails
  - Umgebungsspezifische Einstellungen

#### **CloudWatch Logs & Metrics**
- **Features**:
  - Zentralisiertes Logging für alle Services
  - Leistungsmetriken und Monitoring
  - Fehler-Tracking und Alerting
  - Benutzerdefinierte Metriken für KI-Service-Nutzung

## Datenfluss-Muster

### 1. Benutzerauthentifizierungs-Flow
```
Benutzer → CloudFront → Cognito User Pool → OAuth Flow → JWT Token → API Calls
```

### 2. Echtzeit-Gesprächs-Flow
```
Benutzernachricht → WebSocket (via CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Response → Polly → Audio Stream → WebSocket (via CloudFront) → Benutzer
```

### 3. KI-Verarbeitungs-Pipeline
```
Benutzereingabe → Inhaltsanalyse → Persona-Auswahl → Kontext-Aufbau → LLM-Request → Response-Generierung → Audio-Synthese → Queue-Management → Auslieferung
```

## Sicherheitsarchitektur

### Netzwerksicherheit
- **WAF-Integration**: CloudFront-integrierte Web Application Firewall
- **VPC-Sicherheit**: Private Subnetze für Backend-Services
- **Sicherheitsgruppen**: Least-Privilege-Zugriffskontrolle
- **ALB-Beschränkungen**: CloudFront-IP-Bereichs-Limitierungen

### Datensicherheit
- **Verschlüsselung in Transit**: HTTPS/TLS überall
- **Verschlüsselung at Rest**: S3- und Parameter Store-Verschlüsselung
- **Secrets Management**: Parameter Store für sensible Konfiguration
- **Zugriffskontrolle**: IAM-Rollen mit minimalen Berechtigungen

### Anwendungssicherheit
- **Authentifizierung**: Cognito-basierte OAuth 2.0/OIDC
- **Autorisierung**: JWT-Token-Validierung
- **Eingabevalidierung**: Umfassende Request-Validierung
- **Rate Limiting**: API- und WebSocket-Verbindungslimits

## Skalierbarkeit & Leistung

### Auto Scaling
- **ECS Service**: CPU- und speicherbasierte Auto-Skalierung (1-10 Tasks)
- **ALB**: Automatische Skalierung basierend auf Traffic
- **CloudFront**: Globale Edge-Standorte für CDN

### Leistungsoptimierungen
- **Caching**: CloudFront-Caching für statische Assets
- **Audio-Streaming**: Base64-Daten-URLs für sofortige Wiedergabe
- **Connection Pooling**: Effizientes WebSocket-Verbindungsmanagement
- **Lazy Loading**: On-Demand-Service-Initialisierung

### Hohe Verfügbarkeit
- **Multi-AZ-Deployment**: VPC erstreckt sich über mehrere Verfügbarkeitszonen
- **Health Checks**: ALB-Health-Monitoring für ECS-Services
- **Graceful Degradation**: Fallback-Mechanismen für Service-Ausfälle

## Technologie-Stack-Zusammenfassung

### Frontend
- **Framework**: React 18 mit TypeScript
- **Build Tool**: Vite
- **Styling**: Modernes CSS mit Responsive Design
- **State Management**: React Context API
- **Authentifizierung**: OIDC Client
- **Echtzeit**: WebSocket API

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Sprache**: TypeScript
- **WebSocket**: ws library
- **Logging**: Winston
- **Testing**: Jest

### Infrastruktur
- **Orchestrierung**: AWS CDK (TypeScript)
- **Compute**: ECS Fargate
- **Storage**: S3
- **CDN**: CloudFront
- **Database**: In-Memory-State-Management
- **Konfiguration**: Parameter Store

### AI/ML
- **LLM**: Amazon Bedrock (Claude 4)
- **TTS**: Amazon Polly
- **Inhaltsanalyse**: Custom Service mit LLM-Integration

## Deployment-Architektur

### Umgebungsstrategie
- **Entwicklung**: Lokale Entwicklung mit Backend-Port 3000
- **Produktion**: CDK-deployed Infrastruktur mit CloudFront

### CI/CD-Pipeline
- **Frontend**: Vite Build → S3 Deployment → CloudFront Invalidation
- **Backend**: Docker Build → ECR → ECS Service Update
- **Infrastruktur**: CDK Diff → Deploy → Verification

### Konfigurationsmanagement
- **Umgebungsvariablen**: Container-Level-Konfiguration
- **Secrets**: Parameter Store-Integration
- **Feature Flags**: Umgebungsbasierte Aktivierung

## Monitoring & Observability

### Logging-Strategie
- **Zentralisiert**: Alle Logs fließen zu CloudWatch
- **Strukturiert**: JSON-formatierte Log-Einträge
- **Korrelation**: Request-IDs für Tracing
- **Level**: Debug-, Info-, Warn-, Error-Klassifizierung

### Metriken & Alarme
- **Anwendungsmetriken**: Response-Zeiten, Fehlerquoten
- **Infrastruktur-Metriken**: CPU-, Speicher-, Netzwerkauslastung
- **Business-Metriken**: Gesprächsabschlussraten, Persona-Nutzung
- **Benutzerdefinierte Alarme**: Proaktive Problemerkennung

### Health-Monitoring
- **Health-Endpunkte**: /health für Service-Status
- **Dependency-Checks**: Externe Service-Konnektivität
- **Graceful Degradation**: Fallback-Verhalten-Monitoring

## Zukünftige Architektur-Überlegungen

### Skalierbarkeits-Verbesserungen
- **Datenbankintegration**: RDS für persistente Speicherung in Betracht ziehen
- **Caching-Schicht**: Redis/ElastiCache für Session-State
- **Microservices**: Weitere Service-Dekomposition

### AI/ML-Verbesserungen
- **Modell-Fine-tuning**: Benutzerdefiniertes Modell-Training
- **A/B-Testing**: Mehrere Modell-Vergleiche
- **Gesprächsanalyse**: Erweiterte Nutzungseinblicke

### Sicherheits-Verbesserungen
- **WAF-Regeln**: Erweiterte Angriffsprotektion
- **API Gateway**: Migration für erweiterte Features in Betracht ziehen
- **Compliance**: SOC 2-, GDPR-Überlegungen

Diese Architektur bietet eine robuste, skalierbare und sichere Grundlage für die Group Chat AI-Plattform und behält gleichzeitig die Flexibilität für zukünftige Verbesserungen und Wachstum bei.