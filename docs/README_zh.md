# Pitch Perfect - AI驱动的演示练习

Pitch Perfect是一个AI驱动的焦点小组聊天机器人，为专业人士创建模拟环境来练习和完善关键演示。该系统使用户能够从代表不同利益相关者视角（CEO、CTO、CIO、CFO、CPO）的AI角色那里获得真实的反馈，而无需组织真实焦点小组的开销。

## 🏗️ 架构概览

```
用户输入 → React前端 → API网关 → ConversationOrchestrator
                                              ↓
会话管理器 ← 角色代理 ← LLM接口 ← 语言模型 (Bedrock/OpenAI/Anthropic/Ollama)
```

### 关键特性

- **AI驱动的角色模拟**：多个AI角色独立响应，具有不同的优先级和沟通风格
- **交互式聊天环境**：实时对话流程和即时反馈
- **特定角色反馈**：每个角色基于视角提供响应（CEO专注于策略，CFO专注于成本等）
- **顺序处理**：角色逐一响应，营造真实的会议动态
- **会话管理**：基于会话的对话，具有自动清理和角色持久化
- **简化角色设置**：使用自然语言角色描述而非复杂表单
- **多个LLM提供商**：支持AWS Bedrock、OpenAI、Anthropic和本地Ollama模型

## 🚀 快速开始

### 先决条件

- Node.js 20+ 
- npm 8+
- Docker（可选，用于容器化）
- AWS CLI（用于部署）

### 安装

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd ai-pitch-perfect
   ```

2. **安装依赖项**
   ```bash
   npm run install:all
   ```

3. **设置环境变量**
   ```bash
   # 后端
   cp backend/.env.example backend/.env
   # 编辑backend/.env并填入您的配置
   
   # 前端将使用Vite的代理配置
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
   后端将在`http://localhost:3000`可用

2. **启动前端开发服务器**
   ```bash
   npm run dev:frontend
   ```
   前端将在`http://localhost:3001`可用

3. **测试API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 项目结构

```
ai-pitch-perfect/
├── shared/                 # 共享TypeScript类型和实用工具
│   ├── src/
│   │   ├── types/         # 通用类型定义
│   │   ├── constants/     # 应用程序常量
│   │   └── utils/         # 共享实用函数
├── backend/               # Express.js API服务器
│   ├── src/
│   │   ├── controllers/   # API路由处理程序
│   │   ├── services/      # 业务逻辑服务
│   │   ├── middleware/    # Express中间件
│   │   ├── config/        # 配置文件
│   │   └── utils/         # 后端实用工具
├── frontend/              # React应用程序
│   ├── src/
│   │   ├── components/    # 可重用React组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API服务层
│   │   ├── hooks/         # 自定义React钩子
│   │   └── utils/         # 前端实用工具
├── infrastructure/        # AWS CDK基础设施代码
├── tests/                 # 测试文件
└── documents/             # 项目文档
```

## 🔧 可用脚本

### 根级别
- `npm run install:all` - 安装所有依赖项
- `npm run build` - 构建所有包
- `npm run test` - 运行所有测试
- `npm run lint` - 检查所有包的代码风格

### 后端
- `npm run dev:backend` - 在开发模式下启动后端
- `npm run build:backend` - 构建后端
- `npm run test:backend` - 运行后端测试

### 前端
- `npm run dev:frontend` - 启动前端开发服务器
- `npm run build:frontend` - 构建生产版前端
- `npm run test:frontend` - 运行前端测试

## 🌐 API端点

### 健康检查
- `GET /health` - 基本健康检查
- `GET /health/detailed` - 详细健康信息

### 角色
- `GET /personas` - 获取所有可用角色
- `GET /personas/:personaId` - 获取特定角色详情

### 会话
- `POST /sessions` - 创建新对话会话
- `POST /sessions/:sessionId/messages` - 发送消息并获取响应
- `PUT /sessions/:sessionId/personas` - 更新会话角色
- `GET /sessions/:sessionId/summary` - 获取会话摘要
- `DELETE /sessions/:sessionId` - 结束会话
- `GET /sessions/:sessionId` - 获取会话详情

## 🤖 AI集成

系统通过可配置接口支持多个LLM提供商：

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
在开发中，系统使用模拟响应来模拟AI交互，无需API密钥。

## 🎭 角色

系统包括5个预定义的高管角色，具有简化、用户友好的自定义功能：

1. **CEO** - 战略焦点、竞争优势、业务成果
2. **CTO** - 技术可行性、架构、实施复杂性
3. **CFO** - 财务影响、投资回报率、预算影响
4. **CIO** - 系统集成、安全性、IT基础设施
5. **CPO** - 产品策略、用户体验、市场定位

### 角色结构
每个角色仅由4个简单字段定义：
- **名称**：显示名称（例如"首席执行官"）
- **角色**：短角色标识符（例如"CEO"）
- **详情**：自由文本描述，包括背景、优先级、关注点和影响力水平
- **头像选择**：从可用头像选项中选择视觉表现

### 角色自定义
- **编辑默认角色**：用自然语言修改任何默认角色的详情
- **创建自定义角色**：用您自己的描述构建完全自定义的角色
- **会话持久化**：所有角色自定义在浏览器会话中保持不变
- **导入/导出**：通过JSON文件保存和共享角色配置
- **基于瓦片的界面**：具有全面编辑功能的可视化瓦片选择

### 技术实现
每个角色维护：
- 用于真实响应的隔离对话上下文
- 详情字段的自然语言处理用于AI提示生成
- 基于描述特性的角色特定响应模式
- 用于真实会议动态的顺序响应处理

## 🔒 安全功能

- **输入验证**：所有用户输入都经过验证和清理
- **会话隔离**：每个会话维护单独的上下文
- **错误处理**：优雅的错误处理，带有用户友好的消息
- **速率限制**：内置滥用保护
- **HTTPS**：生产环境中所有通信都经过加密

## 📊 监控与可观测性

- **结构化日志记录**：使用Winston的JSON格式日志
- **健康检查**：全面的健康监控
- **指标**：自定义应用程序指标
- **错误跟踪**：详细的错误记录和跟踪

## 🚢 部署

### Docker
```bash
# 构建后端镜像
cd backend
npm run docker:build

# 运行容器
npm run docker:run
```

### AWS部署
```bash
# 部署基础设施
cd infrastructure
npm run deploy:dev
```

## 🧪 测试

### 单元测试
```bash
npm run test
```

### 集成测试
```bash
npm run test:integration
```

### E2E测试
```bash
npm run test:e2e
```

## 📈 性能目标

- **响应时间**：角色响应<3秒
- **可用性**：99.9%的API可用性
- **并发性**：支持1000+并发用户
- **顺序处理**：每个会话最多5个角色，具有真实的会议流程

## 🤝 贡献

1. Fork仓库
2. 创建功能分支
3. 进行更改
4. 添加测试
5. 提交拉取请求

## 📄 许可证

此项目根据MIT许可证授权 - 详情请参阅LICENSE文件。

## 🆘 支持

获取支持和提问：
- 查看`/documents`中的文档
- 查看`/memory-bank`中的记忆库
- 在GitHub上开issue