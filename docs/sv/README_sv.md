# Group Chat AI - Kollaborativa AI-konversationer

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](#)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


**📖 Detta dokument finns tillgängligt på flera språk:**
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

Group Chat AI är en avancerad kollaborativ plattform som möjliggör dynamiska gruppkonversationer med flera AI-personas. Systemet underlättar meningsfulla diskussioner över olika perspektiv, vilket gör det möjligt för användare att utforska idéer, få feedback och delta i konversationer med flera deltagare tillsammans med AI-agenter som representerar olika roller och synvinklar.

## 🏗️ Arkitekturöversikt

```
User Input → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### Huvudfunktioner

- **Konversationer med flera personas**: Interagera med flera AI-personas samtidigt i gruppdiskussioner
- **Dynamiska interaktionsmönster**: Realtidskonversationsflöde med naturligt turtagande och svar
- **Olika perspektiv**: Varje persona bidrar med unika synvinklar, expertis och kommunikationsstilar
- **Kollaborativ problemlösning**: Arbeta igenom komplexa ämnen med AI-agenter som erbjuder olika tillvägagångssätt
- **Sessionspersistens**: Bibehåll konversationskontext och personakonsistens över sessioner
- **Flexibel personaanpassning**: Skapa och modifiera AI-personas med naturliga språkbeskrivningar
- **Stöd för flera LLM**: Utnyttja olika språkmodeller inklusive AWS Bedrock, OpenAI, Anthropic och Ollama

## 🚀 Snabbstart

### Förutsättningar

- Node.js 20+ 
- npm 8+
- Docker (valfritt, för containerisering)
- AWS CLI (för distribution)

### Installation

1. **Klona repositoriet**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
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
   
   # Frontend kommer att använda Vites proxykonfiguration
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
   Backend kommer att vara tillgängligt på `http://localhost:3000`

2. **Starta frontend-utvecklingsservern**
   ```bash
   npm run dev:frontend
   ```
   Frontend kommer att vara tillgängligt på `http://localhost:3001`

3. **Testa API:et**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Projektstruktur

```
group-chat-ai/
├── shared/                 # Delade TypeScript-typer och verktyg
│   ├── src/
│   │   ├── types/         # Gemensamma typdefinitioner
│   │   ├── constants/     # Applikationskonstanter
│   │   └── utils/         # Delade verktygsfunktioner
├── backend/               # Express.js API-server
│   ├── src/
│   │   ├── controllers/   # API-rutthanterare
│   │   ├── services/      # Affärslogiktjänster
│   │   ├── middleware/    # Express middleware
│   │   ├── config/        # Konfigurationsfiler
│   │   └── utils/         # Backend-verktyg
├── frontend/              # React-applikation
│   ├── src/
│   │   ├── components/    # Återanvändbara React-komponenter
│   │   ├── pages/         # Sidkomponenter
│   │   ├── services/      # API-tjänstelager
│   │   ├── hooks/         # Anpassade React-hooks
│   │   └── utils/         # Frontend-verktyg
├── infrastructure/        # AWS CDK infrastrukturkod
├── tests/                 # Testfiler
└── documents/             # Projektdokumentation
```

## 🔧 Tillgängliga skript

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

### Personas och internationalisering
- `npm run personas:generate` - Generera engelsk personas.json från delade definitioner
- `npm run docs:translate` - Översätt all dokumentation till stödda språk
- `npm run docs:translate:single -- --lang es` - Översätt till specifikt språk

## 🌐 API-endpoints

### Hälsokontroll
- `GET /health` - Grundläggande hälsokontroll
- `GET /health/detailed` - Detaljerad hälsoinformation

### Personas
- `GET /personas` - Hämta alla tillgängliga personas
- `GET /personas/:personaId` - Hämta specifika personadetaljer

### Sessioner
- `POST /sessions` - Skapa ny konversationssession
- `POST /sessions/:sessionId/messages` - Skicka meddelande och få svar
- `PUT /sessions/:sessionId/personas` - Uppdatera sessionspersonas
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
I utvecklingsläge använder systemet mock-svar för att simulera AI-interaktioner utan att kräva API-nycklar.

## 🎭 Personas

Systemet inkluderar olika AI-personas som kan anpassas för olika gruppkonversationsscenarier:

1. **Strategisk rådgivare** - Planering på hög nivå, vision och strategisk riktning
2. **Teknisk expert** - Djup teknisk kunskap, implementeringsdetaljer och lösningar
3. **Analytiker** - Datadrivna insikter, forskning och analytiska perspektiv  
4. **Kreativ tänkare** - Innovation, brainstorming och idéer utanför ramarna
5. **Facilitator** - Diskussionshantering, konsensusbyggande och samarbete

### Personastruktur
Varje persona definieras av endast 4 enkla fält:
- **Namn**: Visningsnamn (t.ex. "Strategisk rådgivare")
- **Roll**: Kort rollidentifierare (t.ex. "Strateg")
- **Detaljer**: Fritextbeskrivning inklusive bakgrund, prioriteringar, bekymmer och inflytandenivå
- **Avatarval**: Visuell representation från tillgängliga avataralternativ

### Personaanpassning
- **Redigera standardpersonas**: Modifiera valfri standardpersonas detaljer på naturligt språk
- **Skapa anpassade personas**: Bygg helt anpassade personas med dina egna beskrivningar
- **Sessionspersistens**: Alla personaanpassningar kvarstår genom webbläsarsessioner
- **Import/Export**: Spara och dela personakonfigurationer via JSON-filer
- **Panelbaserat gränssnitt**: Visuellt panelval med omfattande redigeringsmöjligheter

### Teknisk implementation
Varje persona bibehåller:
- Isolerad konversationskontext för autentiska svar
- Naturlig språkbehandling av detaljfältet för AI-promptgenerering
- Rollspecifika svarsmönster baserade på beskrivna egenskaper
- Intelligent turtagande för naturligt gruppkonversationsflöde

## 🌐 Internationalisering och personahantering

### Arbetsflöde för personadefinition
1. **Sanningskälla**: Alla personadefinitioner underhålls i `shared/src/personas/index.ts`
2. **Generering**: Kör `npm run personas:generate` för att skapa engelsk `personas.json` översättningsfil
3. **Översättning**: Använd befintliga översättningsskript för att generera lokaliserade personafiler

### Personaöversättningsprocess
```bash
# 1. Uppdatera personadefinitioner i delat paket
vim shared/src/personas/index.ts

# 2. Generera engelsk personas.json från delade definitioner
npm run personas:generate

# 3. Översätt personas till alla stödda språk
npm run docs:translate  # Översätter alla filer inklusive personas.json
# Eller översätt till specifikt språk
npm run docs:translate:single -- --lang es

# 4. Bygg om delat paket vid behov
npm run build:shared
```

### Översättningsfilstruktur
- **Källa**: `shared/src/personas/index.ts` (TypeScript-definitioner)
- **Genererad**: `frontend/public/locales/en/personas.json` (Engelsk i18n)
- **Översatt**: `frontend/public/locales/{lang}/personas.json` (Lokaliserade versioner)

### Stödda språk
Systemet stöder 14 språk för personas och dokumentation:
- 🇺🇸 English (en) - Källspråk
- 🇸🇦 العربية (ar) - Arabiska
- 🇩🇪 Deutsch (de) - Tyska
- 🇪🇸 Español (es) - Spanska
- 🇫🇷 Français (fr) - Franska
- 🇮🇱 עברית (he) - Hebreiska
- 🇮🇹 Italiano (it) - Italienska
- 🇯🇵 日本語 (ja) - Japanska
- 🇰🇷 한국어 (ko) - Koreanska
- 🇳🇱 Nederlands (nl) - Nederländska
- 🇵🇹 Português (pt) - Portugisiska
- 🇷🇺 Русский (ru) - Ryska
- 🇸🇪 Svenska (sv) - Svenska
- 🇨🇳 中文 (zh) - Kinesiska

### Lägga till nya personas
1. Lägg till personadefinition i `shared/src/personas/index.ts`
2. Kör `npm run personas:generate` för att uppdatera engelska översättningar
3. Kör översättningsskript för att generera lokaliserade versioner
4. Den nya personan kommer att vara tillgänglig på alla stödda språk

## 🔒 Säkerhetsfunktioner

- **Inputvalidering**: All användarinput valideras och saneras
- **Sessionsisolering**: Varje session bibehåller separat kontext
- **Felhantering**: Graciös felhantering med användarvänliga meddelanden
- **Hastighetsbegränsning**: Inbyggt skydd mot missbruk
- **HTTPS**: All kommunikation krypterad i produktion

## 📊 Övervakning och observerbarhet

- **Strukturerad loggning**: JSON-formaterade loggar med Winston
- **Hälsokontroller**: Omfattande hälsoövervakning
- **Mätvärden**: Anpassade applikationsmätvärden
- **Felspårning**: Detaljerad felloggning och spårning

## 🚢 Distribution

### Docker
```bash
# Bygg backend-image
cd backend
npm run docker:build

# Kör container
npm run docker:run
```

### AWS-distribution
```bash
# Distribuera infrastruktur
cd infrastructure
npm run deploy:dev # ersätt :dev med staging eller prod för dessa miljöer
```

## ⚠️ Varning för distributionsregion!
Som standard är routingmodellen för Bedrock OpenAI gpt-oss:20b (`openai.gpt-oss-20b-1:0`). Personamodellen utnyttjar Anthropic Claude 4 Sonnet (`anthropic.claude-sonnet-4-20250514-v1:0`). Se till att du distribuerar till en region som stöder båda modellerna, eller konfigurera alternativa modeller.

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

## 📈 Prestandamål

- **Svarstid**: < 3 sekunder för personasvar
- **Tillgänglighet**: 99,9% API-tillgänglighet
- **Samtidighet**: Stöd för 1000+ samtidiga användare
- **Gruppkonversationer**: Upp till 5 personas per session med naturligt konversationsflöde

## 🤝 Bidra

1. Forka repositoriet
2. Skapa en funktionsgren
3. Gör dina ändringar
4. Lägg till tester
5. Skicka en pull request

## 📄 Licens

Detta projekt är licensierat under MIT-licensen - se LICENSE-filen för detaljer.