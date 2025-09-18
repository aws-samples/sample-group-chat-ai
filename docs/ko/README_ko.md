# Group Chat AI - 협업 AI 대화

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./README_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](#)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


**📖 이 문서는 여러 언어로 제공됩니다:**
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

Group Chat AI는 여러 AI 페르소나와 동적인 그룹 대화를 가능하게 하는 고급 협업 플랫폼입니다. 이 시스템은 다양한 관점에서 의미 있는 토론을 촉진하여 사용자가 아이디어를 탐색하고, 피드백을 받고, 다양한 역할과 관점을 대표하는 AI 에이전트와 다자간 대화에 참여할 수 있도록 합니다.

## 🏗️ 아키텍처 개요

```
사용자 입력 → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### 주요 기능

- **다중 페르소나 대화**: 그룹 토론에서 여러 AI 페르소나와 동시에 상호작용
- **동적 상호작용 패턴**: 자연스러운 순서 교대와 응답을 통한 실시간 대화 흐름
- **다양한 관점**: 각 페르소나는 고유한 관점, 전문성, 커뮤니케이션 스타일을 제공
- **협업적 문제 해결**: 다양한 접근 방식을 제공하는 AI 에이전트와 함께 복잡한 주제를 해결
- **세션 지속성**: 세션 간 대화 맥락과 페르소나 일관성 유지
- **유연한 페르소나 커스터마이징**: 자연어 설명으로 AI 페르소나 생성 및 수정
- **다중 LLM 지원**: AWS Bedrock, OpenAI, Anthropic, Ollama를 포함한 다양한 언어 모델 활용

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 20+ 
- npm 8+
- Docker (선택사항, 컨테이너화용)
- AWS CLI (배포용)

### 설치

1. **저장소 복제**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **의존성 설치**
   ```bash
   npm run install:all
   ```

3. **환경 변수 설정**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # backend/.env 파일을 설정에 맞게 편집
   
   # Frontend는 Vite의 프록시 설정을 사용합니다
   ```

4. **공유 패키지 빌드**
   ```bash
   npm run build:shared
   ```

### 개발

1. **백엔드 서버 시작**
   ```bash
   npm run dev:backend
   ```
   백엔드는 `http://localhost:3000`에서 사용 가능합니다

2. **프론트엔드 개발 서버 시작**
   ```bash
   npm run dev:frontend
   ```
   프론트엔드는 `http://localhost:3001`에서 사용 가능합니다

3. **API 테스트**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 프로젝트 구조

```
group-chat-ai/
├── shared/                 # 공유 TypeScript 타입 및 유틸리티
│   ├── src/
│   │   ├── types/         # 공통 타입 정의
│   │   ├── constants/     # 애플리케이션 상수
│   │   └── utils/         # 공유 유틸리티 함수
├── backend/               # Express.js API 서버
│   ├── src/
│   │   ├── controllers/   # API 라우트 핸들러
│   │   ├── services/      # 비즈니스 로직 서비스
│   │   ├── middleware/    # Express 미들웨어
│   │   ├── config/        # 설정 파일
│   │   └── utils/         # 백엔드 유틸리티
├── frontend/              # React 애플리케이션
│   ├── src/
│   │   ├── components/    # 재사용 가능한 React 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── services/      # API 서비스 레이어
│   │   ├── hooks/         # 커스텀 React 훅
│   │   └── utils/         # 프론트엔드 유틸리티
├── infrastructure/        # AWS CDK 인프라 코드
├── tests/                 # 테스트 파일
└── documents/             # 프로젝트 문서
```

## 🔧 사용 가능한 스크립트

### 루트 레벨
- `npm run install:all` - 모든 의존성 설치
- `npm run build` - 모든 패키지 빌드
- `npm run test` - 모든 테스트 실행
- `npm run lint` - 모든 패키지 린트

### 백엔드
- `npm run dev:backend` - 개발 모드에서 백엔드 시작
- `npm run build:backend` - 백엔드 빌드
- `npm run test:backend` - 백엔드 테스트 실행

### 프론트엔드
- `npm run dev:frontend` - 프론트엔드 개발 서버 시작
- `npm run build:frontend` - 프로덕션용 프론트엔드 빌드
- `npm run test:frontend` - 프론트엔드 테스트 실행

### 페르소나 및 국제화
- `npm run personas:generate` - 공유 정의에서 영어 personas.json 생성
- `npm run docs:translate` - 지원되는 모든 언어로 문서 번역
- `npm run docs:translate:single -- --lang es` - 특정 언어로 번역

## 🌐 API 엔드포인트

### 상태 확인
- `GET /health` - 기본 상태 확인
- `GET /health/detailed` - 상세 상태 정보

### 페르소나
- `GET /personas` - 사용 가능한 모든 페르소나 가져오기
- `GET /personas/:personaId` - 특정 페르소나 세부 정보 가져오기

### 세션
- `POST /sessions` - 새 대화 세션 생성
- `POST /sessions/:sessionId/messages` - 메시지 전송 및 응답 받기
- `PUT /sessions/:sessionId/personas` - 세션 페르소나 업데이트
- `GET /sessions/:sessionId/summary` - 세션 요약 가져오기
- `DELETE /sessions/:sessionId` - 세션 종료
- `GET /sessions/:sessionId` - 세션 세부 정보 가져오기

## 🤖 AI 통합

시스템은 설정 가능한 인터페이스를 통해 여러 LLM 제공업체를 지원합니다:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (다양한 모델)
- **Ollama** (로컬 모델)

환경 변수를 통해 설정:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### 개발 모드
개발 환경에서 시스템은 API 키 없이도 AI 상호작용을 시뮬레이션하기 위해 모의 응답을 사용합니다.

## 🎭 페르소나

시스템은 다양한 그룹 대화 시나리오에 맞게 커스터마이징할 수 있는 다양한 AI 페르소나를 포함합니다:

1. **전략 고문** - 고수준 계획, 비전, 전략적 방향
2. **기술 전문가** - 깊은 기술 지식, 구현 세부사항, 솔루션
3. **분석가** - 데이터 기반 통찰, 연구, 분석적 관점  
4. **창의적 사고자** - 혁신, 브레인스토밍, 창의적 아이디어
5. **진행자** - 토론 관리, 합의 구축, 협업

### 페르소나 구조
각 페르소나는 단 4개의 간단한 필드로 정의됩니다:
- **이름**: 표시 이름 (예: "전략 고문")
- **역할**: 짧은 역할 식별자 (예: "전략가")
- **세부사항**: 배경, 우선순위, 관심사, 영향력 수준을 포함한 자유 텍스트 설명
- **아바타 선택**: 사용 가능한 아바타 옵션에서 시각적 표현

### 페르소나 커스터마이징
- **기본 페르소나 편집**: 자연어로 기본 페르소나의 세부사항 수정
- **커스텀 페르소나 생성**: 자신만의 설명으로 완전히 커스텀 페르소나 구축
- **세션 지속성**: 모든 페르소나 커스터마이징이 브라우저 세션 동안 유지
- **가져오기/내보내기**: JSON 파일을 통해 페르소나 설정 저장 및 공유
- **타일 기반 인터페이스**: 포괄적인 편집 기능을 갖춘 시각적 타일 선택

### 기술적 구현
각 페르소나는 다음을 유지합니다:
- 진정한 응답을 위한 격리된 대화 맥락
- AI 프롬프트 생성을 위한 세부사항 필드의 자연어 처리
- 설명된 특성에 기반한 역할별 응답 패턴
- 자연스러운 그룹 대화 흐름을 위한 지능적 순서 교대

## 🌐 국제화 및 페르소나 관리

### 페르소나 정의 워크플로우
1. **진실의 원천**: 모든 페르소나 정의는 `shared/src/personas/index.ts`에서 관리됩니다
2. **생성**: `npm run personas:generate`를 실행하여 영어 `personas.json` 번역 파일 생성
3. **번역**: 기존 번역 스크립트를 사용하여 현지화된 페르소나 파일 생성

### 페르소나 번역 프로세스
```bash
# 1. 공유 패키지에서 페르소나 정의 업데이트
vim shared/src/personas/index.ts

# 2. 공유 정의에서 영어 personas.json 생성
npm run personas:generate

# 3. 지원되는 모든 언어로 페르소나 번역
npm run docs:translate  # personas.json을 포함한 모든 파일 번역
# 또는 특정 언어로 번역
npm run docs:translate:single -- --lang es

# 4. 필요시 공유 패키지 재빌드
npm run build:shared
```

### 번역 파일 구조
- **소스**: `shared/src/personas/index.ts` (TypeScript 정의)
- **생성됨**: `frontend/public/locales/en/personas.json` (영어 i18n)
- **번역됨**: `frontend/public/locales/{lang}/personas.json` (현지화 버전)

### 지원 언어
시스템은 페르소나와 문서에 대해 14개 언어를 지원합니다:
- 🇺🇸 English (en) - 소스 언어
- 🇸🇦 العربية (ar) - 아랍어
- 🇩🇪 Deutsch (de) - 독일어
- 🇪🇸 Español (es) - 스페인어
- 🇫🇷 Français (fr) - 프랑스어
- 🇮🇱 עברית (he) - 히브리어
- 🇮🇹 Italiano (it) - 이탈리아어
- 🇯🇵 日本語 (ja) - 일본어
- 🇰🇷 한국어 (ko) - 한국어
- 🇳🇱 Nederlands (nl) - 네덜란드어
- 🇵🇹 Português (pt) - 포르투갈어
- 🇷🇺 Русский (ru) - 러시아어
- 🇸🇪 Svenska (sv) - 스웨덴어
- 🇨🇳 中文 (zh) - 중국어

### 새 페르소나 추가
1. `shared/src/personas/index.ts`에 페르소나 정의 추가
2. `npm run personas:generate`를 실행하여 영어 번역 업데이트
3. 번역 스크립트를 실행하여 현지화 버전 생성
4. 새 페르소나가 지원되는 모든 언어에서 사용 가능해집니다

## 🔒 보안 기능

- **입력 검증**: 모든 사용자 입력이 검증되고 정제됩니다
- **세션 격리**: 각 세션은 별도의 맥락을 유지합니다
- **오류 처리**: 사용자 친화적인 메시지와 함께 우아한 오류 처리
- **속도 제한**: 남용에 대한 내장 보호
- **HTTPS**: 프로덕션에서 모든 통신 암호화

## 📊 모니터링 및 관찰 가능성

- **구조화된 로깅**: Winston을 사용한 JSON 형식 로그
- **상태 확인**: 포괄적인 상태 모니터링
- **메트릭**: 커스텀 애플리케이션 메트릭
- **오류 추적**: 상세한 오류 로깅 및 추적

## 🚢 배포

### Docker
```bash
# 백엔드 이미지 빌드
cd backend
npm run docker:build

# 컨테이너 실행
npm run docker:run
```

### AWS 배포
```bash
# 인프라 배포
cd infrastructure
npm run deploy:dev # 스테이징 또는 프로덕션 환경의 경우 :dev를 staging 또는 prod로 교체
```

## ⚠️ 배포 지역 경고!
기본적으로 Bedrock의 라우팅 모델은 OpenAI gpt-oss:20b (`openai.gpt-oss-20b-1:0`)입니다. 페르소나 모델은 Anthropic Claude 4 Sonnet (`anthropic.claude-sonnet-4-20250514-v1:0`)을 활용합니다. 두 모델을 모두 지원하는 지역에 배포하거나 대체 모델을 설정하시기 바랍니다.

## 🧪 테스트

### 단위 테스트
```bash
npm run test
```

### 통합 테스트
```bash
npm run test:integration
```

### E2E 테스트
```bash
npm run test:e2e
```

## 📈 성능 목표

- **응답 시간**: 페르소나 응답 3초 미만
- **가용성**: 99.9% API 가용성
- **동시성**: 1000명 이상의 동시 사용자 지원
- **그룹 대화**: 자연스러운 대화 흐름으로 세션당 최대 5개 페르소나

## 🤝 기여하기

1. 저장소 포크
2. 기능 브랜치 생성
3. 변경사항 적용
4. 테스트 추가
5. 풀 리퀘스트 제출

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 라이선스가 부여됩니다 - 자세한 내용은 LICENSE 파일을 참조하세요.