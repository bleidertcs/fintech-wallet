# Auth Service (NestJS) 🔐

Microservicio de Autenticación, Gestión de Identidades y Seguridad 2FA del sistema **FinTech Wallet**, desarrollado sobre **NestJS 11 + TypeScript + Prisma ORM + pnpm + OpenTelemetry**.

---

## 🚀 Arquitectura y Características

- **Arquitectura Hexagonal (Ports & Adapters)**: Separación estricta entre Dominio, Casos de Uso (Aplicación), Adaptadores de Inbound (REST) y Outbound (Prisma, Redis, HTTP Client, Nodemailer).
- **Seguridad**:
  - JWT (JSON Web Tokens) firmado con algoritmo HS256.
  - Hashing seguro de contraseñas mediante `bcrypt` (12 salt rounds).
  - Autenticación de Dos Factores (2FA/TOTP) compatible con Google Authenticator y Microsoft Authenticator (`otpauth`).
- **Token Blacklist**: Revocación instantánea de JWTs al cerrar sesión mediante almacenamiento de alta velocidad en **Redis**.
- **Verificación de Email**: Envío de correos de activación vía **Nodemailer** y **Mailpit** (SMTP local).
- **Comunicación Inter-Servicio**: Creación automática del perfil financiero en `user-service` vía HTTP REST al registrar un usuario.
- **Documentación OpenAPI / Swagger UI**: Disponible en vivo en `/auth/docs`.
- **Observabilidad SigNoz & OpenTelemetry**:
  - **Trazas OTLP**: Instrumentación de endpoints HTTP y consultas Prisma (`/v1/traces`).
  - **Logs Winston OTLP**: Envíos estructurados en JSON (`/v1/logs`) con correlación por `trace_id` y atributos nativos de K8s (`k8s.pod.name`, `k8s.namespace.name`, etc.).
  - Métricas OTLP (`/v1/metrics`) enviando throughput, latencia y uso de recursos del sistema.

---

## 📁 Arquitectura de Carpetas (Hexagonal / Ports & Adapters)

```text
backend-nestjs/auth-service/
├── prisma/
│   └── schema.prisma             # Esquema Prisma ORM (Base de datos PostgreSQL authdb)
├── src/
│   ├── adapters/                 # Adaptadores Hexagonales (Interface Adapters)
│   │   ├── inbound/              # Adaptadores de Entrada (Driving / Primary)
│   │   │   └── rest/             # Controladores REST HTTP (AuthController, DTOs de validación)
│   │   └── outbound/             # Adaptadores de Salida (Driven / Secondary)
│   │       ├── email/            # Envíos de correo vía Nodemailer / Mailpit
│   │       ├── persistence/      # Repositorio de persistencia Prisma ORM
│   │       └── redis/            # Revocación de JWT Blacklist y Caché TOTP en Redis
│   ├── application/              # Casos de Uso y Servicios de Aplicación
│   │   └── use-cases/            # AuthUseCases (Registro, Login, 2FA/TOTP, Verificación de Email)
│   ├── domain/                   # Dominio Principal (Core de Negocio)
│   │   ├── entities/             # Entidad User
│   │   ├── ports/                # Contratos e Interfaces de Puertos Inbound & Outbound
│   │   │   ├── inbound/          # AuthServicePort
│   │   │   └── outbound/         # UserRepositoryPort, TokenServicePort, EmailServicePort, CacheServicePort
│   │   └── value-objects/        # Objetos de Valor (Email VO)
│   ├── infrastructure/           # Infraestructura Tecnológica
│   │   ├── config/               # Validación de variables de entorno (.env)
│   │   ├── security/             # Utilidades de seguridad (JWT, BCrypt Hashing, TOTP)
│   │   └── telemetry/            # OpenTelemetry (Trazas OTLP, Métricas y Winston OTLP Logs)
│   ├── app.module.ts             # Módulo Raíz de NestJS
│   ├── auth.module.ts            # Módulo de Autenticación y Inyección de Dependencias
│   └── main.ts                   # Bootstrap de la aplicación y configuración Swagger UI (/auth/docs)
├── test/                         # Pruebas Unitarias y E2E (Jest & Supertest)
├── .dockerignore                 # Exclusiones del contexto de construcción Docker
├── .gitignore                    # Reglas del control de versiones Git
├── Dockerfile                    # Construcción Multi-Stage optimizada para producción (Node 22 Alpine)
├── package.json                  # Dependencias y scripts del proyecto
└── README.md                     # Documentación oficial del microservicio
```

---

## 🛠️ Requisitos Previos

- **Node.js**: `>= 20.x`
- **pnpm**: `>= 9.x`
- **PostgreSQL**: `>= 15.x` (Base de datos `authdb`)
- **Redis**: `>= 7.x` (Puerto `6379`)
- **Mailpit**: Servidor SMTP de desarrollo (Puerto `1025`)

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz de `backend-nestjs/auth-service`:

```env
PORT=3001
NODE_ENV=development

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/authdb"

# Cache & Revocación JWT (Redis)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Servidor de Correo SMTP (Mailpit)
MAIL_HOST="localhost"
MAIL_PORT=1025
MAIL_FROM="noreply@fintechwallet.com"

# Seguridad JWT
JWT_SECRET="fintech-super-secret-jwt-key-2026"

# Microservicio de Perfiles
USER_SERVICE_URL="http://localhost:3002"

# Telemetría SigNoz / OpenTelemetry Collector
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
OTEL_SERVICE_NAME="auth-service"
```

---

## 🗄️ Base de Datos y Prisma ORM

```bash
# 1. Instalar dependencias
pnpm install

# 2. Generar el cliente de Prisma
pnpm dlx prisma generate

# 3. Aplicar esquemas y migraciones a la base de datos PostgreSQL (authdb)
pnpm dlx prisma db push
```

---

## 🏃 Modos de Ejecución

### 1. Desarrollo Local (Standalone)
```bash
# Ejecutar con recarga en vivo (Hot Reload)
pnpm start:dev
```
- El microservicio iniciará en `http://localhost:3001`.
- Swagger UI disponible en: **`http://localhost:3001/auth/docs`** o `http://localhost:3001/api-docs`.

### 2. Producción Local
```bash
# Compilar proyecto TypeScript a JavaScript
pnpm run build

# Ejecutar el build de producción
pnpm start:prod
```

### 3. En Kubernetes con Podman
```bash
# Construir imagen con Podman
podman build -f Containerfile -t fintech/auth-service:1.0.0 .

# Reiniciar deployment en Kubernetes
kubectl rollout restart deployment/auth-service -n fintech
```
- Swagger UI accesible mediante Ingress en: **`http://localhost/auth/docs/`**

---

## 🧪 Guía de Pruebas e Interacción (API REST)

### 1. Registrar Nuevo Usuario (`POST /auth/register`)
Dispara la creación del usuario en `authdb` y sincroniza el perfil con `user-service`.
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@fintech.com",
    "password": "Password123!",
    "name": "Usuario de Prueba"
  }'
```

### 2. Iniciar Sesión (`POST /auth/login`)
Retorna el token JWT en caso de credenciales válidas.
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@fintech.com",
    "password": "Password123!"
  }'
```

### 3. Obtener Usuario Autenticado (`GET /auth/me`)
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer <TU_JWT_TOKEN>"
```

### 4. Configurar Autenticación 2FA/TOTP (`POST /auth/setup-totp`)
Genera la clave secreta y el código QR para enrolar en Google Authenticator.
```bash
curl -X POST http://localhost:3001/auth/setup-totp \
  -H "Authorization: Bearer <TU_JWT_TOKEN>"
```

### 5. Confirmar y Activar 2FA (`POST /auth/enable-totp`)
```bash
curl -X POST http://localhost:3001/auth/enable-totp \
  -H "Authorization: Bearer <TU_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "totpCode": "123456"
  }'
```

### 6. Health Check (`GET /health`)
```bash
curl -X GET http://localhost:3001/health
```

---

## 📊 Integración con SigNoz & Observabilidad

El microservicio utiliza auto-instrumentación de OpenTelemetry al arrancar:
- **Trazas**: Cada solicitud HTTP genera un tramo (`span`) rastreable en SigNoz APM.
- **Logs Contextuales**: Los logs generados por `winston` se envían vía OTLP HTTP directamente a SigNoz con etiquetas de pod (`k8s.pod.name`, `k8s.namespace.name`, `service.name=auth-service`).
