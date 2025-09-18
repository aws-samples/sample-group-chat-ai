# Pitch Perfect - AI搭載プレゼンテーション練習

Pitch Perfectは、専門家が重要なプレゼンテーションを練習し、改善するためのシミュレーション環境を作成するAI搭載フォーカスグループチャットボットです。このシステムにより、ユーザーは実際のフォーカスグループを組織する負担なく、さまざまなステークホルダーの視点（CEO、CTO、CIO、CFO、CPO）を表すAIペルソナからリアルなフィードバックを受け取ることができます。

## 🏗️ アーキテクチャ概要

```
ユーザー入力 → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Model (Bedrock/OpenAI/Anthropic/Ollama)
```

### 主要機能

- **AI搭載ペルソナシミュレーション**：複数のAIペルソナが異なる優先順位とコミュニケーションスタイルで独立して応答
- **インタラクティブチャット環境**：即座のフィードバック付きリアルタイム会話フロー
- **役割特化フィードバック**：各ペルソナが視点ベースの応答を提供（CEOは戦略に焦点、CFOはコストに焦点など）
- **順次処理**：リアルな会議のダイナミクスのためにペルソナが順番に応答
- **セッション管理**：自動クリーンアップとペルソナの永続化を含むセッションベースの会話
- **簡素化ペルソナ設定**：複雑なフォームの代わりに自然言語のペルソナ説明
- **複数LLMプロバイダー**：AWS Bedrock、OpenAI、Anthropic、ローカルOllamaモデルのサポート

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
   cd ai-pitch-perfect
   ```

2. **依存関係をインストール**
   ```bash
   npm run install:all
   ```

3. **環境変数を設定**
   ```bash
   # バックエンド
   cp backend/.env.example backend/.env
   # backend/.envをあなたの設定で編集してください
   
   # フロントエンドはViteのプロキシ設定を使用します
   ```

4. **共有パッケージをビルド**
   ```bash
   npm run build:shared
   ```

### 開発

1. **バックエンドサーバーを開始**
   ```bash
   npm run dev:backend
   ```
   バックエンドは`http://localhost:3000`で利用可能です

2. **フロントエンド開発サーバーを開始**
   ```bash
   npm run dev:frontend
   ```
   フロントエンドは`http://localhost:3001`で利用可能です

3. **APIをテスト**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 プロジェクト構造

```
ai-pitch-perfect/
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
└── documents/             # プロジェクトドキュメント
```

## 🔧 利用可能なスクリプト

### ルートレベル
- `npm run install:all` - すべての依存関係をインストール
- `npm run build` - すべてのパッケージをビルド
- `npm run test` - すべてのテストを実行
- `npm run lint` - すべてのパッケージをリント

### バックエンド
- `npm run dev:backend` - 開発モードでバックエンドを開始
- `npm run build:backend` - バックエンドをビルド
- `npm run test:backend` - バックエンドテストを実行

### フロントエンド
- `npm run dev:frontend` - フロントエンド開発サーバーを開始
- `npm run build:frontend` - 本番用フロントエンドをビルド
- `npm run test:frontend` - フロントエンドテストを実行

## 🌐 APIエンドポイント

### ヘルスチェック
- `GET /health` - 基本的なヘルスチェック
- `GET /health/detailed` - 詳細なヘルス情報

### ペルソナ
- `GET /personas` - 利用可能なすべてのペルソナを取得
- `GET /personas/:personaId` - 特定のペルソナの詳細を取得

### セッション
- `POST /sessions` - 新しい会話セッションを作成
- `POST /sessions/:sessionId/messages` - メッセージを送信し応答を取得
- `PUT /sessions/:sessionId/personas` - セッションペルソナを更新
- `GET /sessions/:sessionId/summary` - セッション概要を取得
- `DELETE /sessions/:sessionId` - セッションを終了
- `GET /sessions/:sessionId` - セッション詳細を取得

## 🤖 AI統合

システムは設定可能なインターフェースを通じて複数のLLMプロバイダーをサポートします：

- **OpenAI**（GPT-3.5/GPT-4）
- **Anthropic**（Claude）
- **AWS Bedrock**（各種モデル）
- **Ollama**（ローカルモデル）

環境変数での設定：
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### 開発モード
開発では、システムはAPIキーを必要とせずにAI相互作用をシミュレートするためにモック応答を使用します。

## 🎭 ペルソナ

システムには簡素化されたユーザーフレンドリーなカスタマイゼーション機能を備えた5つの事前定義された役員ペルソナが含まれています：

1. **CEO** - 戦略フォーカス、競争上の優位性、ビジネス成果
2. **CTO** - 技術的実現可能性、アーキテクチャ、実装の複雑さ
3. **CFO** - 財務影響、ROI、予算への影響
4. **CIO** - システム統合、セキュリティ、ITインフラストラクチャ
5. **CPO** - 製品戦略、ユーザーエクスペリエンス、市場ポジショニング

### ペルソナ構造
各ペルソナは4つのシンプルなフィールドによって定義されます：
- **名前**：表示名（例：「最高経営責任者」）
- **役職**：短い役職識別子（例：「CEO」）
- **詳細**：背景、優先事項、懸念事項、影響レベルを含む自由テキストの説明
- **アバター選択**：利用可能なアバターオプションからの視覚的表現

### ペルソナカスタマイゼーション
- **デフォルトペルソナの編集**：任意のデフォルトペルソナの詳細を自然言語で変更
- **カスタムペルソナの作成**：独自の説明で完全にカスタムなペルソナを構築
- **セッション永続化**：すべてのペルソナカスタマイゼーションがブラウザセッション全体で持続
- **インポート/エクスポート**：JSONファイルによるペルソナ設定の保存と共有
- **タイルベースインターフェース**：包括的な編集機能を備えた視覚的タイル選択

### 技術実装
各ペルソナは以下を維持します：
- 本物の応答のための分離された会話コンテキスト
- AIプロンプト生成のための詳細フィールドの自然言語処理
- 説明された特性に基づく役割特化応答パターン
- リアルな会議ダイナミクスのための順次応答処理

## 🔒 セキュリティ機能

- **入力検証**：すべてのユーザー入力が検証・サニタイズ
- **セッション分離**：各セッションが個別のコンテキストを維持
- **エラー処理**：ユーザーフレンドリーなメッセージによる優雅なエラー処理
- **レート制限**：乱用に対する組み込み保護
- **HTTPS**：本番環境でのすべての通信の暗号化

## 📊 監視・可観測性

- **構造化ログ**：WinstonによるJSON形式のログ
- **ヘルスチェック**：包括的なヘルス監視
- **メトリクス**：カスタムアプリケーションメトリクス
- **エラー追跡**：詳細なエラーログと追跡

## 🚢 デプロイメント

### Docker
```bash
# バックエンドイメージをビルド
cd backend
npm run docker:build

# コンテナを実行
npm run docker:run
```

### AWS デプロイメント
```bash
# インフラストラクチャをデプロイ
cd infrastructure
npm run deploy:dev
```

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

- **応答時間**：ペルソナ応答で3秒未満
- **可用性**：99.9% API可用性
- **並行性**：1000+同時ユーザーのサポート
- **順次処理**：リアルな会議フローでセッションあたり最大5ペルソナ

## 🤝 コントリビューション

1. リポジトリをフォーク
2. フィーチャーブランチを作成
3. 変更を加える
4. テストを追加
5. プルリクエストを提出

## 📄 ライセンス

このプロジェクトはMITライセンスの下でライセンスされています - 詳細はLICENSEファイルを参照してください。

## 🆘 サポート

サポートと質問については：
- `/documents`のドキュメントを確認
- `/memory-bank`のメモリバンクを確認
- GitHubでイシューを開く