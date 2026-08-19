# Transaction Service (NestJS) 💸

Microservicio de Procesamiento de Transferencias, Solicitudes de Dinero e Idempotencia del sistema **FinTech Wallet**, desarrollado sobre **NestJS 11 + Hexagonal Architecture + tRPC Client + REST + CQRS + Prisma ORM + Redis + Kafka + OpenTelemetry**.

---

## 🚀 Arquitectura y Características

- **Arquitectura Hexagonal (Ports & Adapters)**: Separación estricta entre Dominio, Casos de Uso (CQRS) y Adaptadores de Entrada (REST API) / Salida (Prisma PostgreSQL, Redis, Kafka Outbox, tRPC Client).
- **Integración tRPC Inter-Service**: Cliente tRPC type-safe conectando a `user-service:8082/trpc` (`getUserById`, `getUserByEmail`, `updateBalance`) mediante el adaptador `UserServiceTrpcAdapter`.
- **Garantía de Idempotencia Durable (Redis + PostgreSQL)**: Uso del encabezado HTTP `X-Idempotency-Key` verificado en Redis (`ioredis`) para respuesta ultrarrápida y respaldado en la tabla PostgreSQL `idempotency_records` con TTL de 24 horas para evitar cobros dobles en red.
- **Transactional Outbox & Event-Driven Architecture**:
  - Los eventos de transferencias completadas se registran en la tabla `outbox_events` de forma atómica con la transferencia.
  - `OutboxPublisherService` publica asincrónicamente el evento `TRANSFER_COMPLETED` a Apache Kafka (`kafka:29092`) garantizando entrega *at-least-once*.
- **Base de Datos Dedicada**: Persistencia en PostgreSQL (`transactiondb.transactions`, `transactiondb.money_requests`, `transactiondb.outbox_events`, `transactiondb.idempotency_records`) gestionada con Prisma ORM 7 (`@prisma/adapter-pg`).
- **Documentación OpenAPI / Swagger UI**: Disponible en vivo en `/transactions/docs` y `/api-docs`.
- **Observabilidad SigNoz & OpenTelemetry**:
  - **Trazas OTLP**: Rastreabilidad distribuida de transacciones cruzando llamados HTTP REST, tRPC y publicación en Kafka.
  - **Logs Winston OTLP**: Envío estructurado de logs en JSON con correlación `trace_id` / `span_id` y metadatos nativos de Kubernetes.
  - **Métricas OTLP**: Monitoreo de RED Metrics (Rate, Errors, Duration) e idempotencia.

---

## 📁 Arquitectura de Carpetas (Hexagonal / Ports & Adapters)

```text
backend-nestjs/transaction-service/
├── prisma/
│   └── schema.prisma             # Esquema Prisma ORM (Base de datos PostgreSQL transactiondb)
├── src/
│   ├── adapters/                 # Adaptadores Hexagonales (Interface Adapters)
│   │   ├── inbound/              # Adaptadores de Entrada (Driving / Primary)
│   │   │   └── rest/             # Controladores REST HTTP (TransactionController, HealthController, DTOs)
│   │   └── outbound/             # Adaptadores de Salida (Driven / Secondary)
│   │       ├── trpc/             # Cliente tRPC hacia user-service (user-service.trpc-adapter.ts)
│   │       ├── kafka/            # Kafka Producer (outbox-publisher.service.ts emitiendo TRANSFER_COMPLETED)
│   │       ├── persistence/      # Repositorio de persistencia Prisma ORM (prisma-transaction.repository.ts)
│   │       └── redis/            # Idempotencia con Redis (idempotency.service.ts)
│   ├── application/              # Casos de Uso de Aplicación (CQRS)
│   │   ├── commands/             # TransferMoneyCommand & Handler
│   │   ├── queries/              # GetTransactionHistoryQuery & Handler
│   │   └── use-cases/            # TransactionUseCases (Transfer, CreateMoneyRequest, Accept/RejectRequest)
│   ├── domain/                   # Dominio Principal (Core de Negocio)
│   │   ├── entities/             # Entidades TransactionEntity y MoneyRequestEntity
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
- **PostgreSQL**: `>= 15.x` (Base de datos `transactiondb`)
- **Redis**: `7.x` (Servidor de caché e idempotencia)
- **Apache Kafka**: `3.x` (Broker de mensajería)
- **User Service (NestJS)**: Ejecutándose en puerto `8082`.

---

## ⚙️ Variables de Entorno (`.env`)

Crea un archivo `.env` en la raíz de `backend-nestjs/transaction-service`:

```env
PORT=3003
NODE_ENV=development

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transactiondb"

# Redis Cache (Idempotencia)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Kafka Broker
KAFKA_BROKERS="localhost:9092"

# User Service tRPC Client URL
USER_SERVICE_URL="http://localhost:3002"

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
pnpm exec prisma generate
pnpm exec prisma db push
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

## 🦭 Despliegue con Podman y Kubernetes

### Construir Imagen con Podman

```bash
podman build -f Containerfile -t fintech/transaction-service:1.0.0 .
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

**Respuesta Exitosa (200 OK)**:

```json
{
  "id": 1,
  "fromUserId": 1,
  "toUserId": 2,
  "amount": 150,
  "status": "COMPLETED",
  "createdAt": "2026-08-13T14:30:00.000Z"
}
```

### 2. Consultar Transacciones de un Usuario (CQRS Query)

```bash
curl -X GET http://localhost/transactions/user/1
```

### 3. Consultar Historial Global de Transacciones

```bash
curl -X GET http://localhost/transactions/all
```

### 4. Health Check / Probes K8s

```bash
curl -X GET http://localhost/transactions/health
```
