# Group Chat AI - Conversations IA Collaboratives

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](#)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


Group Chat AI est une plateforme collaborative avancée qui permet des conversations de groupe dynamiques avec plusieurs personas IA. Le système facilite des discussions significatives à travers diverses perspectives, permettant aux utilisateurs d'explorer des idées, d'obtenir des retours, et de s'engager dans des conversations multi-participants avec des agents IA représentant différents rôles et points de vue.

## 🏗️ Aperçu de l'Architecture

```
Saisie Utilisateur → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### Fonctionnalités Clés

- **Conversations Multi-Personas** : Interagissez avec plusieurs personas IA simultanément dans des discussions de groupe
- **Modèles d'Interaction Dynamiques** : Flux de conversation en temps réel avec prise de parole naturelle et réponses
- **Perspectives Diverses** : Chaque persona apporte des points de vue uniques, une expertise et des styles de communication
- **Résolution Collaborative de Problèmes** : Travaillez sur des sujets complexes avec des agents IA offrant différentes approches
- **Persistance de Session** : Maintenez le contexte de conversation et la cohérence des personas à travers les sessions
- **Personnalisation Flexible des Personas** : Créez et modifiez des personas IA avec des descriptions en langage naturel
- **Support Multi-LLM** : Exploitez divers modèles de langage incluant AWS Bedrock, OpenAI, Anthropic, et Ollama

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 24+ 
- npm 8+
- Docker (optionnel, pour la conteneurisation)
- AWS CLI (pour le déploiement)

### Installation

1. **Cloner le dépôt**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
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
   Le backend sera disponible à `http://localhost:3000`

2. **Démarrer le serveur de développement frontend**
   ```bash
   npm run dev:frontend
   ```
   Le frontend sera disponible à `http://localhost:3001`

3. **Tester l'API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Structure du Projet

```
group-chat-ai/
├── shared/                 # Types TypeScript partagés et utilitaires
│   ├── src/
│   │   ├── types/         # Définitions de types communes
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
- `npm run lint` - Linter tous les packages

### Backend
- `npm run dev:backend` - Démarrer le backend en mode développement
- `npm run build:backend` - Construire le backend
- `npm run test:backend` - Exécuter les tests backend

### Frontend
- `npm run dev:frontend` - Démarrer le serveur de développement frontend
- `npm run build:frontend` - Construire le frontend pour la production
- `npm run test:frontend` - Exécuter les tests frontend

### Personas et Internationalisation
- `npm run personas:generate` - Générer le personas.json anglais à partir des définitions partagées
- `npm run docs:translate` - Traduire toute la documentation vers les langues supportées
- `npm run docs:translate:single -- --lang es` - Traduire vers une langue spécifique

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

Configurez via les variables d'environnement :
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Mode Développement
En développement, le système utilise des réponses simulées pour imiter les interactions IA sans nécessiter de clés API.

## 🎭 Personas

Le système inclut diverses personas IA qui peuvent être personnalisées pour divers scénarios de conversation de groupe :

1. **Conseiller Stratégique** - Planification de haut niveau, vision et direction stratégique
2. **Expert Technique** - Connaissances techniques approfondies, détails d'implémentation et solutions
3. **Analyste** - Insights basés sur les données, recherche et perspectives analytiques  
4. **Penseur Créatif** - Innovation, brainstorming et idées originales
5. **Facilitateur** - Gestion de discussion, construction de consensus et collaboration

### Structure des Personas
Chaque persona est définie par seulement 4 champs simples :
- **Nom** : Nom d'affichage (ex : "Conseiller Stratégique")
- **Rôle** : Identifiant de rôle court (ex : "Stratège")
- **Détails** : Description en texte libre incluant l'arrière-plan, les priorités, les préoccupations et le niveau d'influence
- **Sélection d'Avatar** : Représentation visuelle parmi les options d'avatar disponibles

### Personnalisation des Personas
- **Modifier les Personas par Défaut** : Modifiez les détails de toute persona par défaut en langage naturel
- **Créer des Personas Personnalisées** : Construisez des personas complètement personnalisées avec vos propres descriptions
- **Persistance de Session** : Toutes les personnalisations de personas persistent durant les sessions de navigateur
- **Import/Export** : Sauvegardez et partagez les configurations de personas via des fichiers JSON
- **Interface Basée sur Tuiles** : Sélection visuelle par tuiles avec des capacités d'édition complètes

### Implémentation Technique
Chaque persona maintient :
- Contexte de conversation isolé pour des réponses authentiques
- Traitement en langage naturel du champ détails pour la génération de prompts IA
- Modèles de réponse spécifiques au rôle basés sur les caractéristiques décrites
- Prise de parole intelligente pour un flux de conversation de groupe naturel

## 🌐 Internationalisation et Gestion des Personas

### Flux de Définition des Personas
1. **Source de Vérité** : Toutes les définitions de personas sont maintenues dans `shared/src/personas/index.ts`
2. **Génération** : Exécutez `npm run personas:generate` pour créer le fichier de traduction `personas.json` anglais
3. **Traduction** : Utilisez les scripts de traduction existants pour générer les fichiers de personas localisés

### Processus de Traduction des Personas
```bash
# 1. Mettre à jour les définitions de personas dans le package partagé
vim shared/src/personas/index.ts

# 2. Générer personas.json anglais à partir des définitions partagées
npm run personas:generate

# 3. Traduire les personas vers toutes les langues supportées
npm run docs:translate  # Traduit tous les fichiers incluant personas.json
# Ou traduire vers une langue spécifique
npm run docs:translate:single -- --lang es

# 4. Reconstruire le package partagé si nécessaire
npm run build:shared
```

### Structure des Fichiers de Traduction
- **Source** : `shared/src/personas/index.ts` (Définitions TypeScript)
- **Généré** : `frontend/public/locales/en/personas.json` (i18n anglais)
- **Traduit** : `frontend/public/locales/{lang}/personas.json` (Versions localisées)

### Langues Supportées
Le système supporte 14 langues pour les personas et la documentation :
- 🇺🇸 English (en) - Langue source
- 🇸🇦 العربية (ar) - Arabe
- 🇩🇪 Deutsch (de) - Allemand
- 🇪🇸 Español (es) - Espagnol
- 🇫🇷 Français (fr) - Français
- 🇮🇱 עברית (he) - Hébreu
- 🇮🇹 Italiano (it) - Italien
- 🇯🇵 日本語 (ja) - Japonais
- 🇰🇷 한국어 (ko) - Coréen
- 🇳🇱 Nederlands (nl) - Néerlandais
- 🇵🇹 Português (pt) - Portugais
- 🇷🇺 Русский (ru) - Russe
- 🇸🇪 Svenska (sv) - Suédois
- 🇨🇳 中文 (zh) - Chinois

### Ajouter de Nouvelles Personas
1. Ajoutez la définition de persona à `shared/src/personas/index.ts`
2. Exécutez `npm run personas:generate` pour mettre à jour les traductions anglaises
3. Exécutez les scripts de traduction pour générer les versions localisées
4. La nouvelle persona sera disponible dans toutes les langues supportées

## 🔒 Fonctionnalités de Sécurité

- **Validation des Entrées** : Toutes les entrées utilisateur sont validées et assainies
- **Isolation de Session** : Chaque session maintient un contexte séparé
- **Gestion d'Erreurs** : Gestion gracieuse des erreurs avec des messages conviviaux
- **Limitation de Taux** : Protection intégrée contre les abus
- **HTTPS** : Toutes les communications chiffrées en production

## 📊 Surveillance et Observabilité

- **Journalisation Structurée** : Logs formatés JSON avec Winston
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
npm run deploy:dev # remplacez :dev par staging ou prod pour ces environnements
```

## ⚠️ Avertissement de Région de Déploiement !
Par défaut, le Modèle de Routage pour Bedrock est Anthropic Claude Haiku 5.5 (`us.anthropic.claude-haiku-5-5`). Le Modèle Persona exploite Anthropic Claude Sonnet 5.5 (`us.anthropic.claude-sonnet-5-5`). Veuillez vous assurer que vous déployez dans une région qui supporte les deux modèles, ou configurez des modèles alternatifs.

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

- **Temps de Réponse** : < 3 secondes pour les réponses de personas
- **Disponibilité** : 99,9% de disponibilité API
- **Concurrence** : Support de 1000+ utilisateurs simultanés
- **Conversations de Groupe** : Jusqu'à 5 personas par session avec flux de conversation naturel

## 🤝 Contribution

1. Forkez le dépôt
2. Créez une branche de fonctionnalité
3. Effectuez vos modifications
4. Ajoutez des tests
5. Soumettez une pull request

## 📄 Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour les détails.