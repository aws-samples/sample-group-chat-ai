# Pitch Perfect - Pratique de Présentation Alimentée par l'IA

Pitch Perfect est un chatbot de groupe de discussion alimenté par l'IA qui crée un environnement simulé pour que les professionnels puissent pratiquer et affiner des présentations critiques. Le système permet aux utilisateurs de recevoir des commentaires réalistes de personas IA représentant différentes perspectives de parties prenantes (PDG, CTO, DSI, DAF, CPO) sans la charge organisationnelle d'organiser de vrais groupes de discussion.

## 🏗️ Aperçu de l'Architecture

```
Entrée Utilisateur → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Model (Bedrock/OpenAI/Anthropic/Ollama)
```

### Fonctionnalités Clés

- **Simulation de Persona Alimentée par l'IA** : Multiples personas IA répondent indépendamment avec des priorités distinctes et des styles de communication
- **Environnement de Chat Interactif** : Flux de conversation en temps réel avec retour immédiat
- **Retour Spécifique au Rôle** : Chaque persona fournit des réponses basées sur la perspective (le PDG se concentre sur la stratégie, le DAF sur les coûts, etc.)
- **Traitement Séquentiel** : Les personas répondent l'une après l'autre pour des dynamiques de réunion réalistes
- **Gestion de Session** : Conversations basées sur des sessions avec nettoyage automatique et persistance des personas
- **Configuration Simplifiée des Personas** : Descriptions de personas en langage naturel au lieu de formulaires complexes
- **Multiples Fournisseurs LLM** : Support pour AWS Bedrock, OpenAI, Anthropic, et modèles Ollama locaux

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 20+ 
- npm 8+
- Docker (optionnel, pour la conteneurisation)
- AWS CLI (pour le déploiement)

### Installation

1. **Cloner le dépôt**
   ```bash
   git clone <repository-url>
   cd ai-pitch-perfect
   ```

2. **Installer les dépendances**
   ```bash
   npm run install:all
   ```

3. **Configurer les variables d'environnement**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Éditez backend/.env avec votre configuration
   
   # Frontend utilisera la configuration proxy de Vite
   ```

4. **Construire le package partagé**
   ```bash
   npm run build:shared
   ```

### Développement

1. **Démarrer le serveur backend**
   ```bash
   npm run dev:backend
   ```
   Backend sera disponible à `http://localhost:3000`

2. **Démarrer le serveur de développement frontend**
   ```bash
   npm run dev:frontend
   ```
   Frontend sera disponible à `http://localhost:3001`

3. **Tester l'API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Structure du Projet

```
ai-pitch-perfect/
├── shared/                 # Types TypeScript partagés et utilitaires
│   ├── src/
│   │   ├── types/         # Définitions de types communs
│   │   ├── constants/     # Constantes d'application
│   │   └── utils/         # Fonctions utilitaires partagées
├── backend/               # Serveur API Express.js
│   ├── src/
│   │   ├── controllers/   # Gestionnaires de routes API
│   │   ├── services/      # Services de logique métier
│   │   ├── middleware/    # Middleware Express
│   │   ├── config/        # Fichiers de configuration
│   │   └── utils/         # Utilitaires backend
├── frontend/              # Application React
│   ├── src/
│   │   ├── components/    # Composants React réutilisables
│   │   ├── pages/         # Composants de page
│   │   ├── services/      # Couche de service API
│   │   ├── hooks/         # Hooks React personnalisés
│   │   └── utils/         # Utilitaires frontend
├── infrastructure/        # Code d'infrastructure AWS CDK
├── tests/                 # Fichiers de test
└── documents/             # Documentation du projet
```

## 🔧 Scripts Disponibles

### Niveau Racine
- `npm run install:all` - Installer toutes les dépendances
- `npm run build` - Construire tous les packages
- `npm run test` - Exécuter tous les tests
- `npm run lint` - Lint de tous les packages

### Backend
- `npm run dev:backend` - Démarrer le backend en mode développement
- `npm run build:backend` - Construire le backend
- `npm run test:backend` - Exécuter les tests backend

### Frontend
- `npm run dev:frontend` - Démarrer le serveur de développement frontend
- `npm run build:frontend` - Construire le frontend pour la production
- `npm run test:frontend` - Exécuter les tests frontend

## 🌐 Points de Terminaison API

### Vérification de Santé
- `GET /health` - Vérification de santé basique
- `GET /health/detailed` - Informations de santé détaillées

### Personas
- `GET /personas` - Obtenir toutes les personas disponibles
- `GET /personas/:personaId` - Obtenir les détails d'une persona spécifique

### Sessions
- `POST /sessions` - Créer une nouvelle session de conversation
- `POST /sessions/:sessionId/messages` - Envoyer un message et obtenir des réponses
- `PUT /sessions/:sessionId/personas` - Mettre à jour les personas de session
- `GET /sessions/:sessionId/summary` - Obtenir le résumé de session
- `DELETE /sessions/:sessionId` - Terminer la session
- `GET /sessions/:sessionId` - Obtenir les détails de session

## 🤖 Intégration IA

Le système supporte plusieurs fournisseurs LLM via une interface configurable :

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Divers modèles)
- **Ollama** (Modèles locaux)

Configurer via les variables d'environnement :
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Mode Développement
En développement, le système utilise des réponses simulées pour simuler les interactions IA sans nécessiter de clés API.

## 🎭 Personas

Le système inclut 5 personas exécutives prédéfinies avec une personnalisation simplifiée et conviviale :

1. **PDG** - Focus stratégique, avantage concurrentiel, résultats business
2. **CTO** - Faisabilité technique, architecture, complexité d'implémentation
3. **DAF** - Impact financier, ROI, implications budgétaires
4. **DSI** - Intégration système, sécurité, infrastructure IT
5. **CPO** - Stratégie produit, expérience utilisateur, positionnement marché

### Structure Persona
Chaque persona est définie par seulement 4 champs simples :
- **Nom** : Nom d'affichage (ex. "Président Directeur Général")
- **Rôle** : Identifiant de rôle court (ex. "PDG")
- **Détails** : Description en texte libre incluant contexte, priorités, préoccupations et niveau d'influence
- **Sélection d'Avatar** : Représentation visuelle parmi les options d'avatar disponibles

### Personnalisation Persona
- **Éditer Personas Par Défaut** : Modifier les détails de toute persona par défaut en langage naturel
- **Créer Personas Personnalisées** : Construire des personas entièrement personnalisées avec vos propres descriptions
- **Persistance de Session** : Toutes les personnalisations de persona persistent à travers les sessions de navigateur
- **Import/Export** : Sauvegarder et partager les configurations de persona via des fichiers JSON
- **Interface Basée sur Tuiles** : Sélection visuelle de tuiles avec des capacités d'édition complètes

### Implémentation Technique
Chaque persona maintient :
- Contexte de conversation isolé pour des réponses authentiques
- Traitement en langage naturel du champ détails pour la génération de prompts IA
- Modèles de réponse spécifiques au rôle basés sur les caractéristiques décrites
- Traitement de réponse séquentiel pour des dynamiques de réunion réalistes

## 🔒 Fonctionnalités de Sécurité

- **Validation d'Entrée** : Toutes les entrées utilisateur sont validées et assainies
- **Isolation de Session** : Chaque session maintient un contexte séparé
- **Gestion d'Erreurs** : Gestion d'erreurs élégante avec des messages conviviaux
- **Limitation de Débit** : Protection intégrée contre l'abus
- **HTTPS** : Toutes les communications cryptées en production

## 📊 Surveillance & Observabilité

- **Journalisation Structurée** : Logs au format JSON avec Winston
- **Vérifications de Santé** : Surveillance de santé complète
- **Métriques** : Métriques d'application personnalisées
- **Suivi d'Erreurs** : Journalisation et suivi détaillés des erreurs

## 🚢 Déploiement

### Docker
```bash
# Construire l'image backend
cd backend
npm run docker:build

# Exécuter le conteneur
npm run docker:run
```

### Déploiement AWS
```bash
# Déployer l'infrastructure
cd infrastructure
npm run deploy:dev
```

## 🧪 Tests

### Tests Unitaires
```bash
npm run test
```

### Tests d'Intégration
```bash
npm run test:integration
```

### Tests E2E
```bash
npm run test:e2e
```

## 📈 Objectifs de Performance

- **Temps de Réponse** : < 3 secondes pour les réponses de persona
- **Disponibilité** : 99.9% de disponibilité API
- **Concurrence** : Support de 1000+ utilisateurs concurrents
- **Traitement Séquentiel** : Jusqu'à 5 personas par session avec flux de réunion réaliste

## 🤝 Contribuer

1. Fork du dépôt
2. Créer une branche de fonctionnalité
3. Faire vos changements
4. Ajouter des tests
5. Soumettre une pull request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour les détails.

## 🆘 Support

Pour le support et les questions :
- Consultez la documentation dans `/documents`
- Consultez la banque de mémoire dans `/memory-bank`
- Ouvrez une issue sur GitHub