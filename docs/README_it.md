# Pitch Perfect - Pratica di Presentazione Potenziata dall'IA

Pitch Perfect è un chatbot per gruppi di focus potenziato dall'IA che crea un ambiente simulato per i professionisti per praticare e perfezionare presentazioni critiche. Il sistema consente agli utenti di ricevere feedback realistici da persona IA che rappresentano diverse prospettive degli stakeholder (CEO, CTO, CIO, CFO, CPO) senza il sovraccarico organizzativo di organizzare veri gruppi di focus.

## 🏗️ Panoramica dell'Architettura

```
Input Utente → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Model (Bedrock/OpenAI/Anthropic/Ollama)
```

### Caratteristiche Chiave

- **Simulazione Persona Potenziata dall'IA**: Multiple persona IA rispondono indipendentemente con priorità distinte e stili di comunicazione
- **Ambiente Chat Interattivo**: Flusso di conversazione in tempo reale con feedback immediato
- **Feedback Specifico per Ruolo**: Ogni persona fornisce risposte basate sulla prospettiva (CEO si concentra sulla strategia, CFO sui costi, ecc.)
- **Elaborazione Sequenziale**: Le persona rispondono una dopo l'altra per dinamiche di riunione realistiche
- **Gestione Sessioni**: Conversazioni basate su sessioni con pulizia automatica e persistenza delle persona
- **Setup Persona Semplificato**: Descrizioni persona in linguaggio naturale invece di moduli complessi
- **Fornitori LLM Multipli**: Supporto per AWS Bedrock, OpenAI, Anthropic, e modelli Ollama locali

## 🚀 Avvio Rapido

### Prerequisiti

- Node.js 20+ 
- npm 8+
- Docker (opzionale, per containerizzazione)
- AWS CLI (per deployment)

### Installazione

1. **Clonare il repository**
   ```bash
   git clone <repository-url>
   cd ai-pitch-perfect
   ```

2. **Installare le dipendenze**
   ```bash
   npm run install:all
   ```

3. **Configurare le variabili d'ambiente**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Modifica backend/.env con la tua configurazione
   
   # Frontend userà la configurazione proxy di Vite
   ```

4. **Costruire il pacchetto condiviso**
   ```bash
   npm run build:shared
   ```

### Sviluppo

1. **Avviare il server backend**
   ```bash
   npm run dev:backend
   ```
   Backend sarà disponibile su `http://localhost:3000`

2. **Avviare il server di sviluppo frontend**
   ```bash
   npm run dev:frontend
   ```
   Frontend sarà disponibile su `http://localhost:3001`

3. **Testare l'API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Struttura del Progetto

```
ai-pitch-perfect/
├── shared/                 # Tipi TypeScript condivisi e utility
│   ├── src/
│   │   ├── types/         # Definizioni di tipi comuni
│   │   ├── constants/     # Costanti dell'applicazione
│   │   └── utils/         # Funzioni utility condivise
├── backend/               # Server API Express.js
│   ├── src/
│   │   ├── controllers/   # Gestori rotte API
│   │   ├── services/      # Servizi logica di business
│   │   ├── middleware/    # Middleware Express
│   │   ├── config/        # File di configurazione
│   │   └── utils/         # Utility backend
├── frontend/              # Applicazione React
│   ├── src/
│   │   ├── components/    # Componenti React riutilizzabili
│   │   ├── pages/         # Componenti pagina
│   │   ├── services/      # Strato servizio API
│   │   ├── hooks/         # Hook React personalizzati
│   │   └── utils/         # Utility frontend
├── infrastructure/        # Codice infrastruttura AWS CDK
├── tests/                 # File di test
└── documents/             # Documentazione del progetto
```

## 🔧 Script Disponibili

### Livello Root
- `npm run install:all` - Installare tutte le dipendenze
- `npm run build` - Costruire tutti i pacchetti
- `npm run test` - Eseguire tutti i test
- `npm run lint` - Lint di tutti i pacchetti

### Backend
- `npm run dev:backend` - Avviare backend in modalità sviluppo
- `npm run build:backend` - Costruire backend
- `npm run test:backend` - Eseguire test backend

### Frontend
- `npm run dev:frontend` - Avviare server di sviluppo frontend
- `npm run build:frontend` - Costruire frontend per produzione
- `npm run test:frontend` - Eseguire test frontend

## 🌐 Endpoint API

### Controllo Salute
- `GET /health` - Controllo salute di base
- `GET /health/detailed` - Informazioni salute dettagliate

### Persona
- `GET /personas` - Ottenere tutte le persona disponibili
- `GET /personas/:personaId` - Ottenere dettagli persona specifica

### Sessioni
- `POST /sessions` - Creare nuova sessione di conversazione
- `POST /sessions/:sessionId/messages` - Inviare messaggio e ottenere risposte
- `PUT /sessions/:sessionId/personas` - Aggiornare persona di sessione
- `GET /sessions/:sessionId/summary` - Ottenere riassunto sessione
- `DELETE /sessions/:sessionId` - Terminare sessione
- `GET /sessions/:sessionId` - Ottenere dettagli sessione

## 🤖 Integrazione IA

Il sistema supporta fornitori LLM multipli attraverso un'interfaccia configurabile:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Vari modelli)
- **Ollama** (Modelli locali)

Configurare tramite variabili d'ambiente:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Modalità Sviluppo
Nello sviluppo, il sistema usa risposte simulate per simulare interazioni IA senza richiedere chiavi API.

## 🎭 Persona

Il sistema include 5 persona esecutive predefinite con personalizzazione semplificata e user-friendly:

1. **CEO** - Focus strategico, vantaggio competitivo, risultati business
2. **CTO** - Fattibilità tecnica, architettura, complessità implementazione
3. **CFO** - Impatto finanziario, ROI, implicazioni budget
4. **CIO** - Integrazione sistemi, sicurezza, infrastruttura IT
5. **CPO** - Strategia prodotto, esperienza utente, posizionamento mercato

### Struttura Persona
Ogni persona è definita da soli 4 campi semplici:
- **Nome**: Nome display (es. "Chief Executive Officer")
- **Ruolo**: Identificatore ruolo breve (es. "CEO")
- **Dettagli**: Descrizione testo libero includendo background, priorità, preoccupazioni e livello di influenza
- **Selezione Avatar**: Rappresentazione visiva dalle opzioni avatar disponibili

### Personalizzazione Persona
- **Modificare Persona Predefinite**: Modificare dettagli di qualsiasi persona predefinita in linguaggio naturale
- **Creare Persona Personalizzate**: Costruire persona completamente personalizzate con le tue descrizioni
- **Persistenza Sessione**: Tutte le personalizzazioni persona persistono attraverso le sessioni del browser
- **Import/Export**: Salvare e condividere configurazioni persona tramite file JSON
- **Interfaccia Basata su Tessere**: Selezione visuale tessere con capacità di modifica complete

### Implementazione Tecnica
Ogni persona mantiene:
- Contesto conversazione isolato per risposte autentiche
- Elaborazione linguaggio naturale del campo dettagli per generazione prompt IA
- Pattern di risposta specifici per ruolo basati su caratteristiche descritte
- Elaborazione risposta sequenziale per dinamiche riunione realistiche

## 🔒 Caratteristiche di Sicurezza

- **Validazione Input**: Tutti gli input utente sono validati e sanificati
- **Isolamento Sessione**: Ogni sessione mantiene contesto separato
- **Gestione Errori**: Gestione errori elegante con messaggi user-friendly
- **Rate Limiting**: Protezione integrata contro abuso
- **HTTPS**: Tutte le comunicazioni crittografate in produzione

## 📊 Monitoraggio & Osservabilità

- **Logging Strutturato**: Log formato JSON con Winston
- **Controlli Salute**: Monitoraggio salute completo
- **Metriche**: Metriche applicazione personalizzate
- **Tracciamento Errori**: Logging e tracciamento errori dettagliato

## 🚢 Deployment

### Docker
```bash
# Costruire immagine backend
cd backend
npm run docker:build

# Eseguire container
npm run docker:run
```

### Deployment AWS
```bash
# Deployare infrastruttura
cd infrastructure
npm run deploy:dev
```

## 🧪 Testing

### Test Unitari
```bash
npm run test
```

### Test di Integrazione
```bash
npm run test:integration
```

### Test E2E
```bash
npm run test:e2e
```

## 📈 Obiettivi Prestazioni

- **Tempo di Risposta**: < 3 secondi per risposte persona
- **Disponibilità**: 99.9% disponibilità API
- **Concorrenza**: Supporto 1000+ utenti concorrenti
- **Elaborazione Sequenziale**: Fino a 5 persona per sessione con flusso riunione realistico

## 🤝 Contribuire

1. Fork del repository
2. Creare branch funzionalità
3. Fare le tue modifiche
4. Aggiungere test
5. Inviare pull request

## 📄 Licenza

Questo progetto è sotto licenza MIT - vedere il file LICENSE per dettagli.

## 🆘 Supporto

Per supporto e domande:
- Controllare la documentazione in `/documents`
- Rivedere la memory bank in `/memory-bank`
- Aprire un issue su GitHub