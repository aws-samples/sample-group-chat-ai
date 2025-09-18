# Group Chat AI - 시스템 아키텍처

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./ARCHITECTURE_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](./ARCHITECTURE_es.md)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./ARCHITECTURE_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./ARCHITECTURE_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./ARCHITECTURE_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](#)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./ARCHITECTURE_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## 개요

Group Chat AI는 사용자가 여러 AI 페르소나와 협업적 토론에 참여할 수 있도록 하는 정교한 실시간 대화형 AI 플랫폼입니다. 이 시스템은 AWS 클라우드 서비스를 활용하여 그룹 대화를 위한 실시간 음성 및 텍스트 상호작용과 함께 확장 가능하고 안전하며 성능이 우수한 솔루션을 제공합니다.

## 아키텍처 다이어그램

### 고수준 시스템 아키텍처
![Group Chat AI System Architecture](ARCHITECTURE.png)

## 시스템 구성 요소

### 1. 프론트엔드 계층

#### **CloudFront Distribution**
- **목적**: 최적의 성능을 위한 글로벌 콘텐츠 전송 네트워크
- **기능**:
  - 정적 자산 캐싱 (React 애플리케이션 빌드)
  - 백엔드 ALB로의 API 요청 라우팅
  - 실시간 통신을 위한 WebSocket 연결 프록시
  - 지역 제한 및 보안 정책
  - ACM 인증서를 통한 사용자 정의 도메인 지원

#### **S3 Static Hosting**
- **목적**: React 애플리케이션 빌드 아티팩트 제공
- **콘텐츠**:
  - HTML, CSS, JavaScript 번들
  - 정적 자산 (이미지, 폰트, 현지화 파일)
  - 동적 구성 파일 (환경별 설정을 위한 config.json)

#### **React Frontend Application**
- **기술**: TypeScript를 사용한 React 18, Vite 빌드 시스템
- **기능**:
  - 실시간 WebSocket 통신
  - 음성 입력/출력 기능
  - 다국어 국제화
  - 현대적인 UI 구성 요소를 사용한 반응형 디자인
  - 이미지 업로드 및 처리

### 2. 인증 및 권한 부여

#### **Amazon Cognito User Pool**
- **목적**: 중앙 집중식 사용자 인증 및 관리
- **기능**:
  - OAuth 2.0 / OpenID Connect 통합
  - 이메일 기반 등록 및 검증
  - 비밀번호 정책 및 계정 복구
  - OIDC 플로우를 통한 프론트엔드 통합

#### **User Pool Client**
- **구성**:
  - Authorization Code Grant 플로우
  - 개발 및 프로덕션 환경을 위한 콜백 URL
  - 스코프: openid, email, profile
  - 보안에 최적화된 토큰 유효 기간

### 3. 네트워크 인프라

#### **VPC (Virtual Private Cloud)**
- **설계**: 고가용성을 위한 다중 AZ 배포
- **서브넷**:
  - **퍼블릭 서브넷**: ALB 및 NAT Gateway 호스팅
  - **프라이빗 서브넷**: 보안을 위한 ECS Fargate 작업 호스팅

#### **Application Load Balancer (ALB)**
- **목적**: HTTP/HTTPS 트래픽 분산 및 SSL 종료
- **보안**: **중요 - ALB는 CloudFront IP 범위에서만 트래픽을 수락**
- **기능**:
  - ECS 서비스에 대한 상태 확인
  - 경로 기반 라우팅 (/api/* → 백엔드, /ws/* → WebSocket)
  - CloudFront 관리 접두사 목록으로 구성된 보안 그룹
  - S3로의 액세스 로깅
  - **모든 사용자 트래픽 (HTTP/WebSocket)은 CloudFront를 통해 흘러야 함**

### 4. 백엔드 서비스 (ECS Fargate)

#### **Express.js Application Server**
- **런타임**: TypeScript를 사용한 Node.js 20
- **아키텍처**: 마이크로서비스 지향 설계
- **핵심 구성 요소**:
  - 세션 관리를 위한 REST API 엔드포인트
  - 실시간 통신을 위한 WebSocket 서버
  - 로깅, 오류 처리 및 보안을 위한 미들웨어

#### **핵심 서비스 구성 요소**

##### **ConversationOrchestrator**
- **목적**: AI 대화를 위한 중앙 조정자
- **책임**:
  - 메시지 라우팅 및 페르소나 선택
  - 자연스러운 대화 흐름을 위한 오디오 큐 관리
  - 실시간 응답 스트리밍
  - 반복적 대화 관리

##### **PersonaManager & PersonaAgent**
- **목적**: AI 페르소나 정의 및 행동 관리
- **기능**:
  - 사용자 정의 페르소나 생성 및 관리
  - 페르소나별 대화 컨텍스트
  - 콘텐츠 분석 기반 동적 페르소나 선택

##### **RoutingAgent**
- **목적**: 사용자 메시지를 적절한 페르소나로 지능적 라우팅
- **기술**: 의사결정을 위해 Amazon Bedrock 사용
- **기능**:
  - 콘텐츠 분석 및 페르소나 관련성 점수 매기기
  - 대화 연속성 로직
  - 다중 페르소나 상호작용 조정

##### **SessionService**
- **목적**: 사용자 세션 및 대화 상태 관리
- **기능**:
  - 세션 생명주기 관리
  - 대화 기록 지속성
  - 사용자별 사용자 정의

##### **WebSocket Management**
- **구성 요소**: WebSocketServer, WebSocketController, SessionWebSocketManager
- **기능**:
  - 실시간 양방향 통신
  - 세션별 WebSocket 연결
  - 오디오 스트리밍 및 확인 프로토콜

### 5. AI/ML 서비스 통합

#### **Amazon Bedrock**
- **모델**: Claude 4 (us.anthropic.claude-sonnet-4-20250514-v1:0)
- **사용**:
  - AI 페르소나를 위한 대화 생성
  - 콘텐츠 분석 및 라우팅 결정
  - 컨텍스트 인식 응답 생성
- **구성**: 환경별 설정을 위한 Parameter Store를 통해

#### **Amazon Polly**
- **목적**: 음성 상호작용을 위한 텍스트 음성 변환
- **기능**:
  - 페르소나별 할당이 있는 다중 음성 옵션
  - 특정 페르소나를 위한 뉴스캐스터 말하기 스타일
  - 스트리밍 오디오 합성
  - 언어 인식 음성 선택

### 6. 구성 및 모니터링

#### **AWS Systems Manager Parameter Store**
- **목적**: 중앙 집중식 구성 관리
- **매개변수**:
  - LLM 모델 및 공급자 설정
  - Cognito 구성 세부사항
  - 환경별 설정

#### **CloudWatch Logs & Metrics**
- **기능**:
  - 모든 서비스에 대한 중앙 집중식 로깅
  - 성능 메트릭 및 모니터링
  - 오류 추적 및 알림
  - AI 서비스 사용량에 대한 사용자 정의 메트릭

## 데이터 플로우 패턴

### 1. 사용자 인증 플로우
```
User → CloudFront → Cognito User Pool → OAuth Flow → JWT Token → API Calls
```

### 2. 실시간 대화 플로우
```
User Message → WebSocket (via CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Response → Polly → Audio Stream → WebSocket (via CloudFront) → User
```

### 3. AI 처리 파이프라인
```
User Input → Content Analysis → Persona Selection → Context Building → LLM Request → Response Generation → Audio Synthesis → Queue Management → Delivery
```

## 보안 아키텍처

### 네트워크 보안
- **WAF 통합**: CloudFront 통합 웹 애플리케이션 방화벽
- **VPC 보안**: 백엔드 서비스를 위한 프라이빗 서브넷
- **보안 그룹**: 최소 권한 액세스 제어
- **ALB 제한**: CloudFront IP 범위 제한

### 데이터 보안
- **전송 중 암호화**: 모든 곳에서 HTTPS/TLS
- **저장 시 암호화**: S3 및 Parameter Store 암호화
- **비밀 관리**: 민감한 구성을 위한 Parameter Store
- **액세스 제어**: 최소 권한을 가진 IAM 역할

### 애플리케이션 보안
- **인증**: Cognito 기반 OAuth 2.0/OIDC
- **권한 부여**: JWT 토큰 검증
- **입력 검증**: 포괄적인 요청 검증
- **속도 제한**: API 및 WebSocket 연결 제한

## 확장성 및 성능

### 자동 확장
- **ECS Service**: CPU 및 메모리 기반 자동 확장 (1-10 작업)
- **ALB**: 트래픽 기반 자동 확장
- **CloudFront**: CDN을 위한 글로벌 엣지 로케이션

### 성능 최적화
- **캐싱**: 정적 자산을 위한 CloudFront 캐싱
- **오디오 스트리밍**: 즉시 재생을 위한 Base64 데이터 URL
- **연결 풀링**: 효율적인 WebSocket 연결 관리
- **지연 로딩**: 온디맨드 서비스 초기화

### 고가용성
- **다중 AZ 배포**: VPC가 여러 가용 영역에 걸쳐 있음
- **상태 확인**: ECS 서비스에 대한 ALB 상태 모니터링
- **우아한 성능 저하**: 서비스 장애에 대한 폴백 메커니즘

## 기술 스택 요약

### 프론트엔드
- **프레임워크**: TypeScript를 사용한 React 18
- **빌드 도구**: Vite
- **스타일링**: 반응형 디자인을 사용한 현대적인 CSS
- **상태 관리**: React Context API
- **인증**: OIDC Client
- **실시간**: WebSocket API

### 백엔드
- **런타임**: Node.js 20
- **프레임워크**: Express.js
- **언어**: TypeScript
- **WebSocket**: ws 라이브러리
- **로깅**: Winston
- **테스팅**: Jest

### 인프라
- **오케스트레이션**: AWS CDK (TypeScript)
- **컴퓨팅**: ECS Fargate
- **스토리지**: S3
- **CDN**: CloudFront
- **데이터베이스**: 인메모리 상태 관리
- **구성**: Parameter Store

### AI/ML
- **LLM**: Amazon Bedrock (Claude 4)
- **TTS**: Amazon Polly
- **콘텐츠 분석**: LLM 통합을 사용한 사용자 정의 서비스

## 배포 아키텍처

### 환경 전략
- **개발**: 백엔드 포트 3000을 사용한 로컬 개발
- **프로덕션**: CloudFront를 사용한 CDK 배포 인프라

### CI/CD 파이프라인
- **프론트엔드**: Vite 빌드 → S3 배포 → CloudFront 무효화
- **백엔드**: Docker 빌드 → ECR → ECS 서비스 업데이트
- **인프라**: CDK diff → 배포 → 검증

### 구성 관리
- **환경 변수**: 컨테이너 수준 구성
- **비밀**: Parameter Store 통합
- **기능 플래그**: 환경 기반 활성화

## 모니터링 및 관찰 가능성

### 로깅 전략
- **중앙 집중식**: 모든 로그가 CloudWatch로 흐름
- **구조화**: JSON 형식의 로그 항목
- **상관관계**: 추적을 위한 요청 ID
- **레벨**: Debug, Info, Warn, Error 분류

### 메트릭 및 알람
- **애플리케이션 메트릭**: 응답 시간, 오류율
- **인프라 메트릭**: CPU, 메모리, 네트워크 사용률
- **비즈니스 메트릭**: 대화 완료율, 페르소나 사용량
- **사용자 정의 알람**: 사전 예방적 문제 감지

### 상태 모니터링
- **상태 엔드포인트**: 서비스 상태를 위한 /health
- **종속성 확인**: 외부 서비스 연결성
- **우아한 성능 저하**: 폴백 동작 모니터링

## 향후 아키텍처 고려사항

### 확장성 개선
- **데이터베이스 통합**: 영구 스토리지를 위한 RDS 고려
- **캐싱 계층**: 세션 상태를 위한 Redis/ElastiCache
- **마이크로서비스**: 추가 서비스 분해

### AI/ML 개선
- **모델 미세 조정**: 사용자 정의 모델 훈련
- **A/B 테스팅**: 다중 모델 비교
- **대화 분석**: 고급 사용량 인사이트

### 보안 개선
- **WAF 규칙**: 향상된 공격 보호
- **API Gateway**: 고급 기능을 위한 마이그레이션 고려
- **규정 준수**: SOC 2, GDPR 고려사항

이 아키텍처는 향후 개선 및 성장을 위한 유연성을 유지하면서 Group Chat AI 플랫폼을 위한 견고하고 확장 가능하며 안전한 기반을 제공합니다.