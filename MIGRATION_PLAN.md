# Migración Spring Boot → NestJS: Plan de Implementación

## Contexto

Migración completa del backend de **FinTech Wallet** desde Java Spring Boot a **NestJS + TypeScript + Prisma + pnpm**, manteniendo MySQL, Kubernetes, OpenTelemetry/SigNoz, y gRPC.

---

## Estándares Obligatorios de Proyecto

1. **Documentación por Microservicio**: Al culminar cada fase de migración de un microservicio, es **MANDATORIO** generar o actualizar un archivo `README.md` en la raíz del proyecto (`backend-nestjs/<microservicio>/README.md`) detallando:
   - Descripción del microservicio y sus límites de dominio.
   - Puertos HTTP y gRPC configurados.
   - Variables de entorno requeridas.
   - Integración con bases de datos y servicios externos (Redis, MySQL, Kafka, Mailpit).
   - Comandos para ejecución local independiente (`pnpm start:dev`).
   - Ejemplos de uso e interacción (cURL, gRPC CLI).

2. **Observabilidad Estándar OTLP (SigNoz)**:
   - **Trazas**: OTLP HTTP Traces (`/v1/traces`) con instrumentación automática y contextualización manual.
   - **Logs**: Formateador Winston OTLP (`/v1/logs`) con inyección de `trace_id`, `span_id` y metadatos nativos de Kubernetes (`k8s.pod.name`, `k8s.namespace.name`, `k8s.deployment.name`, `k8s.container.name`, `k8s.node.name`, `k8s.cluster.name`, `host.name`, `deployment.environment`).
   - **Métricas**: Exportador OTLP Metrics (`/v1/metrics`) registrando throughput (RPS), latencias HTTP/gRPC, consumo de Memoria Heap, CPU y Event Loop Lag.

---

## Decisiones Arquitectónicas Confirmadas

| # | Decisión | Elección |
|---|---------|----------|
| 1 | Estructura proyecto | **Repos independientes** (cada servicio es standalone) |
| 2 | Código compartido | Carpeta `shared/` local en cada servicio |
| 3 | Puertos | **Node.js estándar** (3001-3005) + actualizar K8s |
| 4 | Coexistencia | **Strangler Fig** (Spring + NestJS en paralelo) |
| 5 | Arquitectura interna | **Hexagonal Architecture** (Ports & Adapters) |
| 6 | Primer servicio | **Auth Service** |
| 7 | Base de datos | **Reusar tablas MySQL** existentes con `@@map()` |
| 8 | API Gateway | **Eliminar** Gateway Spring → **Traefik nativo** |
| 9 | OpenTelemetry | Auto-instrumentación + spans manuales + Winston OTLP |
| 10 | Inter-servicio RPC | **gRPC** con `@nestjs/microservices` |
| 11 | Kafka | **kafkajs** |
| 12 | JWT Validation | **Traefik JWT plugin** |
| 13 | Redis | **ioredis** |
| 14 | Testing | **Jest** |
| 15 | Rate Limiting | **Traefik nativo** |
| 16 | Deployment | **Local primero**, luego Docker + K8s |

---

## User Review Required

> [!IMPORTANT]
> **Traefik JWT Plugin**: Los plugins de JWT para Traefik (ej: `traefik-jwt-plugin`) son community-maintained y varían en madurez. Como fallback, podemos implementar un JWT Guard en cada servicio NestJS. Esto se evaluará en la FASE 2 cuando configuremos Traefik.

> [!WARNING]
> **Repos independientes sin monorepo**: Al tener 6 repos separados, cualquier cambio en DTOs compartidos (ej: `TransferCompletedEvent`) o proto files requerirá actualización manual en cada servicio afectado. Esto es manejable para 6 servicios pero requiere disciplina.

> [!WARNING]
> **Puertos nuevos**: Cambiar de 8081-8085 a 3001-3005 requiere actualizar: K8s Services, K8s Deployments, Ingress rules, health probes, y env vars de comunicación inter-servicio. Esto se hará cuando cada servicio se despliegue en K8s.

---

## Inventario del Sistema Actual (FASE 0 - Completada)

### Microservicios Spring Boot y Estado de Migración

| Servicio | Puerto HTTP | Puerto gRPC | DB | Estado Migración |
|----------|------------|-------------|-----|------------------|
| api-gateway | 8080 | — | — | 🗑️ Eliminado (Reemplazado por Traefik/Ingress) |
| auth-service | 3001 (ex-8081) | — | authdb | ✅ Migrado a NestJS (FASE 2) |
| user-service | 3002 (ex-8082) | 50051 (ex-9090) | userdb | ✅ Migrado a NestJS (FASE 3) |
| transaction-service | 3003 (ex-8083) | — | transactiondb | ⏳ Pendiente (FASE 4) |
| notification-service | 3004 (ex-8084) | — | notificationdb | ⏳ Pendiente (FASE 5) |
| worker-service | 3005 (ex-8085) | — | workerdb | ⏳ Pendiente (FASE 6) |

---

## FASE 1: Auth Service NestJS — Desarrollo Local

### Tareas (una por una, cada una < 1 hora)

- [x] **Tarea 1.1**: Crear estructura de carpetas Hexagonal
- [x] **Tarea 1.2**: Instalar dependencias core
- [x] **Tarea 1.3**: Configurar environment y ConfigModule
- [x] **Tarea 1.4**: Configurar Prisma con authdb
- [x] **Tarea 1.5**: Implementar capa Domain
- [x] **Tarea 1.6**: Implementar adaptador de persistencia (Prisma)
- [x] **Tarea 1.7**: Implementar servicios de seguridad (JWT + TOTP)
- [x] **Tarea 1.8**: Implementar adaptador Redis (Token Blacklist)
- [x] **Tarea 1.9**: Implementar adaptador HTTP (User Profile Client)
- [x] **Tarea 1.10**: Implementar adaptador Email (Nodemailer)
- [x] **Tarea 1.11**: Implementar casos de uso (Application Layer)
- [x] **Tarea 1.12**: Implementar controlador REST + DTOs
- [x] **Tarea 1.13**: Wiring — Módulo Auth + AppModule
- [x] **Tarea 1.14**: OpenTelemetry
- [x] **Tarea 1.15**: Tests unitarios + E2E
- [x] **Tarea 1.16**: Verificar paridad con Spring Boot

---

## FASE 2: Containerización + K8s Auth Service NestJS + SigNoz Observabilidad

- [x] **Tarea 2.1**: Configurar OTLP Logger en NestJS para correlación de Logs + Trazas en SigNoz
- [x] **Tarea 2.2**: Crear `Dockerfile` multi-stage optimizado para NestJS + pnpm
- [x] **Tarea 2.3**: Construir imagen de contenedor con `nerdctl` en Rancher Desktop (`nerdctl --namespace k8s.io build`)
- [x] **Tarea 2.4**: Actualizar Deployment de `auth-service` en `k8s/02-microservices.yaml` (puerto 3001, probes `/health`)
- [x] **Tarea 2.5**: Configurar Middlewares de Traefik (JWT Plugin + Rate Limiting)
- [x] **Tarea 2.6**: Actualizar `k8s/05-ingress.yaml` para enrutar `/auth/**` al nuevo `auth-service` NestJS
- [x] **Tarea 2.7**: Desplegar en Rancher/K8s y ejecutar script de prueba `test-services-integration.ps1` para verificar Métricas, Trazas y Logs correlacionados en SigNoz UI (`:3301`)
- [x] **Tarea 2.8**: Generar documentación individual [backend-nestjs/auth-service/README.md](file:///c:/dev/DevOps/fintech-wallet/backend-nestjs/auth-service/README.md)

---

## FASE 3: User Service NestJS Migration (Hexagonal Architecture + gRPC + REST + Prisma)

- [x] **Tarea 3.1**: Inicializar `backend-nestjs/user-service` con Hexagonal Architecture (`domain`, `application`, `adapters`, `infrastructure`)
- [x] **Tarea 3.2**: Configurar Prisma 7 schema (`userdb.user_profiles`) y driver adapter `@prisma/adapter-mariadb`
- [x] **Tarea 3.3**: Implementar Dominio (`UserProfile` Entity) y Puertos outbound (Repository, gRPC Client/Server)
- [x] **Tarea 3.4**: Configurar servidor gRPC `@nestjs/microservices` con `user.proto` (`UserService.GetUserProfile`)
- [x] **Tarea 3.5**: Implementar casos de uso (Create Profile, Get Profile, Update Profile, Kyc Verification)
- [x] **Tarea 3.6**: Implementar controladores REST + gRPC Controllers
- [x] **Tarea 3.7**: Configurar Winston Logger + OTLP Telemetry (SigNoz)
- [x] **Tarea 3.8**: Crear `Dockerfile` multi-stage para `user-service` + pnpm
- [x] **Tarea 3.9**: Construir imagen con `nerdctl` y actualizar `k8s/02-microservices.yaml`
- [x] **Tarea 3.10**: Desplegar en K8s y verificar comunicación gRPC/HTTP con `auth-service` y observabilidad en SigNoz UI
- [x] **Tarea 3.11**: Generar documentación individual [backend-nestjs/user-service/README.md](file:///c:/dev/DevOps/fintech-wallet/backend-nestjs/user-service/README.md)

---

## FASE 4: Transaction Service NestJS Migration (Hexagonal Architecture + gRPC + Prisma + Redis)
- [ ] **Tarea 4.1**: Inicializar `backend-nestjs/transaction-service`
- [ ] **Tarea 4.2**: Prisma Schema (`transactiondb`)
- [ ] **Tarea 4.3**: Adaptador gRPC Client a `user-service`
- [ ] **Tarea 4.4**: Kafka Producer (Transfer events)
- [ ] **Tarea 4.5**: Containerización y K8s deployment
- [ ] **Tarea 4.6**: Documentación individual `transaction-service/README.md`

---

## FASE 5: Notification Service NestJS Migration (RabbitMQ/Kafka + Nodemailer)
- [ ] **Tarea 5.1**: Inicializar `backend-nestjs/notification-service`
- [ ] **Tarea 5.2**: Kafka Consumer & SMTP Adapter
- [ ] **Tarea 5.3**: Containerización y K8s deployment
- [ ] **Tarea 5.4**: Documentación individual `notification-service/README.md`

---

## FASE 6: Worker Service NestJS Migration (Cron Jobs + Outbox Pattern)
- [ ] **Tarea 6.1**: Inicializar `backend-nestjs/worker-service`
- [ ] **Tarea 6.2**: Outbox Consumer & Cron tasks
- [ ] **Tarea 6.3**: Containerización y K8s deployment
- [ ] **Tarea 6.4**: Documentación individual `worker-service/README.md`

---

## ANEXO FINAL: Configuración de Reglas de Alerta en SigNoz (Opcional)

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
   - **Condición**: == 0 por más de 10 minutos en horario laboral.
   - **Severidad**: `CRITICAL`.
