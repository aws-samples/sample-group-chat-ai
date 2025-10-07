# Group Chat AI - Architettura del Sistema

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./ARCHITECTURE_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./ARCHITECTURE_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./ARCHITECTURE_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](#)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./ARCHITECTURE_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./ARCHITECTURE_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./ARCHITECTURE_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## Panoramica

Group Chat AI è una sofisticata piattaforma di intelligenza artificiale conversazionale in tempo reale che consente agli utenti di partecipare a discussioni collaborative con più personalità AI. Il sistema sfrutta i servizi cloud AWS per fornire una soluzione scalabile, sicura e performante con interazioni vocali e testuali in tempo reale per conversazioni di gruppo.

## Diagrammi dell'Architettura

### Architettura del Sistema di Alto Livello
![Group Chat AI System Architecture](ARCHITECTURE.png)

## Componenti del Sistema

### 1. Livello Frontend

#### **CloudFront Distribution**
- **Scopo**: Rete di distribuzione dei contenuti globale per prestazioni ottimali
- **Funzionalità**:
  - Caching delle risorse statiche (build dell'applicazione React)
  - Routing delle richieste API al backend ALB
  - Proxy delle connessioni WebSocket per comunicazione in tempo reale
  - Geo-restrizioni e politiche di sicurezza
  - Supporto per domini personalizzati con certificati ACM

#### **S3 Static Hosting**
- **Scopo**: Serve gli artefatti di build dell'applicazione React
- **Contenuto**:
  - Bundle HTML, CSS, JavaScript
  - Risorse statiche (immagini, font, file di localizzazione)
  - File di configurazione dinamici (config.json per impostazioni specifiche dell'ambiente)

#### **Applicazione Frontend React**
- **Tecnologia**: React 18 con TypeScript, sistema di build Vite
- **Funzionalità**:
  - Comunicazione WebSocket in tempo reale
  - Capacità di input/output vocale
  - Internazionalizzazione multi-lingua
  - Design responsivo con componenti UI moderni
  - Caricamento e elaborazione di immagini

### 2. Autenticazione e Autorizzazione

#### **Amazon Cognito User Pool**
- **Scopo**: Autenticazione e gestione utenti centralizzata
- **Funzionalità**:
  - Integrazione OAuth 2.0 / OpenID Connect
  - Registrazione e verifica basata su email
  - Politiche delle password e recupero account
  - Integrazione con frontend tramite flusso OIDC

#### **User Pool Client**
- **Configurazione**:
  - Flusso Authorization Code Grant
  - URL di callback per ambienti di sviluppo e produzione
  - Scope: openid, email, profile
  - Periodi di validità dei token ottimizzati per la sicurezza

### 3. Infrastruttura di Rete

#### **VPC (Virtual Private Cloud)**
- **Design**: Distribuzione multi-AZ per alta disponibilità
- **Subnet**:
  - **Subnet Pubbliche**: Ospitano ALB e NAT Gateway
  - **Subnet Private**: Ospitano task ECS Fargate per sicurezza

#### **Application Load Balancer (ALB)**
- **Scopo**: Distribuzione del traffico HTTP/HTTPS e terminazione SSL
- **Sicurezza**: **CRITICO - ALB accetta traffico SOLO dagli intervalli IP di CloudFront**
- **Funzionalità**:
  - Controlli di salute per servizi ECS
  - Routing basato su percorso (/api/* → backend, /ws/* → WebSocket)
  - Gruppi di sicurezza configurati con liste di prefissi gestiti da CloudFront
  - Logging degli accessi su S3
  - **Tutto il traffico utente (HTTP/WebSocket) deve passare attraverso CloudFront**

### 4. Servizi Backend (ECS Fargate)

#### **Server Applicazioni Express.js**
- **Runtime**: Node.js 20 con TypeScript
- **Architettura**: Design orientato ai microservizi
- **Componenti Principali**:
  - Endpoint REST API per gestione sessioni
  - Server WebSocket per comunicazione in tempo reale
  - Middleware per logging, gestione errori e sicurezza

#### **Componenti dei Servizi Principali**

##### **ConversationOrchestrator**
- **Scopo**: Coordinatore centrale per conversazioni AI
- **Responsabilità**:
  - Routing dei messaggi e selezione delle personalità
  - Gestione della coda audio per flusso di conversazione naturale
  - Streaming delle risposte in tempo reale
  - Gestione iterativa delle conversazioni

##### **PersonaManager & PersonaAgent**
- **Scopo**: Gestisce definizioni e comportamenti delle personalità AI
- **Funzionalità**:
  - Creazione e gestione di personalità personalizzate
  - Contesti di conversazione specifici per personalità
  - Selezione dinamica delle personalità basata sull'analisi del contenuto

##### **RoutingAgent**
- **Scopo**: Routing intelligente dei messaggi utente alle personalità appropriate
- **Tecnologia**: Utilizza Amazon Bedrock per il processo decisionale
- **Funzionalità**:
  - Analisi del contenuto e punteggio di rilevanza delle personalità
  - Logica di continuazione della conversazione
  - Orchestrazione dell'interazione multi-personalità

##### **SessionService**
- **Scopo**: Gestisce sessioni utente e stato delle conversazioni
- **Funzionalità**:
  - Gestione del ciclo di vita delle sessioni
  - Persistenza della cronologia delle conversazioni
  - Personalizzazioni specifiche dell'utente

##### **Gestione WebSocket**
- **Componenti**: WebSocketServer, WebSocketController, SessionWebSocketManager
- **Funzionalità**:
  - Comunicazione bidirezionale in tempo reale
  - Connessioni WebSocket specifiche per sessione
  - Protocolli di streaming audio e acknowledgment

### 5. Integrazione Servizi AI/ML

#### **Amazon Bedrock**
- **Modelli**: Claude 4 (anthropic.claude-sonnet-4-5-20250929-v1:0)
- **Utilizzo**:
  - Generazione di conversazioni per personalità AI
  - Analisi del contenuto e decisioni di routing
  - Generazione di risposte consapevoli del contesto
- **Configurazione**: Tramite Parameter Store per impostazioni specifiche dell'ambiente

#### **Amazon Polly**
- **Scopo**: Conversione testo-voce per interazioni vocali
- **Funzionalità**:
  - Opzioni vocali multiple con assegnazioni specifiche per personalità
  - Stile di parlato da giornalista per certe personalità
  - Sintesi audio in streaming
  - Selezione vocale consapevole della lingua

### 6. Configurazione e Monitoraggio

#### **AWS Systems Manager Parameter Store**
- **Scopo**: Gestione centralizzata della configurazione
- **Parametri**:
  - Impostazioni del modello LLM e del provider
  - Dettagli di configurazione Cognito
  - Impostazioni specifiche dell'ambiente

#### **CloudWatch Logs & Metrics**
- **Funzionalità**:
  - Logging centralizzato per tutti i servizi
  - Metriche delle prestazioni e monitoraggio
  - Tracciamento degli errori e alerting
  - Metriche personalizzate per l'utilizzo dei servizi AI

## Pattern di Flusso Dati

### 1. Flusso di Autenticazione Utente
```
Utente → CloudFront → Cognito User Pool → Flusso OAuth → Token JWT → Chiamate API
```

### 2. Flusso di Conversazione in Tempo Reale
```
Messaggio Utente → WebSocket (via CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Risposta → Polly → Stream Audio → WebSocket (via CloudFront) → Utente
```

### 3. Pipeline di Elaborazione AI
```
Input Utente → Analisi Contenuto → Selezione Personalità → Costruzione Contesto → Richiesta LLM → Generazione Risposta → Sintesi Audio → Gestione Coda → Consegna
```

## Architettura di Sicurezza

### Sicurezza di Rete
- **Integrazione WAF**: Web Application Firewall integrato con CloudFront
- **Sicurezza VPC**: Subnet private per servizi backend
- **Gruppi di Sicurezza**: Controllo degli accessi con privilegi minimi
- **Restrizioni ALB**: Limitazioni agli intervalli IP di CloudFront

### Sicurezza dei Dati
- **Crittografia in Transito**: HTTPS/TLS ovunque
- **Crittografia a Riposo**: Crittografia S3 e Parameter Store
- **Gestione Segreti**: Parameter Store per configurazioni sensibili
- **Controllo Accessi**: Ruoli IAM con permessi minimi

### Sicurezza Applicativa
- **Autenticazione**: OAuth 2.0/OIDC basato su Cognito
- **Autorizzazione**: Validazione token JWT
- **Validazione Input**: Validazione completa delle richieste
- **Rate Limiting**: Limiti API e connessioni WebSocket

## Scalabilità e Prestazioni

### Auto Scaling
- **Servizio ECS**: Auto scaling basato su CPU e memoria (1-10 task)
- **ALB**: Scaling automatico basato sul traffico
- **CloudFront**: Posizioni edge globali per CDN

### Ottimizzazioni delle Prestazioni
- **Caching**: Caching CloudFront per risorse statiche
- **Streaming Audio**: URL dati Base64 per riproduzione immediata
- **Connection Pooling**: Gestione efficiente delle connessioni WebSocket
- **Lazy Loading**: Inizializzazione dei servizi su richiesta

### Alta Disponibilità
- **Distribuzione Multi-AZ**: VPC si estende su più zone di disponibilità
- **Controlli di Salute**: Monitoraggio della salute ALB per servizi ECS
- **Degradazione Graduale**: Meccanismi di fallback per guasti dei servizi

## Riepilogo Stack Tecnologico

### Frontend
- **Framework**: React 18 con TypeScript
- **Strumento di Build**: Vite
- **Styling**: CSS moderno con design responsivo
- **Gestione Stato**: React Context API
- **Autenticazione**: OIDC Client
- **Tempo Reale**: WebSocket API

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Linguaggio**: TypeScript
- **WebSocket**: libreria ws
- **Logging**: Winston
- **Testing**: Jest

### Infrastruttura
- **Orchestrazione**: AWS CDK (TypeScript)
- **Compute**: ECS Fargate
- **Storage**: S3
- **CDN**: CloudFront
- **Database**: Gestione stato in memoria
- **Configurazione**: Parameter Store

### AI/ML
- **LLM**: Amazon Bedrock (Claude 4)
- **TTS**: Amazon Polly
- **Analisi Contenuto**: Servizio personalizzato con integrazione LLM

## Architettura di Deployment

### Strategia degli Ambienti
- **Sviluppo**: Sviluppo locale con backend sulla porta 3000
- **Produzione**: Infrastruttura distribuita con CDK con CloudFront

### Pipeline CI/CD
- **Frontend**: Build Vite → Deployment S3 → Invalidazione CloudFront
- **Backend**: Build Docker → ECR → Aggiornamento servizio ECS
- **Infrastruttura**: CDK diff → Deploy → Verifica

### Gestione Configurazione
- **Variabili d'Ambiente**: Configurazione a livello container
- **Segreti**: Integrazione Parameter Store
- **Feature Flag**: Abilitazione basata sull'ambiente

## Monitoraggio e Osservabilità

### Strategia di Logging
- **Centralizzato**: Tutti i log confluiscono in CloudWatch
- **Strutturato**: Voci di log formattate JSON
- **Correlazione**: ID richiesta per tracciamento
- **Livelli**: Classificazione Debug, Info, Warn, Error

### Metriche e Allarmi
- **Metriche Applicative**: Tempi di risposta, tassi di errore
- **Metriche Infrastrutturali**: Utilizzo CPU, memoria, rete
- **Metriche di Business**: Tassi di completamento conversazioni, utilizzo personalità
- **Allarmi Personalizzati**: Rilevamento proattivo dei problemi

### Monitoraggio della Salute
- **Endpoint di Salute**: /health per stato del servizio
- **Controlli Dipendenze**: Connettività servizi esterni
- **Degradazione Graduale**: Monitoraggio comportamento di fallback

## Considerazioni Future dell'Architettura

### Miglioramenti di Scalabilità
- **Integrazione Database**: Considerare RDS per storage persistente
- **Livello di Caching**: Redis/ElastiCache per stato delle sessioni
- **Microservizi**: Ulteriore decomposizione dei servizi

### Miglioramenti AI/ML
- **Fine-tuning Modelli**: Addestramento modelli personalizzati
- **A/B Testing**: Confronto di modelli multipli
- **Analytics Conversazioni**: Insights avanzati sull'utilizzo

### Miglioramenti di Sicurezza
- **Regole WAF**: Protezione avanzata dagli attacchi
- **API Gateway**: Considerare migrazione per funzionalità avanzate
- **Compliance**: Considerazioni SOC 2, GDPR

Questa architettura fornisce una base robusta, scalabile e sicura per la piattaforma Group Chat AI mantenendo flessibilità per futuri miglioramenti e crescita.