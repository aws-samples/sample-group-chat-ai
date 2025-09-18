# Pitch Perfect - AI-driven Presentationsträning

Pitch Perfect är en AI-driven fokusgrupp-chatbot som skapar en simulerad miljö för proffs att träna och förfina kritiska presentationer. Systemet gör det möjligt för användare att få realistisk feedback från AI-personas som representerar olika intressent-perspektiv (VD, CTO, CIO, CFO, CPO) utan organisationsbördan av att arrangera verkliga fokusgrupper.

## 🏗️ Arkitekturöversikt

```
Användarinput → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Model (Bedrock/OpenAI/Anthropic/Ollama)
```

### Huvudfunktioner

- **AI-driven Persona-simulering**: Flera AI-personas svarar oberoende med distinkta prioriteter och kommunikationsstilar
- **Interaktiv Chattmiljö**: Realtidskonversationsflöde med omedelbar feedback
- **Rollspecifik Feedback**: Varje persona ger perspektiv-baserade svar (VD fokuserar på strategi, CFO på kostnader, etc.)
- **Sekventiell Bearbetning**: Personas svarar en efter en för realistisk mötesdynamik
- **Sessionshantering**: Sessionsbaserade konversationer med automatisk städning och persona-persistens
- **Förenklad Persona-konfiguration**: Naturligt språk persona-beskrivningar istället för komplexa formulär
- **Flera LLM-leverantörer**: Stöd för AWS Bedrock, OpenAI, Anthropic, och lokala Ollama-modeller

## 🚀 Snabbstart

### Förutsättningar

- Node.js 20+ 
- npm 8+
- Docker (valfritt, för containerisering)
- AWS CLI (för deployment)

### Installation

1. **Klona repositoryt**
   ```bash
   git clone <repository-url>
   cd ai-pitch-perfect
   ```

2. **Installera beroenden**
   ```bash
   npm run install:all
   ```

3. **Konfigurera miljövariabler**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Redigera backend/.env med din konfiguration
   
   # Frontend kommer att använda Vites proxy-konfiguration
   ```

4. **Bygg delat paket**
   ```bash
   npm run build:shared
   ```

### Utveckling

1. **Starta backend-servern**
   ```bash
   npm run dev:backend
   ```
   Backend kommer att vara tillgänglig på `http://localhost:3000`

2. **Starta frontend-utvecklingsservern**
   ```bash
   npm run dev:frontend
   ```
   Frontend kommer att vara tillgänglig på `http://localhost:3001`

3. **Testa API:et**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Projektstruktur

```
ai-pitch-perfect/
├── shared/                 # Delade TypeScript-typer och verktyg
│   ├── src/
│   │   ├── types/         # Gemensamma typdefinitioner
│   │   ├── constants/     # Applikationskonstanter
│   │   └── utils/         # Delade verktygsfunktioner
├── backend/               # Express.js API-server
│   ├── src/
│   │   ├── controllers/   # API-ruthanterare
│   │   ├── services/      # Affärslogikstjänster
│   │   ├── middleware/    # Express middleware
│   │   ├── config/        # Konfigurationsfiler
│   │   └── utils/         # Backend-verktyg
├── frontend/              # React-applikation
│   ├── src/
│   │   ├── components/    # Återanvändbara React-komponenter
│   │   ├── pages/         # Sidkomponenter
│   │   ├── services/      # API-tjänstlager
│   │   ├── hooks/         # Anpassade React-hooks
│   │   └── utils/         # Frontend-verktyg
├── infrastructure/        # AWS CDK infrastrukturkod
├── tests/                 # Testfiler
└── documents/             # Projektdokumentation
```

## 🔧 Tillgängliga Skript

### Rotnivå
- `npm run install:all` - Installera alla beroenden
- `npm run build` - Bygg alla paket
- `npm run test` - Kör alla tester
- `npm run lint` - Linta alla paket

### Backend
- `npm run dev:backend` - Starta backend i utvecklingsläge
- `npm run build:backend` - Bygg backend
- `npm run test:backend` - Kör backend-tester

### Frontend
- `npm run dev:frontend` - Starta frontend-utvecklingsserver
- `npm run build:frontend` - Bygg frontend för produktion
- `npm run test:frontend` - Kör frontend-tester

## 🌐 API-endpoints

### Hälsokontroll
- `GET /health` - Grundläggande hälsokontroll
- `GET /health/detailed` - Detaljerad hälsoinformation

### Personas
- `GET /personas` - Hämta alla tillgängliga personas
- `GET /personas/:personaId` - Hämta specifika persona-detaljer

### Sessioner
- `POST /sessions` - Skapa ny konversationssession
- `POST /sessions/:sessionId/messages` - Skicka meddelande och få svar
- `PUT /sessions/:sessionId/personas` - Uppdatera sessions-personas
- `GET /sessions/:sessionId/summary` - Hämta sessionssammanfattning
- `DELETE /sessions/:sessionId` - Avsluta session
- `GET /sessions/:sessionId` - Hämta sessionsdetaljer

## 🤖 AI-integration

Systemet stöder flera LLM-leverantörer genom ett konfigurerbart gränssnitt:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Olika modeller)
- **Ollama** (Lokala modeller)

Konfigurera via miljövariabler:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Utvecklingsläge
I utveckling använder systemet mock-svar för att simulera AI-interaktioner utan att kräva API-nycklar.

## 🎭 Personas

Systemet inkluderar 5 fördefinierade executive-personas med förenklad, användarvänlig anpassning:

1. **VD** - Strategiskt fokus, konkurrensfördelar, affärsresultat
2. **CTO** - Teknisk genomförbarhet, arkitektur, implementeringskomplexitet
3. **CFO** - Finansiell påverkan, ROI, budgetimplikationer
4. **CIO** - Systemintegration, säkerhet, IT-infrastruktur
5. **CPO** - Produktstrategi, användarupplevelse, marknadspositionering

### Persona-struktur
Varje persona definieras av endast 4 enkla fält:
- **Namn**: Visningsnamn (t.ex. "Verkställande Direktör")
- **Roll**: Kort rollidentifierare (t.ex. "VD")
- **Detaljer**: Fritextbeskrivning inklusive bakgrund, prioriteter, bekymmer och inflytandenivå
- **Avatar-val**: Visuell representation från tillgängliga avatar-alternativ

### Persona-anpassning
- **Redigera Standard-personas**: Modifiera alla standard-personas detaljer på naturligt språk
- **Skapa Anpassade Personas**: Bygg helt anpassade personas med dina egna beskrivningar
- **Sessions-persistens**: Alla persona-anpassningar kvarstår genom webbläsarsessioner
- **Import/Export**: Spara och dela persona-konfigurationer via JSON-filer
- **Plattbaserat Gränssnitt**: Visuell platt-val med omfattande redigeringsmöjligheter

### Teknisk Implementering
Varje persona upprätthåller:
- Isolerad konversationskontext för autentiska svar
- Naturligt språkbehandling av detalj-fältet för AI-prompt-generering
- Rollspecifika svarsmönster baserade på beskrivna egenskaper
- Sekventiell svarsbehandling för realistisk mötesdynamik

## 🔒 Säkerhetsfunktioner

- **Input-validering**: Alla användarinmatningar valideras och rensas
- **Sessions-isolering**: Varje session upprätthåller separat kontext
- **Felhantering**: Elegant felhantering med användarvänliga meddelanden
- **Hastighetsbegränsning**: Inbyggt skydd mot missbruk
- **HTTPS**: All kommunikation krypterad i produktion

## 📊 Övervakning & Observabilitet

- **Strukturerad Loggning**: JSON-formaterade loggar med Winston
- **Hälsokontroller**: Omfattande hälsoövervakning
- **Mätvärden**: Anpassade applikationsmätvärden
- **Felspårning**: Detaljerad felloggning och spårning

## 🚢 Deployment

### Docker
```bash
# Bygg backend-image
cd backend
npm run docker:build

# Kör container
npm run docker:run
```

### AWS Deployment
```bash
# Deploya infrastruktur
cd infrastructure
npm run deploy:dev
```

## 🧪 Testning

### Enhetstester
```bash
npm run test
```

### Integrationstester
```bash
npm run test:integration
```

### E2E-tester
```bash
npm run test:e2e
```

## 📈 Prestationsmål

- **Svarstid**: < 3 sekunder för persona-svar
- **Tillgänglighet**: 99.9% API-tillgänglighet
- **Samtidighet**: Stöd för 1000+ samtidiga användare
- **Sekventiell Bearbetning**: Upp till 5 personas per session med realistiskt mötesflöde

## 🤝 Bidrag

1. Förgrena repositoryt
2. Skapa feature-gren
3. Gör dina ändringar
4. Lägg till tester
5. Skicka pull request

## 📄 Licens

Detta projekt är licenserat under MIT-licensen - se LICENSE-filen för detaljer.

## 🆘 Support

För support och frågor:
- Kolla dokumentationen i `/documents`
- Granska minnesbanken i `/memory-bank`
- Öppna ett ärende på GitHub