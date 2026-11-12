# Group Chat AI - Kollaborative KI-Gespräche

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](#)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


Group Chat AI ist eine fortschrittliche kollaborative Plattform, die dynamische Gruppengespräche mit mehreren KI-Personas ermöglicht. Das System erleichtert bedeutungsvolle Diskussionen aus verschiedenen Blickwinkeln und erlaubt es Benutzern, Ideen zu erkunden, Feedback zu erhalten und sich in Gesprächen mit mehreren Teilnehmern mit KI-Agenten zu engagieren, die verschiedene Rollen und Standpunkte repräsentieren.

## 🏗️ Architektur-Übersicht

```
User Input → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### Hauptfunktionen

- **Multi-Persona-Gespräche**: Gleichzeitige Interaktion mit mehreren KI-Personas in Gruppendiskussionen
- **Dynamische Interaktionsmuster**: Echtzeit-Gesprächsfluss mit natürlichem Rederecht und Antworten
- **Vielfältige Perspektiven**: Jede Persona bringt einzigartige Standpunkte, Expertise und Kommunikationsstile mit
- **Kollaborative Problemlösung**: Bearbeitung komplexer Themen mit KI-Agenten, die verschiedene Ansätze bieten
- **Sitzungspersistenz**: Erhaltung des Gesprächskontexts und der Persona-Konsistenz über Sitzungen hinweg
- **Flexible Persona-Anpassung**: Erstellung und Modifikation von KI-Personas mit natürlichsprachlichen Beschreibungen
- **Mehrfache LLM-Unterstützung**: Nutzung verschiedener Sprachmodelle einschließlich AWS Bedrock, OpenAI, Anthropic und Ollama

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 22+ 
- npm 8+
- Docker (optional, für Containerisierung)
- AWS CLI (für Deployment)

### Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm run install:all
   ```

3. **Umgebungsvariablen einrichten**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Bearbeiten Sie backend/.env mit Ihrer Konfiguration
   
   # Frontend verwendet Vites Proxy-Konfiguration
   ```

4. **Shared Package erstellen**
   ```bash
   npm run build:shared
   ```

### Entwicklung

1. **Backend-Server starten**
   ```bash
   npm run dev:backend
   ```
   Backend ist verfügbar unter `http://localhost:3000`

2. **Frontend-Entwicklungsserver starten**
   ```bash
   npm run dev:frontend
   ```
   Frontend ist verfügbar unter `http://localhost:3001`

3. **API testen**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Projektstruktur

```
group-chat-ai/
├── shared/                 # Geteilte TypeScript-Typen und Utilities
│   ├── src/
│   │   ├── types/         # Gemeinsame Typdefinitionen
│   │   ├── constants/     # Anwendungskonstanten
│   │   └── utils/         # Geteilte Utility-Funktionen
├── backend/               # Express.js API-Server
│   ├── src/
│   │   ├── controllers/   # API-Route-Handler
│   │   ├── services/      # Geschäftslogik-Services
│   │   ├── middleware/    # Express-Middleware
│   │   ├── config/        # Konfigurationsdateien
│   │   └── utils/         # Backend-Utilities
├── frontend/              # React-Anwendung
│   ├── src/
│   │   ├── components/    # Wiederverwendbare React-Komponenten
│   │   ├── pages/         # Seitenkomponenten
│   │   ├── services/      # API-Service-Schicht
│   │   ├── hooks/         # Benutzerdefinierte React-Hooks
│   │   └── utils/         # Frontend-Utilities
├── infrastructure/        # AWS CDK-Infrastrukturcode
├── tests/                 # Testdateien
└── documents/             # Projektdokumentation
```

## 🔧 Verfügbare Skripte

### Root-Ebene
- `npm run install:all` - Alle Abhängigkeiten installieren
- `npm run build` - Alle Pakete erstellen
- `npm run test` - Alle Tests ausführen
- `npm run lint` - Alle Pakete linten

### Backend
- `npm run dev:backend` - Backend im Entwicklungsmodus starten
- `npm run build:backend` - Backend erstellen
- `npm run test:backend` - Backend-Tests ausführen

### Frontend
- `npm run dev:frontend` - Frontend-Entwicklungsserver starten
- `npm run build:frontend` - Frontend für Produktion erstellen
- `npm run test:frontend` - Frontend-Tests ausführen

### Personas & Internationalisierung
- `npm run personas:generate` - Englische personas.json aus geteilten Definitionen generieren
- `npm run docs:translate` - Gesamte Dokumentation in unterstützte Sprachen übersetzen
- `npm run docs:translate:single -- --lang es` - In spezifische Sprache übersetzen

## 🌐 API-Endpunkte

### Gesundheitsprüfung
- `GET /health` - Grundlegende Gesundheitsprüfung
- `GET /health/detailed` - Detaillierte Gesundheitsinformationen

### Personas
- `GET /personas` - Alle verfügbaren Personas abrufen
- `GET /personas/:personaId` - Spezifische Persona-Details abrufen

### Sitzungen
- `POST /sessions` - Neue Gesprächssitzung erstellen
- `POST /sessions/:sessionId/messages` - Nachricht senden und Antworten erhalten
- `PUT /sessions/:sessionId/personas` - Sitzungs-Personas aktualisieren
- `GET /sessions/:sessionId/summary` - Sitzungszusammenfassung abrufen
- `DELETE /sessions/:sessionId` - Sitzung beenden
- `GET /sessions/:sessionId` - Sitzungsdetails abrufen

## 🤖 KI-Integration

Das System unterstützt mehrere LLM-Anbieter über eine konfigurierbare Schnittstelle:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Verschiedene Modelle)
- **Ollama** (Lokale Modelle)

Konfiguration über Umgebungsvariablen:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Entwicklungsmodus
Im Entwicklungsmodus verwendet das System Mock-Antworten, um KI-Interaktionen zu simulieren, ohne API-Schlüssel zu benötigen.

## 🎭 Personas

Das System umfasst vielfältige KI-Personas, die für verschiedene Gruppengespräch-Szenarien angepasst werden können:

1. **Strategischer Berater** - Hochrangige Planung, Vision und strategische Ausrichtung
2. **Technischer Experte** - Tiefes technisches Wissen, Implementierungsdetails und Lösungen
3. **Analyst** - Datengesteuerte Einblicke, Forschung und analytische Perspektiven  
4. **Kreativer Denker** - Innovation, Brainstorming und unkonventionelle Ideen
5. **Moderator** - Diskussionsmanagement, Konsensbildung und Zusammenarbeit

### Persona-Struktur
Jede Persona wird durch nur 4 einfache Felder definiert:
- **Name**: Anzeigename (z.B. "Strategischer Berater")
- **Rolle**: Kurze Rollenbezeichnung (z.B. "Stratege")
- **Details**: Freitextbeschreibung einschließlich Hintergrund, Prioritäten, Bedenken und Einflussgrad
- **Avatar-Auswahl**: Visuelle Darstellung aus verfügbaren Avatar-Optionen

### Persona-Anpassung
- **Standard-Personas bearbeiten**: Beliebige Standard-Persona-Details in natürlicher Sprache modifizieren
- **Benutzerdefinierte Personas erstellen**: Vollständig benutzerdefinierte Personas mit eigenen Beschreibungen erstellen
- **Sitzungspersistenz**: Alle Persona-Anpassungen bleiben während der Browser-Sitzungen erhalten
- **Import/Export**: Persona-Konfigurationen über JSON-Dateien speichern und teilen
- **Kachel-basierte Oberfläche**: Visuelle Kachelauswahl mit umfassenden Bearbeitungsmöglichkeiten

### Technische Implementierung
Jede Persona behält bei:
- Isolierten Gesprächskontext für authentische Antworten
- Natürlichsprachliche Verarbeitung des Details-Feldes für KI-Prompt-Generierung
- Rollenspezifische Antwortmuster basierend auf beschriebenen Eigenschaften
- Intelligente Rederecht-Verteilung für natürlichen Gruppengespräch-Fluss

## 🌐 Internationalisierung & Persona-Management

### Persona-Definitions-Workflow
1. **Quelle der Wahrheit**: Alle Persona-Definitionen werden in `shared/src/personas/index.ts` gepflegt
2. **Generierung**: `npm run personas:generate` ausführen, um englische `personas.json`-Übersetzungsdatei zu erstellen
3. **Übersetzung**: Bestehende Übersetzungsskripte verwenden, um lokalisierte Persona-Dateien zu generieren

### Persona-Übersetzungsprozess
```bash
# 1. Persona-Definitionen im shared Package aktualisieren
vim shared/src/personas/index.ts

# 2. Englische personas.json aus geteilten Definitionen generieren
npm run personas:generate

# 3. Personas in alle unterstützten Sprachen übersetzen
npm run docs:translate  # Übersetzt alle Dateien einschließlich personas.json
# Oder in spezifische Sprache übersetzen
npm run docs:translate:single -- --lang es

# 4. Shared Package bei Bedarf neu erstellen
npm run build:shared
```

### Übersetzungsdatei-Struktur
- **Quelle**: `shared/src/personas/index.ts` (TypeScript-Definitionen)
- **Generiert**: `frontend/public/locales/en/personas.json` (Englisch i18n)
- **Übersetzt**: `frontend/public/locales/{lang}/personas.json` (Lokalisierte Versionen)

### Unterstützte Sprachen
Das System unterstützt 14 Sprachen für Personas und Dokumentation:
- 🇺🇸 English (en) - Quellsprache
- 🇸🇦 العربية (ar) - Arabisch
- 🇩🇪 Deutsch (de) - Deutsch
- 🇪🇸 Español (es) - Spanisch
- 🇫🇷 Français (fr) - Französisch
- 🇮🇱 עברית (he) - Hebräisch
- 🇮🇹 Italiano (it) - Italienisch
- 🇯🇵 日本語 (ja) - Japanisch
- 🇰🇷 한국어 (ko) - Koreanisch
- 🇳🇱 Nederlands (nl) - Niederländisch
- 🇵🇹 Português (pt) - Portugiesisch
- 🇷🇺 Русский (ru) - Russisch
- 🇸🇪 Svenska (sv) - Schwedisch
- 🇨🇳 中文 (zh) - Chinesisch

### Neue Personas hinzufügen
1. Persona-Definition zu `shared/src/personas/index.ts` hinzufügen
2. `npm run personas:generate` ausführen, um englische Übersetzungen zu aktualisieren
3. Übersetzungsskripte ausführen, um lokalisierte Versionen zu generieren
4. Die neue Persona wird in allen unterstützten Sprachen verfügbar sein

## 🔒 Sicherheitsfeatures

- **Eingabevalidierung**: Alle Benutzereingaben werden validiert und bereinigt
- **Sitzungsisolation**: Jede Sitzung behält separaten Kontext bei
- **Fehlerbehandlung**: Elegante Fehlerbehandlung mit benutzerfreundlichen Nachrichten
- **Rate Limiting**: Eingebauter Schutz gegen Missbrauch
- **HTTPS**: Alle Kommunikationen in der Produktion verschlüsselt

## 📊 Monitoring & Observability

- **Strukturierte Protokollierung**: JSON-formatierte Logs mit Winston
- **Gesundheitsprüfungen**: Umfassendes Gesundheitsmonitoring
- **Metriken**: Benutzerdefinierte Anwendungsmetriken
- **Fehlerverfolgung**: Detaillierte Fehlerprotokollierung und -verfolgung

## 🚢 Deployment

### Docker
```bash
# Backend-Image erstellen
cd backend
npm run docker:build

# Container ausführen
npm run docker:run
```

### AWS-Deployment
```bash
# Infrastruktur deployen
cd infrastructure
npm run deploy:dev # ersetzen Sie :dev durch staging oder prod für diese Umgebungen
```

## ⚠️ Deployment-Regions-Warnung!
Standardmäßig ist das Routing-Modell für Bedrock Anthropic Claude Haiku 5.5 (`us.anthropic.claude-haiku-5-5`). Das Persona-Modell nutzt Anthropic Claude Sonnet 5.5 (`us.anthropic.claude-sonnet-5-5`). Bitte stellen Sie sicher, dass Sie in einer Region deployen, die beide Modelle unterstützt, oder konfigurieren Sie alternative Modelle.

## 🧪 Testen

### Unit-Tests
```bash
npm run test
```

### Integrationstests
```bash
npm run test:integration
```

### E2E-Tests
```bash
npm run test:e2e
```

## 📈 Performance-Ziele

- **Antwortzeit**: < 3 Sekunden für Persona-Antworten
- **Verfügbarkeit**: 99,9% API-Verfügbarkeit
- **Gleichzeitigkeit**: Unterstützung von 1000+ gleichzeitigen Benutzern
- **Gruppengespräche**: Bis zu 5 Personas pro Sitzung mit natürlichem Gesprächsfluss

## 🤝 Mitwirken

1. Repository forken
2. Feature-Branch erstellen
3. Änderungen vornehmen
4. Tests hinzufügen
5. Pull Request einreichen

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die LICENSE-Datei für Details.