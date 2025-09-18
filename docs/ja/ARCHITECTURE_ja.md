# Group Chat AI - システムアーキテクチャ

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./ARCHITECTURE_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./ARCHITECTURE_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./ARCHITECTURE_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./ARCHITECTURE_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](#)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./ARCHITECTURE_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./ARCHITECTURE_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## 概要

Group Chat AIは、ユーザーが複数のAIペルソナと協調的なディスカッションを行うことを可能にする、高度なリアルタイム会話AI プラットフォームです。このシステムは、AWS クラウドサービスを活用して、グループ会話におけるリアルタイムの音声およびテキストインタラクションを備えた、スケーラブルで安全かつ高性能なソリューションを提供します。

## アーキテクチャ図

### 高レベルシステムアーキテクチャ
![Group Chat AI System Architecture](ARCHITECTURE.png)

## システムコンポーネント

### 1. フロントエンド層

#### **CloudFront Distribution**
- **目的**: 最適なパフォーマンスのためのグローバルコンテンツ配信ネットワーク
- **機能**:
  - 静的アセットキャッシング（React アプリケーションビルド）
  - バックエンド ALB への API リクエストルーティング
  - リアルタイム通信のための WebSocket 接続プロキシ
  - 地理的制限とセキュリティポリシー
  - ACM 証明書によるカスタムドメインサポート

#### **S3 Static Hosting**
- **目的**: React アプリケーションビルドアーティファクトの提供
- **コンテンツ**:
  - HTML、CSS、JavaScript バンドル
  - 静的アセット（画像、フォント、ローカライゼーションファイル）
  - 動的設定ファイル（環境固有設定のための config.json）

#### **React Frontend Application**
- **技術**: React 18 with TypeScript、Vite ビルドシステム
- **機能**:
  - リアルタイム WebSocket 通信
  - 音声入出力機能
  - 多言語国際化
  - モダンUI コンポーネントによるレスポンシブデザイン
  - 画像アップロードと処理

### 2. 認証・認可

#### **Amazon Cognito User Pool**
- **目的**: 集中化されたユーザー認証と管理
- **機能**:
  - OAuth 2.0 / OpenID Connect 統合
  - メールベースの登録と検証
  - パスワードポリシーとアカウント復旧
  - OIDC フローによるフロントエンドとの統合

#### **User Pool Client**
- **設定**:
  - Authorization Code Grant フロー
  - 開発環境と本番環境のコールバック URL
  - スコープ: openid、email、profile
  - セキュリティに最適化されたトークン有効期間

### 3. ネットワークインフラストラクチャ

#### **VPC (Virtual Private Cloud)**
- **設計**: 高可用性のためのマルチ AZ デプロイメント
- **サブネット**:
  - **パブリックサブネット**: ALB と NAT Gateway をホスト
  - **プライベートサブネット**: セキュリティのため ECS Fargate タスクをホスト

#### **Application Load Balancer (ALB)**
- **目的**: HTTP/HTTPS トラフィック分散と SSL 終端
- **セキュリティ**: **重要 - ALB は CloudFront IP 範囲からのトラフィックのみを受け入れ**
- **機能**:
  - ECS サービスのヘルスチェック
  - パスベースルーティング（/api/* → バックエンド、/ws/* → WebSocket）
  - CloudFront 管理プレフィックスリストで設定されたセキュリティグループ
  - S3 へのアクセスログ
  - **すべてのユーザートラフィック（HTTP/WebSocket）は CloudFront を経由する必要があります**

### 4. バックエンドサービス（ECS Fargate）

#### **Express.js Application Server**
- **ランタイム**: Node.js 20 with TypeScript
- **アーキテクチャ**: マイクロサービス指向設計
- **コアコンポーネント**:
  - セッション管理のための REST API エンドポイント
  - リアルタイム通信のための WebSocket サーバー
  - ログ記録、エラーハンドリング、セキュリティのためのミドルウェア

#### **コアサービスコンポーネント**

##### **ConversationOrchestrator**
- **目的**: AI 会話の中央コーディネーター
- **責任**:
  - メッセージルーティングとペルソナ選択
  - 自然な会話フローのためのオーディオキュー管理
  - リアルタイムレスポンスストリーミング
  - 反復的会話管理

##### **PersonaManager & PersonaAgent**
- **目的**: AI ペルソナ定義と動作の管理
- **機能**:
  - カスタムペルソナ作成と管理
  - ペルソナ固有の会話コンテキスト
  - コンテンツ分析に基づく動的ペルソナ選択

##### **RoutingAgent**
- **目的**: 適切なペルソナへのユーザーメッセージのインテリジェントルーティング
- **技術**: 意思決定に Amazon Bedrock を使用
- **機能**:
  - コンテンツ分析とペルソナ関連性スコアリング
  - 会話継続ロジック
  - マルチペルソナインタラクションオーケストレーション

##### **SessionService**
- **目的**: ユーザーセッションと会話状態の管理
- **機能**:
  - セッションライフサイクル管理
  - 会話履歴の永続化
  - ユーザー固有のカスタマイゼーション

##### **WebSocket Management**
- **コンポーネント**: WebSocketServer、WebSocketController、SessionWebSocketManager
- **機能**:
  - リアルタイム双方向通信
  - セッション固有の WebSocket 接続
  - オーディオストリーミングと確認応答プロトコル

### 5. AI/ML サービス統合

#### **Amazon Bedrock**
- **モデル**: Claude 4 (us.anthropic.claude-sonnet-4-20250514-v1:0)
- **使用用途**:
  - AI ペルソナの会話生成
  - コンテンツ分析とルーティング決定
  - コンテキスト認識レスポンス生成
- **設定**: 環境固有設定のための Parameter Store 経由

#### **Amazon Polly**
- **目的**: 音声インタラクションのためのテキスト読み上げ変換
- **機能**:
  - ペルソナ固有の割り当てによる複数の音声オプション
  - 特定のペルソナのためのニュースキャスター話し方スタイル
  - ストリーミング音声合成
  - 言語認識音声選択

### 6. 設定・監視

#### **AWS Systems Manager Parameter Store**
- **目的**: 集中化された設定管理
- **パラメータ**:
  - LLM モデルとプロバイダー設定
  - Cognito 設定詳細
  - 環境固有設定

#### **CloudWatch Logs & Metrics**
- **機能**:
  - すべてのサービスの集中ログ記録
  - パフォーマンスメトリクスと監視
  - エラー追跡とアラート
  - AI サービス使用量のカスタムメトリクス

## データフローパターン

### 1. ユーザー認証フロー
```
User → CloudFront → Cognito User Pool → OAuth Flow → JWT Token → API Calls
```

### 2. リアルタイム会話フロー
```
User Message → WebSocket (via CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Response → Polly → Audio Stream → WebSocket (via CloudFront) → User
```

### 3. AI 処理パイプライン
```
User Input → Content Analysis → Persona Selection → Context Building → LLM Request → Response Generation → Audio Synthesis → Queue Management → Delivery
```

## セキュリティアーキテクチャ

### ネットワークセキュリティ
- **WAF 統合**: CloudFront 統合 Web Application Firewall
- **VPC セキュリティ**: バックエンドサービス用プライベートサブネット
- **セキュリティグループ**: 最小権限アクセス制御
- **ALB 制限**: CloudFront IP 範囲制限

### データセキュリティ
- **転送時暗号化**: すべての場所で HTTPS/TLS
- **保存時暗号化**: S3 と Parameter Store 暗号化
- **シークレット管理**: 機密設定のための Parameter Store
- **アクセス制御**: 最小権限による IAM ロール

### アプリケーションセキュリティ
- **認証**: Cognito ベース OAuth 2.0/OIDC
- **認可**: JWT トークン検証
- **入力検証**: 包括的なリクエスト検証
- **レート制限**: API と WebSocket 接続制限

## スケーラビリティ・パフォーマンス

### オートスケーリング
- **ECS Service**: CPU とメモリベースのオートスケーリング（1-10 タスク）
- **ALB**: トラフィックに基づく自動スケーリング
- **CloudFront**: CDN のためのグローバルエッジロケーション

### パフォーマンス最適化
- **キャッシング**: 静的アセットの CloudFront キャッシング
- **オーディオストリーミング**: 即座の再生のための Base64 データ URL
- **コネクションプーリング**: 効率的な WebSocket 接続管理
- **遅延読み込み**: オンデマンドサービス初期化

### 高可用性
- **マルチ AZ デプロイメント**: VPC は複数のアベイラビリティゾーンにまたがる
- **ヘルスチェック**: ECS サービスの ALB ヘルス監視
- **グレースフルデグラデーション**: サービス障害のためのフォールバック機構

## 技術スタック概要

### フロントエンド
- **フレームワーク**: React 18 with TypeScript
- **ビルドツール**: Vite
- **スタイリング**: レスポンシブデザインによるモダン CSS
- **状態管理**: React Context API
- **認証**: OIDC Client
- **リアルタイム**: WebSocket API

### バックエンド
- **ランタイム**: Node.js 20
- **フレームワーク**: Express.js
- **言語**: TypeScript
- **WebSocket**: ws ライブラリ
- **ログ記録**: Winston
- **テスト**: Jest

### インフラストラクチャ
- **オーケストレーション**: AWS CDK (TypeScript)
- **コンピュート**: ECS Fargate
- **ストレージ**: S3
- **CDN**: CloudFront
- **データベース**: インメモリ状態管理
- **設定**: Parameter Store

### AI/ML
- **LLM**: Amazon Bedrock (Claude 4)
- **TTS**: Amazon Polly
- **コンテンツ分析**: LLM 統合によるカスタムサービス

## デプロイメントアーキテクチャ

### 環境戦略
- **開発**: バックエンドポート 3000 でのローカル開発
- **本番**: CloudFront による CDK デプロイインフラストラクチャ

### CI/CD パイプライン
- **フロントエンド**: Vite ビルド → S3 デプロイメント → CloudFront 無効化
- **バックエンド**: Docker ビルド → ECR → ECS サービス更新
- **インフラストラクチャ**: CDK diff → デプロイ → 検証

### 設定管理
- **環境変数**: コンテナレベル設定
- **シークレット**: Parameter Store 統合
- **機能フラグ**: 環境ベース有効化

## 監視・可観測性

### ログ記録戦略
- **集中化**: すべてのログが CloudWatch に流れる
- **構造化**: JSON 形式のログエントリ
- **相関**: トレーシングのためのリクエスト ID
- **レベル**: Debug、Info、Warn、Error 分類

### メトリクス・アラーム
- **アプリケーションメトリクス**: レスポンス時間、エラー率
- **インフラストラクチャメトリクス**: CPU、メモリ、ネットワーク使用率
- **ビジネスメトリクス**: 会話完了率、ペルソナ使用状況
- **カスタムアラーム**: プロアクティブな問題検出

### ヘルス監視
- **ヘルスエンドポイント**: サービス状態のための /health
- **依存関係チェック**: 外部サービス接続性
- **グレースフルデグラデーション**: フォールバック動作監視

## 将来のアーキテクチャ考慮事項

### スケーラビリティ強化
- **データベース統合**: 永続ストレージのための RDS を検討
- **キャッシング層**: セッション状態のための Redis/ElastiCache
- **マイクロサービス**: さらなるサービス分解

### AI/ML 改善
- **モデルファインチューニング**: カスタムモデルトレーニング
- **A/B テスト**: 複数モデル比較
- **会話分析**: 高度な使用状況インサイト

### セキュリティ強化
- **WAF ルール**: 強化された攻撃保護
- **API Gateway**: 高度な機能のための移行を検討
- **コンプライアンス**: SOC 2、GDPR 考慮事項

このアーキテクチャは、将来の機能強化と成長に対する柔軟性を維持しながら、Group Chat AI プラットフォームのための堅牢でスケーラブルかつ安全な基盤を提供します。