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

7. **Pruebas Unitarias y E2E Obligatorias (Jest & Supertest)**:
   - Todo microservicio migrado debe incluir su suite de pruebas unitarias (`pnpm test`) con Jest y Mocks para los adaptadores hexagonales, verificando la lógica de los Casos de Uso y Controladores REST con paso 100% exitoso.

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
| transaction-service | 3003 | — | transactiondb | ✅ Migrado a NestJS 11 |
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

- [x] **Tarea 4.1**: Inicializar `backend-nestjs/transaction-service` con Hexagonal Architecture y eliminar subcarpetas `.git` internas.
- [x] **Tarea 4.2**: Configurar Prisma ORM 7 (`transactiondb`) con `@prisma/adapter-mariadb`.
- [x] **Tarea 4.3**: Implementar Adaptador Outbound gRPC Client conectando a `user-service:50051` (`UserService.GetUserProfile`).
- [x] **Tarea 4.4**: Implementar Idempotencia de Transferencias con adaptador Redis (`ioredis` en `X-Idempotency-Key`).
- [x] **Tarea 4.5**: Implementar Adaptador Outbound Kafka Producer (`kafkajs`) emitiendo eventos `transfer_completed`.
- [x] **Tarea 4.6**: Implementar controladores REST HTTP + DTOs con validaciones `class-validator`.
- [x] **Tarea 4.7**: Configurar Swagger UI en `/transactions/docs` y `/api-docs`.
- [x] **Tarea 4.8**: Configurar Winston OTLP Logger (con metadatos K8s) y OpenTelemetry Tracing/Metrics hacia SigNoz.
- [x] **Tarea 4.9**: Crear `Dockerfile` multi-stage optimizado para `transaction-service`.
- [x] **Tarea 4.10**: Construir imagen con `nerdctl` y actualizar `k8s/02-microservices.yaml` (puerto 3003) y `k8s/05-ingress.yaml` (`/transactions`).
- [x] **Tarea 4.11**: Creación y ejecución de Pruebas Unitarias y E2E con Jest (`pnpm test`).
- [x] **Tarea 4.12**: Generar documentación individual `backend-nestjs/transaction-service/README.md` con arquitectura de carpetas, env vars, endpoints y cURL.

---

## FASE 5: Notification Service NestJS Migration (Hexagonal Architecture + Kafka Consumer + SMTP)

- [x] **Tarea 5.1**: Inicializar `backend-nestjs/notification-service` con Hexagonal Architecture y Git hygiene.
- [x] **Tarea 5.2**: Configurar Prisma ORM (`notificationdb`) para registrar notificaciones persistidas.
- [x] **Tarea 5.3**: Implementar Adaptador Inbound Kafka Consumer (`kafkajs`) consumiendo del topic `transfer_completed`.
- [x] **Tarea 5.4**: Implementar Adaptador Outbound Email (Nodemailer / Mailpit).
- [x] **Tarea 5.5**: Configurar Swagger UI en `/notifications/docs` y `/api-docs`.
- [x] **Tarea 5.6**: Configurar Winston OTLP Logger con correlación `trace_id` y atributos K8s para SigNoz.
- [x] **Tarea 5.7**: Crear `Dockerfile` multi-stage y desplegar en Kubernetes (puerto 3004).
- [x] **Tarea 5.8**: Creación y ejecución de Pruebas Unitarias y E2E con Jest (`pnpm test`).
- [x] **Tarea 5.9**: Generar documentación individual `backend-nestjs/notification-service/README.md` con árbol de carpetas.

---

## FASE 6: Worker Service NestJS Migration (Hexagonal Architecture + PDF Generation + Kafka DLQ)

- [x] **Tarea 6.1**: Inicializar `backend-nestjs/worker-service` con Hexagonal Architecture.
- [x] **Tarea 6.2**: Configurar Prisma ORM (`workerdb`) para `statement_jobs` y `audit_logs`.
- [x] **Tarea 6.3**: Implementar servicio de generación de extractos bancarios en PDF.
- [x] **Tarea 6.4**: Implementar procesamiento de reintentos y Dead Letter Queue (DLQ) Kafka.
- [x] **Tarea 6.5**: Configurar Swagger UI en `/worker/docs` y `/api-docs`.
- [x] **Tarea 6.6**: Configurar Winston OTLP Logger + OpenTelemetry para SigNoz.
- [x] **Tarea 6.7**: Crear `Dockerfile` multi-stage y actualizar manifiestos de Kubernetes (puerto 3005).
- [x] **Tarea 6.8**: Creación y ejecución de Pruebas Unitarias y E2E con Jest (`pnpm test`).
- [x] **Tarea 6.9**: Generar documentación individual `backend-nestjs/worker-service/README.md` con árbol de carpetas.
---

## FASE 7: Frontend React Application Containerization & Ingress Integration (Nginx + Traefik Ingress)

- [x] **Tarea 7.1**: Configurar servidor Nginx `frontend/nginx.conf` con soporte para SPA (`try_files index.html`) y proxied endpoints.
- [x] **Tarea 7.2**: Crear `frontend/Dockerfile` Multi-Stage (`node:22-alpine` builder y `nginx:alpine` runner).
- [x] **Tarea 7.3**: Crear `frontend/.dockerignore` excluyendo `node_modules`, `dist` y temporales.
- [x] **Tarea 7.4**: Configurar manifiesto `k8s/03-frontend.yaml` con contenedor en puerto 80, NodePort 30000, Liveness/Readiness probes y límites de recursos.
- [x] **Tarea 7.5**: Configurar enrutamiento Ingress en Traefik (`k8s/05-ingress.yaml`) vinculando la ruta `/` al servicio `frontend:80`.
- [x] **Tarea 7.6**: Integrar telemetría OpenTelemetry Web SDK (`frontend/src/telemetry.js`) hacia SigNoz APM.
- [x] **Tarea 7.7**: Compilar la imagen con `nerdctl` en Rancher Desktop (`k8s.io` namespace) y desplegar en Kubernetes (**Pod 1/1 Running**).
- [x] **Tarea 7.8**: Generar la documentación técnica individual `frontend/README.md`.

---

## ANEXO: Dashboards de Observabilidad Completa en SigNoz (`k8s/dashboards/`)

El sistema cuenta con **5 Dashboards Modulares en formato JSON Nactivo** listos para ser importados vía UI (`http://localhost:3301`) o mediante los scripts bajo demanda `.\import-signoz-dashboards.ps1` / `./import-signoz-dashboards.sh`:

1. **`01. NestJS Microservices RED Metrics & APM`** (`signoz-01-nestjs-apm.json`): Solicitudes/sec (RPS), Latencias P50/P95/P99, Tasa de Errores % 4xx/5xx y Métricas de Node.js Runtime (Heap Used/Total, Event Loop Lag).
2. **`02. MySQL Database Health & Performance`** (`signoz-02-mysql-health.json`): QPS de lectura/escritura en `authdb`, `userdb`, `transactiondb`, Consultas Lentas (>200ms) y Pool de Conexiones.
3. **`03. Redis Cache & Idempotency Operations`** (`signoz-03-redis-cache.json`): Tasa de acierto de caché (Hit Rate %), Operaciones/sec por comando (GET/SET/DEL), Memoria usada e Idempotencia.
4. **`04. Apache Kafka KRaft & Event Streaming`** (`signoz-04-kafka-streaming.json`): Throughput de mensajes producidos/consumidos en `transfer_completed`, Consumer Lag de Notificaciones y cola Dead Letter Queue (`transfer-events-dlq`).
5. **`05. Kubernetes Workloads & Infrastructure Health`** (`signoz-05-kubernetes-workloads.json`): Consumo de CPU (milicores), Memoria RAM (Residente vs Límites), Reinicios de Pods (Restarts / OOMKilled) y Red (Rx/Tx) en el namespace `fintech`.

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
