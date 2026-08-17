# Ficha Técnica de Microservicios

Este documento detalla la especificación técnica, arquitectura interna, responsabilidades, variables de entorno, puertos y contratos de los 5 microservicios que conforman el backend de **FinTech Wallet**.

---

## 📑 Microservicios

1. [Auth Service (`auth-service`)](#1-auth-service-auth-service)
2. [User Service (`user-service`)](#2-user-service-user-service)
3. [Transaction Service (`transaction-service`)](#3-transaction-service-transaction-service)
4. [Notification Service (`notification-service`)](#4-notification-service-notification-service)
5. [Worker Service (`worker-service`)](#5-worker-service-worker-service)

---

## 1. Auth Service (`auth-service`)

### 1.1. Propósito
Centraliza la gestión de identidad, control de acceso, emisión de tokens criptográficos y autenticación multifactor (2FA / TOTP) para todo el ecosistema.

### 1.2. Responsabilidades
* **Qué hace**:
  * Registro de nuevos usuarios con contraseñas cifradas vía BCrypt (10 salt rounds).
  * Generación y validación de tokens JWT (HMAC SHA-256) con expiración configurable.
  * Configuración, activación, verificación y deshabilitación de 2FA basado en tiempo (TOTP con RFC 6238).
  * Verificación de cuentas por correo electrónico mediante tokens seguros.
  * Revocación de sesiones y gestión de lista negra de tokens en Redis.
  * Cambio de contraseñas y promoción de roles administrativos.
  * Comunicación síncrona con `user-service` para la creación del perfil financiero inicial.
* **Qué NO hace**:
  * No administra saldos, monedas ni límites transaccionales (responsabilidad de `user-service`).
  * No procesa transferencias ni solicitudes de dinero (responsabilidad de `transaction-service`).

### 1.3. Arquitectura Interna
```text
backend-nestjs/auth-service/src/
├── domain/                      # Núcleo de Dominio
│   ├── entities/                # Entidad User (id, email, password, role, verified, totpSecret)
│   ├── value-objects/           # Email, Password, UserId
│   └── ports/                   # Interfaces Inbound (AuthServicePort) y Outbound (UserRepositoryPort, TokenServicePort)
├── application/                 # Casos de Uso (AuthService)
├── adapters/                    # Adaptadores Hexagonales
│   ├── inbound/rest/            # AuthController, HealthController, DTOs, Guards, Filters
│   └── outbound/                # PrismaUserRepository, RedisBlacklistAdapter, MaildevAdapter, UserServiceClient
└── infrastructure/              # Telemetría OpenTelemetry, Logger Winston y Prisma Client
```

### 1.4. Canales de Entrada y Salida
* **Entrada**: HTTP REST (`/auth/*`, `/api/auth/*`).
* **Salida**:
  * Base de datos `authdb` (PostgreSQL 16 vía PgBouncer Core).
  * Redis (Blacklist de tokens `jwt:blacklist:*`).
  * HTTP S2S hacia `user-service` (`http://user-service:8082/users`).
  * SMTP hacia Maildev (`maildev:1025`).
  * Telemetría OTLP HTTP hacia OpenTelemetry Collector (`:4318`).

### 1.5. Variables de Configuración

| Variable | Descripción | Ejemplo / Valor en K8s |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP donde escucha el proceso NestJS | `3001` |
| `NODE_ENV` | Ambiente de ejecución | `production` |
| `DATABASE_URL` | Cadena de conexión JDBC a Postgres con PgBouncer | `postgresql://postgres:12345@pgbouncer-core:6432/authdb?schema=public&pgbouncer=true` |
| `JWT_SECRET` | Clave secreta para firma y verificación de JWT | Obtenida desde Secret `fintech-secrets` |
| `REDIS_HOST` | Host del clúster Redis | `redis` |
| `REDIS_PORT` | Puerto de conexión Redis | `6379` |
| `USER_SERVICE_URL` | URL interna para llamadas HTTP a `user-service` | `http://user-service:8082` |
| `MAIL_HOST` | Host del servidor SMTP | `maildev` |
| `MAIL_PORT` | Puerto del servidor SMTP | `1025` |
| `MAIL_FROM` | Dirección de remitente para correos salientes | `noreply@fintechwallet.com` |
| `OTEL_SERVICE_NAME` | Identificador del servicio en SigNoz | `auth-service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint del recolector OpenTelemetry | `http://otel-collector.fintech.svc.cluster.local:4318` |

### 1.6. Puertos, Rutas y Health Checks
* **Container Port**: `3001`
* **Kubernetes Service Port**: `3001` (ClusterIP)
* **Ruta Ingress Traefik**: `/auth` y `/api/auth` (con middleware `auth-ratelimit` y `strip-api-prefix`)
* **Swagger UI**: `http://localhost/auth/docs/`
* **Probes**:
  * `startupProbe`: `GET /health/startup` (InitialDelay: 5s, Period: 3s, FailureThreshold: 20)
  * `livenessProbe`: `GET /health/live` (InitialDelay: 10s, Period: 10s)
  * `readinessProbe`: `GET /health/ready` (InitialDelay: 5s, Period: 5s)

---

## 2. User Service (`user-service`)

### 2.1. Propósito
Gestiona la entidad central de perfil de usuario, saldos en cuenta, monedas soportadas, límites operativos diarios y provee el enrutador tipado tRPC para operaciones transaccionales inter-servicio.

### 2.2. Responsabilidades
* **Qué hace**:
  * Creación y actualización de perfiles de usuario (`user_profiles`).
  * Actualización atómica de saldo (incremento y decremento con validación de balance no negativo).
  * Control y actualización de límites operativos diarios y moneda base (`ARS`, `USD`, `EUR`).
  * Exposición de procedimientos tRPC (`getUserById`, `getUserByEmail`, `updateBalance`) para llamadas de alto rendimiento.
  * Publicación de eventos en tabla `outbox_events`.
* **Qué NO hace**:
  * No gestiona contraseñas, hashes ni credenciales de acceso (responsabilidad de `auth-service`).
  * No orquesta transferencias entre múltiples partes (responsabilidad de `transaction-service`).

### 2.3. Arquitectura Interna
```text
backend-nestjs/user-service/src/
├── domain/                      # Núcleo de Dominio
│   ├── entities/                # Entidad UserProfile (id, name, email, balance, dailyLimit, currency)
│   ├── value-objects/           # Money, Balance, Currency
│   └── ports/                   # IUserServicePort, IUserProfileRepositoryPort
├── application/                 # Casos de Uso (UserService)
├── adapters/                    # Adaptadores Hexagonales
│   ├── inbound/rest/            # UserController, HealthController, DTOs
│   ├── inbound/trpc/            # UserTrpcRouter (procedimientos tipados con Zod)
│   └── outbound/                # PrismaUserProfileRepository
└── infrastructure/              # Telemetría OpenTelemetry, Logger Winston y Prisma Client
```

### 2.4. Canales de Entrada y Salida
* **Entrada**:
  * HTTP REST (`/users/*`, `/api/users/*`).
  * tRPC Router (`/trpc/*`).
* **Salida**:
  * Base de datos `userdb` (PostgreSQL 16 vía PgBouncer Core).
  * Telemetría OTLP HTTP hacia OpenTelemetry Collector (`:4318`).

### 2.5. Variables de Configuración

| Variable | Descripción | Ejemplo / Valor en K8s |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP donde escucha el proceso NestJS | `3002` |
| `NODE_ENV` | Ambiente de ejecución | `production` |
| `DATABASE_URL` | Cadena de conexión JDBC a Postgres con PgBouncer | `postgresql://postgres:12345@pgbouncer-core:6432/userdb?schema=public&pgbouncer=true` |
| `OTEL_SERVICE_NAME` | Identificador del servicio en SigNoz | `user-service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint del recolector OpenTelemetry | `http://otel-collector.fintech.svc.cluster.local:4318` |

### 2.6. Puertos, Rutas y Health Checks
* **Container Port**: `3002`
* **Kubernetes Service Port**: `8082` (ClusterIP mapeado al targetPort `3002`)
* **Ruta Ingress Traefik**: `/users` y `/api/users`
* **Swagger UI**: `http://localhost/users/docs/`
* **Probes**:
  * `startupProbe`: `GET /health/startup` (InitialDelay: 5s, Period: 3s, FailureThreshold: 20)
  * `livenessProbe`: `GET /health/live` (InitialDelay: 10s, Period: 10s)
  * `readinessProbe`: `GET /health/ready` (InitialDelay: 5s, Period: 5s)

---

## 3. Transaction Service (`transaction-service`)

### 3.1. Propósito
Orquesta el flujo transaccional crítico del negocio financiero: transferencias directas, solicitudes de cobro de dinero, garantías de no duplicidad (idempotencia), ejecución del patrón CQRS y publicación transaccional mediante Outbox.

### 3.2. Responsabilidades
* **Qué hace**:
  * Procesamiento de transferencias mediante comandos CQRS (`TransferMoneyCommand` y `TransferMoneyCommandHandler`).
  * Consulta de historial de transacciones mediante consultas CQRS (`GetTransactionHistoryQuery`).
  * Idempotencia distribuida en dos fases mediante Redis (`acquireLock` pesimista inicial y `registerKey` con TTL de 24h) y tabla `idempotency_records`.
  * Validación y ajuste atómico de saldos mediante tRPC contra `user-service`.
  * Ejecución de compensación SAGA (si falla la acreditación en destino, revierte automáticamente el débito en origen).
  * Ciclo de vida completo de solicitudes de dinero (`MoneyRequest`: creación, aceptación con transferencia implícita y rechazo).
  * Persistencia ACID atómica en `transactions` y `outbox_events`.
  * Despacho del evento `TransferCompletedEvent` a Kafka (`transfer_completed`).
* **Qué NO hace**:
  * No almacena saldos de usuarios en sus propias tablas (consulta a `user-service`).
  * No despacha correos ni genera archivos PDF directamente (delega asíncronamente a Kafka).

### 3.3. Arquitectura Interna
```text
backend-nestjs/transaction-service/src/
├── domain/                      # Núcleo de Dominio
│   ├── entities/                # TransactionEntity, MoneyRequestEntity
│   ├── value-objects/           # Money, UserId
│   ├── events/                  # TransferCompletedEvent
│   └── ports/                   # TransactionServicePort, TransactionRepositoryPort, UserServiceClientPort
├── application/                 # Casos de Uso y CQRS
│   ├── commands/                # TransferMoneyCommand, TransferMoneyCommandHandler
│   ├── queries/                 # GetTransactionHistoryQuery, GetTransactionHistoryQueryHandler
│   └── services/                # TransactionService
├── adapters/                    # Adaptadores Hexagonales
│   ├── inbound/rest/            # TransactionController, HealthController, DTOs
│   └── outbound/                # PrismaTransactionRepository, RedisIdempotencyService, TrpcUserServiceClient, KafkaEventPublisher
└── infrastructure/              # Telemetría OpenTelemetry, Logger Winston, OutboxService y Prisma Client
```

### 3.4. Canales de Entrada y Salida
* **Entrada**: HTTP REST (`/transactions/*`, `/api/transactions/*`).
* **Salida**:
  * Base de datos `transactiondb` (PostgreSQL 16 vía PgBouncer Core).
  * Redis (Candados y claves de idempotencia `idemp:lock:*` e `idemp:key:*`).
  * tRPC / HTTP S2S hacia `user-service` (`http://user-service:8082`).
  * Apache Kafka (Publicación en tópico `transfer_completed`).
  * Telemetría OTLP HTTP hacia OpenTelemetry Collector (`:4318`).

### 3.5. Variables de Configuración

| Variable | Descripción | Ejemplo / Valor en K8s |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP donde escucha el proceso NestJS | `3003` |
| `NODE_ENV` | Ambiente de ejecución | `production` |
| `DATABASE_URL` | Cadena de conexión JDBC a Postgres con PgBouncer | `postgresql://postgres:12345@pgbouncer-core:6432/transactiondb?schema=public&pgbouncer=true` |
| `REDIS_HOST` | Host del clúster Redis | `redis` |
| `REDIS_PORT` | Puerto de conexión Redis | `6379` |
| `USER_SERVICE_URL` | URL interna para tRPC / HTTP hacia `user-service` | `http://user-service:8082` |
| `KAFKA_BROKERS` | Lista de brokers Kafka | `kafka:29092` |
| `OTEL_SERVICE_NAME` | Identificador del servicio en SigNoz | `transaction-service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint del recolector OpenTelemetry | `http://otel-collector.fintech.svc.cluster.local:4318` |

### 3.6. Puertos, Rutas y Health Checks
* **Container Port**: `3003`
* **Kubernetes Service Port**: `8083` (ClusterIP mapeado al targetPort `3003`)
* **Ruta Ingress Traefik**: `/transactions` y `/api/transactions`
* **Swagger UI**: `http://localhost/transactions/docs/`
* **Probes**:
  * `startupProbe`: `GET /health/startup` (InitialDelay: 5s, Period: 3s, FailureThreshold: 20)
  * `livenessProbe`: `GET /health/live` (InitialDelay: 10s, Period: 10s)
  * `readinessProbe`: `GET /health/ready` (InitialDelay: 5s, Period: 5s)

---

## 4. Notification Service (`notification-service`)

### 4.1. Propósito
Consume asíncronamente los eventos transaccionales publicados en Apache Kafka para generar el historial de notificaciones del usuario y enviar correos electrónicos informativos.

### 4.2. Responsabilidades
* **Qué hace**:
  * Consumo del tópico Kafka `transfer_completed` mediante el grupo de consumidores `notification-group`.
  * Deduplicación de eventos en memoria para evitar notificaciones repetidas ante rebalances.
  * Reintentos automáticos exponenciales ante fallos de red o base de datos.
  * Persistencia de registros en la tabla `notifications` de `notificationdb`.
  * Envío de correos electrónicos con formato HTML mediante Maildev (SMTP).
  * Exposición de endpoints REST para consultar notificaciones y marcar lectura.
* **Qué NO hace**:
  * No interfiere en la respuesta de la transferencia al cliente (procesamiento 100% en background).

### 4.3. Arquitectura Interna
```text
backend-nestjs/notification-service/src/
├── domain/                      # Núcleo de Dominio
│   ├── entities/                # NotificationEntity (id, userId, type, message, amount, fromUserId, read, createdAt)
│   └── ports/                   # NotificationServicePort, NotificationRepositoryPort, EmailSenderPort
├── application/                 # Casos de Uso (NotificationService)
├── adapters/                    # Adaptadores Hexagonales
│   ├── inbound/kafka/           # KafkaConsumerService (Consumer de kafkajs)
│   ├── inbound/rest/            # NotificationController, HealthController
│   └── outbound/                # PrismaNotificationRepository, MaildevEmailSender
└── infrastructure/              # Telemetría OpenTelemetry, Logger Winston y Prisma Client
```

### 4.4. Canales de Entrada y Salida
* **Entrada**:
  * Apache Kafka (Suscripción al tópico `transfer_completed`).
  * HTTP REST (`/notifications/*`, `/api/notifications/*`).
* **Salida**:
  * Base de datos `notificationdb` (PostgreSQL 16 en `postgres-support:5432`).
  * SMTP hacia Maildev (`maildev:1025`).
  * Telemetría OTLP HTTP hacia OpenTelemetry Collector (`:4318`).

### 4.5. Variables de Configuración

| Variable | Descripción | Ejemplo / Valor en K8s |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP donde escucha el proceso NestJS | `3004` |
| `NODE_ENV` | Ambiente de ejecución | `production` |
| `DATABASE_URL` | Cadena de conexión JDBC a Postgres Support | `postgresql://postgres:12345@postgres-support:5432/notificationdb?schema=public` |
| `KAFKA_BROKERS` | Lista de brokers Kafka | `kafka:29092` |
| `MAIL_HOST` | Host del servidor SMTP | `maildev` |
| `MAIL_PORT` | Puerto del servidor SMTP | `1025` |
| `MAIL_FROM` | Remitente de los correos de notificación | `noreply@fintechwallet.com` |
| `OTEL_SERVICE_NAME` | Identificador del servicio en SigNoz | `notification-service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint del recolector OpenTelemetry | `http://otel-collector.fintech.svc.cluster.local:4318` |

### 4.6. Puertos, Rutas y Health Checks
* **Container Port**: `3004`
* **Kubernetes Service Port**: `8084` (ClusterIP mapeado al targetPort `3004`)
* **Ruta Ingress Traefik**: `/notifications` y `/api/notifications`
* **Swagger UI**: `http://localhost/notifications/docs/`
* **Probes**:
  * `startupProbe`: `GET /health/startup` (InitialDelay: 5s, Period: 3s, FailureThreshold: 20)
  * `livenessProbe`: `GET /health/live` (InitialDelay: 10s, Period: 10s)
  * `readinessProbe`: `GET /health/ready` (InitialDelay: 5s, Period: 5s)

---

## 5. Worker Service (`worker-service`)

### 5.1. Propósito
Procesa tareas pesadas en segundo plano: registro de auditoría transaccional, enrutamiento a Dead Letter Queue (DLQ) ante mensajes malformados y generación asíncrona de extractos bancarios en documentos PDF.

### 5.2. Responsabilidades
* **Qué hace**:
  * Consumo del tópico Kafka `transfer_completed` mediante el grupo de consumidores `worker-group`.
  * Inserción de bitácoras de auditoría en la tabla `audit_logs`.
  * Publicación de mensajes fallidos no procesables en el tópico Dead Letter Queue (`transfer-events-dlq`).
  * Creación y seguimiento de trabajos de extracto bancario (`StatementJob`: `PENDING`, `COMPLETED`, `FAILED`).
  * Compilación y renderizado de extractos PDF profesionales mediante la librería PDFKit.
  * Streaming binario de descarga de archivos PDF vía endpoint REST (`/worker/statements/:jobId/download`).
* **Qué NO hace**:
  * No atiende peticiones de pago ni modifica saldos de usuarios.

### 5.3. Arquitectura Interna
```text
backend-nestjs/worker-service/src/
├── domain/                      # Núcleo de Dominio
│   ├── entities/                # StatementJobEntity, AuditLogEntity
│   └── ports/                   # WorkerServicePort, WorkerRepositoryPort, PdfGeneratorPort
├── application/                 # Casos de Uso (WorkerService)
├── adapters/                    # Adaptadores Hexagonales
│   ├── inbound/kafka/           # KafkaWorkerConsumer (kafkajs Consumer + DLQ Producer)
│   ├── inbound/rest/            # WorkerController, HealthController
│   └── outbound/                # PrismaWorkerRepository, PdfKitGeneratorAdapter
└── infrastructure/              # Telemetría OpenTelemetry, Logger Winston y Prisma Client
```

### 5.4. Canales de Entrada y Salida
* **Entrada**:
  * Apache Kafka (Suscripción a `transfer_completed`).
  * HTTP REST (`/worker/*`, `/api/worker/*`).
* **Salida**:
  * Base de datos `workerdb` (PostgreSQL 16 en `postgres-support:5432`).
  * Apache Kafka (Publicación en Dead Letter Queue `transfer-events-dlq`).
  * Sistema de archivos local (`/tmp/statements`) para almacenamiento temporal de PDFs.
  * Telemetría OTLP HTTP hacia OpenTelemetry Collector (`:4318`).

### 5.5. Variables de Configuración

| Variable | Descripción | Ejemplo / Valor en K8s |
| :--- | :--- | :--- |
| `PORT` | Puerto HTTP donde escucha el proceso NestJS | `3005` |
| `NODE_ENV` | Ambiente de ejecución | `production` |
| `DATABASE_URL` | Cadena de conexión JDBC a Postgres Support | `postgresql://postgres:12345@postgres-support:5432/workerdb?schema=public` |
| `KAFKA_BROKERS` | Lista de brokers Kafka | `kafka:29092` |
| `STATEMENTS_DIR` | Directorio en disco para guardar PDFs generados | `/tmp/statements` |
| `OTEL_SERVICE_NAME` | Identificador del servicio en SigNoz | `worker-service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint del recolector OpenTelemetry | `http://otel-collector.fintech.svc.cluster.local:4318` |

### 5.6. Puertos, Rutas y Health Checks
* **Container Port**: `3005`
* **Kubernetes Service Port**: `8085` (ClusterIP mapeado al targetPort `3005`)
* **Ruta Ingress Traefik**: `/worker` y `/api/worker`
* **Swagger UI**: `http://localhost/worker/docs/`
* **Probes**:
  * `startupProbe`: `GET /health` (InitialDelay: 5s, Period: 3s, FailureThreshold: 20)
  * `livenessProbe`: `GET /health` (InitialDelay: 10s, Period: 10s)
  * `readinessProbe`: `GET /health` (InitialDelay: 5s, Period: 5s)
