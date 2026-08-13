# Worker Service (NestJS) ⚙️

Servicio asíncrono en **NestJS** diseñado bajo **Arquitectura Hexagonal (Ports & Adapters)** para el procesamiento de tareas pesadas en segundo plano: generación de extractos bancarios en formato PDF con firma institucional, auditoría transaccional, y manejo de Dead Letter Queue (DLQ) mediante Apache Kafka.

---

## 🏗️ Arquitectura Hexagonal

```text
backend-nestjs/worker-service/
├── src/
│   ├── adapters/                  # Capa de Adaptadores (Infraestructura)
│   │   ├── inbound/               # Adaptadores de entrada (Trigger / Drivers)
│   │   │   ├── kafka/             # Kafka Worker Consumer & DLQ Producer
│   │   │   └── rest/              # REST Controllers (HealthController & WorkerController)
│   │   └── outbound/              # Adaptadores de salida (Driven / External)
│   │       ├── database/          # Prisma ORM & Repositorios MySQL (workerdb)
│   │       ├── pdf/               # Generador de Extractos Bancarios en PDF (PDFKit)
│   │       └── telemetry/         # OpenTelemetry Tracer Provider (OTLP)
│   ├── application/               # Casos de Uso y Servicios de Aplicación
│   │   └── use-cases/             # Lógica de Negocio (StatementJob & AuditLog)
│   ├── domain/                    # Entidades de Dominio y Puertos
│   │   ├── entities/              # DTOs y Modelos de Negocio
│   │   └── ports/                 # Puertos Inbound/Outbound (Interfaces)
│   └── main.ts                    # Bootstrap del servicio (:3005)
├── prisma/                        # Schema Prisma (workerdb: statement_jobs, audit_logs)
└── test/                          # Pruebas E2E y Unitarias
```

---

## 🚀 Características Principales

1. **Generación de Extractos PDF**: Utiliza `PDFKit` para la generación asíncrona de estados de cuenta con firma institucional y detalle transaccional.
2. **Event-Driven & Kafka DLQ**: Consume el tópico `transfer_completed`. En caso de falla en el procesamiento de auditoría o extractos, redirige el mensaje a `transfer-events-dlq` para reintentos y auditoría.
3. **Observabilidad SigNoz & OpenTelemetry**: Traza cada ejecución con `OTLPExporter` enviando spans y logs enriquecidos con `trace_id`, `span_id` y atributos K8s (`k8s.pod.name`, `k8s.namespace.name`).
4. **Persistencia aislada (Database-per-Service)**: Base de datos MySQL independiente (`workerdb`) para `statement_jobs` y `audit_logs`.
5. **Documentación OpenAPI / Swagger**: Disponible en `/worker/docs` y `/api-docs`.

---

## 🔧 Comandos de Ejecución

```bash
# Instalar dependencias
pnpm install

# Generar cliente de Prisma
pnpm exec prisma generate

# Aplicar esquema a la base de datos MySQL (workerdb)
pnpm exec prisma db push

# Ejecutar en modo desarrollo
pnpm run start:dev

# Ejecutar pruebas unitarias y de integración
pnpm test
```

---

## 🐳 Docker & Kubernetes Deployment

```bash
# Construir imagen con nerdctl en containerd (Rancher Desktop)
nerdctl --namespace k8s.io build -t fintech/worker-service:nestjs ./backend-nestjs/worker-service

# Reiniciar deployment en Kubernetes
kubectl rollout restart deployment/worker-service -n fintech
```
