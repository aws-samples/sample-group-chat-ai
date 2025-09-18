# Pitch Perfect - KI-gestützte Präsentationsübung

Pitch Perfect ist ein KI-gestützter Fokusgruppen-Chatbot, der eine simulierte Umgebung für Fachkräfte schafft, um kritische Präsentationen zu üben und zu verfeinern. Das System ermöglicht es Benutzern, realistisches Feedback von KI-Personas zu erhalten, die verschiedene Stakeholder-Perspektiven repräsentieren (CEO, CTO, CIO, CFO, CPO) ohne den Aufwand der Organisation tatsächlicher Fokusgruppen.

## 🏗️ Architektur-Überblick

```
Benutzereingabe → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Model (Bedrock/OpenAI/Anthropic/Ollama)
```

### Hauptfunktionen

- **KI-gestützte Persona-Simulation**: Mehrere KI-Personas reagieren unabhängig mit unterschiedlichen Prioritäten und Kommunikationsstilen
- **Interaktive Chat-Umgebung**: Echtzeit-Gesprächsfluss mit sofortigem Feedback
- **Rollenspezifisches Feedback**: Jede Persona bietet perspektivbasierte Antworten (CEO fokussiert auf Strategie, CFO auf Kosten, etc.)
- **Sequentielle Verarbeitung**: Personas antworten nacheinander für realistische Meeting-Dynamiken
- **Session-Management**: Sitzungsbasierte Gespräche mit automatischer Bereinigung und Persona-Persistenz
- **Vereinfachtes Persona-Setup**: Natürlichsprachige Persona-Beschreibungen anstatt komplexer Formulare
- **Mehrere LLM-Anbieter**: Unterstützung für AWS Bedrock, OpenAI, Anthropic und lokale Ollama-Modelle

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 20+ 
- npm 8+
- Docker (optional, für Containerisierung)
- AWS CLI (für Deployment)

### Installation

1. **Repository klonen**
   ```bash
   git clone <repository-url>
   cd ai-pitch-perfect
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
   
   # Frontend wird Vites Proxy-Konfiguration verwenden
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
   Backend wird unter `http://localhost:3000` verfügbar sein

2. **Frontend-Entwicklungsserver starten**
   ```bash
   npm run dev:frontend
   ```
   Frontend wird unter `http://localhost:3001` verfügbar sein

3. **API testen**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Projektstruktur

```
ai-pitch-perfect/
├── shared/                 # Gemeinsame TypeScript-Typen und Utilities
│   ├── src/
│   │   ├── types/         # Gemeinsame Typdefinitionen
│   │   ├── constants/     # Anwendungskonstanten
│   │   └── utils/         # Gemeinsame Utility-Funktionen
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

## 🌐 API-Endpunkte

### Gesundheitscheck
- `GET /health` - Basis-Gesundheitscheck
- `GET /health/detailed` - Detaillierte Gesundheitsinformationen

### Personas
- `GET /personas` - Alle verfügbaren Personas abrufen
- `GET /personas/:personaId` - Spezifische Persona-Details abrufen

### Sessions
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
In der Entwicklung verwendet das System Mock-Antworten zur Simulation von KI-Interaktionen ohne API-Schlüssel.

## 🎭 Personas

Das System enthält 5 vordefinierte Führungskraft-Personas mit vereinfachter, benutzerfreundlicher Anpassung:

1. **CEO** - Strategischer Fokus, Wettbewerbsvorteil, Geschäftsergebnisse
2. **CTO** - Technische Machbarkeit, Architektur, Implementierungskomplexität
3. **CFO** - Finanzielle Auswirkungen, ROI, Budgetauswirkungen
4. **CIO** - Systemintegration, Sicherheit, IT-Infrastruktur
5. **CPO** - Produktstrategie, Benutzererfahrung, Marktpositionierung

### Persona-Struktur
Jede Persona wird durch nur 4 einfache Felder definiert:
- **Name**: Anzeigename (z.B. "Chief Executive Officer")
- **Rolle**: Kurze Rollenkennung (z.B. "CEO")
- **Details**: Freitext-Beschreibung mit Hintergrund, Prioritäten, Bedenken und Einflusslevel
- **Avatar-Auswahl**: Visuelle Darstellung aus verfügbaren Avatar-Optionen

### Persona-Anpassung
- **Standard-Personas bearbeiten**: Beliebige Standard-Persona-Details in natürlicher Sprache modifizieren
- **Benutzerdefinierte Personas erstellen**: Völlig benutzerdefinierte Personas mit eigenen Beschreibungen erstellen
- **Sitzungspersistenz**: Alle Persona-Anpassungen bleiben während der Browser-Sitzungen bestehen
- **Import/Export**: Persona-Konfigurationen über JSON-Dateien speichern und teilen
- **Kachelbasierte Schnittstelle**: Visuelle Kachelauswahl mit umfassenden Bearbeitungsmöglichkeiten

### Technische Implementierung
Jede Persona behält bei:
- Isolierten Gesprächskontext für authentische Antworten
- Natürlichsprachige Verarbeitung des Details-Feldes für KI-Prompt-Generierung
- Rollenspezifische Antwortmuster basierend auf beschriebenen Eigenschaften
- Sequentielle Antwortverarbeitung für realistische Meeting-Dynamiken

## 🔒 Sicherheitsfeatures

- **Input-Validierung**: Alle Benutzereingaben werden validiert und bereinigt
- **Session-Isolation**: Jede Sitzung behält separaten Kontext bei
- **Fehlerbehandlung**: Graceful Error Handling mit benutzerfreundlichen Nachrichten
- **Rate Limiting**: Eingebauter Schutz vor Missbrauch
- **HTTPS**: Alle Kommunikation verschlüsselt in der Produktion

## 📊 Monitoring & Observability

- **Strukturiertes Logging**: JSON-formatierte Logs mit Winston
- **Health Checks**: Umfassendes Gesundheitsmonitoring
- **Metriken**: Benutzerdefinierte Anwendungsmetriken
- **Fehler-Tracking**: Detailliertes Fehlerlogging und -tracking

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
npm run deploy:dev
```

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integrationstests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📈 Performance-Ziele

- **Antwortzeit**: < 3 Sekunden für Persona-Antworten
- **Verfügbarkeit**: 99.9% API-Verfügbarkeit
- **Parallelität**: Unterstützung für 1000+ gleichzeitige Benutzer
- **Sequentielle Verarbeitung**: Bis zu 5 Personas pro Sitzung mit realistischem Meeting-Flow

## 🤝 Beitragen

1. Repository forken
2. Feature-Branch erstellen
3. Änderungen vornehmen
4. Tests hinzufügen
5. Pull Request einreichen

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe LICENSE-Datei für Details.

## 🆘 Support

Für Support und Fragen:
- Überprüfen Sie die Dokumentation in `/documents`
- Überprüfen Sie die Memory Bank in `/memory-bank`
- Öffnen Sie ein Issue auf GitHub