# Group Chat AI - 系统架构

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./ARCHITECTURE_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./ARCHITECTURE_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./ARCHITECTURE_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./ARCHITECTURE_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./ARCHITECTURE_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./ARCHITECTURE_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./ARCHITECTURE_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](#)


## 概述

Group Chat AI 是一个复杂的实时对话 AI 平台，使用户能够与多个 AI 角色进行协作讨论。该系统利用 AWS 云服务提供可扩展、安全且高性能的解决方案，支持群组对话中的实时语音和文本交互。

## 架构图

### 高级系统架构
![Group Chat AI System Architecture](ARCHITECTURE.png)

## 系统组件

### 1. 前端层

#### **CloudFront Distribution**
- **用途**：全球内容分发网络，提供最佳性能
- **功能**：
  - 静态资源缓存（React 应用程序构建）
  - API 请求路由到后端 ALB
  - WebSocket 连接代理，用于实时通信
  - 地理限制和安全策略
  - 使用 ACM 证书的自定义域名支持

#### **S3 静态托管**
- **用途**：提供 React 应用程序构建产物
- **内容**：
  - HTML、CSS、JavaScript 包
  - 静态资源（图像、字体、本地化文件）
  - 动态配置文件（用于环境特定设置的 config.json）

#### **React 前端应用程序**
- **技术**：React 18 with TypeScript，Vite 构建系统
- **功能**：
  - 实时 WebSocket 通信
  - 语音输入/输出功能
  - 多语言国际化
  - 现代 UI 组件的响应式设计
  - 图像上传和处理

### 2. 身份验证和授权

#### **Amazon Cognito User Pool**
- **用途**：集中式用户身份验证和管理
- **功能**：
  - OAuth 2.0 / OpenID Connect 集成
  - 基于电子邮件的注册和验证
  - 密码策略和账户恢复
  - 通过 OIDC 流程与前端集成

#### **User Pool Client**
- **配置**：
  - Authorization Code Grant 流程
  - 开发和生产环境的回调 URL
  - 作用域：openid、email、profile
  - 为安全性优化的令牌有效期

### 3. 网络基础设施

#### **VPC (Virtual Private Cloud)**
- **设计**：多可用区部署，确保高可用性
- **子网**：
  - **公有子网**：托管 ALB 和 NAT Gateway
  - **私有子网**：为安全起见托管 ECS Fargate 任务

#### **Application Load Balancer (ALB)**
- **用途**：HTTP/HTTPS 流量分发和 SSL 终止
- **安全性**：**关键 - ALB 仅接受来自 CloudFront IP 范围的流量**
- **功能**：
  - ECS 服务的健康检查
  - 基于路径的路由（/api/* → 后端，/ws/* → WebSocket）
  - 使用 CloudFront 托管前缀列表配置的安全组
  - 访问日志记录到 S3
  - **所有用户流量（HTTP/WebSocket）必须通过 CloudFront 流转**

### 4. 后端服务（ECS Fargate）

#### **Express.js 应用服务器**
- **运行时**：Node.js 20 with TypeScript
- **架构**：面向微服务的设计
- **核心组件**：
  - 用于会话管理的 REST API 端点
  - 用于实时通信的 WebSocket 服务器
  - 用于日志记录、错误处理和安全的中间件

#### **核心服务组件**

##### **ConversationOrchestrator**
- **用途**：AI 对话的中央协调器
- **职责**：
  - 消息路由和角色选择
  - 自然对话流程的音频队列管理
  - 实时响应流式传输
  - 迭代对话管理

##### **PersonaManager & PersonaAgent**
- **用途**：管理 AI 角色定义和行为
- **功能**：
  - 自定义角色创建和管理
  - 角色特定的对话上下文
  - 基于内容分析的动态角色选择

##### **RoutingAgent**
- **用途**：智能路由用户消息到适当的角色
- **技术**：使用 Amazon Bedrock 进行决策
- **功能**：
  - 内容分析和角色相关性评分
  - 对话延续逻辑
  - 多角色交互编排

##### **SessionService**
- **用途**：管理用户会话和对话状态
- **功能**：
  - 会话生命周期管理
  - 对话历史持久化
  - 用户特定的自定义设置

##### **WebSocket 管理**
- **组件**：WebSocketServer、WebSocketController、SessionWebSocketManager
- **功能**：
  - 实时双向通信
  - 会话特定的 WebSocket 连接
  - 音频流式传输和确认协议

### 5. AI/ML 服务集成

#### **Amazon Bedrock**
- **模型**：Claude 4 (us.anthropic.claude-sonnet-4-20250514-v1:0)
- **用途**：
  - AI 角色的对话生成
  - 内容分析和路由决策
  - 上下文感知的响应生成
- **配置**：通过 Parameter Store 进行环境特定设置

#### **Amazon Polly**
- **用途**：语音交互的文本转语音转换
- **功能**：
  - 多种语音选项，具有角色特定分配
  - 特定角色的新闻播音员说话风格
  - 流式音频合成
  - 语言感知的语音选择

### 6. 配置和监控

#### **AWS Systems Manager Parameter Store**
- **用途**：集中式配置管理
- **参数**：
  - LLM 模型和提供商设置
  - Cognito 配置详情
  - 环境特定设置

#### **CloudWatch Logs & Metrics**
- **功能**：
  - 所有服务的集中式日志记录
  - 性能指标和监控
  - 错误跟踪和告警
  - AI 服务使用的自定义指标

## 数据流模式

### 1. 用户身份验证流程
```
用户 → CloudFront → Cognito User Pool → OAuth 流程 → JWT Token → API 调用
```

### 2. 实时对话流程
```
用户消息 → WebSocket（通过 CloudFront）→ ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → 响应 → Polly → 音频流 → WebSocket（通过 CloudFront）→ 用户
```

### 3. AI 处理管道
```
用户输入 → 内容分析 → 角色选择 → 上下文构建 → LLM 请求 → 响应生成 → 音频合成 → 队列管理 → 交付
```

## 安全架构

### 网络安全
- **WAF 集成**：CloudFront 集成的 Web 应用程序防火墙
- **VPC 安全**：后端服务的私有子网
- **安全组**：最小权限访问控制
- **ALB 限制**：CloudFront IP 范围限制

### 数据安全
- **传输加密**：全程 HTTPS/TLS
- **静态加密**：S3 和 Parameter Store 加密
- **密钥管理**：Parameter Store 用于敏感配置
- **访问控制**：具有最小权限的 IAM 角色

### 应用程序安全
- **身份验证**：基于 Cognito 的 OAuth 2.0/OIDC
- **授权**：JWT 令牌验证
- **输入验证**：全面的请求验证
- **速率限制**：API 和 WebSocket 连接限制

## 可扩展性和性能

### 自动扩展
- **ECS 服务**：基于 CPU 和内存的自动扩展（1-10 个任务）
- **ALB**：基于流量的自动扩展
- **CloudFront**：CDN 的全球边缘位置

### 性能优化
- **缓存**：静态资源的 CloudFront 缓存
- **音频流式传输**：Base64 数据 URL 用于即时播放
- **连接池**：高效的 WebSocket 连接管理
- **懒加载**：按需服务初始化

### 高可用性
- **多可用区部署**：VPC 跨越多个可用区
- **健康检查**：ECS 服务的 ALB 健康监控
- **优雅降级**：服务故障的回退机制

## 技术栈总结

### 前端
- **框架**：React 18 with TypeScript
- **构建工具**：Vite
- **样式**：响应式设计的现代 CSS
- **状态管理**：React Context API
- **身份验证**：OIDC Client
- **实时**：WebSocket API

### 后端
- **运行时**：Node.js 20
- **框架**：Express.js
- **语言**：TypeScript
- **WebSocket**：ws 库
- **日志记录**：Winston
- **测试**：Jest

### 基础设施
- **编排**：AWS CDK (TypeScript)
- **计算**：ECS Fargate
- **存储**：S3
- **CDN**：CloudFront
- **数据库**：内存状态管理
- **配置**：Parameter Store

### AI/ML
- **LLM**：Amazon Bedrock (Claude 4)
- **TTS**：Amazon Polly
- **内容分析**：与 LLM 集成的自定义服务

## 部署架构

### 环境策略
- **开发**：使用后端端口 3000 的本地开发
- **生产**：使用 CloudFront 的 CDK 部署基础设施

### CI/CD 管道
- **前端**：Vite 构建 → S3 部署 → CloudFront 失效
- **后端**：Docker 构建 → ECR → ECS 服务更新
- **基础设施**：CDK diff → 部署 → 验证

### 配置管理
- **环境变量**：容器级配置
- **密钥**：Parameter Store 集成
- **功能标志**：基于环境的启用

## 监控和可观测性

### 日志记录策略
- **集中式**：所有日志流向 CloudWatch
- **结构化**：JSON 格式的日志条目
- **关联**：用于跟踪的请求 ID
- **级别**：Debug、Info、Warn、Error 分类

### 指标和告警
- **应用程序指标**：响应时间、错误率
- **基础设施指标**：CPU、内存、网络利用率
- **业务指标**：对话完成率、角色使用情况
- **自定义告警**：主动问题检测

### 健康监控
- **健康端点**：/health 用于服务状态
- **依赖检查**：外部服务连接性
- **优雅降级**：回退行为监控

## 未来架构考虑

### 可扩展性增强
- **数据库集成**：考虑使用 RDS 进行持久存储
- **缓存层**：Redis/ElastiCache 用于会话状态
- **微服务**：进一步的服务分解

### AI/ML 改进
- **模型微调**：自定义模型训练
- **A/B 测试**：多模型比较
- **对话分析**：高级使用洞察

### 安全增强
- **WAF 规则**：增强攻击防护
- **API Gateway**：考虑迁移以获得高级功能
- **合规性**：SOC 2、GDPR 考虑

该架构为 Group Chat AI 平台提供了强大、可扩展且安全的基础，同时保持了未来增强和增长的灵活性。