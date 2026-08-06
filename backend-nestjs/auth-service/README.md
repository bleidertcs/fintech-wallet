# Auth Service (NestJS) 🔐

Microservicio de Autenticación y Gestión de Identidades del sistema **FinTech Wallet**, migrado desde Java Spring Boot a **NestJS 11 + TypeScript + Prisma + pnpm**.

---

## 🚀 Arquitectura & Características

- **Arquitectura Hexagonal (Ports & Adapters)**: Separación estricta entre Dominio, Casos de Uso (Aplicación), Adaptadores de Inbound (REST) y Outbound (Prisma, Redis, HTTP, Nodemailer).
- **Seguridad**: JWT (JSON Web Tokens) + Hashing de contraseñas con `bcrypt` (12 salt rounds) + Soporte 2FA/TOTP (`otpauth`).
- **Token Blacklist**: Revocación instantánea de tokens JWT en **Redis**.
- **Comprobación de Email**: Envío de correos de activación vía **Nodemailer** y **Mailpit**.
- **Integración Inter-Servicio**: Comunicación REST resiliente hacia `user-service` para la creación automática del perfil financiero tras el registro.
- **Observabilidad SigNoz & OpenTelemetry**:
  - Trazas OTLP (`/v1/traces`)
  - Logs contextuales Winston OTLP (`/v1/logs`) con correlación por `trace_id` y metadatos nativos de Kubernetes.
  - Métricas OTLP (`/v1/metrics`) enviando throughput, latencia y uso de recursos del sistema.

---

## 🛠️ Requisitos e Instalación

### Requisitos Prerequisito
- Node.js >= 20.x
- pnpm >= 9.x
- MySQL 8.x (`authdb`)
- Redis >= 7.x
- Mailpit (Servidor SMTP de pruebas)

### Instalación de Dependencias
```bash
cd backend-nestjs/auth-service
pnpm install
```

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del microservicio con la siguiente configuración:

```env
PORT=3001
NODE_ENV=development

# Base de Datos (MySQL)
DATABASE_URL="mysql://root:12345@localhost:3306/authdb"

# Cache & Revocación JWT (Redis)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Servidor de Correo (SMTP)
MAIL_HOST="localhost"
MAIL_PORT=1025
MAIL_FROM="noreply@fintechwallet.com"

# Seguridad JWT
JWT_SECRET="fintech-super-secret-jwt-key-2026"

# Microservicios Externos
USER_SERVICE_URL="http://localhost:3002"

# Telemetría SigNoz (OpenTelemetry)
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
OTEL_SERVICE_NAME="auth-service"
```

---

## 🗄️ Base de Datos y Prisma

Generación del cliente de Prisma y migraciones de `authdb`:

```bash
# Generar Cliente de Prisma
pnpm dlx prisma generate

# Aplicar schema a la base de datos MySQL (authdb)
pnpm dlx prisma db push
```

---

## 🏃 Modo de Ejecución Individual (Standalone)

```bash
# Desarrollo con recarga en vivo (Watch Mode)
pnpm start:dev

# Compilación para producción
pnpm run build

# Ejecución en producción
pnpm start:prod
```

---

## 🧪 Pruebas e Interacción (Endpoints REST)

Una vez iniciado en `http://localhost:3001`, puedes probar el servicio con cURL:

### 1. Registro de Usuario (`POST /auth/register`)
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@fintech.com",
    "password": "Password123!",
    "name": "Juan Perez"
  }'
```
*Respuesta:* Retorna los datos del usuario registrado y dispara la llamada HTTP hacia `user-service` para crear su saldo inicial.

### 2. Inicio de Sesión (`POST /auth/login`)
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@fintech.com",
    "password": "Password123!"
  }'
```
*Respuesta:* Retorna el token JWT bearer de autenticación.

### 3. Información del Usuario Autenticado (`GET /auth/me`)
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer <TU_JWT_TOKEN>"
```

### 4. Health Check (`GET /health`)
```bash
curl -X GET http://localhost:3001/health
```

---

## 🐳 Despliegue en Docker / Kubernetes

### Construcción de Imagen con `nerdctl`
```bash
nerdctl --namespace k8s.io build -t fintech/auth-service:nestjs .
```

### Manifiestos de Kubernetes
El microservicio está configurado en `k8s/02-microservices.yaml`:
- **Puerto de Contenedor**: 3001
- **Health Probes**: `/health` (Liveness, Readiness, Startup)
- **Recursos**: 128Mi RAM request / 256Mi RAM limit
