# Migración Spring Boot → NestJS: Plan de Implementación

## Contexto

Migración completa del backend de **FinTech Wallet** desde Java Spring Boot a **NestJS + TypeScript + Prisma ORM + pnpm**, manteniendo MySQL, Kubernetes, OpenTelemetry/SigNoz, gRPC y Apache Kafka.

---

## Estándares Obligatorios de Proyecto (Checklist de Calidad)

Cada microservicio migrado debe cumplir obligatoriamente con los siguientes 6 pilares de calidad comprobados en `auth-service` y `user-service`:

1. **Control de Versiones y Git Hygiene**:
   - Eliminar cualquier subcarpeta `.git` generada por Nest CLI dentro de `backend-nestjs/<microservicio>/` para evitar que Git trate el servicio como submódulo desconfigurado.
   - Mantener `pnpm-lock.yaml` trackeado en Git para garantizar builds deterministas.
   - Configurar `.dockerignore` limpio excluyendo `node_modules`, `dist/`, `.env`, `.git/`, `coverage/`, `README.md`.

2. **Arquitectura Hexagonal Estricta (Ports & Adapters)**:
   - `src/domain/`: Entidades de dominio, Objetos de Valor y Puertos Inbound/Outbound.
   - `src/application/`: Casos de uso puros independientes de la infraestructura.
   - `src/adapters/`: Adaptadores Inbound (REST, gRPC, Kafka Consumers) y Outbound (Prisma ORM, Redis, HTTP Clients, Kafka Producers, Email).
   - `src/infrastructure/`: Configuración global, Seguridad y Telemetría.

3. **Configuración de Swagger / OpenAPI Accesible**:
   - Configurar `SwaggerModule.setup('<servicio>/docs', app, document)` y `SwaggerModule.setup('api-docs', app, document)` en `main.ts` para permitir el acceso tanto por Ingress Traefik (`http://localhost/<servicio>/docs/`) como en desarrollo local (`http://localhost:<puerto>/api-docs`).

4. **Observabilidad Estándar OTLP (SigNoz APM)**:
   - **Trazas OTLP**: Ingesta distribuida en `/v1/traces` para rastrear endpoints HTTP REST y llamadas gRPC/Kafka.
   - **Logs Winston OTLP**: Formateador JSON enviado a `/v1/logs` con inyección de `trace_id`, `span_id` y metadatos nativos de Kubernetes (`k8s.pod.name`, `k8s.namespace.name`, `k8s.deployment.name`, `k8s.container.name`, `k8s.node.name`, `k8s.cluster.name`, `host.name`, `deployment.environment`).
   - **Métricas OTLP**: Exportador en `/v1/metrics` registrando throughput (RPS), latencias y recursos (CPU/RAM/Event Loop).

5. **Dockerfile Multi-Stage Optimizado**:
   - Stage 1 `builder` y Stage 2 `runner` sobre `node:22-alpine`.
   - Uso de `pnpm install` y `pnpm dlx prisma generate` para no fallar en caso de lockfiles opcionales.

6. **Documentación Individual Obligatoria (`README.md`)**:
   - Generar `backend-nestjs/<microservicio>/README.md` incluyendo:
     - Descripción del dominio y características principales.
     - Árbol de arquitectura de carpetas (`text`).
     - Variables de entorno `.env`.
     - Endpoints REST, gRPC o eventos Kafka con ejemplos `curl` / `grpcurl`.
     - Modos de ejecución (Local standalone, Docker, Kubernetes).
     - Enlace directo a Swagger UI.

---

## Decisiones Arquitectónicas Confirmadas

| # | Decisión | Elección |
|---|---------|----------|
| 1 | Estructura proyecto | Repositorio principal `fintech-wallet` con subdirectorio `backend-nestjs/` |
| 2 | Arquitectura interna | **Hexagonal Architecture** (Ports & Adapters) |
| 3 | Puertos HTTP | **Node.js estándar** (`auth`: 3001, `user`: 3002, `transaction`: 3003, `notification`: 3004, `worker`: 3005) |
| 4 | Puertos gRPC | `user-service`: `50051` (K8s `9090`) |
| 5 | Coexistencia | **Strangler Fig** (Spring + NestJS en paralelo) |
| 6 | Base de datos | **Reusar tablas MySQL** existentes con Prisma ORM (`@@map()`) |
| 7 | Ingress & Ruteo | **Traefik Nativo** (`k8s/05-ingress.yaml`) |
| 8 | OpenTelemetry | OTLP Traces + Winston OTLP Logs con K8s metadata + OTLP Metrics |
| 9 | Inter-servicio RPC | **gRPC** con `@nestjs/microservices` |
| 10 | Mensajería | **kafkajs** (Kafka KRaft) |
| 11 | Cache & State | **ioredis** (Redis 7) |
| 12 | Testing | **Jest + Supertest** |

---

## Inventario del Sistema (Estado Actual)

| Servicio | Puerto HTTP | Puerto gRPC | DB | Estado Migración |
|----------|------------|-------------|-----|------------------|
| api-gateway | 8080 | — | — | 🗑️ Eliminado (Reemplazado por Traefik Ingress) |
| auth-service | 3001 | — | authdb | ✅ Migrado a NestJS 11 |
| user-service | 3002 | 50051 | userdb | ✅ Migrado a NestJS 11 |
| transaction-service | 3003 | — | transactiondb | ⏳ Pendiente (FASE 4) |
| notification-service | 3004 | — | notificationdb | ⏳ Pendiente (FASE 5) |
| worker-service | 3005 | — | workerdb | ⏳ Pendiente (FASE 6) |

---

## FASE 1: Auth Service NestJS — Desarrollo Local
- [x] **Tarea 1.1 - 1.16**: Migración completada a NestJS 11 con Hexagonal Architecture, Prisma, Redis y JWT.

## FASE 2: Containerización + K8s Auth Service NestJS + SigNoz Observabilidad
- [x] **Tarea 2.1 - 2.8**: Containerizado, desplegado en K8s y validado con observabilidad SigNoz OTLP (Traces/Logs/Metrics) y Swagger en `http://localhost/auth/docs/`.

## FASE 3: User Service NestJS Migration (Hexagonal Architecture + gRPC + REST + Prisma)
- [x] **Tarea 3.1 - 3.11**: Migración completada con gRPC (`user.proto`), REST, Prisma, SigNoz y Swagger en `http://localhost/users/docs/`.

---

## FASE 4: Transaction Service NestJS Migration (Hexagonal Architecture + gRPC Client + Prisma + Redis + Kafka)

- [ ] **Tarea 4.1**: Inicializar `backend-nestjs/transaction-service` con Hexagonal Architecture y eliminar subcarpetas `.git` internas.
- [ ] **Tarea 4.2**: Configurar Prisma ORM 7 (`transactiondb`) con `@prisma/adapter-mariadb`.
- [ ] **Tarea 4.3**: Implementar Adaptador Outbound gRPC Client conectando a `user-service:50051` (`UserService.GetUserProfile`).
- [ ] **Tarea 4.4**: Implementar Idempotencia de Transferencias con adaptador Redis (`ioredis` en `X-Idempotency-Key`).
- [ ] **Tarea 4.5**: Implementar Adaptador Outbound Kafka Producer (`kafkajs`) emitiendo eventos `transfer_completed`.
- [ ] **Tarea 4.6**: Implementar controladores REST HTTP + DTOs con validaciones `class-validator`.
- [ ] **Tarea 4.7**: Configurar Swagger UI en `/transactions/docs` y `/api-docs`.
- [ ] **Tarea 4.8**: Configurar Winston OTLP Logger (con metadatos K8s) y OpenTelemetry Tracing/Metrics hacia SigNoz.
- [ ] **Tarea 4.9**: Crear `Dockerfile` multi-stage optimizado para `transaction-service`.
- [ ] **Tarea 4.10**: Construir imagen con `nerdctl` y actualizar `k8s/02-microservices.yaml` (puerto 3003) y `k8s/05-ingress.yaml` (`/transactions`).
- [ ] **Tarea 4.11**: Generar documentación individual `backend-nestjs/transaction-service/README.md` con arquitectura de carpetas, env vars, endpoints y cURL.

---

## FASE 5: Notification Service NestJS Migration (Hexagonal Architecture + Kafka Consumer + SMTP)

- [ ] **Tarea 5.1**: Inicializar `backend-nestjs/notification-service` con Hexagonal Architecture y Git hygiene.
- [ ] **Tarea 5.2**: Configurar Prisma ORM (`notificationdb`) para registrar notificaciones persistidas.
- [ ] **Tarea 5.3**: Implementar Adaptador Inbound Kafka Consumer (`kafkajs`) consumiendo del topic `transfer_completed`.
- [ ] **Tarea 5.4**: Implementar Adaptador Outbound Email (Nodemailer / Mailpit).
- [ ] **Tarea 5.5**: Configurar Swagger UI en `/notifications/docs` y `/api-docs`.
- [ ] **Tarea 5.6**: Configurar Winston OTLP Logger con correlación `trace_id` y atributos K8s para SigNoz.
- [ ] **Tarea 5.7**: Crear `Dockerfile` multi-stage y desplegar en Kubernetes (puerto 3004).
- [ ] **Tarea 5.8**: Generar documentación individual `backend-nestjs/notification-service/README.md` con árbol de carpetas.

---

## FASE 6: Worker Service NestJS Migration (Hexagonal Architecture + PDF Generation + Kafka DLQ)

- [ ] **Tarea 6.1**: Inicializar `backend-nestjs/worker-service` con Hexagonal Architecture.
- [ ] **Tarea 6.2**: Configurar Prisma ORM (`workerdb`) para `statement_jobs` y `audit_logs`.
- [ ] **Tarea 6.3**: Implementar servicio de generación de extractos bancarios en PDF.
- [ ] **Tarea 6.4**: Implementar procesamiento de reintentos y Dead Letter Queue (DLQ) Kafka.
- [ ] **Tarea 6.5**: Configurar Swagger UI en `/worker/docs` y `/api-docs`.
- [ ] **Tarea 6.6**: Configurar Winston OTLP Logger + OpenTelemetry para SigNoz.
- [ ] **Tarea 6.7**: Crear `Dockerfile` multi-stage y actualizar manifiestos de Kubernetes (puerto 3005).
- [ ] **Tarea 6.8**: Generar documentación individual `backend-nestjs/worker-service/README.md` con árbol de carpetas.

---

## ANEXO FINAL: Configuración de Reglas de Alerta en SigNoz

Para configurar las reglas de monitoreo en **SigNoz UI (`http://localhost:3301`) -> Alerts**:

1. **Alerta de Tasa de Errores (Error Rate Alert)**:
   - **Métrica**: `rate(http_requests_errors_total[5m]) / rate(http_requests_total[5m]) * 100`
   - **Condición**: > 5% durante 5 minutos.
   - **Severidad**: `ERROR` / `HIGH`.

2. **Alerta de Latencia P99 (Latency Spike Alert)**:
   - **Métrica**: `histogram_quantile(0.99, rate(http_server_duration_ms_bucket[5m]))`
   - **Condición**: > 2000 ms (2 segundos).
   - **Severidad**: `WARNING` / `MEDIUM`.

3. **Alerta de Ausencia de Datos (Absent Data Alert)**:
   - **Métrica**: `rate(http_requests_total[10m])`
   - **Condición**: == 0 por más de 10 minutos.
   - **Severidad**: `CRITICAL`.
