# Pitch Perfect - AI 기반 프레젠테이션 연습

Pitch Perfect는 전문가들이 중요한 프레젠테이션을 연습하고 개선할 수 있는 시뮬레이션 환경을 만드는 AI 기반 포커스 그룹 챗봇입니다. 이 시스템은 사용자가 실제 포커스 그룹을 조직하는 부담 없이 다양한 이해관계자 관점(CEO, CTO, CIO, CFO, CPO)을 나타내는 AI 페르소나로부터 현실적인 피드백을 받을 수 있게 합니다.

## 🏗️ 아키텍처 개요

```
사용자 입력 → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Model (Bedrock/OpenAI/Anthropic/Ollama)
```

### 주요 기능

- **AI 기반 페르소나 시뮬레이션**: 여러 AI 페르소나가 서로 다른 우선순위와 의사소통 스타일로 독립적으로 응답
- **대화형 채팅 환경**: 즉각적인 피드백을 제공하는 실시간 대화 흐름
- **역할별 피드백**: 각 페르소나가 관점 기반 응답 제공(CEO는 전략에 집중, CFO는 비용에 집중 등)
- **순차 처리**: 현실적인 회의 역학을 위해 페르소나가 차례대로 응답
- **세션 관리**: 자동 정리 및 페르소나 지속성을 포함한 세션 기반 대화
- **단순화된 페르소나 설정**: 복잡한 양식 대신 자연어 페르소나 설명
- **다중 LLM 제공자**: AWS Bedrock, OpenAI, Anthropic, 로컬 Ollama 모델 지원

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
   cd ai-pitch-perfect
   ```

2. **종속성 설치**
   ```bash
   npm run install:all
   ```

3. **환경 변수 설정**
   ```bash
   # 백엔드
   cp backend/.env.example backend/.env
   # backend/.env를 귀하의 구성으로 편집하세요
   
   # 프론트엔드는 Vite의 프록시 구성을 사용합니다
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
   백엔드는 `http://localhost:3000`에서 이용 가능합니다

2. **프론트엔드 개발 서버 시작**
   ```bash
   npm run dev:frontend
   ```
   프론트엔드는 `http://localhost:3001`에서 이용 가능합니다

3. **API 테스트**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 프로젝트 구조

```
ai-pitch-perfect/
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
│   │   ├── config/        # 구성 파일
│   │   └── utils/         # 백엔드 유틸리티
├── frontend/              # React 애플리케이션
│   ├── src/
│   │   ├── components/    # 재사용 가능한 React 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── services/      # API 서비스 계층
│   │   ├── hooks/         # 커스텀 React 훅
│   │   └── utils/         # 프론트엔드 유틸리티
├── infrastructure/        # AWS CDK 인프라 코드
├── tests/                 # 테스트 파일
└── documents/             # 프로젝트 문서
```

## 🔧 사용 가능한 스크립트

### 루트 레벨
- `npm run install:all` - 모든 종속성 설치
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

## 🌐 API 엔드포인트

### 상태 확인
- `GET /health` - 기본 상태 확인
- `GET /health/detailed` - 상세 상태 정보

### 페르소나
- `GET /personas` - 사용 가능한 모든 페르소나 가져오기
- `GET /personas/:personaId` - 특정 페르소나 세부정보 가져오기

### 세션
- `POST /sessions` - 새 대화 세션 생성
- `POST /sessions/:sessionId/messages` - 메시지 전송 및 응답 받기
- `PUT /sessions/:sessionId/personas` - 세션 페르소나 업데이트
- `GET /sessions/:sessionId/summary` - 세션 요약 가져오기
- `DELETE /sessions/:sessionId` - 세션 종료
- `GET /sessions/:sessionId` - 세션 세부정보 가져오기

## 🤖 AI 통합

시스템은 구성 가능한 인터페이스를 통해 여러 LLM 제공자를 지원합니다:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (다양한 모델)
- **Ollama** (로컬 모델)

환경 변수를 통한 구성:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### 개발 모드
개발 환경에서 시스템은 API 키 없이 AI 상호작용을 시뮬레이션하기 위해 모의 응답을 사용합니다.

## 🎭 페르소나

시스템에는 단순하고 사용자 친화적인 사용자 정의 기능을 갖춘 5개의 사전 정의된 임원 페르소나가 포함되어 있습니다:

1. **CEO** - 전략적 초점, 경쟁 우위, 비즈니스 결과
2. **CTO** - 기술적 타당성, 아키텍처, 구현 복잡성
3. **CFO** - 재정적 영향, ROI, 예산 영향
4. **CIO** - 시스템 통합, 보안, IT 인프라
5. **CPO** - 제품 전략, 사용자 경험, 시장 포지셔닝

### 페르소나 구조
각 페르소나는 단 4개의 간단한 필드로 정의됩니다:
- **이름**: 표시 이름 (예: "최고경영책임자")
- **역할**: 짧은 역할 식별자 (예: "CEO")
- **세부사항**: 배경, 우선순위, 우려사항, 영향력 수준을 포함한 자유 텍스트 설명
- **아바타 선택**: 사용 가능한 아바타 옵션에서 시각적 표현

### 페르소나 사용자 정의
- **기본 페르소나 편집**: 자연어로 모든 기본 페르소나의 세부사항 수정
- **커스텀 페르소나 생성**: 고유한 설명으로 완전히 커스텀한 페르소나 구축
- **세션 지속성**: 모든 페르소나 사용자 정의가 브라우저 세션 전반에 걸쳐 지속
- **가져오기/내보내기**: JSON 파일을 통한 페르소나 구성 저장 및 공유
- **타일 기반 인터페이스**: 포괄적인 편집 기능을 갖춘 시각적 타일 선택

### 기술적 구현
각 페르소나는 다음을 유지합니다:
- 진정한 응답을 위한 격리된 대화 컨텍스트
- AI 프롬프트 생성을 위한 세부사항 필드의 자연어 처리
- 설명된 특성에 기반한 역할별 응답 패턴
- 현실적인 회의 역학을 위한 순차적 응답 처리

## 🔒 보안 기능

- **입력 검증**: 모든 사용자 입력이 검증되고 정제됨
- **세션 격리**: 각 세션이 별도의 컨텍스트 유지
- **오류 처리**: 사용자 친화적인 메시지와 함께 우아한 오류 처리
- **속도 제한**: 남용에 대한 내장 보호
- **HTTPS**: 프로덕션에서 모든 통신 암호화

## 📊 모니터링 및 관찰성

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
npm run deploy:dev
```

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

- **응답 시간**: 페르소나 응답에 3초 미만
- **가용성**: 99.9% API 가용성
- **동시성**: 1000+ 동시 사용자 지원
- **순차 처리**: 현실적인 회의 흐름으로 세션당 최대 5개 페르소나

## 🤝 기여

1. 저장소 포크
2. 기능 브랜치 생성
3. 변경사항 작성
4. 테스트 추가
5. 풀 리퀘스트 제출

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 라이선스됩니다 - 자세한 내용은 LICENSE 파일을 참조하세요.

## 🆘 지원

지원 및 문의사항:
- `/documents`의 문서 확인
- `/memory-bank`의 메모리 뱅크 검토
- GitHub에서 이슈 열기