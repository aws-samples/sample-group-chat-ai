# Group Chat AI - Architecture Système

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./ARCHITECTURE_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./ARCHITECTURE_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](#)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./ARCHITECTURE_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./ARCHITECTURE_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./ARCHITECTURE_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./ARCHITECTURE_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## Vue d'ensemble

Group Chat AI est une plateforme d'IA conversationnelle sophistiquée en temps réel qui permet aux utilisateurs de participer à des discussions collaboratives avec plusieurs personas d'IA. Le système exploite les services cloud AWS pour fournir une solution évolutive, sécurisée et performante avec des interactions vocales et textuelles en temps réel pour les conversations de groupe.

## Diagrammes d'architecture

### Architecture système de haut niveau
![Group Chat AI System Architecture](ARCHITECTURE.png)

## Composants du système

### 1. Couche Frontend

#### **Distribution CloudFront**
- **Objectif** : Réseau de diffusion de contenu global pour des performances optimales
- **Fonctionnalités** :
  - Mise en cache des ressources statiques (build de l'application React)
  - Routage des requêtes API vers l'ALB backend
  - Proxy des connexions WebSocket pour la communication en temps réel
  - Géo-restriction et politiques de sécurité
  - Support de domaine personnalisé avec certificats ACM

#### **Hébergement statique S3**
- **Objectif** : Sert les artefacts de build de l'application React
- **Contenu** :
  - Bundles HTML, CSS, JavaScript
  - Ressources statiques (images, polices, fichiers de localisation)
  - Fichiers de configuration dynamiques (config.json pour les paramètres spécifiques à l'environnement)

#### **Application Frontend React**
- **Technologie** : React 18 avec TypeScript, système de build Vite
- **Fonctionnalités** :
  - Communication WebSocket en temps réel
  - Capacités d'entrée/sortie vocale
  - Internationalisation multi-langues
  - Design responsive avec composants UI modernes
  - Upload et traitement d'images

### 2. Authentification et autorisation

#### **Amazon Cognito User Pool**
- **Objectif** : Authentification et gestion centralisées des utilisateurs
- **Fonctionnalités** :
  - Intégration OAuth 2.0 / OpenID Connect
  - Inscription et vérification basées sur l'email
  - Politiques de mot de passe et récupération de compte
  - Intégration avec le frontend via le flux OIDC

#### **User Pool Client**
- **Configuration** :
  - Flux Authorization Code Grant
  - URLs de callback pour les environnements de développement et de production
  - Scopes : openid, email, profile
  - Périodes de validité des tokens optimisées pour la sécurité

### 3. Infrastructure réseau

#### **VPC (Virtual Private Cloud)**
- **Design** : Déploiement multi-AZ pour haute disponibilité
- **Sous-réseaux** :
  - **Sous-réseaux publics** : Hébergent l'ALB et la passerelle NAT
  - **Sous-réseaux privés** : Hébergent les tâches ECS Fargate pour la sécurité

#### **Application Load Balancer (ALB)**
- **Objectif** : Distribution du trafic HTTP/HTTPS et terminaison SSL
- **Sécurité** : **CRITIQUE - L'ALB accepte le trafic UNIQUEMENT depuis les plages IP CloudFront**
- **Fonctionnalités** :
  - Vérifications de santé pour les services ECS
  - Routage basé sur le chemin (/api/* → backend, /ws/* → WebSocket)
  - Groupes de sécurité configurés avec les listes de préfixes gérées CloudFront
  - Journalisation des accès vers S3
  - **Tout le trafic utilisateur (HTTP/WebSocket) doit passer par CloudFront**

### 4. Services Backend (ECS Fargate)

#### **Serveur d'application Express.js**
- **Runtime** : Node.js 20 avec TypeScript
- **Architecture** : Design orienté microservices
- **Composants principaux** :
  - Points de terminaison API REST pour la gestion des sessions
  - Serveur WebSocket pour la communication en temps réel
  - Middleware pour la journalisation, la gestion d'erreurs et la sécurité

#### **Composants de service principaux**

##### **ConversationOrchestrator**
- **Objectif** : Coordinateur central pour les conversations IA
- **Responsabilités** :
  - Routage des messages et sélection de persona
  - Gestion de la file d'attente audio pour un flux de conversation naturel
  - Streaming de réponses en temps réel
  - Gestion de conversations itératives

##### **PersonaManager & PersonaAgent**
- **Objectif** : Gère les définitions et comportements des personas IA
- **Fonctionnalités** :
  - Création et gestion de personas personnalisées
  - Contextes de conversation spécifiques aux personas
  - Sélection dynamique de persona basée sur l'analyse de contenu

##### **RoutingAgent**
- **Objectif** : Routage intelligent des messages utilisateur vers les personas appropriées
- **Technologie** : Utilise Amazon Bedrock pour la prise de décision
- **Fonctionnalités** :
  - Analyse de contenu et scoring de pertinence des personas
  - Logique de continuation de conversation
  - Orchestration d'interactions multi-personas

##### **SessionService**
- **Objectif** : Gère les sessions utilisateur et l'état des conversations
- **Fonctionnalités** :
  - Gestion du cycle de vie des sessions
  - Persistance de l'historique des conversations
  - Personnalisations spécifiques à l'utilisateur

##### **Gestion WebSocket**
- **Composants** : WebSocketServer, WebSocketController, SessionWebSocketManager
- **Fonctionnalités** :
  - Communication bidirectionnelle en temps réel
  - Connexions WebSocket spécifiques aux sessions
  - Protocoles de streaming audio et d'accusé de réception

### 5. Intégration des services IA/ML

#### **Amazon Bedrock**
- **Modèles** : Claude 4 (anthropic.claude-sonnet-4-5-20250929-v1:0)
- **Usage** :
  - Génération de conversations pour les personas IA
  - Analyse de contenu et décisions de routage
  - Génération de réponses contextuelles
- **Configuration** : Via Parameter Store pour les paramètres spécifiques à l'environnement

#### **Amazon Polly**
- **Objectif** : Conversion texte-vers-parole pour les interactions vocales
- **Fonctionnalités** :
  - Options de voix multiples avec assignations spécifiques aux personas
  - Style de parole présentateur pour certaines personas
  - Synthèse audio en streaming
  - Sélection de voix adaptée à la langue

### 6. Configuration et surveillance

#### **AWS Systems Manager Parameter Store**
- **Objectif** : Gestion centralisée de la configuration
- **Paramètres** :
  - Paramètres de modèle LLM et de fournisseur
  - Détails de configuration Cognito
  - Paramètres spécifiques à l'environnement

#### **CloudWatch Logs & Metrics**
- **Fonctionnalités** :
  - Journalisation centralisée pour tous les services
  - Métriques de performance et surveillance
  - Suivi d'erreurs et alertes
  - Métriques personnalisées pour l'usage des services IA

## Modèles de flux de données

### 1. Flux d'authentification utilisateur
```
Utilisateur → CloudFront → Cognito User Pool → Flux OAuth → Token JWT → Appels API
```

### 2. Flux de conversation en temps réel
```
Message utilisateur → WebSocket (via CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Réponse → Polly → Flux audio → WebSocket (via CloudFront) → Utilisateur
```

### 3. Pipeline de traitement IA
```
Entrée utilisateur → Analyse de contenu → Sélection de persona → Construction de contexte → Requête LLM → Génération de réponse → Synthèse audio → Gestion de file → Livraison
```

## Architecture de sécurité

### Sécurité réseau
- **Intégration WAF** : Pare-feu d'application Web intégré à CloudFront
- **Sécurité VPC** : Sous-réseaux privés pour les services backend
- **Groupes de sécurité** : Contrôle d'accès au moindre privilège
- **Restrictions ALB** : Limitations aux plages IP CloudFront

### Sécurité des données
- **Chiffrement en transit** : HTTPS/TLS partout
- **Chiffrement au repos** : Chiffrement S3 et Parameter Store
- **Gestion des secrets** : Parameter Store pour la configuration sensible
- **Contrôle d'accès** : Rôles IAM avec permissions minimales

### Sécurité applicative
- **Authentification** : OAuth 2.0/OIDC basé sur Cognito
- **Autorisation** : Validation de token JWT
- **Validation d'entrée** : Validation complète des requêtes
- **Limitation de débit** : Limites de connexions API et WebSocket

## Évolutivité et performance

### Auto Scaling
- **Service ECS** : Auto scaling basé sur CPU et mémoire (1-10 tâches)
- **ALB** : Scaling automatique basé sur le trafic
- **CloudFront** : Emplacements edge globaux pour CDN

### Optimisations de performance
- **Mise en cache** : Mise en cache CloudFront pour les ressources statiques
- **Streaming audio** : URLs de données Base64 pour lecture immédiate
- **Pool de connexions** : Gestion efficace des connexions WebSocket
- **Chargement paresseux** : Initialisation de service à la demande

### Haute disponibilité
- **Déploiement multi-AZ** : VPC s'étend sur plusieurs zones de disponibilité
- **Vérifications de santé** : Surveillance de santé ALB pour les services ECS
- **Dégradation gracieuse** : Mécanismes de fallback pour les échecs de service

## Résumé de la pile technologique

### Frontend
- **Framework** : React 18 avec TypeScript
- **Outil de build** : Vite
- **Stylisation** : CSS moderne avec design responsive
- **Gestion d'état** : React Context API
- **Authentification** : Client OIDC
- **Temps réel** : API WebSocket

### Backend
- **Runtime** : Node.js 20
- **Framework** : Express.js
- **Langage** : TypeScript
- **WebSocket** : Bibliothèque ws
- **Journalisation** : Winston
- **Tests** : Jest

### Infrastructure
- **Orchestration** : AWS CDK (TypeScript)
- **Calcul** : ECS Fargate
- **Stockage** : S3
- **CDN** : CloudFront
- **Base de données** : Gestion d'état en mémoire
- **Configuration** : Parameter Store

### IA/ML
- **LLM** : Amazon Bedrock (Claude 4)
- **TTS** : Amazon Polly
- **Analyse de contenu** : Service personnalisé avec intégration LLM

## Architecture de déploiement

### Stratégie d'environnement
- **Développement** : Développement local avec backend sur port 3000
- **Production** : Infrastructure déployée CDK avec CloudFront

### Pipeline CI/CD
- **Frontend** : Build Vite → Déploiement S3 → Invalidation CloudFront
- **Backend** : Build Docker → ECR → Mise à jour service ECS
- **Infrastructure** : CDK diff → Déploiement → Vérification

### Gestion de configuration
- **Variables d'environnement** : Configuration au niveau conteneur
- **Secrets** : Intégration Parameter Store
- **Feature Flags** : Activation basée sur l'environnement

## Surveillance et observabilité

### Stratégie de journalisation
- **Centralisée** : Tous les logs affluent vers CloudWatch
- **Structurée** : Entrées de log formatées JSON
- **Corrélation** : IDs de requête pour le traçage
- **Niveaux** : Classification Debug, Info, Warn, Error

### Métriques et alarmes
- **Métriques applicatives** : Temps de réponse, taux d'erreur
- **Métriques d'infrastructure** : Utilisation CPU, mémoire, réseau
- **Métriques métier** : Taux de completion de conversation, usage de personas
- **Alarmes personnalisées** : Détection proactive de problèmes

### Surveillance de santé
- **Points de terminaison de santé** : /health pour le statut de service
- **Vérifications de dépendances** : Connectivité des services externes
- **Dégradation gracieuse** : Surveillance du comportement de fallback

## Considérations d'architecture future

### Améliorations d'évolutivité
- **Intégration de base de données** : Considérer RDS pour le stockage persistant
- **Couche de cache** : Redis/ElastiCache pour l'état de session
- **Microservices** : Décomposition de service plus poussée

### Améliorations IA/ML
- **Fine-tuning de modèle** : Entraînement de modèle personnalisé
- **Tests A/B** : Comparaison de modèles multiples
- **Analytiques de conversation** : Insights d'usage avancés

### Améliorations de sécurité
- **Règles WAF** : Protection d'attaque renforcée
- **API Gateway** : Considérer la migration pour des fonctionnalités avancées
- **Conformité** : Considérations SOC 2, GDPR

Cette architecture fournit une fondation robuste, évolutive et sécurisée pour la plateforme Group Chat AI tout en maintenant la flexibilité pour les améliorations et la croissance futures.