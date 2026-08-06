# Transaction Service (NestJS) 💸

Microservicio de Procesamiento de Transferencias, Solicitudes de Dinero e Idempotencia del sistema **FinTech Wallet**, desarrollado sobre **NestJS 11 + Hexagonal Architecture + gRPC Client + REST + Prisma ORM + Redis + Kafka + OpenTelemetry**.

---

## 🚀 Arquitectura y Características

- **Arquitectura Hexagonal (Ports & Adapters)**: Separación estricta entre Dominio, Casos de Uso y Adaptadores de Entrada (REST API) / Salida (Prisma MySQL, Redis, Kafka Producer, gRPC Client).
- **Integración gRPC Inter-Service**: Cliente gRPC de alto rendimiento conectando a `user-service:50051` (`UserService.GetUserProfile` y `UpdateUserBalance`) mediante el contrato proto compartido (`user.proto`).
- **Garantía de Idempotencia con Redis**: Uso del encabezado HTTP `X-Idempotency-Key` en Redis (`ioredis`) con TTL de 24 horas para evitar dobles transferencias financieras en red o reintentos del cliente.
- **Event-Driven Architecture con Kafka**: Adaptador de salida Kafka Producer (`kafkajs`) emitiendo eventos `transfer_completed` al cluster Apache Kafka en cada transferencia exitosa para ser procesados asincrónicamente por `notification-service`.
- **Base de Datos Dedicada**: Persistencia en MySQL (`transactiondb.transactions` y `transactiondb.money_requests`) gestionada con Prisma ORM 7 (`@prisma/adapter-mariadb`).
- **Documentación OpenAPI / Swagger UI**: Disponible en vivo en `/transactions/docs` y `/api-docs`.
- **Observabilidad SigNoz & OpenTelemetry**:
  - **Trazas OTLP**: Rastreabilidad distribuida de transacciones cruzando llamados HTTP, gRPC y publicación en Kafka.
  - **Logs Winston OTLP**: Envío estructurado de logs en JSON con correlación `trace_id` / `span_id` y metadatos nativos de Kubernetes (`k8s.pod.name`, `k8s.namespace.name`).
  - **Métricas OTLP**: Monitoreo de tasa de transferencias, tiempos de respuesta e idempotencia.

---

## 📁 Arquitectura de Carpetas (Hexagonal / Ports & Adapters)

```text
backend-nestjs/transaction-service/
├── prisma/
│   └── schema.prisma             # Esquema Prisma ORM (Base de datos MySQL transactiondb)
├── src/
│   ├── adapters/                 # Adaptadores Hexagonales (Interface Adapters)
│   │   ├── inbound/              # Adaptadores de Entrada (Driving / Primary)
│   │   │   └── rest/             # Controladores REST HTTP (TransactionController, HealthController, DTOs)
│   │   └── outbound/             # Adaptadores de Salida (Driven / Secondary)
│   │       ├── grpc/             # Cliente gRPC hacia user-service (user.proto, UserServiceClientAdapter)
│   │       ├── kafka/            # Kafka Producer (KafkaProducerService emitiendo transfer_completed)
│   │       ├── persistence/      # Repositorio de persistencia Prisma ORM (prisma-transaction.repository.ts)
│   │       └── redis/            # Idempotencia con Redis (IdempotencyService)
│   ├── application/              # Casos de Uso de Aplicación
│   │   └── use-cases/            # TransactionUseCases (Transfer, CreateMoneyRequest, Accept/RejectRequest)
│   ├── domain/                   # Dominio Principal (Core de Negocio)
│   │   ├── entities/             # Entidades Transaction y MoneyRequest
│   │   └── ports/                # Interfaces de Puertos Inbound & Outbound
│   │       ├── inbound/          # TransactionServicePort
│   │       └── outbound/         # TransactionRepositoryPort, UserServiceClientPort
│   ├── infrastructure/           # Componentes de Infraestructura
│   │   ├── logger/               # Winston Logger OTLP contextual
│   │   └── telemetry/            # OpenTelemetry SDK (Traces, Metrics y Winston Logs OTLP)
│   ├── app.module.ts             # Módulo Raíz de NestJS
│   └── main.ts                   # Bootstrap (Servidor REST puerto :3003 y Swagger UI en /transactions/docs)
├── test/                         # Pruebas Unitarias y E2E con Jest
├── .dockerignore                 # Exclusiones de construcción Docker
├── .gitignore                    # Control de versiones Git
├── Dockerfile                    # Multi-stage Dockerfile para producción (Node 22 Alpine)
├── package.json                  # Dependencias y scripts pnpm
└── README.md                     # Documentación oficial del microservicio
```

---

## 🛠️ Requisitos Previos

- **Node.js**: `>= 20.x`
- **pnpm**: `>= 9.x`
- **MySQL**: `8.x` (Base de datos `transactiondb`)
- **Redis**: `7.x` (Servidor de caché para idempotencia)
- **Apache Kafka**: `3.x` (Broker de mensajería)
- **User Service (NestJS)**: Ejecutándose en puerto gRPC `50051`.

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz de `backend-nestjs/transaction-service`:

```env
PORT=3003
NODE_ENV=development

# Base de Datos MySQL
DATABASE_URL="mysql://root:12345@localhost:3306/transactiondb"

# Redis Cache (Idempotencia)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Kafka Broker
KAFKA_BROKERS="localhost:9092"

# User Service gRPC Client
USER_SERVICE_GRPC_URL="localhost:50051"

# Telemetría SigNoz / OpenTelemetry Collector
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
OTEL_SERVICE_NAME="transaction-service"
```

---

## 🚀 Ejecución y Pruebas

### 1. Instalación de Dependencias

```bash
cd backend-nestjs/transaction-service
pnpm install
```

### 2. Generación del Cliente Prisma y Migraciones

```bash
pnpm dlx prisma generate
pnpm dlx prisma db push
```

### 3. Ejecución en Desarrollo Local

```bash
pnpm run start:dev
```

El servidor estará escuchando en `http://localhost:3003`.

### 4. Pruebas Unitarias con Jest

```bash
pnpm test
```

---

## 🐳 Despliegue con Docker y Kubernetes

### Construir Imagen con `nerdctl` / Docker

```bash
nerdctl --namespace k8s.io build -t fintech/transaction-service:nestjs ./backend-nestjs/transaction-service
```

### Aplicar Manifiesto Kubernetes

```bash
kubectl apply -f k8s/02-microservices.yaml -f k8s/05-ingress.yaml
```

- **Servidor K8s**: Puerto `8083` (TargetPort `3003`)
- **Ingress Traefik**: Ruta `/transactions` accesible a través del API Ingress (`http://localhost/transactions/docs/`).

---

## 📖 Swagger UI / Documentación OpenAPI

Accede a la documentación interactiva en:
- **Local**: [http://localhost:3003/transactions/docs](http://localhost:3003/transactions/docs)
- **Kubernetes Ingress**: [http://localhost/transactions/docs/](http://localhost/transactions/docs/)

---

## 🔌 Guía de Endpoints API REST y Ejemplos `curl`

### 1. Realizar Transferencia de Dinero (con Idempotencia)

```bash
curl -X POST http://localhost/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: TX-882910-AAA" \
  -d '{
    "fromUserId": 1,
    "toUserId": 2,
    "amount": 150.00
  }'
```

**Respuesta Exitosa (201 Created)**:

```json
{
  "id": 1,
  "fromUserId": 1,
  "toUserId": 2,
  "amount": 150,
  "status": "SUCCESS",
  "createdAt": "2026-08-06T14:30:00.000Z"
}
```

### 2. Consultar Transacciones de un Usuario

```bash
curl -X GET http://localhost/transactions/user/1
```

### 3. Consultar Historial Global de Transacciones

```bash
curl -X GET http://localhost/transactions
```

### 4. Crear Solicitud de Dinero (Money Request)

```bash
curl -X POST http://localhost/transactions/request-money \
  -H "Content-Type: application/json" \
  -d '{
    "requesterId": 2,
    "targetUserId": 1,
    "amount": 75.50
  }'
```

### 5. Aceptar Solicitud de Dinero

```bash
curl -X POST http://localhost/transactions/money-requests/1/accept
```

### 6. Rechazar Solicitud de Dinero

```bash
curl -X POST http://localhost/transactions/money-requests/1/reject
```

### 7. Health Check / Probes K8s

```bash
curl -X GET http://localhost/transactions/health
```

**Respuesta**:

```json
{
  "status": "ok",
  "service": "transaction-service",
  "timestamp": "2026-08-06T14:30:00.000Z"
}
```
