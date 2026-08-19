# Notification Service (NestJS) 🔔

Microservicio de Notificaciones y Alertas por Correo Electrónico del sistema **FinTech Wallet**, desarrollado sobre **NestJS 11 + Hexagonal Architecture + Prisma ORM + Nodemailer + tRPC Client + Kafka Consumer + OpenTelemetry**.

---

## 🚀 Arquitectura y Características

- **Arquitectura Hexagonal (Ports & Adapters)**: Separación estricta entre Dominio, Casos de Uso y Adaptadores de Entrada (REST API, Kafka Consumer) / Salida (Prisma PostgreSQL, Nodemailer SMTP, tRPC Client).
- **Integración tRPC Inter-Service**: Cliente tRPC type-safe conectando a `user-service:8082/trpc` (`getUserById`, `getUserByEmail`) mediante `UserServiceTrpcAdapter` para obtener datos de contacto de emisor y receptor.
- **Event-Driven Architecture con Kafka Consumer**: Consumidor Kafka (`kafkajs`) escuchando el tópico `transfer_completed`. Genera 2 notificaciones persistidas en BD (`TRANSFER_SENT` y `TRANSFER_RECEIVED`) y envía 2 correos electrónicos en HTML vía Nodemailer hacia Maildev (SMTP local).
- **Base de Datos Dedicada**: Persistencia en PostgreSQL (`notificationdb.notifications`) gestionada con Prisma ORM 7 (`@prisma/adapter-pg`).
- **Documentación OpenAPI / Swagger UI**: Disponible en vivo en `/notifications/docs` y `/api-docs`.
- **Observabilidad SigNoz & OpenTelemetry**:
  - **Trazas OTLP**: Rastreabilidad distribuida conectada con la traza origen enviada desde `transaction-service`.
  - **Logs Winston OTLP**: Envío estructurado de logs en JSON con correlación `trace_id` / `span_id` y metadatos nativos de Kubernetes.

---

## 📁 Arquitectura de Carpetas (Hexagonal / Ports & Adapters)

```text
backend-nestjs/notification-service/
├── prisma/
│   └── schema.prisma                     # Esquema Prisma ORM (Base de datos PostgreSQL notificationdb)
├── src/
│   ├── adapters/                         # Adaptadores Hexagonales (Interface Adapters)
│   │   ├── inbound/                      # Adaptadores de Entrada (Driving / Primary)
│   │   │   ├── rest/                     # Controllers REST (NotificationController, HealthController)
│   │   │   └── kafka/                    # Kafka Consumer (kafka-consumer.service.ts)
│   │   └── outbound/                     # Adaptadores de Salida (Driven / Secondary)
│   │       ├── database/                 # Repositorio Prisma PostgreSQL
│   │       ├── email/                    # Nodemailer Adapter (Maildev SMTP)
│   │       └── trpc/                     # Cliente tRPC hacia user-service
│   ├── application/                      # Casos de Uso de Aplicación
│   │   └── use-cases/                    # NotificationUseCases
│   ├── domain/                           # Dominio Principal (Core de Negocio)
│   │   ├── entities/                     # Entidad Notification
│   │   └── ports/                        # Puertos Inbound & Outbound
│   ├── infrastructure/                   # Configuración e Infraestructura
│   │   ├── logging/                      # Winston Logger OTLP
│   │   └── telemetry/                    # OpenTelemetry SDK (Traces, Metrics, Logs)
│   ├── app.module.ts                     # Módulo Raíz de NestJS
│   └── main.ts                           # Bootstrap del microservicio (:3004)
├── test/                                 # Pruebas Unitarias y E2E (Jest)
├── Dockerfile                            # Multi-stage Dockerfile (Node 22 Alpine)
├── package.json                          # Dependencias pnpm
└── README.md                             # Documentación oficial del microservicio
```

---

## ⚙️ Variables de Entorno (`.env`)

```env
PORT=3004
NODE_ENV=development

# Base de Datos PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notificationdb"

# Kafka Broker
KAFKA_BROKERS="localhost:9092"

# Servidor SMTP Maildev
MAIL_HOST="localhost"
MAIL_PORT=1025
MAIL_FROM="noreply@fintechwallet.com"

# User Service tRPC Client
USER_SERVICE_URL="http://localhost:3002"

# Telemetría SigNoz / OpenTelemetry Collector
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
OTEL_SERVICE_NAME="notification-service"
```

---

## 🚀 Endpoints REST API & Swagger UI

- **Swagger UI Documentation**: `http://localhost/notifications/docs/`
- **Healthcheck**: `GET /notifications/health`
- **Obtener Notificaciones de Usuario**: `GET /notifications/user/:userId`
- **Marcar Notificación Leída**: `PATCH /notifications/:id/read`
- **Conteo No Leídas**: `GET /notifications/unread-count/:userId`

---

## 🧪 Pruebas Unitarias

```bash
pnpm test
```

---

## 🦭 Despliegue en Kubernetes con Podman

```bash
podman build -f Containerfile -t fintech/notification-service:1.0.0 .
kubectl rollout restart deployment/notification-service -n fintech
```
