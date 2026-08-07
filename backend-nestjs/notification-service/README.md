# Notification Service (NestJS Migration)

Microservicio de Notificaciones y Alertas por Correo Electrónico de **FinTech Wallet**, migrado de Java Spring Boot a **NestJS 11** con Arquitectura Hexagonal, Prisma 7 ORM, MariaDB, Nodemailer, gRPC Client, Kafka Consumer y Observabilidad OpenTelemetry integrada con SigNoz.

---

## 📁 Estructura del Proyecto (Arquitectura Hexagonal)

```text
backend-nestjs/notification-service/
├── src/
│   ├── main.ts                           # Bootstrap del microservicio & OTLP Logger setup
│   ├── app.module.ts                     # Módulo raíz de NestJS
│   ├── domain/                           # Dominio y Lógica de Negocio Pura
│   │   ├── entities/
│   │   │   ├── notification.entity.ts    # Entidad de Notificación
│   │   │   └── transfer-events.dto.ts    # DTO del Evento transfer_completed de Kafka
│   │   └── ports/
│   │       ├── notification-service.port.ts  # Puerto de Servicio de Aplicación
│   │       ├── notification-repository.port.ts # Puerto de Repositorio de BD
│   │       ├── email-adapter.port.ts          # Puerto de Envío de Email
│   │       └── user-service-client.port.ts    # Puerto de Cliente gRPC de Usuarios
│   ├── application/                      # Casos de Uso
│   │   ├── notification-application.module.ts
│   │   └── use-cases/
│   │       ├── notification.use-cases.ts      # Procesamiento de notificaciones y transferencias
│   │       └── notification.use-cases.spec.ts # Pruebas unitarias de casos de uso (100% Cobertura)
│   ├── adapters/                         # Adaptadores de Entrada y Salida
│   │   ├── inbound/                      # Adaptadores de Entrada (REST, Kafka Consumer)
│   │   │   ├── rest/
│   │   │   │   ├── notification.controller.ts      # Controller REST de Notificaciones
│   │   │   │   ├── notification.controller.spec.ts # Pruebas unitarias Controller REST
│   │   │   │   ├── health.controller.ts            # Controller de Healthcheck K8s
│   │   │   │   └── health.controller.spec.ts       # Pruebas unitarias Health Controller
│   │   │   └── kafka/
│   │   │       └── kafka-consumer.service.ts       # Consumidor de tópico transfer_completed
│   │   └── outbound/                     # Adaptadores de Salida (Prisma, Nodemailer, gRPC)
│   │       ├── database/
│   │       │   ├── prisma-notification.repository.ts # Repositorio Prisma MariaDB
│   │       │   └── database.module.ts
│   │       ├── email/
│   │       │   ├── nodemailer.adapter.ts             # Adaptador de envío de mail con Mailpit/SMTP
│   │       │   └── email.module.ts
│   │       └── grpc/
│   │           ├── user-service.grpc-adapter.ts   # Cliente gRPC hacia User Service (:9090)
│   │           ├── user-grpc-client.module.ts
│   │           └── proto/
│   │               └── user.proto                 # Definición del contrato Protobuf gRPC
│   └── infrastructure/                   # Configuración e Infraestructura
│       ├── database/
│       │   └── prisma.service.ts         # PrismaMariaDb Driver Adapter
│       ├── logging/
│       │   └── otel-winston.logger.ts    # Logger Winston OTLP con trace_id y k8s tags
│       └── telemetry/
│           └── tracing.ts                # Inicialización de OpenTelemetry SDK Tracing/Metrics
├── prisma/
│   └── schema.prisma                     # Esquema Prisma de MariaDB (Tabla notifications)
├── test/                                 # Pruebas E2E de Jest
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── Dockerfile                            # Multi-stage Dockerfile para producción (node:22-alpine)
├── .dockerignore                         # Exclusiones de contexto Docker
├── nest-cli.json                         # Configuración Nest CLI con assets proto
├── package.json                          # Scripts y dependencias NestJS
└── README.md                             # Documentación oficial del Microservicio
```

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Valor por Defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha HTTP REST | `3004` |
| `NODE_ENV` | Entorno de ejecución (`development` / `production`) | `production` |
| `NODE_OPTIONS` | Opciones V8 para optimización de memoria GC | `--max-old-space-size=200` |
| `DATABASE_URL` | URL de conexión MySQL / MariaDB | `mysql://root:12345@mysql:3306/notificationdb` |
| `KAFKA_BROKERS` | Brokers de Apache Kafka | `kafka:9092` |
| `MAIL_HOST` | Host SMTP de envío de correos (Mailpit) | `mailpit` |
| `MAIL_PORT` | Puerto SMTP | `1025` |
| `MAIL_FROM` | Remitente por defecto de correos | `noreply@fintechwallet.com` |
| `USER_SERVICE_GRPC_URL` | Endpoint gRPC de User Service | `user-service.fintech.svc.cluster.local:9090` |
| `OTEL_SERVICE_NAME` | Nombre del servicio para SigNoz | `notification-service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint HTTP OTLP del Collector de SigNoz | `http://otel-collector.fintech.svc.cluster.local:4318` |

---

## 🚀 Endpoints REST API & Swagger UI

### Swagger UI Documentation
- **URL Interactiva UI**: `http://localhost/notifications/docs/`
- **JSON OpenAPI**: `http://localhost/notifications/docs-json`

### 1. Healthcheck (K8s Liveness / Readiness Probes)
- **GET** `/health`
- **Respuesta 200 OK**:
  ```json
  {
    "status": "ok",
    "info": { "database": { "status": "up" } },
    "error": {},
    "details": { "database": { "status": "up" } }
  }
  ```

### 2. Obtener Notificaciones de un Usuario
- **GET** `/notifications/user/:userId`
- **Ejemplo cURL**:
  ```bash
  curl -X GET "http://localhost/notifications/user/1" -H "Accept: application/json"
  ```
- **Respuesta 200 OK**:
  ```json
  [
    {
      "id": 1,
      "userId": 1,
      "title": "Transferencia Recibida",
      "message": "Has recibido $150.00 USD de Maria Lopez.",
      "type": "TRANSFER_RECEIVED",
      "read": false,
      "createdAt": "2026-08-07T14:45:00.000Z"
    }
  ]
  ```

### 3. Marcar Notificación como Leída
- **PATCH** `/notifications/:id/read`
- **Ejemplo cURL**:
  ```bash
  curl -X PATCH "http://localhost/notifications/1/read" -H "Accept: application/json"
  ```
- **Respuesta 200 OK**:
  ```json
  {
    "id": 1,
    "userId": 1,
    "title": "Transferencia Recibida",
    "message": "Has recibido $150.00 USD de Maria Lopez.",
    "type": "TRANSFER_RECEIVED",
    "read": true,
    "createdAt": "2026-08-07T14:45:00.000Z"
  }
  ```

### 4. Obtener Conteo de Notificaciones No Leídas
- **GET** `/notifications/unread-count/:userId`
- **Ejemplo cURL**:
  ```bash
  curl -X GET "http://localhost/notifications/unread-count/1" -H "Accept: application/json"
  ```
- **Respuesta 200 OK**:
  ```json
  {
    "userId": 1,
    "unreadCount": 3
  }
  ```

---

## 🔌 Eventos Asíncronos Kafka

- **Tópico Consumido**: `transfer_completed`
- **Estructura del Payload**:
  ```json
  {
    "transactionId": "tx-99812",
    "sourceUserId": 1,
    "targetUserId": 2,
    "amount": 250.00,
    "currency": "USD",
    "timestamp": "2026-08-07T14:46:00Z"
  }
  ```
- **Flujo**:
  1. Consume evento desde Kafka.
  2. Consulta nombres y correos de `sourceUserId` y `targetUserId` mediante cliente gRPC hacia `user-service:9090`.
  3. Almacena 2 notificaciones en MariaDB mediante Prisma (`TRANSFER_SENT` y `TRANSFER_RECEIVED`).
  4. Envía 2 correos electrónicos en HTML/Texto mediante Nodemailer hacia Mailpit (SMTP `:1025`).

---

## 🧪 Pruebas Unitarias y Cobertura

Las pruebas se ejecutan con **Jest** y cumplen el estándar del **Pilar 7 (100% de éxito en la suite de pruebas unitarias)**.

```bash
# Ejecución de Pruebas Unitarias
pnpm test

# Resultado de Pruebas:
# PASS src/application/use-cases/notification.use-cases.spec.ts
# PASS src/adapters/inbound/rest/notification.controller.spec.ts
# PASS src/adapters/inbound/rest/health.controller.spec.ts
# Test Suites: 3 passed, 3 total
# Tests:       11 passed, 11 total
```

---

## 📦 Construcción y Despliegue en Kubernetes (Rancher / nerdctl)

```powershell
# 1. Construir la imagen con containerd en Rancher Desktop (namespace k8s.io)
& "C:\Program Files\Rancher Desktop\resources\resources\win32\bin\nerdctl.exe" --namespace k8s.io build -t fintech/notification-service:nestjs ./backend-nestjs/notification-service

# 2. Desplegar en Kubernetes
kubectl apply -f k8s/02-microservices.yaml
kubectl apply -f k8s/05-ingress.yaml

# 3. Reiniciar el deployment para aplicar cambios
kubectl rollout restart deployment/notification-service -n fintech
```
