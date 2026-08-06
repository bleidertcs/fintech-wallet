# User Service (NestJS) 👤

Microservicio de Gestión de Perfiles de Usuario, Saldos y Verificación KYC del sistema **FinTech Wallet**, migrado desde Java Spring Boot a **NestJS 11 + Hexagonal Architecture + gRPC + REST + Prisma + pnpm**.

---

## 🚀 Arquitectura & Características

- **Arquitectura Hexagonal (Ports & Adapters)**: Separación de responsabilidades entre Dominio, Servicios de Aplicación y Adaptadores Inbound/Outbound.
- **Doble Interfaz de Comunicación**:
  - **REST API** (Puerto `3002`): Endpoints HTTP para consultar perfiles, actualizar saldos y estado KYC.
  - **gRPC Server** (Puerto `50051`): Servidor RPC de alta velocidad mediante el contrato `user.proto` (`UserService.GetUserProfile`) para ser consumido por otros microservicios (como `transaction-service`).
- **Base de Datos Dedicada**: Persistencia en MySQL (`userdb.user_profiles`) mediante Prisma ORM.
- **Documentación Swagger / OpenAPI**: Disponible automáticamente en `http://localhost:3002/api-docs`.
- **Observabilidad SigNoz & OpenTelemetry**:
  - Trazas OTLP (`/v1/traces`)
  - Logs Winston OTLP (`/v1/logs`) con correlación `trace_id`
  - Métricas OTLP (`/v1/metrics`) de throughput, latencia y uso de recursos.

---

## 🛠️ Requisitos e Instalación

### Requisitos Prerequisito
- Node.js >= 20.x
- pnpm >= 9.x
- MySQL 8.x (`userdb`)

### Instalación de Dependencias
```bash
cd backend-nestjs/user-service
pnpm install
```

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz del microservicio:

```env
PORT=3002
GRPC_PORT=50051
NODE_ENV=development

# Base de Datos (MySQL)
DATABASE_URL="mysql://root:12345@localhost:3306/userdb"

# Telemetría SigNoz (OpenTelemetry)
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
OTEL_SERVICE_NAME="user-service"
```

---

## 🗄️ Base de Datos y Prisma

```bash
# Generar Cliente de Prisma
pnpm dlx prisma generate

# Aplicar schema a la base de datos MySQL (userdb)
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

## 🧪 Pruebas e Interacción (Endpoints REST y gRPC)

### 1. Consultar Perfil por ID (`GET /users/profile/:id`)
```bash
curl -X GET http://localhost:3002/users/profile/1
```

### 2. Crear Perfil (`POST /users`)
```bash
curl -X POST http://localhost:3002/users \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "email": "juan.perez@fintech.com",
    "name": "Juan Perez",
    "balance": 10000
  }'
```

### 3. Actualizar Saldo (`PUT /users/profile/:id/balance`)
```bash
curl -X PUT http://localhost:3002/users/profile/1/balance \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000
  }'
```

### 4. Probar Interfaz gRPC con `grpcurl` (`:50051`)
```bash
grpcurl -plaintext -d '{"userId": 1}' localhost:50051 user.UserService/GetUserProfile
```

### 5. Health Check (`GET /health`)
```bash
curl -X GET http://localhost:3002/health
```

---

## 🐳 Despliegue en Docker / Kubernetes

### Construcción de Imagen con `nerdctl`
```bash
nerdctl --namespace k8s.io build -t fintech/user-service:nestjs .
```

### Manifiestos de Kubernetes
El microservicio está configurado en `k8s/02-microservices.yaml`:
- **Puerto HTTP**: 3002 (Mapeado a servicio K8s 8082)
- **Puerto gRPC**: 50051 (Mapeado a servicio K8s 9090)
- **Health Probes**: `/health` (Liveness, Readiness, Startup)
