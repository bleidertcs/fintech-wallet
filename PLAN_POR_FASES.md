# Plan de Implementación por Fases — FinTech Wallet

> Basado en [Analisis.md](file:///c:/dev/DevOps/fintech-wallet/Analisis.md)
> Fecha: 2026-08-12
> Estado: Pendiente de aprobación

---

## Decisiones de Diseño Validadas

| Decisión | Elección |
|---|---|
| Monorepo | **No**. Mantener estructura actual `backend-nestjs/<service>/` con carpeta `shared/` para contratos |
| API Gateway | **REST directo** (Traefik → microservicios). Sin BFF intermedio |
| tRPC | **v10** (ya instalado en user-service) |
| Password hashing | **BCrypt** (mantener actual) |
| DDD | **Pragmático**: Value Objects clave + Entidades ricas + Domain Events |
| CQRS | **`@nestjs/cqrs`** con CommandBus, QueryBus, EventBus, Sagas |
| Testing | **Jest + Supertest + K6** + contract tests manuales |
| Secrets | **Kubernetes Secrets** (mover env hardcodeados a Secret objects) |
| Spring Backend | **Mantener** `backend/` como referencia hasta paridad funcional |

---

## Estado Actual del Proyecto

```text
Evaluación post-implementaciones parciales:

| Área                       | Estado Original | Estado Actual |
|----------------------------|:--------------:|:-------------:|
| Migración Spring → NestJS  |      85%       |      85%      |
| Hexagonal Architecture     |      80%       |      80%      |
| DDD                        |      60%       |      60%      |
| tRPC                       |       0%       |      25%      |  ← router básico + client
| gRPC                       |    Presente    |    Presente   |  ← aún en dependencias
| Consistencia Financiera    |       🔴       |      40%      |  ← atomic SQL + outbox schema
| Idempotencia               |       🟡       |      50%      |  ← Redis, falta MySQL durable
| Transactional Outbox       |       🔴       |      30%      |  ← schema + service, falta publisher
| Testing                    |      65%       |      70%      |  ← concurrency.spec.ts + k6
| Docker Optimization        |       🟡       |      90%      |  ← pnpm prune --prod
```

---

## Fase 0 — Baseline y Estabilización

**Objetivo:** Congelar el estado actual, documentar contratos, medir rendimiento.

**Prioridad:** 🔴 Crítica
**Duración estimada:** 2-3 días

### Tareas

- [ ] Ejecutar todos los servicios en K8s y verificar que arranquen sin errores
- [ ] Documentar todos los endpoints REST actuales (auth, user, transaction)
- [ ] Comparar contratos: respuestas Spring Boot vs NestJS
  - Status codes, headers, body, errores, validación
- [ ] Medir baseline de rendimiento:
  - RPS por servicio
  - Latencia P50/P95/P99
  - Uso de CPU/RAM por pod
- [ ] Ejecutar tests existentes y medir cobertura
- [ ] Crear `BASELINE.md` con todos los resultados

### Archivos a crear

```text
BASELINE.md                          → Resultados de baseline
scripts/baseline-test.js             → K6 script para medir rendimiento
```

### Criterio de completitud

- [ ] Todos los servicios en Running 1/1
- [ ] Documento BASELINE.md completo con métricas

---

## Fase 1 — Consistencia Financiera (Completar)

**Objetivo:** Garantizar que las transferencias nunca corrompan balances.

**Prioridad:** 🔴 Crítica
**Duración estimada:** 3-4 días
**Estado:** ⚡ Parcialmente implementado

### Lo que ya existe

- [x] Atomic SQL en `PrismaUserRepository` (`UPDATE ... WHERE balance >= X`)
- [x] `OutboxEvent` model en los 3 schemas Prisma
- [x] `OutboxService` en transaction-service
- [x] `IdempotencyService` con Redis en transaction-service
- [x] `concurrency.spec.ts` con tests de concurrencia

### Lo que falta

- [ ] **Idempotencia durable en MySQL**: Crear tabla `idempotency_records` con `UNIQUE(user_id, key)` como respaldo de Redis
  - Modelo Prisma `IdempotencyRecord` en `transaction-service/prisma/schema.prisma`
  - Flujo: Redis (fast lookup) → MySQL (durable guarantee)
- [ ] **Outbox Publisher**: Implementar un poller/scheduler que lea `outbox_events` con `status = PENDING` y publique a Kafka
  - Crear `OutboxPublisher` como NestJS ScheduleModule cron job
  - Marcar eventos como `PROCESSED` tras publicación exitosa
- [ ] **Compensación**: Implementar rollback si falla el credit después del debit
  - Lógica de compensación en `TransactionUseCases`
  - Estado `FAILED` con motivo de fallo
- [ ] **Flujo completo de transferencia atómica**:
  ```text
  Transfer Command
        │
        ▼
  Validate (sender exists, receiver exists, amount > 0)
        │
        ▼
  Idempotency Check (Redis → MySQL)
        │
        ▼
  BEGIN TRANSACTION
        │
        ├── Debit sender (atomic WHERE balance >= X)
        ├── Credit receiver
        ├── INSERT transaction record
        ├── INSERT outbox_event
        │
  COMMIT
        │
        ▼
  Outbox Publisher → Kafka
  ```

### Archivos a modificar/crear

```text
[MODIFY] transaction-service/prisma/schema.prisma        → Añadir IdempotencyRecord
[MODIFY] transaction-service/src/application/use-cases/   → Flujo atómico completo
[NEW]    transaction-service/src/infrastructure/outbox/outbox-publisher.service.ts
[NEW]    transaction-service/src/infrastructure/idempotency/idempotency-mysql.service.ts
[MODIFY] transaction-service/test/concurrency.spec.ts     → Tests de compensación
```

### Criterio de completitud

- [ ] Dos transferencias concurrentes por el mismo monto nunca generan balance negativo
- [ ] Evento Kafka siempre se publica tras commit exitoso (vía Outbox)
- [ ] Retry de request idempotente retorna misma respuesta sin re-ejecutar

---

## Fase 2 — Migración Completa gRPC → tRPC

**Objetivo:** Reemplazar toda comunicación gRPC por tRPC v10 entre microservicios.

**Prioridad:** 🔴 Crítica
**Duración estimada:** 3-4 días
**Estado:** ⚡ Parcialmente implementado

### Lo que ya existe

- [x] `UserTrpcRouter` en user-service (`getUserById`, `getUserByEmail`, `updateBalance`)
- [x] `UserProfileTrpcClient` en auth-service
- [x] Endpoint `/trpc` montado en user-service vía express middleware

### Lo que falta

- [ ] **Crear carpeta `shared/trpc-contracts/`** con tipos exportados del AppRouter de cada servicio
  ```text
  backend-nestjs/
  └── shared/
      └── trpc-contracts/
          ├── package.json
          ├── tsconfig.json
          ├── src/
          │   ├── user.router.ts      → tipos del UserRouter
          │   ├── auth.router.ts      → tipos del AuthRouter
          │   └── index.ts
          └── README.md
  ```
- [ ] **Migrar transaction-service → user-service**: Reemplazar llamadas gRPC por tRPC client
  - `GetUserProfile` → `userRouter.getUserById`
  - `UpdateBalance` → `userRouter.updateBalance`
- [ ] **Migrar notification-service → user-service**: Reemplazar gRPC por tRPC client
- [ ] **Eliminar dependencias gRPC** de transaction-service:
  ```text
  - @grpc/grpc-js
  - @grpc/proto-loader
  - @nestjs/microservices (si solo se usaba para gRPC)
  ```
- [ ] **Eliminar archivos `.proto`** y configuración gRPC
- [ ] **Contract tests tRPC**: Crear `.spec.ts` que valide que los routers responden correctamente
- [ ] **Actualizar K8s manifests**: Eliminar puertos gRPC (50051, 9090) de los deployments

### Archivos a crear/modificar

```text
[NEW]    shared/trpc-contracts/package.json
[NEW]    shared/trpc-contracts/src/user.router.ts
[NEW]    shared/trpc-contracts/src/index.ts
[MODIFY] transaction-service/package.json                  → Eliminar gRPC deps
[NEW]    transaction-service/src/infrastructure/trpc/user-trpc.client.ts
[MODIFY] notification-service/src/...                      → tRPC client
[DELETE] *.proto files
[MODIFY] k8s/02-microservices.yaml                         → Eliminar puertos gRPC
```

### Criterio de completitud

- [ ] Cero dependencias de `@grpc/*` en todo el proyecto
- [ ] Todas las llamadas síncronas inter-servicio usan tRPC
- [ ] Contract tests pasan al 100%

---

## Fase 3 — DDD Pragmático

**Objetivo:** Introducir Value Objects financieros y Domain Events sin over-engineering.

**Prioridad:** 🟠 Alta
**Duración estimada:** 3-4 días

### Tareas

- [ ] **Value Objects**:
  - `Money` (amount: Decimal, currency: string) con operaciones `add()`, `subtract()`, `isGreaterThanOrEqual()`
  - `UserId` (value: bigint)
  - `TransactionId` (value: string/uuid)
  - `Email` (value: string) con validación
- [ ] **Entidades ricas**:
  - `UserProfile` con métodos `debit(money)`, `credit(money)`, `hasEnoughBalance(money)`
  - `Transaction` con estados (PENDING → COMPLETED → FAILED) y transiciones válidas
  - `Transfer` como entidad de dominio que encapsula sender, receiver, money
- [ ] **Domain Events**:
  - `TransferInitiated`
  - `TransferCompleted`
  - `TransferFailed`
  - `BalanceUpdated`
  - `InsufficientFunds`
- [ ] **Mover domain a capa pura**: Sin dependencias de Prisma, NestJS, Redis en `src/domain/`

### Estructura por servicio

```text
src/domain/
├── entities/
│   ├── user-profile.entity.ts
│   └── transaction.entity.ts
├── value-objects/
│   ├── money.vo.ts
│   ├── user-id.vo.ts
│   ├── transaction-id.vo.ts
│   └── email.vo.ts
├── events/
│   ├── transfer-completed.event.ts
│   ├── transfer-failed.event.ts
│   └── balance-updated.event.ts
├── enums/
│   └── transaction-status.enum.ts
└── ports/
    ├── inbound/
    └── outbound/
```

### Criterio de completitud

- [ ] `src/domain/` no importa ningún paquete de infraestructura
- [ ] Value Object `Money` maneja correctamente operaciones decimales
- [ ] Tests unitarios para cada Value Object y entidad

---

## Fase 4 — CQRS con @nestjs/cqrs

**Objetivo:** Implementar Command/Query separation en transaction-service usando el módulo oficial.

**Prioridad:** 🟠 Alta
**Duración estimada:** 3-4 días

### Tareas

- [ ] Instalar `@nestjs/cqrs` en transaction-service
- [ ] **Commands**:
  - `TransferMoneyCommand` + `TransferMoneyHandler`
  - `CreateMoneyRequestCommand` + `CreateMoneyRequestHandler`
  - `AcceptMoneyRequestCommand` + `AcceptMoneyRequestHandler`
  - `RejectMoneyRequestCommand` + `RejectMoneyRequestHandler`
- [ ] **Queries**:
  - `GetTransactionQuery` + `GetTransactionHandler`
  - `GetTransactionHistoryQuery` + `GetTransactionHistoryHandler`
  - `GetWalletBalanceQuery` + `GetWalletBalanceHandler`
- [ ] **Events (EventBus)**:
  - `TransferCompletedEvent` → triggers notification via Kafka outbox
  - `TransferFailedEvent` → triggers compensation
- [ ] **Sagas** (si aplica):
  - `TransferSaga`: orquesta el flujo completo de transferencia
- [ ] **Refactorizar controladores**: Los endpoints REST despachan Commands/Queries en vez de llamar use-cases directamente

### Estructura

```text
transaction-service/src/
├── application/
│   ├── commands/
│   │   ├── transfer-money.command.ts
│   │   ├── transfer-money.handler.ts
│   │   ├── create-money-request.command.ts
│   │   └── ...
│   ├── queries/
│   │   ├── get-transaction.query.ts
│   │   ├── get-transaction.handler.ts
│   │   └── ...
│   ├── events/
│   │   ├── transfer-completed.event.ts
│   │   └── transfer-failed.event.ts
│   └── sagas/
│       └── transfer.saga.ts
```

### Criterio de completitud

- [ ] Todos los endpoints de transaction-service usan CommandBus/QueryBus
- [ ] Events disparan side-effects (notificaciones, outbox) via EventBus
- [ ] Tests unitarios para cada Handler

---

## Fase 5 — Kafka: Contratos de Eventos y Retry Formal

**Objetivo:** Formalizar eventos Kafka con versionado, envelope y estrategia de retry/DLQ.

**Prioridad:** 🟠 Alta
**Duración estimada:** 2-3 días

### Tareas

- [ ] **Event Envelope estándar**:
  ```typescript
  interface DomainEvent<T> {
    eventId: string;          // UUID
    eventType: string;        // "TransferCompleted"
    version: number;          // 1
    occurredAt: string;       // ISO 8601
    producer: string;         // "transaction-service"
    correlationId: string;    // trace_id
    causationId: string;      // parent event id
    data: T;                  // payload tipado
  }
  ```
- [ ] **Event versioning**: `TransferCompletedV1`, con soporte para deserialización backward-compatible
- [ ] **Topics formalizados**:
  ```text
  fintech.transaction.transfer.completed.v1
  fintech.transaction.transfer.failed.v1
  fintech.transaction.money-request.created.v1
  ```
- [ ] **Retry strategy formal**:
  ```text
  original → retry-1 (1s) → retry-2 (5s) → retry-3 (30s) → DLQ
  ```
  Con backoff exponencial + jitter
- [ ] **Consumer idempotency**: Cada consumer guarda `eventId` procesados para evitar re-procesamiento
- [ ] **Dead Letter Queue**: Topic `fintech.dlq` con alertas en SigNoz cuando hay mensajes

### Archivos a crear

```text
[NEW]    shared/kafka-contracts/src/events/          → Interfaces de eventos
[NEW]    shared/kafka-contracts/src/envelope.ts       → Event envelope
[MODIFY] transaction-service/src/infrastructure/kafka/  → Producer con envelope
[MODIFY] notification-service/src/...                   → Consumer con retry
[MODIFY] worker-service/src/...                         → Consumer con retry
```

### Criterio de completitud

- [ ] Todos los eventos Kafka usan el envelope estándar
- [ ] Retry con backoff funciona para 3 intentos antes de DLQ
- [ ] Consumer no re-procesa eventos duplicados

---

## Fase 6 — Seguridad

**Objetivo:** Reforzar autenticación, autorización y gestión de secretos.

**Prioridad:** 🟠 Alta
**Duración estimada:** 3-4 días

### Tareas

- [ ] **JWT Access + Refresh Token**:
  - Access Token: 15min expiry
  - Refresh Token: 7d expiry, rotación en cada uso
  - Refresh Token Family: detectar reutilización (posible robo)
  - Token Revocation: lista negra en Redis
- [ ] **RBAC Guards**:
  - Roles: `USER`, `ADMIN`
  - Decoradores: `@Roles('ADMIN')`, `@Public()`
  - Guard global que verifica JWT + roles
- [ ] **Rate Limiting**:
  - `@nestjs/throttler` en auth-service (login: 5 req/min, register: 3 req/min)
  - Rate limiting global en otros servicios (100 req/min)
- [ ] **Kubernetes Secrets**:
  - Mover `JWT_SECRET`, `DATABASE_URL`, `REDIS_HOST` de env hardcodeados a `Secret` objects
  - Actualizar deployments para usar `secretKeyRef`
- [ ] **Helmet + CORS**: Reforzar headers HTTP

### Archivos a crear/modificar

```text
[NEW]    auth-service/src/infrastructure/security/jwt-refresh.strategy.ts
[NEW]    auth-service/src/infrastructure/security/roles.guard.ts
[NEW]    auth-service/src/infrastructure/security/roles.decorator.ts
[NEW]    k8s/00-secrets.yaml                        → Kubernetes Secrets
[MODIFY] k8s/02-microservices.yaml                  → secretKeyRef
[MODIFY] auth-service/src/auth.module.ts            → Throttler, Guards
```

### Criterio de completitud

- [ ] Login retorna access_token + refresh_token
- [ ] Refresh token rotation funciona
- [ ] Rate limiting bloquea exceso de requests
- [ ] Cero secretos hardcodeados en YAML de deployments

---

## Fase 7 — Health Checks y Probes

**Objetivo:** Separar liveness/readiness/startup probes correctamente.

**Prioridad:** 🟡 Media
**Duración estimada:** 1-2 días

### Tareas

- [ ] **Implementar 3 endpoints por servicio** usando `@nestjs/terminus`:
  - `/health/live` — Liveness: ¿el proceso está vivo? (NO depende de DB/Redis/Kafka)
  - `/health/ready` — Readiness: ¿puede recibir tráfico? (verifica DB + Redis + Kafka)
  - `/health/startup` — Startup: ¿terminó de inicializar?
- [ ] **Actualizar K8s probes**:
  ```yaml
  livenessProbe:
    httpGet:
      path: /health/live
      port: http
    initialDelaySeconds: 10
    periodSeconds: 15
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /health/ready
      port: http
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /health/startup
      port: http
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 30
  ```
- [ ] **Liveness NO debe depender de MySQL/Kafka/Redis** (evitar cascading restarts)

### Criterio de completitud

- [ ] Los 3 endpoints responden correctamente en cada servicio
- [ ] K8s usa probes separadas
- [ ] Un MySQL slow no mata pods por liveness failure

---

## Fase 8 — Testing Completo

**Objetivo:** Alcanzar >80% coverage con tests unitarios, integración, concurrencia y carga.

**Prioridad:** 🟠 Alta
**Duración estimada:** 4-5 días

### Tareas

- [ ] **Unit Tests** (70% del esfuerzo):
  - Value Objects: `Money`, `UserId`, `Email`
  - Entidades: `Transaction`, `UserProfile`
  - Command/Query Handlers
  - Servicios de dominio
- [ ] **Integration Tests** (20%):
  - Flujo completo de transferencia (REST → Command → DB → Outbox → Kafka)
  - Login + verificación de email + TOTP
  - tRPC client-server roundtrip
- [ ] **Contract Tests**:
  - Validar que NestJS devuelve exactamente los mismos contratos que Spring
  - Status codes, body shape, error format
- [ ] **Concurrency Tests** (mejorar existentes):
  - 10 requests concurrentes al mismo balance
  - Doble spend protection
  - Idempotency con mismo key
- [ ] **Load Tests K6**:
  - Transferencias bajo carga (100 VUs, 30s)
  - Login bajo carga
  - Spike test (0 → 200 VUs en 10s)
- [ ] **Financial Invariants**:
  - `balance_before - debit + credit = balance_after`
  - `sender.balance >= 0` después de cualquier operación
  - Sum de todos los balances = constante (conservation of money)

### Criterio de completitud

- [ ] >80% coverage global
- [ ] Tests de concurrencia pasan al 100%
- [ ] K6 report documenta RPS, P95, P99

---

## Fase 9 — Observabilidad Avanzada

**Objetivo:** Correlación distribuida completa y métricas de negocio en SigNoz.

**Prioridad:** 🟡 Media
**Duración estimada:** 2-3 días

### Tareas

- [ ] **Correlation IDs en todas las requests**:
  ```text
  trace_id, span_id, correlation_id, request_id, user_id, transaction_id
  ```
  - Middleware que genera/propaga `X-Correlation-Id`
  - Incluir en logs Winston
  - Incluir como atributos de span OpenTelemetry
- [ ] **Business Metrics** (custom counters/histograms):
  ```text
  fintech_transfers_total{status="completed|failed"}
  fintech_transfer_amount_total{currency="ARS"}
  fintech_transfer_duration_seconds
  fintech_idempotency_hits_total
  fintech_insufficient_funds_total
  fintech_kafka_consumer_lag
  fintech_outbox_pending_events
  ```
- [ ] **Dashboards SigNoz**:
  - Business Dashboard (transfers, amounts, failures)
  - Application Dashboard (RPS, latency, errors by service)
  - Infrastructure Dashboard (CPU, RAM, pods)
  - Kafka Dashboard (consumer lag, DLQ size)
- [ ] **Alerts SigNoz**:
  - Error rate > 5% en últimos 5 min
  - P99 latency > 2s
  - Kafka consumer lag > 1000
  - Outbox pending > 100

### Criterio de completitud

- [ ] Un trace en SigNoz muestra el flujo completo: React → auth → transaction → user → Kafka → notification
- [ ] Dashboard de negocio muestra métricas financieras en tiempo real
- [ ] Alerts configuradas y funcionando

---

## Fase 10 — Kubernetes Hardening

**Objetivo:** Reforzar seguridad y resiliencia del clúster.

**Prioridad:** 🟡 Media
**Duración estimada:** 2-3 días

### Tareas

- [ ] **Security Context en todos los pods**:
  ```yaml
  securityContext:
    runAsNonRoot: true
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
    capabilities:
      drop: ["ALL"]
  ```
- [ ] **Pod Security Standards**: Aplicar `restricted` policy al namespace
- [ ] **NetworkPolicy**: Restringir tráfico entre servicios (solo permitir rutas necesarias)
- [ ] **HPA refinado**:
  - Escalar auth-service y transaction-service por CPU (70%) y custom metrics
  - Min 1, Max 3 réplicas
- [ ] **PDB** (Pod Disruption Budget):
  - `minAvailable: 1` para servicios críticos
- [ ] **Topology Spread Constraints**: Distribuir pods entre nodos cuando haya múltiples
- [ ] **Resource requests/limits** revisados por servicio:
  ```yaml
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 256Mi
  ```

### Criterio de completitud

- [ ] Todos los pods corren como non-root
- [ ] NetworkPolicies restringen tráfico no autorizado
- [ ] HPA escala automáticamente bajo carga

---

## Fase 11 — Validación Final y Paridad con Spring

**Objetivo:** Verificar paridad funcional completa NestJS vs Spring Boot.

**Prioridad:** 🟡 Media
**Duración estimada:** 2-3 días

### Tareas

- [ ] **Comparación funcional**:
  - 100% endpoints equivalentes
  - 100% contratos compatibles
  - 100% casos de negocio críticos
- [ ] **Performance comparison**:
  ```text
  Métrica         | Spring | NestJS |
  RPS             |   ?    |   ?    |
  P50             |   ?    |   ?    |
  P95             |   ?    |   ?    |
  P99             |   ?    |   ?    |
  CPU             |   ?    |   ?    |
  RAM             |   ?    |   ?    |
  ```
- [ ] **Tests de resiliencia**:
  - Kafka down → ¿qué pasa con las transferencias?
  - Redis down → ¿funciona el fallback de idempotencia?
  - MySQL slow → ¿timeouts correctos?
  - User service down → ¿transaction service maneja el error?
  - Duplicate Kafka event → ¿consumer es idempotente?
  - Concurrent transfers → ¿balances correctos?
- [ ] **Documentación final**:
  - Actualizar README con nueva arquitectura
  - API documentation completa (Swagger)
  - Runbook de operaciones

### Criterio de completitud

- [ ] Paridad funcional 100% verificada con contract tests
- [ ] Performance comparable o superior a Spring
- [ ] Resiliencia verificada para todos los escenarios de fallo
- [ ] Decisión GO/NO-GO para eliminar `backend/` Spring

---

## Resumen de Prioridades

| Fase | Nombre | Prioridad | Estado | Duración |
|:----:|--------|:---------:|:------:|:--------:|
| 0 | Baseline y Estabilización | 🔴 Crítica | 🟢 Completada | 2-3 días |
| 1 | Consistencia Financiera | 🔴 Crítica | 🟢 Completada | 3-4 días |
| 2 | gRPC → tRPC Completo | 🔴 Crítica | 🟢 Completada | 3-4 días |
| 3 | DDD Pragmático | 🟠 Alta | 🟢 Completada | 3-4 días |
| 4 | CQRS @nestjs/cqrs | 🟠 Alta | 🟢 Completada | 3-4 días |
| 5 | Kafka Contracts + Retry | 🟠 Alta | 🟢 Completada | 2-3 días |
| 6 | Seguridad | 🟠 Alta | Pendiente | 3-4 días |
| 7 | Health Checks + Probes | 🟡 Media | 🟢 Completada | 1-2 días |
| 8 | Testing Completo | 🟠 Alta | ⚡ Parcial | 4-5 días |
| 9 | Observabilidad Avanzada | 🟡 Media | Pendiente | 2-3 días |
| 10 | Kubernetes Hardening | 🟡 Media | Pendiente | 2-3 días |
| 11 | Validación Final | 🟡 Media | Pendiente | 2-3 días |

**Duración total estimada:** 30-42 días

---

## Arquitectura Objetivo

```text
                         INTERNET
                            │
                            ▼
                    ┌──────────────┐
                    │    Traefik   │
                    │ Ingress/TLS  │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌─────────────┐
    │   Auth   │    │   User   │    │ Transaction │
    │ Service  │    │ Service  │    │   Service   │
    │  (REST)  │    │(REST+tRPC│    │(REST+CQRS)  │
    └────┬─────┘    └────┬─────┘    └──────┬──────┘
         │               │                │
        DB              DB               DB
                         ▲                │
                         │ tRPC           ▼
                         └────────── Outbox
                                         │
                                         ▼
                                      Kafka
                                   ┌─────┴─────┐
                                   ▼           ▼
                             Notification    Worker
                                   │           │
                                   DB          DB

              ┌───────────────────────────────────────┐
              │ Redis                                  │
              │ Cache / Idempotency / Rate Limiting   │
              └───────────────────────────────────────┘

              ┌───────────────────────────────────────┐
              │ OpenTelemetry Collector               │
              └───────────────────┬───────────────────┘
                                  ▼
                               SigNoz
```

### Protocolos de Comunicación

| Comunicación                | Tecnología   |
|-----------------------------|--------------|
| React → Services            | REST         |
| Service → Service síncrono  | tRPC v10     |
| Service → Service asíncrono | Kafka        |
| Observabilidad              | OTLP         |
| DB                          | Prisma/MySQL |
| Ingress                     | Traefik      |
