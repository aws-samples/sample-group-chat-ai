# Pitch Perfect - Práctica de Presentaciones Potenciada por IA

Pitch Perfect es un chatbot de grupo de enfoque potenciado por IA que crea un entorno simulado para que los profesionales practiquen y perfeccionen presentaciones críticas. El sistema permite a los usuarios recibir retroalimentación realista de personas de IA que representan diferentes perspectivas de stakeholders (CEO, CTO, CIO, CFO, CPO) sin la carga organizativa de organizar grupos de enfoque reales.

## 🏗️ Visión General de la Arquitectura

```
Entrada del Usuario → React Frontend → API Gateway → ConversationOrchestrator
                                              ↓
Session Manager ← PersonaAgent ← LLM Interface ← Language Model (Bedrock/OpenAI/Anthropic/Ollama)
```

### Características Principales

- **Simulación de Persona Potenciada por IA**: Múltiples personas de IA responden independientemente con prioridades distintas y estilos de comunicación
- **Entorno de Chat Interactivo**: Flujo de conversación en tiempo real con retroalimentación inmediata
- **Retroalimentación Específica por Rol**: Cada persona proporciona respuestas basadas en perspectiva (CEO se enfoca en estrategia, CFO en costos, etc.)
- **Procesamiento Secuencial**: Las personas responden una tras otra para dinámicas de reunión realistas
- **Gestión de Sesiones**: Conversaciones basadas en sesiones con limpieza automática y persistencia de persona
- **Configuración Simplificada de Persona**: Descripciones de persona en lenguaje natural en lugar de formularios complejos
- **Múltiples Proveedores de LLM**: Soporte para AWS Bedrock, OpenAI, Anthropic, y modelos Ollama locales

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
   cd ai-pitch-perfect
   ```

2. **Instalar dependencias**
   ```bash
   npm run install:all
   ```

3. **Configurar variables de entorno**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edita backend/.env con tu configuración
   
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
ai-pitch-perfect/
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
│   │   ├── hooks/         # Hooks React personalizados
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
- `npm run lint` - Lint de todos los paquetes

### Backend
- `npm run dev:backend` - Iniciar backend en modo desarrollo
- `npm run build:backend` - Construir backend
- `npm run test:backend` - Ejecutar pruebas del backend

### Frontend
- `npm run dev:frontend` - Iniciar servidor de desarrollo frontend
- `npm run build:frontend` - Construir frontend para producción
- `npm run test:frontend` - Ejecutar pruebas del frontend

## 🌐 Endpoints de la API

### Chequeo de Salud
- `GET /health` - Chequeo de salud básico
- `GET /health/detailed` - Información de salud detallada

### Personas
- `GET /personas` - Obtener todas las personas disponibles
- `GET /personas/:personaId` - Obtener detalles de persona específica

### Sesiones
- `POST /sessions` - Crear nueva sesión de conversación
- `POST /sessions/:sessionId/messages` - Enviar mensaje y obtener respuestas
- `PUT /sessions/:sessionId/personas` - Actualizar personas de sesión
- `GET /sessions/:sessionId/summary` - Obtener resumen de sesión
- `DELETE /sessions/:sessionId` - Terminar sesión
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

El sistema incluye 5 personas ejecutivas predefinidas con personalización simplificada y amigable:

1. **CEO** - Enfoque estratégico, ventaja competitiva, resultados de negocio
2. **CTO** - Viabilidad técnica, arquitectura, complejidad de implementación
3. **CFO** - Impacto financiero, ROI, implicaciones presupuestarias
4. **CIO** - Integración de sistemas, seguridad, infraestructura de TI
5. **CPO** - Estrategia de producto, experiencia de usuario, posicionamiento de mercado

### Estructura de Persona
Cada persona se define con solo 4 campos simples:
- **Nombre**: Nombre a mostrar (ej. "Chief Executive Officer")
- **Rol**: Identificador de rol corto (ej. "CEO")
- **Detalles**: Descripción de texto libre incluyendo antecedentes, prioridades, preocupaciones y nivel de influencia
- **Selección de Avatar**: Representación visual de opciones de avatar disponibles

### Personalización de Persona
- **Editar Personas Por Defecto**: Modificar detalles de cualquier persona por defecto en lenguaje natural
- **Crear Personas Personalizadas**: Construir personas completamente personalizadas con tus propias descripciones
- **Persistencia de Sesión**: Todas las personalizaciones de persona persisten a través de sesiones del navegador
- **Importar/Exportar**: Guardar y compartir configuraciones de persona vía archivos JSON
- **Interfaz Basada en Azulejos**: Selección visual de azulejos con capacidades de edición comprehensivas

### Implementación Técnica
Cada persona mantiene:
- Contexto de conversación aislado para respuestas auténticas
- Procesamiento de lenguaje natural del campo de detalles para generación de prompts de IA
- Patrones de respuesta específicos por rol basados en características descritas
- Procesamiento de respuesta secuencial para dinámicas de reunión realistas

## 🔒 Características de Seguridad

- **Validación de Entrada**: Todas las entradas de usuario son validadas y sanitizadas
- **Aislamiento de Sesión**: Cada sesión mantiene contexto separado
- **Manejo de Errores**: Manejo elegante de errores con mensajes amigables al usuario
- **Limitación de Velocidad**: Protección incorporada contra abuso
- **HTTPS**: Todas las comunicaciones encriptadas en producción

## 📊 Monitoreo y Observabilidad

- **Logging Estructurado**: Logs con formato JSON con Winston
- **Chequeos de Salud**: Monitoreo de salud comprehensivo
- **Métricas**: Métricas de aplicación personalizadas
- **Rastreo de Errores**: Logging y rastreo detallado de errores

## 🚢 Despliegue

### Docker
```bash
# Construir imagen del backend
cd backend
npm run docker:build

# Ejecutar contenedor
npm run docker:run
```

### Despliegue AWS
```bash
# Desplegar infraestructura
cd infrastructure
npm run deploy:dev
```

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

- **Tiempo de Respuesta**: < 3 segundos para respuestas de persona
- **Disponibilidad**: 99.9% disponibilidad API
- **Concurrencia**: Soporte para 1000+ usuarios concurrentes
- **Procesamiento Secuencial**: Hasta 5 personas por sesión con flujo de reunión realista

## 🤝 Contribuir

1. Fork del repositorio
2. Crear rama de característica
3. Hacer tus cambios
4. Añadir pruebas
5. Enviar pull request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para detalles.

## 🆘 Soporte

Para soporte y preguntas:
- Revisa la documentación en `/documents`
- Revisa el banco de memoria en `/memory-bank`
- Abre un issue en GitHub