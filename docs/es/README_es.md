# Group Chat AI - Conversaciones Colaborativas con IA

> • 🇺🇸 **This document is also available in:** [English](../README.md)
> • 🇸🇦 **هذا المستند متوفر أيضاً بـ:** [العربية](./README_ar.md)
> • 🇩🇪 **Dieses Dokument ist auch verfügbar in:** [Deutsch](./README_de.md)
> • 🇪🇸 **Este documento también está disponible en:** [Español](#)
> • 🇫🇷 **Ce document est également disponible en:** [Français](./README_fr.md)
> • 🇮🇱 **מסמך זה זמין גם ב:** [עברית](./README_he.md)
> • 🇮🇹 **Questo documento è disponibile anche in:** [Italiano](./README_it.md)
> • 🇯🇵 **この文書は以下の言語でもご利用いただけます:** [日本語](./README_ja.md)
> • 🇰🇷 **이 문서는 다음 언어로도 제공됩니다:** [한국어](./README_ko.md)
> • 🇳🇱 **Dit document is ook beschikbaar in:** [Nederlands](./README_nl.md)
> • 🇵🇹 **Este documento também está disponível em:** [Português](./README_pt.md)
> • 🇷🇺 **Этот документ также доступен на:** [Русский](./README_ru.md)
> • 🇸🇪 **Detta dokument är också tillgängligt på:** [Svenska](./README_sv.md)
> • 🇨🇳 **本文档还提供以下语言版本:** [中文](./README_zh.md)


Group Chat AI es una plataforma colaborativa avanzada que permite conversaciones grupales dinámicas con múltiples personas de IA. El sistema facilita discusiones significativas a través de diversas perspectivas, permitiendo a los usuarios explorar ideas, obtener retroalimentación y participar en conversaciones multi-participante con agentes de IA que representan diferentes roles y puntos de vista.

## 🏗️ Resumen de Arquitectura

```
Entrada del Usuario → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Models (Bedrock/OpenAI/Anthropic/Ollama)
```

### Características Principales

- **Conversaciones Multi-Persona**: Interactúa con múltiples personas de IA simultáneamente en discusiones grupales
- **Patrones de Interacción Dinámicos**: Flujo de conversación en tiempo real con turnos naturales y respuestas
- **Perspectivas Diversas**: Cada persona aporta puntos de vista únicos, experiencia y estilos de comunicación
- **Resolución Colaborativa de Problemas**: Trabaja a través de temas complejos con agentes de IA ofreciendo diferentes enfoques
- **Persistencia de Sesión**: Mantiene el contexto de conversación y consistencia de personas a través de sesiones
- **Personalización Flexible de Personas**: Crea y modifica personas de IA con descripciones en lenguaje natural
- **Soporte para Múltiples LLM**: Aprovecha varios modelos de lenguaje incluyendo AWS Bedrock, OpenAI, Anthropic y Ollama

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+ 
- npm 8+
- Docker (opcional, para containerización)
- AWS CLI (para despliegue)

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd group-chat-ai
   ```

2. **Instalar dependencias**
   ```bash
   npm run install:all
   ```

3. **Configurar variables de entorno**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Editar backend/.env con tu configuración
   
   # Frontend usará la configuración de proxy de Vite
   ```

4. **Construir paquete compartido**
   ```bash
   npm run build:shared
   ```

### Desarrollo

1. **Iniciar el servidor backend**
   ```bash
   npm run dev:backend
   ```
   Backend estará disponible en `http://localhost:3000`

2. **Iniciar el servidor de desarrollo frontend**
   ```bash
   npm run dev:frontend
   ```
   Frontend estará disponible en `http://localhost:3001`

3. **Probar la API**
   ```bash
   curl http://localhost:3000/health
   ```

## 📁 Estructura del Proyecto

```
group-chat-ai/
├── shared/                 # Tipos TypeScript compartidos y utilidades
│   ├── src/
│   │   ├── types/         # Definiciones de tipos comunes
│   │   ├── constants/     # Constantes de aplicación
│   │   └── utils/         # Funciones de utilidad compartidas
├── backend/               # Servidor API Express.js
│   ├── src/
│   │   ├── controllers/   # Manejadores de rutas API
│   │   ├── services/      # Servicios de lógica de negocio
│   │   ├── middleware/    # Middleware de Express
│   │   ├── config/        # Archivos de configuración
│   │   └── utils/         # Utilidades del backend
├── frontend/              # Aplicación React
│   ├── src/
│   │   ├── components/    # Componentes React reutilizables
│   │   ├── pages/         # Componentes de página
│   │   ├── services/      # Capa de servicio API
│   │   ├── hooks/         # Hooks personalizados de React
│   │   └── utils/         # Utilidades del frontend
├── infrastructure/        # Código de infraestructura AWS CDK
├── tests/                 # Archivos de prueba
└── documents/             # Documentación del proyecto
```

## 🔧 Scripts Disponibles

### Nivel Raíz
- `npm run install:all` - Instalar todas las dependencias
- `npm run build` - Construir todos los paquetes
- `npm run test` - Ejecutar todas las pruebas
- `npm run lint` - Lintear todos los paquetes

### Backend
- `npm run dev:backend` - Iniciar backend en modo desarrollo
- `npm run build:backend` - Construir backend
- `npm run test:backend` - Ejecutar pruebas del backend

### Frontend
- `npm run dev:frontend` - Iniciar servidor de desarrollo frontend
- `npm run build:frontend` - Construir frontend para producción
- `npm run test:frontend` - Ejecutar pruebas del frontend

### Personas e Internacionalización
- `npm run personas:generate` - Generar personas.json en inglés desde definiciones compartidas
- `npm run docs:translate` - Traducir toda la documentación a idiomas soportados
- `npm run docs:translate:single -- --lang es` - Traducir a idioma específico

## 🌐 Endpoints de API

### Verificación de Salud
- `GET /health` - Verificación básica de salud
- `GET /health/detailed` - Información detallada de salud

### Personas
- `GET /personas` - Obtener todas las personas disponibles
- `GET /personas/:personaId` - Obtener detalles de persona específica

### Sesiones
- `POST /sessions` - Crear nueva sesión de conversación
- `POST /sessions/:sessionId/messages` - Enviar mensaje y obtener respuestas
- `PUT /sessions/:sessionId/personas` - Actualizar personas de sesión
- `GET /sessions/:sessionId/summary` - Obtener resumen de sesión
- `DELETE /sessions/:sessionId` - Finalizar sesión
- `GET /sessions/:sessionId` - Obtener detalles de sesión

## 🤖 Integración de IA

El sistema soporta múltiples proveedores de LLM a través de una interfaz configurable:

- **OpenAI** (GPT-3.5/GPT-4)
- **Anthropic** (Claude)
- **AWS Bedrock** (Varios modelos)
- **Ollama** (Modelos locales)

Configurar vía variables de entorno:
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=500
```

### Modo de Desarrollo
En desarrollo, el sistema usa respuestas simuladas para simular interacciones de IA sin requerir claves API.

## 🎭 Personas

El sistema incluye diversas personas de IA que pueden ser personalizadas para varios escenarios de conversación grupal:

1. **Asesor Estratégico** - Planificación de alto nivel, visión y dirección estratégica
2. **Experto Técnico** - Conocimiento técnico profundo, detalles de implementación y soluciones
3. **Analista** - Perspectivas analíticas, investigación y conocimientos basados en datos
4. **Pensador Creativo** - Innovación, lluvia de ideas e ideas fuera de lo común
5. **Facilitador** - Gestión de discusiones, construcción de consenso y colaboración

### Estructura de Persona
Cada persona se define por solo 4 campos simples:
- **Nombre**: Nombre para mostrar (ej., "Asesor Estratégico")
- **Rol**: Identificador de rol corto (ej., "Estratega")
- **Detalles**: Descripción de texto libre incluyendo antecedentes, prioridades, preocupaciones y nivel de influencia
- **Selección de Avatar**: Representación visual de opciones de avatar disponibles

### Personalización de Personas
- **Editar Personas Predeterminadas**: Modificar los detalles de cualquier persona predeterminada en lenguaje natural
- **Crear Personas Personalizadas**: Construir personas completamente personalizadas con tus propias descripciones
- **Persistencia de Sesión**: Todas las personalizaciones de personas persisten a través de sesiones del navegador
- **Importar/Exportar**: Guardar y compartir configuraciones de personas vía archivos JSON
- **Interfaz Basada en Mosaicos**: Selección visual de mosaicos con capacidades de edición completas

### Implementación Técnica
Cada persona mantiene:
- Contexto de conversación aislado para respuestas auténticas
- Procesamiento de lenguaje natural del campo de detalles para generación de prompts de IA
- Patrones de respuesta específicos del rol basados en características descritas
- Toma de turnos inteligente para flujo de conversación grupal natural

## 🌐 Internacionalización y Gestión de Personas

### Flujo de Trabajo de Definición de Personas
1. **Fuente de Verdad**: Todas las definiciones de personas se mantienen en `shared/src/personas/index.ts`
2. **Generación**: Ejecutar `npm run personas:generate` para crear archivo de traducción `personas.json` en inglés
3. **Traducción**: Usar scripts de traducción existentes para generar archivos de personas localizados

### Proceso de Traducción de Personas
```bash
# 1. Actualizar definiciones de personas en paquete compartido
vim shared/src/personas/index.ts

# 2. Generar personas.json en inglés desde definiciones compartidas
npm run personas:generate

# 3. Traducir personas a todos los idiomas soportados
npm run docs:translate  # Traduce todos los archivos incluyendo personas.json
# O traducir a idioma específico
npm run docs:translate:single -- --lang es

# 4. Reconstruir paquete compartido si es necesario
npm run build:shared
```

### Estructura de Archivos de Traducción
- **Fuente**: `shared/src/personas/index.ts` (Definiciones TypeScript)
- **Generado**: `frontend/public/locales/en/personas.json` (i18n en inglés)
- **Traducido**: `frontend/public/locales/{lang}/personas.json` (Versiones localizadas)

### Idiomas Soportados
El sistema soporta 14 idiomas para personas y documentación:
- 🇺🇸 English (en) - Idioma fuente
- 🇸🇦 العربية (ar) - Árabe
- 🇩🇪 Deutsch (de) - Alemán
- 🇪🇸 Español (es) - Español
- 🇫🇷 Français (fr) - Francés
- 🇮🇱 עברית (he) - Hebreo
- 🇮🇹 Italiano (it) - Italiano
- 🇯🇵 日本語 (ja) - Japonés
- 🇰🇷 한국어 (ko) - Coreano
- 🇳🇱 Nederlands (nl) - Holandés
- 🇵🇹 Português (pt) - Portugués
- 🇷🇺 Русский (ru) - Ruso
- 🇸🇪 Svenska (sv) - Sueco
- 🇨🇳 中文 (zh) - Chino

### Agregar Nuevas Personas
1. Agregar definición de persona a `shared/src/personas/index.ts`
2. Ejecutar `npm run personas:generate` para actualizar traducciones en inglés
3. Ejecutar scripts de traducción para generar versiones localizadas
4. La nueva persona estará disponible en todos los idiomas soportados

## 🔒 Características de Seguridad

- **Validación de Entrada**: Todas las entradas del usuario son validadas y sanitizadas
- **Aislamiento de Sesión**: Cada sesión mantiene contexto separado
- **Manejo de Errores**: Manejo elegante de errores con mensajes amigables para el usuario
- **Limitación de Velocidad**: Protección incorporada contra abuso
- **HTTPS**: Todas las comunicaciones encriptadas en producción

## 📊 Monitoreo y Observabilidad

- **Registro Estructurado**: Logs con formato JSON con Winston
- **Verificaciones de Salud**: Monitoreo integral de salud
- **Métricas**: Métricas de aplicación personalizadas
- **Seguimiento de Errores**: Registro y seguimiento detallado de errores

## 🚢 Despliegue

### Docker
```bash
# Construir imagen del backend
cd backend
npm run docker:build

# Ejecutar contenedor
npm run docker:run
```

### Despliegue en AWS
```bash
# Desplegar infraestructura
cd infrastructure
npm run deploy:dev # reemplazar :dev con staging o prod para esos entornos
```

## ⚠️ ¡Advertencia de Región de Despliegue!
Por defecto, el Modelo de Enrutamiento para Bedrock es OpenAI gpt-oss:20b (`openai.gpt-oss-20b-1:0`). El Modelo de Persona aprovecha Anthropic Claude 4 Sonnet (`anthropic.claude-sonnet-4-20250514-v1:0`). Por favor asegúrate de estar desplegando en una región que soporte ambos modelos, o configura modelos alternativos.

## 🧪 Pruebas

### Pruebas Unitarias
```bash
npm run test
```

### Pruebas de Integración
```bash
npm run test:integration
```

### Pruebas E2E
```bash
npm run test:e2e
```

## 📈 Objetivos de Rendimiento

- **Tiempo de Respuesta**: < 3 segundos para respuestas de personas
- **Disponibilidad**: 99.9% de disponibilidad de API
- **Concurrencia**: Soporte para 1000+ usuarios concurrentes
- **Conversaciones Grupales**: Hasta 5 personas por sesión con flujo de conversación natural

## 🤝 Contribuir

1. Hacer fork del repositorio
2. Crear una rama de característica
3. Hacer tus cambios
4. Agregar pruebas
5. Enviar un pull request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para detalles.