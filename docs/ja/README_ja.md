# Group Chat AI - 協調的なAI会話

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](#)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


**📖 この文書は複数の言語で利用できます:**
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

Group Chat AIは、複数のAIペルソナとの動的なグループ会話を可能にする高度な協調プラットフォームです。このシステムは多様な視点にわたって意味のある議論を促進し、ユーザーがアイデアを探求し、フィードバックを得て、異なる役割や視点を代表するAIエージェントとの多参加者会話に参加することを可能にします。

## 🏗️ アーキテクチャ概要

```
User Input → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### 主要機能

- **マルチペルソナ会話**: グループディスカッションで複数のAIペルソナと同時に対話
- **動的インタラクションパターン**: 自然なターンテイキングと応答によるリアルタイム会話フロー
- **多様な視点**: 各ペルソナが独自の視点、専門知識、コミュニケーションスタイルを提供
- **協調的問題解決**: 異なるアプローチを提供するAIエージェントと複雑なトピックに取り組む
- **セッション永続化**: セッション間で会話コンテキストとペルソナの一貫性を維持
- **柔軟なペルソナカスタマイゼーション**: 自然言語記述でAIペルソナを作成・修正
- **複数LLMサポート**: AWS Bedrock、OpenAI、Anthropic、Ollamaを含む様々な言語モデルを活用

## 🚀 クイックスタート

### 前提条件

- Node.js 20+ 
- npm 8+
- Docker（オプション、コンテナ化用）
- AWS CLI（デプロイ用）

### インストール

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **依存関係をインストール**
   ```bash
   npm run install:all
   ```

3. **環境変数を設定**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # backend/.envを設定で編集
   
   # FrontendはViteのプロキシ設定を使用
   ```

4. **共有パッケージをビルド**
   ```bash
   npm run build:shared
   ```

### 開発

1. **バックエンドサーバーを起動**
   ```bash
   npm run dev:backend
   ```
   バックエンドは`http://localhost:3000`で利用可能

2. **フロントエンド開発サーバーを起動**
   ```bash
   npm run dev:frontend
   ```
   フロントエンドは`http://localhost:3001`で利用可能

3. **APIをテスト**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 プロジェクト構造

```
group-chat-ai/
├── shared/                 # 共有TypeScript型とユーティリティ
│   ├── src/
│   │   ├── types/         # 共通型定義
│   │   ├── constants/     # アプリケーション定数
│   │   └── utils/         # 共有ユーティリティ関数
├── backend/               # Express.js APIサーバー
│   ├── src/
│   │   ├── controllers/   # APIルートハンドラー
│   │   ├── services/      # ビジネスロジックサービス
│   │   ├── middleware/    # Expressミドルウェア
│   │   ├── config/        # 設定ファイル
│   │   └── utils/         # バックエンドユーティリティ
├── frontend/              # Reactアプリケーション
│   ├── src/
│   │   ├── components/    # 再利用可能なReactコンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── services/      # APIサービス層
│   │   ├── hooks/         # カスタムReactフック
│   │   └── utils/         # フロントエンドユーティリティ
├── infrastructure/        # AWS CDKインフラストラクチャコード
├── tests/                 # テストファイル
└── documents/             # プロジェクト文書
```

## 🔧 利用可能なスクリプト

### ルートレベル
- `npm run install:all` - すべての依存関係をインストール
- `npm run build` - すべてのパッケージをビルド
- `npm run test` - すべてのテストを実行
- `npm run lint` - すべてのパッケージをリント

### バックエンド
- `npm run dev:backend` - 開発モードでバックエンドを起動
- `npm run build:backend` - バックエンドをビルド
- `npm run test:backend` - バックエンドテストを実行

### フロントエンド
- `npm run dev:frontend` - フロントエンド開発サーバーを起動
- `npm run build:frontend` - 本番用フロントエンドをビルド
- `npm run test:frontend` - フロントエンドテストを実行

### ペルソナと国際化
- `npm run personas:generate` - 共有定義から英語personas.jsonを生成
- `npm run docs:translate` - サポートされているすべての言語に文書を翻訳
- `npm run docs:translate:single -- --lang es` - 特定の言語に翻訳

## 🌐 APIエンドポイント

### ヘルスチェック
- `GET /health` - 基本ヘルスチェック
- `GET /health/detailed` - 詳細ヘルス情報

### ペルソナ
- `GET /personas` - 利用可能なすべてのペルソナを取得
- `GET /personas/:personaId` - 特定のペルソナ詳細を取得

### セッション
- `POST /sessions` - 新しい会話セッションを作成
- `POST /sessions/:sessionId/messages` - メッセージを送信して応答を取得
- `PUT /sessions/:sessionId/personas` - セッションペルソナを更新
- `GET /sessions/:sessionId/summary` - セッション要約を取得
- `DELETE /sessions/:sessionId` - セッションを終了
- `GET /sessions/:sessionId` - セッション詳細を取得

## 🤖 AI統合

システムは設定可能なインターフェースを通じて複数のLLMプロバイダーをサポートします：

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (各種モデル)
- **Ollama** (ローカルモデル)

環境変数で設定：
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### 開発モード
開発時、システムはAPIキーを必要とせずにAIインタラクションをシミュレートするモック応答を使用します。

## 🎭 ペルソナ

システムには様々なグループ会話シナリオ用にカスタマイズ可能な多様なAIペルソナが含まれています：

1. **戦略アドバイザー** - 高レベル計画、ビジョン、戦略的方向性
2. **技術専門家** - 深い技術知識、実装詳細、ソリューション
3. **アナリスト** - データ駆動の洞察、研究、分析的視点
4. **創造的思考者** - イノベーション、ブレインストーミング、型破りなアイデア
5. **ファシリテーター** - 議論管理、合意形成、協力

### ペルソナ構造
各ペルソナは4つのシンプルなフィールドで定義されます：
- **名前**: 表示名（例：「戦略アドバイザー」）
- **役割**: 短い役割識別子（例：「戦略家」）
- **詳細**: 背景、優先事項、懸念事項、影響レベルを含む自由テキスト記述
- **アバター選択**: 利用可能なアバターオプションからの視覚的表現

### ペルソナカスタマイゼーション
- **デフォルトペルソナ編集**: 任意のデフォルトペルソナの詳細を自然言語で修正
- **カスタムペルソナ作成**: 独自の記述で完全にカスタムなペルソナを構築
- **セッション永続化**: すべてのペルソナカスタマイゼーションがブラウザセッション全体で持続
- **インポート/エクスポート**: JSONファイル経由でペルソナ設定を保存・共有
- **タイルベースインターフェース**: 包括的な編集機能を持つ視覚的タイル選択

### 技術実装
各ペルソナは以下を維持します：
- 真正な応答のための分離された会話コンテキスト
- AI プロンプト生成のための詳細フィールドの自然言語処理
- 記述された特性に基づく役割固有の応答パターン
- 自然なグループ会話フローのためのインテリジェントなターンテイキング

## 🌐 国際化とペルソナ管理

### ペルソナ定義ワークフロー
1. **信頼できる情報源**: すべてのペルソナ定義は`shared/src/personas/index.ts`で維持
2. **生成**: `npm run personas:generate`を実行して英語`personas.json`翻訳ファイルを作成
3. **翻訳**: 既存の翻訳スクリプトを使用してローカライズされたペルソナファイルを生成

### ペルソナ翻訳プロセス
```bash
# 1. 共有パッケージでペルソナ定義を更新
vim shared/src/personas/index.ts

# 2. 共有定義から英語personas.jsonを生成
npm run personas:generate

# 3. ペルソナをサポートされているすべての言語に翻訳
npm run docs:translate  # personas.jsonを含むすべてのファイルを翻訳
# または特定の言語に翻訳
npm run docs:translate:single -- --lang es

# 4. 必要に応じて共有パッケージを再ビルド
npm run build:shared
```

### 翻訳ファイル構造
- **ソース**: `shared/src/personas/index.ts` (TypeScript定義)
- **生成**: `frontend/public/locales/en/personas.json` (英語i18n)
- **翻訳**: `frontend/public/locales/{lang}/personas.json` (ローカライズ版)

### サポート言語
システムはペルソナと文書について14言語をサポートします：
- 🇺🇸 English (en) - ソース言語
- 🇸🇦 العربية (ar) - アラビア語
- 🇩🇪 Deutsch (de) - ドイツ語
- 🇪🇸 Español (es) - スペイン語
- 🇫🇷 Français (fr) - フランス語
- 🇮🇱 עברית (he) - ヘブライ語
- 🇮🇹 Italiano (it) - イタリア語
- 🇯🇵 日本語 (ja) - 日本語
- 🇰🇷 한국어 (ko) - 韓国語
- 🇳🇱 Nederlands (nl) - オランダ語
- 🇵🇹 Português (pt) - ポルトガル語
- 🇷🇺 Русский (ru) - ロシア語
- 🇸🇪 Svenska (sv) - スウェーデン語
- 🇨🇳 中文 (zh) - 中国語

### 新しいペルソナの追加
1. `shared/src/personas/index.ts`にペルソナ定義を追加
2. `npm run personas:generate`を実行して英語翻訳を更新
3. 翻訳スクリプトを実行してローカライズ版を生成
4. 新しいペルソナがサポートされているすべての言語で利用可能になります

## 🔒 セキュリティ機能

- **入力検証**: すべてのユーザー入力が検証・サニタイズされます
- **セッション分離**: 各セッションが個別のコンテキストを維持
- **エラーハンドリング**: ユーザーフレンドリーなメッセージでの優雅なエラーハンドリング
- **レート制限**: 悪用に対する組み込み保護
- **HTTPS**: 本番環境でのすべての通信の暗号化

## 📊 監視と可観測性

- **構造化ログ**: Winstonを使用したJSON形式のログ
- **ヘルスチェック**: 包括的なヘルス監視
- **メトリクス**: カスタムアプリケーションメトリクス
- **エラー追跡**: 詳細なエラーログと追跡

## 🚢 デプロイ

### Docker
```bash
# バックエンドイメージをビルド
cd backend
npm run docker:build

# コンテナを実行
npm run docker:run
```

### AWSデプロイ
```bash
# インフラストラクチャをデプロイ
cd infrastructure
npm run deploy:dev # staging または prod 環境の場合は :dev を置き換え
```

## ⚠️ デプロイリージョン警告！
デフォルトでは、BedrockのRouting ModelはOpenAI gpt-oss:20b (`openai.gpt-oss-20b-1:0`)です。Persona ModelはAnthropic Claude 4 Sonnet (`anthropic.claude-sonnet-4-20250514-v1:0`)を活用します。両方のモデルをサポートするリージョンにデプロイしているか、代替モデルを設定していることを確認してください。

## 🧪 テスト

### ユニットテスト
```bash
npm run test
```

### 統合テスト
```bash
npm run test:integration
```

### E2Eテスト
```bash
npm run test:e2e
```

## 📈 パフォーマンス目標

- **応答時間**: ペルソナ応答で3秒未満
- **可用性**: 99.9% API可用性
- **同時実行性**: 1000+同時ユーザーをサポート
- **グループ会話**: 自然な会話フローでセッションあたり最大5ペルソナ

## 🤝 貢献

1. リポジトリをフォーク
2. 機能ブランチを作成
3. 変更を行う
4. テストを追加
5. プルリクエストを提出

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細はLICENSEファイルを参照してください。