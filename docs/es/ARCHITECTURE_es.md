# Group Chat AI - Arquitectura del Sistema

> • 🇺🇸 **This document is also available in:** [English](../ARCHITECTURE.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./ARCHITECTURE_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./ARCHITECTURE_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](#)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./ARCHITECTURE_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./ARCHITECTURE_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./ARCHITECTURE_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./ARCHITECTURE_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./ARCHITECTURE_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./ARCHITECTURE_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./ARCHITECTURE_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./ARCHITECTURE_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./ARCHITECTURE_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./ARCHITECTURE_zh.md)


## Descripción General

Group Chat AI es una plataforma sofisticada de IA conversacional en tiempo real que permite a los usuarios participar en discusiones colaborativas con múltiples personas de IA. El sistema aprovecha los servicios en la nube de AWS para ofrecer una solución escalable, segura y de alto rendimiento con interacciones de voz y texto en tiempo real para conversaciones grupales.

## Diagramas de Arquitectura

### Arquitectura del Sistema de Alto Nivel
![Group Chat AI System Architecture](ARCHITECTURE.png)

## Componentes del Sistema

### 1. Capa de Frontend

#### **CloudFront Distribution**
- **Propósito**: Red de entrega de contenido global para rendimiento óptimo
- **Características**:
  - Almacenamiento en caché de activos estáticos (compilación de aplicación React)
  - Enrutamiento de solicitudes API al ALB del backend
  - Proxy de conexiones WebSocket para comunicación en tiempo real
  - Restricciones geográficas y políticas de seguridad
  - Soporte de dominio personalizado con certificados ACM

#### **S3 Static Hosting**
- **Propósito**: Sirve los artefactos de compilación de la aplicación React
- **Contenido**:
  - Paquetes HTML, CSS, JavaScript
  - Activos estáticos (imágenes, fuentes, archivos de localización)
  - Archivos de configuración dinámica (config.json para configuraciones específicas del entorno)

#### **React Frontend Application**
- **Tecnología**: React 18 con TypeScript, sistema de compilación Vite
- **Características**:
  - Comunicación WebSocket en tiempo real
  - Capacidades de entrada/salida de voz
  - Internacionalización multiidioma
  - Diseño responsivo con componentes de UI modernos
  - Carga y procesamiento de imágenes

### 2. Autenticación y Autorización

#### **Amazon Cognito User Pool**
- **Propósito**: Autenticación y gestión de usuarios centralizada
- **Características**:
  - Integración OAuth 2.0 / OpenID Connect
  - Registro y verificación basados en email
  - Políticas de contraseñas y recuperación de cuentas
  - Integración con frontend a través del flujo OIDC

#### **User Pool Client**
- **Configuración**:
  - Flujo Authorization Code Grant
  - URLs de callback para entornos de desarrollo y producción
  - Ámbitos: openid, email, profile
  - Períodos de validez de tokens optimizados para seguridad

### 3. Infraestructura de Red

#### **VPC (Virtual Private Cloud)**
- **Diseño**: Despliegue Multi-AZ para alta disponibilidad
- **Subredes**:
  - **Subredes Públicas**: Alojan ALB y NAT Gateway
  - **Subredes Privadas**: Alojan tareas ECS Fargate para seguridad

#### **Application Load Balancer (ALB)**
- **Propósito**: Distribución de tráfico HTTP/HTTPS y terminación SSL
- **Seguridad**: **CRÍTICO - ALB acepta tráfico SOLO desde rangos IP de CloudFront**
- **Características**:
  - Verificaciones de salud para servicios ECS
  - Enrutamiento basado en rutas (/api/* → backend, /ws/* → WebSocket)
  - Grupos de seguridad configurados con listas de prefijos gestionadas por CloudFront
  - Registro de acceso a S3
  - **Todo el tráfico de usuario (HTTP/WebSocket) debe fluir a través de CloudFront**

### 4. Servicios Backend (ECS Fargate)

#### **Express.js Application Server**
- **Runtime**: Node.js 20 con TypeScript
- **Arquitectura**: Diseño orientado a microservicios
- **Componentes Principales**:
  - Endpoints de API REST para gestión de sesiones
  - Servidor WebSocket para comunicación en tiempo real
  - Middleware para logging, manejo de errores y seguridad

#### **Componentes de Servicios Principales**

##### **ConversationOrchestrator**
- **Propósito**: Coordinador central para conversaciones de IA
- **Responsabilidades**:
  - Enrutamiento de mensajes y selección de personas
  - Gestión de cola de audio para flujo de conversación natural
  - Transmisión de respuestas en tiempo real
  - Gestión de conversaciones iterativas

##### **PersonaManager & PersonaAgent**
- **Propósito**: Gestiona definiciones y comportamientos de personas de IA
- **Características**:
  - Creación y gestión de personas personalizadas
  - Contextos de conversación específicos de personas
  - Selección dinámica de personas basada en análisis de contenido

##### **RoutingAgent**
- **Propósito**: Enrutamiento inteligente de mensajes de usuario a personas apropiadas
- **Tecnología**: Utiliza Amazon Bedrock para toma de decisiones
- **Características**:
  - Análisis de contenido y puntuación de relevancia de personas
  - Lógica de continuación de conversación
  - Orquestación de interacción multi-persona

##### **SessionService**
- **Propósito**: Gestiona sesiones de usuario y estado de conversación
- **Características**:
  - Gestión del ciclo de vida de sesiones
  - Persistencia del historial de conversaciones
  - Personalizaciones específicas del usuario

##### **WebSocket Management**
- **Componentes**: WebSocketServer, WebSocketController, SessionWebSocketManager
- **Características**:
  - Comunicación bidireccional en tiempo real
  - Conexiones WebSocket específicas de sesión
  - Protocolos de transmisión de audio y reconocimiento

### 5. Integración de Servicios AI/ML

#### **Amazon Bedrock**
- **Modelos**: Claude 4 (anthropic.claude-sonnet-4-5-20250929-v1:0)
- **Uso**:
  - Generación de conversaciones para personas de IA
  - Análisis de contenido y decisiones de enrutamiento
  - Generación de respuestas conscientes del contexto
- **Configuración**: A través de Parameter Store para configuraciones específicas del entorno

#### **Amazon Polly**
- **Propósito**: Conversión de texto a voz para interacciones de voz
- **Características**:
  - Múltiples opciones de voz con asignaciones específicas de personas
  - Estilo de habla de locutor para ciertas personas
  - Síntesis de audio en streaming
  - Selección de voz consciente del idioma

### 6. Configuración y Monitoreo

#### **AWS Systems Manager Parameter Store**
- **Propósito**: Gestión de configuración centralizada
- **Parámetros**:
  - Configuraciones de modelo LLM y proveedor
  - Detalles de configuración de Cognito
  - Configuraciones específicas del entorno

#### **CloudWatch Logs & Metrics**
- **Características**:
  - Logging centralizado para todos los servicios
  - Métricas de rendimiento y monitoreo
  - Seguimiento de errores y alertas
  - Métricas personalizadas para uso de servicios de IA

## Patrones de Flujo de Datos

### 1. Flujo de Autenticación de Usuario
```
Usuario → CloudFront → Cognito User Pool → OAuth Flow → JWT Token → API Calls
```

### 2. Flujo de Conversación en Tiempo Real
```
Mensaje de Usuario → WebSocket (vía CloudFront) → ALB → ConversationOrchestrator → RoutingAgent → PersonaAgent → Bedrock → Respuesta → Polly → Audio Stream → WebSocket (vía CloudFront) → Usuario
```

### 3. Pipeline de Procesamiento de IA
```
Entrada de Usuario → Análisis de Contenido → Selección de Persona → Construcción de Contexto → Solicitud LLM → Generación de Respuesta → Síntesis de Audio → Gestión de Cola → Entrega
```

## Arquitectura de Seguridad

### Seguridad de Red
- **Integración WAF**: Web Application Firewall integrado con CloudFront
- **Seguridad VPC**: Subredes privadas para servicios backend
- **Grupos de Seguridad**: Control de acceso de menor privilegio
- **Restricciones ALB**: Limitaciones de rango IP de CloudFront

### Seguridad de Datos
- **Cifrado en Tránsito**: HTTPS/TLS en todas partes
- **Cifrado en Reposo**: Cifrado de S3 y Parameter Store
- **Gestión de Secretos**: Parameter Store para configuración sensible
- **Control de Acceso**: Roles IAM con permisos mínimos

### Seguridad de Aplicación
- **Autenticación**: OAuth 2.0/OIDC basado en Cognito
- **Autorización**: Validación de tokens JWT
- **Validación de Entrada**: Validación integral de solicitudes
- **Limitación de Velocidad**: Límites de API y conexiones WebSocket

## Escalabilidad y Rendimiento

### Auto Scaling
- **Servicio ECS**: Auto scaling basado en CPU y memoria (1-10 tareas)
- **ALB**: Escalado automático basado en tráfico
- **CloudFront**: Ubicaciones de borde globales para CDN

### Optimizaciones de Rendimiento
- **Almacenamiento en Caché**: Caché de CloudFront para activos estáticos
- **Transmisión de Audio**: URLs de datos Base64 para reproducción inmediata
- **Agrupación de Conexiones**: Gestión eficiente de conexiones WebSocket
- **Carga Perezosa**: Inicialización de servicios bajo demanda

### Alta Disponibilidad
- **Despliegue Multi-AZ**: VPC abarca múltiples zonas de disponibilidad
- **Verificaciones de Salud**: Monitoreo de salud ALB para servicios ECS
- **Degradación Elegante**: Mecanismos de respaldo para fallos de servicio

## Resumen de Stack Tecnológico

### Frontend
- **Framework**: React 18 con TypeScript
- **Herramienta de Compilación**: Vite
- **Estilos**: CSS moderno con diseño responsivo
- **Gestión de Estado**: React Context API
- **Autenticación**: OIDC Client
- **Tiempo Real**: WebSocket API

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Lenguaje**: TypeScript
- **WebSocket**: librería ws
- **Logging**: Winston
- **Testing**: Jest

### Infraestructura
- **Orquestación**: AWS CDK (TypeScript)
- **Cómputo**: ECS Fargate
- **Almacenamiento**: S3
- **CDN**: CloudFront
- **Base de Datos**: Gestión de estado en memoria
- **Configuración**: Parameter Store

### AI/ML
- **LLM**: Amazon Bedrock (Claude 4)
- **TTS**: Amazon Polly
- **Análisis de Contenido**: Servicio personalizado con integración LLM

## Arquitectura de Despliegue

### Estrategia de Entornos
- **Desarrollo**: Desarrollo local con puerto backend 3000
- **Producción**: Infraestructura desplegada con CDK con CloudFront

### Pipeline CI/CD
- **Frontend**: Compilación Vite → Despliegue S3 → Invalidación CloudFront
- **Backend**: Compilación Docker → ECR → Actualización servicio ECS
- **Infraestructura**: CDK diff → Deploy → Verificación

### Gestión de Configuración
- **Variables de Entorno**: Configuración a nivel de contenedor
- **Secretos**: Integración Parameter Store
- **Feature Flags**: Habilitación basada en entorno

## Monitoreo y Observabilidad

### Estrategia de Logging
- **Centralizado**: Todos los logs fluyen a CloudWatch
- **Estructurado**: Entradas de log con formato JSON
- **Correlación**: IDs de solicitud para trazabilidad
- **Niveles**: Clasificación Debug, Info, Warn, Error

### Métricas y Alarmas
- **Métricas de Aplicación**: Tiempos de respuesta, tasas de error
- **Métricas de Infraestructura**: Utilización de CPU, memoria, red
- **Métricas de Negocio**: Tasas de finalización de conversación, uso de personas
- **Alarmas Personalizadas**: Detección proactiva de problemas

### Monitoreo de Salud
- **Endpoints de Salud**: /health para estado del servicio
- **Verificaciones de Dependencias**: Conectividad de servicios externos
- **Degradación Elegante**: Monitoreo de comportamiento de respaldo

## Consideraciones Futuras de Arquitectura

### Mejoras de Escalabilidad
- **Integración de Base de Datos**: Considerar RDS para almacenamiento persistente
- **Capa de Caché**: Redis/ElastiCache para estado de sesión
- **Microservicios**: Mayor descomposición de servicios

### Mejoras AI/ML
- **Ajuste Fino de Modelos**: Entrenamiento de modelos personalizados
- **Pruebas A/B**: Comparación de múltiples modelos
- **Análisis de Conversaciones**: Insights avanzados de uso

### Mejoras de Seguridad
- **Reglas WAF**: Protección mejorada contra ataques
- **API Gateway**: Considerar migración para características avanzadas
- **Cumplimiento**: Consideraciones SOC 2, GDPR

Esta arquitectura proporciona una base robusta, escalable y segura para la plataforma Group Chat AI mientras mantiene flexibilidad para futuras mejoras y crecimiento.