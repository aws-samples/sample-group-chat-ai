# Group Chat AI - Collaboratieve AI-gesprekken

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](#)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


Group Chat AI is een geavanceerd collaboratief platform dat dynamische groepsgesprekken mogelijk maakt met meerdere AI-persona's. Het systeem faciliteert betekenisvolle discussies vanuit diverse perspectieven, waardoor gebruikers ideeën kunnen verkennen, feedback kunnen krijgen en kunnen deelnemen aan gesprekken met meerdere deelnemers met AI-agenten die verschillende rollen en standpunten vertegenwoordigen.

## 🏗️ Architectuuroverzicht

```
User Input → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### Belangrijkste functies

- **Multi-Persona Gesprekken**: Ga gelijktijdig in gesprek met meerdere AI-persona's in groepsdiscussies
- **Dynamische Interactiepatronen**: Real-time gespreksverloop met natuurlijke beurtwisseling en reacties
- **Diverse Perspectieven**: Elke persona brengt unieke standpunten, expertise en communicatiestijlen mee
- **Collaboratief Probleemoplossen**: Werk complexe onderwerpen door met AI-agenten die verschillende benaderingen bieden
- **Sessie Persistentie**: Behoud gesprekscontext en persona-consistentie tussen sessies
- **Flexibele Persona Aanpassing**: Creëer en wijzig AI-persona's met natuurlijke taalbeschrijvingen
- **Ondersteuning voor Meerdere LLM's**: Maak gebruik van verschillende taalmodellen waaronder AWS Bedrock, OpenAI, Anthropic en Ollama

## 🚀 Snelle Start

### Vereisten

- Node.js 20+ 
- npm 8+
- Docker (optioneel, voor containerisatie)
- AWS CLI (voor deployment)

### Installatie

1. **Kloon de repository**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **Installeer afhankelijkheden**
   ```bash
   npm run install:all
   ```

3. **Stel omgevingsvariabelen in**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Bewerk backend/.env met uw configuratie
   
   # Frontend zal Vite's proxy configuratie gebruiken
   ```

4. **Bouw gedeeld pakket**
   ```bash
   npm run build:shared
   ```

### Ontwikkeling

1. **Start de backend server**
   ```bash
   npm run dev:backend
   ```
   Backend zal beschikbaar zijn op `http://localhost:3000`

2. **Start de frontend ontwikkelingsserver**
   ```bash
   npm run dev:frontend
   ```
   Frontend zal beschikbaar zijn op `http://localhost:3001`

3. **Test de API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Projectstructuur

```
group-chat-ai/
├── shared/                 # Gedeelde TypeScript types en utilities
│   ├── src/
│   │   ├── types/         # Gemeenschappelijke type definities
│   │   ├── constants/     # Applicatie constanten
│   │   └── utils/         # Gedeelde utility functies
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── controllers/   # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── middleware/    # Express middleware
│   │   ├── config/        # Configuratiebestanden
│   │   └── utils/         # Backend utilities
├── frontend/              # React applicatie
│   ├── src/
│   │   ├── components/    # Herbruikbare React componenten
│   │   ├── pages/         # Pagina componenten
│   │   ├── services/      # API service laag
│   │   ├── hooks/         # Aangepaste React hooks
│   │   └── utils/         # Frontend utilities
├── infrastructure/        # AWS CDK infrastructuur code
├── tests/                 # Test bestanden
└── documents/             # Project documentatie
```

## 🔧 Beschikbare Scripts

### Root Niveau
- `npm run install:all` - Installeer alle afhankelijkheden
- `npm run build` - Bouw alle pakketten
- `npm run test` - Voer alle tests uit
- `npm run lint` - Lint alle pakketten

### Backend
- `npm run dev:backend` - Start backend in ontwikkelingsmodus
- `npm run build:backend` - Bouw backend
- `npm run test:backend` - Voer backend tests uit

### Frontend
- `npm run dev:frontend` - Start frontend ontwikkelingsserver
- `npm run build:frontend` - Bouw frontend voor productie
- `npm run test:frontend` - Voer frontend tests uit

### Persona's & Internationalisatie
- `npm run personas:generate` - Genereer Engelse personas.json uit gedeelde definities
- `npm run docs:translate` - Vertaal alle documentatie naar ondersteunde talen
- `npm run docs:translate:single -- --lang es` - Vertaal naar specifieke taal

## 🌐 API Endpoints

### Health Check
- `GET /health` - Basis health check
- `GET /health/detailed` - Gedetailleerde health informatie

### Persona's
- `GET /personas` - Krijg alle beschikbare persona's
- `GET /personas/:personaId` - Krijg specifieke persona details

### Sessies
- `POST /sessions` - Creëer nieuwe gesprekssessie
- `POST /sessions/:sessionId/messages` - Verstuur bericht en krijg reacties
- `PUT /sessions/:sessionId/personas` - Update sessie persona's
- `GET /sessions/:sessionId/summary` - Krijg sessie samenvatting
- `DELETE /sessions/:sessionId` - Beëindig sessie
- `GET /sessions/:sessionId` - Krijg sessie details

## 🤖 AI Integratie

Het systeem ondersteunt meerdere LLM providers via een configureerbare interface:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Verschillende modellen)
- **Ollama** (Lokale modellen)

Configureer via omgevingsvariabelen:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Ontwikkelingsmodus
In ontwikkeling gebruikt het systeem mock responses om AI-interacties te simuleren zonder API-sleutels te vereisen.

## 🎭 Persona's

Het systeem bevat diverse AI-persona's die aangepast kunnen worden voor verschillende groepsgespreksscenario's:

1. **Strategisch Adviseur** - Planning op hoog niveau, visie en strategische richting
2. **Technisch Expert** - Diepgaande technische kennis, implementatiedetails en oplossingen
3. **Analist** - Data-gedreven inzichten, onderzoek en analytische perspectieven  
4. **Creatief Denker** - Innovatie, brainstorming en out-of-the-box ideeën
5. **Facilitator** - Discussiebeheer, consensusvorming en samenwerking

### Persona Structuur
Elke persona wordt gedefinieerd door slechts 4 eenvoudige velden:
- **Naam**: Weergavenaam (bijv. "Strategisch Adviseur")
- **Rol**: Korte rol identificatie (bijv. "Strateeg")
- **Details**: Vrije tekstbeschrijving inclusief achtergrond, prioriteiten, zorgen en invloedsniveau
- **Avatar Selectie**: Visuele representatie uit beschikbare avatar opties

### Persona Aanpassing
- **Bewerk Standaard Persona's**: Wijzig de details van elke standaard persona in natuurlijke taal
- **Creëer Aangepaste Persona's**: Bouw volledig aangepaste persona's met uw eigen beschrijvingen
- **Sessie Persistentie**: Alle persona aanpassingen blijven behouden gedurende browsersessies
- **Import/Export**: Bewaar en deel persona configuraties via JSON bestanden
- **Tile-gebaseerde Interface**: Visuele tile selectie met uitgebreide bewerkingsmogelijkheden

### Technische Implementatie
Elke persona behoudt:
- Geïsoleerde gesprekscontext voor authentieke reacties
- Natuurlijke taalverwerking van details veld voor AI prompt generatie
- Rol-specifieke reactiepatronen gebaseerd op beschreven kenmerken
- Intelligente beurtwisseling voor natuurlijke groepsgespreksverloop

## 🌐 Internationalisatie & Persona Beheer

### Persona Definitie Workflow
1. **Bron van Waarheid**: Alle persona definities worden onderhouden in `shared/src/personas/index.ts`
2. **Generatie**: Voer `npm run personas:generate` uit om Engels `personas.json` vertaalbestand te creëren
3. **Vertaling**: Gebruik bestaande vertaalscripts om gelokaliseerde persona bestanden te genereren

### Persona Vertaalproces
```bash
# 1. Update persona definities in gedeeld pakket
vim shared/src/personas/index.ts

# 2. Genereer Engels personas.json uit gedeelde definities
npm run personas:generate

# 3. Vertaal persona's naar alle ondersteunde talen
npm run docs:translate  # Vertaalt alle bestanden inclusief personas.json
# Of vertaal naar specifieke taal
npm run docs:translate:single -- --lang es

# 4. Herbouw gedeeld pakket indien nodig
npm run build:shared
```

### Vertaalbestand Structuur
- **Bron**: `shared/src/personas/index.ts` (TypeScript definities)
- **Gegenereerd**: `frontend/public/locales/en/personas.json` (Engels i18n)
- **Vertaald**: `frontend/public/locales/{lang}/personas.json` (Gelokaliseerde versies)

### Ondersteunde Talen
Het systeem ondersteunt 14 talen voor persona's en documentatie:
- 🇺🇸 English (en) - Brontaal
- 🇸🇦 العربية (ar) - Arabisch
- 🇩🇪 Deutsch (de) - Duits
- 🇪🇸 Español (es) - Spaans
- 🇫🇷 Français (fr) - Frans
- 🇮🇱 עברית (he) - Hebreeuws
- 🇮🇹 Italiano (it) - Italiaans
- 🇯🇵 日本語 (ja) - Japans
- 🇰🇷 한국어 (ko) - Koreaans
- 🇳🇱 Nederlands (nl) - Nederlands
- 🇵🇹 Português (pt) - Portugees
- 🇷🇺 Русский (ru) - Russisch
- 🇸🇪 Svenska (sv) - Zweeds
- 🇨🇳 中文 (zh) - Chinees

### Nieuwe Persona's Toevoegen
1. Voeg persona definitie toe aan `shared/src/personas/index.ts`
2. Voer `npm run personas:generate` uit om Engelse vertalingen bij te werken
3. Voer vertaalscripts uit om gelokaliseerde versies te genereren
4. De nieuwe persona zal beschikbaar zijn in alle ondersteunde talen

## 🔒 Beveiligingsfuncties

- **Input Validatie**: Alle gebruikersinvoer wordt gevalideerd en gesaniteerd
- **Sessie Isolatie**: Elke sessie behoudt aparte context
- **Foutafhandeling**: Elegante foutafhandeling met gebruiksvriendelijke berichten
- **Rate Limiting**: Ingebouwde bescherming tegen misbruik
- **HTTPS**: Alle communicatie versleuteld in productie

## 📊 Monitoring & Observeerbaarheid

- **Gestructureerde Logging**: JSON-geformatteerde logs met Winston
- **Health Checks**: Uitgebreide health monitoring
- **Metrics**: Aangepaste applicatie metrics
- **Error Tracking**: Gedetailleerde error logging en tracking

## 🚢 Deployment

### Docker
```bash
# Bouw backend image
cd backend
npm run docker:build

# Voer container uit
npm run docker:run
```

### AWS Deployment
```bash
# Deploy infrastructuur
cd infrastructure
npm run deploy:dev # vervang :dev met staging of prod voor die omgevingen
```

## ⚠️ Deployment Regio Waarschuwing!
Standaard is het Routing Model voor Bedrock OpenAI gpt-oss:20b (`openai.gpt-oss-20b-1:0`). Het Persona Model maakt gebruik van Anthropic Claude 4 Sonnet (`anthropic.claude-sonnet-4-20250514-v1:0`). Zorg ervoor dat u deployt naar een regio die beide modellen ondersteunt, of configureer alternatieve modellen.

## 🧪 Testen

### Unit Tests
```bash
npm run test
```

### Integratie Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📈 Prestatiedoelen

- **Reactietijd**: < 3 seconden voor persona reacties
- **Beschikbaarheid**: 99.9% API beschikbaarheid
- **Gelijktijdigheid**: Ondersteuning voor 1000+ gelijktijdige gebruikers
- **Groepsgesprekken**: Tot 5 persona's per sessie met natuurlijke gespreksverloop

## 🤝 Bijdragen

1. Fork de repository
2. Creëer een feature branch
3. Maak uw wijzigingen
4. Voeg tests toe
5. Dien een pull request in

## 📄 Licentie

Dit project is gelicentieerd onder de MIT Licentie - zie het LICENSE bestand voor details.