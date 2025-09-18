# Group Chat AI - Conversazioni AI Collaborative

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](#)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


**📖 Questo documento è disponibile in più lingue:**
- 🇸🇦 [العربية (Arabic)](docs/README_ar.md)
- 🇩🇪 [Deutsch (German)](docs/README_de.md) 
- 🇪🇸 [Español (Spanish)](docs/README_es.md)
- 🇫🇷 [Français (French)](docs/README_fr.md)
- 🇮🇹 [Italiano (Italian)](docs/README_it.md)
- 🇯🇵 [日本語 (Japanese)](docs/README_ja.md)
- 🇰🇷 [한국어 (Korean)](docs/README_ko.md)
- 🇵🇹 [Português (Portuguese)](docs/README_pt.md)
- 🇷🇺 [Русский (Russian)](docs/README_ru.md)
- 🇸🇪 [Svenska (Swedish)](docs/README_sv.md)
- 🇨🇳 [中文 (Chinese)](docs/README_zh.md)

---

Group Chat AI è una piattaforma collaborativa avanzata che consente conversazioni di gruppo dinamiche con più personas AI. Il sistema facilita discussioni significative attraverso prospettive diverse, permettendo agli utenti di esplorare idee, ricevere feedback e partecipare a conversazioni multi-partecipante con agenti AI che rappresentano ruoli e punti di vista differenti.

## 🏗️ Panoramica dell'Architettura

```
User Input → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### Caratteristiche Principali

- **Conversazioni Multi-Persona**: Interagisci con più personas AI simultaneamente in discussioni di gruppo
- **Modelli di Interazione Dinamici**: Flusso di conversazione in tempo reale con alternanza naturale dei turni e risposte
- **Prospettive Diverse**: Ogni persona porta punti di vista unici, competenze e stili di comunicazione
- **Risoluzione Collaborativa dei Problemi**: Affronta argomenti complessi con agenti AI che offrono approcci diversi
- **Persistenza delle Sessioni**: Mantieni il contesto della conversazione e la coerenza delle personas attraverso le sessioni
- **Personalizzazione Flessibile delle Personas**: Crea e modifica personas AI con descrizioni in linguaggio naturale
- **Supporto per Più LLM**: Sfrutta vari modelli linguistici inclusi AWS Bedrock, OpenAI, Anthropic e Ollama

## 🚀 Avvio Rapido

### Prerequisiti

- Node.js 20+ 
- npm 8+
- Docker (opzionale, per la containerizzazione)
- AWS CLI (per il deployment)

### Installazione

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **Installa le dipendenze**
   ```bash
   npm run install:all
   ```

3. **Configura le variabili d'ambiente**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Modifica backend/.env con la tua configurazione
   
   # Frontend utilizzerà la configurazione proxy di Vite
   ```

4. **Compila il pacchetto condiviso**
   ```bash
   npm run build:shared
   ```

### Sviluppo

1. **Avvia il server backend**
   ```bash
   npm run dev:backend
   ```
   Il backend sarà disponibile su `http://localhost:3000`

2. **Avvia il server di sviluppo frontend**
   ```bash
   npm run dev:frontend
   ```
   Il frontend sarà disponibile su `http://localhost:3001`

3. **Testa l'API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Struttura del Progetto

```
group-chat-ai/
├── shared/                 # Tipi TypeScript condivisi e utilità
│   ├── src/
│   │   ├── types/         # Definizioni di tipi comuni
│   │   ├── constants/     # Costanti dell'applicazione
│   │   └── utils/         # Funzioni di utilità condivise
├── backend/               # Server API Express.js
│   ├── src/
│   │   ├── controllers/   # Gestori delle rotte API
│   │   ├── services/      # Servizi di logica di business
│   │   ├── middleware/    # Middleware Express
│   │   ├── config/        # File di configurazione
│   │   └── utils/         # Utilità backend
├── frontend/              # Applicazione React
│   ├── src/
│   │   ├── components/    # Componenti React riutilizzabili
│   │   ├── pages/         # Componenti pagina
│   │   ├── services/      # Livello di servizio API
│   │   ├── hooks/         # Hook React personalizzati
│   │   └── utils/         # Utilità frontend
├── infrastructure/        # Codice infrastruttura AWS CDK
├── tests/                 # File di test
└── documents/             # Documentazione del progetto
```

## 🔧 Script Disponibili

### Livello Root
- `npm run install:all` - Installa tutte le dipendenze
- `npm run build` - Compila tutti i pacchetti
- `npm run test` - Esegui tutti i test
- `npm run lint` - Lint di tutti i pacchetti

### Backend
- `npm run dev:backend` - Avvia backend in modalità sviluppo
- `npm run build:backend` - Compila backend
- `npm run test:backend` - Esegui test backend

### Frontend
- `npm run dev:frontend` - Avvia server di sviluppo frontend
- `npm run build:frontend` - Compila frontend per produzione
- `npm run test:frontend` - Esegui test frontend

### Personas e Internazionalizzazione
- `npm run personas:generate` - Genera personas.json inglese dalle definizioni condivise
- `npm run docs:translate` - Traduci tutta la documentazione nelle lingue supportate
- `npm run docs:translate:single -- --lang es` - Traduci in una lingua specifica

## 🌐 Endpoint API

### Controllo Stato
- `GET /health` - Controllo stato di base
- `GET /health/detailed` - Informazioni dettagliate sullo stato

### Personas
- `GET /personas` - Ottieni tutte le personas disponibili
- `GET /personas/:personaId` - Ottieni dettagli persona specifica

### Sessioni
- `POST /sessions` - Crea nuova sessione di conversazione
- `POST /sessions/:sessionId/messages` - Invia messaggio e ottieni risposte
- `PUT /sessions/:sessionId/personas` - Aggiorna personas della sessione
- `GET /sessions/:sessionId/summary` - Ottieni riassunto sessione
- `DELETE /sessions/:sessionId` - Termina sessione
- `GET /sessions/:sessionId` - Ottieni dettagli sessione

## 🤖 Integrazione AI

Il sistema supporta più fornitori LLM attraverso un'interfaccia configurabile:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Vari modelli)
- **Ollama** (Modelli locali)

Configura tramite variabili d'ambiente:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Modalità Sviluppo
In sviluppo, il sistema utilizza risposte simulate per simulare interazioni AI senza richiedere chiavi API.

## 🎭 Personas

Il sistema include diverse personas AI che possono essere personalizzate per vari scenari di conversazione di gruppo:

1. **Consulente Strategico** - Pianificazione di alto livello, visione e direzione strategica
2. **Esperto Tecnico** - Conoscenza tecnica approfondita, dettagli di implementazione e soluzioni
3. **Analista** - Insights basati sui dati, ricerca e prospettive analitiche  
4. **Pensatore Creativo** - Innovazione, brainstorming e idee fuori dagli schemi
5. **Facilitatore** - Gestione discussioni, costruzione consenso e collaborazione

### Struttura Persona
Ogni persona è definita da soli 4 campi semplici:
- **Nome**: Nome visualizzato (es. "Consulente Strategico")
- **Ruolo**: Identificatore ruolo breve (es. "Stratega")
- **Dettagli**: Descrizione in testo libero inclusi background, priorità, preoccupazioni e livello di influenza
- **Selezione Avatar**: Rappresentazione visiva dalle opzioni avatar disponibili

### Personalizzazione Persona
- **Modifica Personas Predefinite**: Modifica i dettagli di qualsiasi persona predefinita in linguaggio naturale
- **Crea Personas Personalizzate**: Costruisci personas completamente personalizzate con le tue descrizioni
- **Persistenza Sessione**: Tutte le personalizzazioni delle personas persistono durante le sessioni del browser
- **Importa/Esporta**: Salva e condividi configurazioni personas tramite file JSON
- **Interfaccia Basata su Tessere**: Selezione visuale a tessere con capacità di modifica complete

### Implementazione Tecnica
Ogni persona mantiene:
- Contesto di conversazione isolato per risposte autentiche
- Elaborazione linguaggio naturale del campo dettagli per generazione prompt AI
- Modelli di risposta specifici per ruolo basati su caratteristiche descritte
- Alternanza intelligente dei turni per flusso conversazione di gruppo naturale

## 🌐 Internazionalizzazione e Gestione Personas

### Flusso di Lavoro Definizione Persona
1. **Fonte di Verità**: Tutte le definizioni delle personas sono mantenute in `shared/src/personas/index.ts`
2. **Generazione**: Esegui `npm run personas:generate` per creare il file di traduzione inglese `personas.json`
3. **Traduzione**: Usa script di traduzione esistenti per generare file personas localizzati

### Processo Traduzione Persona
```bash
# 1. Aggiorna definizioni personas nel pacchetto condiviso
vim shared/src/personas/index.ts

# 2. Genera personas.json inglese dalle definizioni condivise
npm run personas:generate

# 3. Traduci personas in tutte le lingue supportate
npm run docs:translate  # Traduce tutti i file incluso personas.json
# O traduci in lingua specifica
npm run docs:translate:single -- --lang es

# 4. Ricompila pacchetto condiviso se necessario
npm run build:shared
```

### Struttura File Traduzione
- **Fonte**: `shared/src/personas/index.ts` (Definizioni TypeScript)
- **Generato**: `frontend/public/locales/en/personas.json` (i18n inglese)
- **Tradotto**: `frontend/public/locales/{lang}/personas.json` (Versioni localizzate)

### Lingue Supportate
Il sistema supporta 14 lingue per personas e documentazione:
- 🇺🇸 English (en) - Lingua fonte
- 🇸🇦 العربية (ar) - Arabo
- 🇩🇪 Deutsch (de) - Tedesco
- 🇪🇸 Español (es) - Spagnolo
- 🇫🇷 Français (fr) - Francese
- 🇮🇱 עברית (he) - Ebraico
- 🇮🇹 Italiano (it) - Italiano
- 🇯🇵 日本語 (ja) - Giapponese
- 🇰🇷 한국어 (ko) - Coreano
- 🇳🇱 Nederlands (nl) - Olandese
- 🇵🇹 Português (pt) - Portoghese
- 🇷🇺 Русский (ru) - Russo
- 🇸🇪 Svenska (sv) - Svedese
- 🇨🇳 中文 (zh) - Cinese

### Aggiunta Nuove Personas
1. Aggiungi definizione persona a `shared/src/personas/index.ts`
2. Esegui `npm run personas:generate` per aggiornare traduzioni inglesi
3. Esegui script traduzione per generare versioni localizzate
4. La nuova persona sarà disponibile in tutte le lingue supportate

## 🔒 Caratteristiche di Sicurezza

- **Validazione Input**: Tutti gli input utente sono validati e sanificati
- **Isolamento Sessioni**: Ogni sessione mantiene contesto separato
- **Gestione Errori**: Gestione errori elegante con messaggi user-friendly
- **Limitazione Velocità**: Protezione integrata contro abusi
- **HTTPS**: Tutte le comunicazioni crittografate in produzione

## 📊 Monitoraggio e Osservabilità

- **Logging Strutturato**: Log formattati JSON con Winston
- **Controlli Stato**: Monitoraggio stato completo
- **Metriche**: Metriche applicazione personalizzate
- **Tracciamento Errori**: Logging e tracciamento errori dettagliato

## 🚢 Deployment

### Docker
```bash
# Compila immagine backend
cd backend
npm run docker:build

# Esegui container
npm run docker:run
```

### Deployment AWS
```bash
# Distribuisci infrastruttura
cd infrastructure
npm run deploy:dev # sostituisci :dev con staging o prod per quegli ambienti
```

## ⚠️ Avviso Regione Deployment!
Per impostazione predefinita, il Routing Model per Bedrock è OpenAI gpt-oss:20b (`openai.gpt-oss-20b-1:0`). Il Persona Model sfrutta Anthropic Claude 4 Sonnet (`anthropic.claude-sonnet-4-20250514-v1:0`). Assicurati di distribuire in una regione che supporta entrambi i modelli, o configura modelli alternativi.

## 🧪 Testing

### Test Unitari
```bash
npm run test
```

### Test Integrazione
```bash
npm run test:integration
```

### Test E2E
```bash
npm run test:e2e
```

## 📈 Obiettivi Prestazioni

- **Tempo di Risposta**: < 3 secondi per risposte personas
- **Disponibilità**: 99.9% disponibilità API
- **Concorrenza**: Supporto 1000+ utenti concorrenti
- **Conversazioni di Gruppo**: Fino a 5 personas per sessione con flusso conversazione naturale

## 🤝 Contribuire

1. Fai fork del repository
2. Crea un branch feature
3. Apporta le tue modifiche
4. Aggiungi test
5. Invia una pull request

## 📄 Licenza

Questo progetto è concesso in licenza sotto la Licenza MIT - vedi il file LICENSE per i dettagli.