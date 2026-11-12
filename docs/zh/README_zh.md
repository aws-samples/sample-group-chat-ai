# Group Chat AI - 协作式 AI 对话

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
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](#)




Group Chat AI 是一个先进的协作平台，支持与多个 AI 角色进行动态群组对话。该系统促进跨不同视角的有意义讨论，允许用户探索想法、获得反馈，并与代表不同角色和观点的 AI 代理进行多参与者对话。

## 🏗️ 架构概览

```
用户输入 → React 前端 → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### 核心功能

- **多角色对话**：在群组讨论中同时与多个 AI 角色互动
- **动态交互模式**：具有自然轮流发言和响应的实时对话流
- **多元化视角**：每个角色都带来独特的观点、专业知识和沟通风格
- **协作问题解决**：与提供不同方法的 AI 代理一起处理复杂话题
- **会话持久化**：在会话间维护对话上下文和角色一致性
- **灵活的角色定制**：使用自然语言描述创建和修改 AI 角色
- **多 LLM 支持**：利用各种语言模型，包括 AWS Bedrock、OpenAI、Anthropic 和 Ollama

## 🚀 快速开始

### 前置要求

- Node.js 24+ 
- npm 8+
- Docker（可选，用于容器化）
- AWS CLI（用于部署）

### 安装

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **安装依赖**
   ```bash
   npm run install:all
   ```

3. **设置环境变量**
   ```bash
   # 后端
   cp backend/.env.example backend/.env
   # 使用您的配置编辑 backend/.env
   
   # 前端将使用 Vite 的代理配置
   ```

4. **构建共享包**
   ```bash
   npm run build:shared
   ```

### 开发

1. **启动后端服务器**
   ```bash
   npm run dev:backend
   ```
   后端将在 `http://localhost:3000` 可用

2. **启动前端开发服务器**
   ```bash
   npm run dev:frontend
   ```
   前端将在 `http://localhost:3001` 可用

3. **测试 API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 项目结构

```
group-chat-ai/
├── shared/                 # 共享的 TypeScript 类型和工具
│   ├── src/
│   │   ├── types/         # 通用类型定义
│   │   ├── constants/     # 应用程序常量
│   │   └── utils/         # 共享工具函数
├── backend/               # Express.js API 服务器
│   ├── src/
│   │   ├── controllers/   # API 路由处理器
│   │   ├── services/      # 业务逻辑服务
│   │   ├── middleware/    # Express 中间件
│   │   ├── config/        # 配置文件
│   │   └── utils/         # 后端工具
├── frontend/              # React 应用程序
│   ├── src/
│   │   ├── components/    # 可重用的 React 组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API 服务层
│   │   ├── hooks/         # 自定义 React hooks
│   │   └── utils/         # 前端工具
├── infrastructure/        # AWS CDK 基础设施代码
├── tests/                 # 测试文件
└── documents/             # 项目文档
```

## 🔧 可用脚本

### 根级别
- `npm run install:all` - 安装所有依赖
- `npm run build` - 构建所有包
- `npm run test` - 运行所有测试
- `npm run lint` - 检查所有包的代码规范

### 后端
- `npm run dev:backend` - 以开发模式启动后端
- `npm run build:backend` - 构建后端
- `npm run test:backend` - 运行后端测试

### 前端
- `npm run dev:frontend` - 启动前端开发服务器
- `npm run build:frontend` - 构建生产环境前端
- `npm run test:frontend` - 运行前端测试

### 角色和国际化
- `npm run personas:generate` - 从共享定义生成英文 personas.json
- `npm run docs:translate` - 将所有文档翻译为支持的语言
- `npm run docs:translate:single -- --lang es` - 翻译为特定语言

## 🌐 API 端点

### 健康检查
- `GET /health` - 基本健康检查
- `GET /health/detailed` - 详细健康信息

### 角色
- `GET /personas` - 获取所有可用角色
- `GET /personas/:personaId` - 获取特定角色详情

### 会话
- `POST /sessions` - 创建新的对话会话
- `POST /sessions/:sessionId/messages` - 发送消息并获取响应
- `PUT /sessions/:sessionId/personas` - 更新会话角色
- `GET /sessions/:sessionId/summary` - 获取会话摘要
- `DELETE /sessions/:sessionId` - 结束会话
- `GET /sessions/:sessionId` - 获取会话详情

## 🤖 AI 集成

系统通过可配置接口支持多个 LLM 提供商：

- **OpenAI**（GPT-3.5/GPT-4）
- **Anthropic**（Claude）
- **AWS Bedrock**（各种模型）
- **Ollama**（本地模型）

通过环境变量配置：
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### 开发模式
在开发中，系统使用模拟响应来模拟 AI 交互，无需 API 密钥。

## 🎭 角色

系统包含多样化的 AI 角色，可针对各种群组对话场景进行定制：

1. **战略顾问** - 高层规划、愿景和战略方向
2. **技术专家** - 深度技术知识、实施细节和解决方案
3. **分析师** - 数据驱动的洞察、研究和分析视角  
4. **创意思考者** - 创新、头脑风暴和跳出框架的想法
5. **协调者** - 讨论管理、共识建立和协作

### 角色结构
每个角色仅由 4 个简单字段定义：
- **名称**：显示名称（例如，"战略顾问"）
- **角色**：简短角色标识符（例如，"战略家"）
- **详情**：自由文本描述，包括背景、优先事项、关注点和影响力水平
- **头像选择**：从可用头像选项中选择视觉表示

### 角色定制
- **编辑默认角色**：使用自然语言修改任何默认角色的详情
- **创建自定义角色**：使用您自己的描述构建完全自定义的角色
- **会话持久化**：所有角色定制在浏览器会话中持续存在
- **导入/导出**：通过 JSON 文件保存和共享角色配置
- **基于磁贴的界面**：具有全面编辑功能的可视化磁贴选择

### 技术实现
每个角色维护：
- 用于真实响应的隔离对话上下文
- 详情字段的自然语言处理，用于 AI 提示生成
- 基于描述特征的角色特定响应模式
- 用于自然群组对话流的智能轮流发言

## 🌐 国际化和角色管理

### 角色定义工作流
1. **真实来源**：所有角色定义都在 `shared/src/personas/index.ts` 中维护
2. **生成**：运行 `npm run personas:generate` 创建英文 `personas.json` 翻译文件
3. **翻译**：使用现有翻译脚本生成本地化角色文件

### 角色翻译流程
```bash
# 1. 在共享包中更新角色定义
vim shared/src/personas/index.ts

# 2. 从共享定义生成英文 personas.json
npm run personas:generate

# 3. 将角色翻译为所有支持的语言
npm run docs:translate  # 翻译所有文件，包括 personas.json
# 或翻译为特定语言
npm run docs:translate:single -- --lang es

# 4. 如需要，重新构建共享包
npm run build:shared
```

### 翻译文件结构
- **源文件**：`shared/src/personas/index.ts`（TypeScript 定义）
- **生成文件**：`frontend/public/locales/en/personas.json`（英文 i18n）
- **翻译文件**：`frontend/public/locales/{lang}/personas.json`（本地化版本）

### 支持的语言
系统支持 14 种语言的角色和文档：
- 🇺🇸 English (en) - 源语言
- 🇸🇦 العربية (ar) - 阿拉伯语
- 🇩🇪 Deutsch (de) - 德语
- 🇪🇸 Español (es) - 西班牙语
- 🇫🇷 Français (fr) - 法语
- 🇮🇱 עברית (he) - 希伯来语
- 🇮🇹 Italiano (it) - 意大利语
- 🇯🇵 日本語 (ja) - 日语
- 🇰🇷 한국어 (ko) - 韩语
- 🇳🇱 Nederlands (nl) - 荷兰语
- 🇵🇹 Português (pt) - 葡萄牙语
- 🇷🇺 Русский (ru) - 俄语
- 🇸🇪 Svenska (sv) - 瑞典语
- 🇨🇳 中文 (zh) - 中文

### 添加新角色
1. 在 `shared/src/personas/index.ts` 中添加角色定义
2. 运行 `npm run personas:generate` 更新英文翻译
3. 运行翻译脚本生成本地化版本
4. 新角色将在所有支持的语言中可用

## 🔒 安全功能

- **输入验证**：所有用户输入都经过验证和清理
- **会话隔离**：每个会话维护独立的上下文
- **错误处理**：优雅的错误处理，提供用户友好的消息
- **速率限制**：内置防滥用保护
- **HTTPS**：生产环境中所有通信都加密

## 📊 监控和可观测性

- **结构化日志**：使用 Winston 的 JSON 格式日志
- **健康检查**：全面的健康监控
- **指标**：自定义应用程序指标
- **错误跟踪**：详细的错误日志记录和跟踪

## 🚢 部署

### Docker
```bash
# 构建后端镜像
cd backend
npm run docker:build

# 运行容器
npm run docker:run
```

### AWS 部署
```bash
# 部署基础设施
cd infrastructure
npm run deploy:dev # 将 :dev 替换为 staging 或 prod 以部署到相应环境
```

## ⚠️ 部署区域警告！
默认情况下，Bedrock 的路由模型是 Anthropic Claude Haiku 5.5 (`us.anthropic.claude-haiku-5-5`)。角色模型利用 Anthropic Claude Sonnet 5.5 (`us.anthropic.claude-sonnet-5-5`)。请确保您部署到支持这两个模型的区域，或配置替代模型。

## 🧪 测试

### 单元测试
```bash
npm run test
```

### 集成测试
```bash
npm run test:integration
```

### 端到端测试
```bash
npm run test:e2e
```

## 📈 性能目标

- **响应时间**：角色响应 < 3 秒
- **可用性**：99.9% API 可用性
- **并发性**：支持 1000+ 并发用户
- **群组对话**：每个会话最多 5 个角色，具有自然对话流

## 🤝 贡献

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 添加测试
5. 提交拉取请求

## 📄 许可证

本项目采用 MIT 许可证 - 详情请参阅 LICENSE 文件。