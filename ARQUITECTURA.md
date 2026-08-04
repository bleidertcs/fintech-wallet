# FinTech Wallet - Arquitectura del Proyecto

Este documento detalla la arquitectura de software, infraestructura, flujos de datos y diseño de bases de datos del sistema **FinTech Wallet**.

---

## 1. Arquitectura General del Sistema

El sistema está diseñado bajo un patrón de **microservicios**, donde cada servicio tiene una responsabilidad única y su propia persistencia de datos (Database-per-Service).

```mermaid
graph TD
    subgraph Client ["Capa Cliente"]
        Frontend["Frontend (React + Vite)<br>Puerto: 3000"]
    end

    subgraph Gateway ["Capa de Ruteo"]
        ApiGateway["API Gateway (Spring Cloud Gateway)<br>Puerto: 8080<br>(Validación JWT & Redis RateLimiter)"]
    end

    subgraph Microservices ["Capa de Negocio"]
        AuthService["Auth Service<br>Puerto: 8081<br>(Login, Registro, 2FA, JWT Blacklist)"]
        UserService["User Service<br>Puerto: 8082<br>gRPC: 9090<br>(Saldos con Caché Redis)"]
        TransactionService["Transaction Service<br>Puerto: 8083<br>(Transferencias & Idempotencia)"]
        NotificationService["Notification Service<br>Puerto: 8084<br>(Alertas & Email)"]
        WorkerService["Worker Service<br>Puerto: 8085<br>(Extractos PDF, Auditoría & DLQ)"]
    end

    subgraph Caching ["Capa de Caché y Rate Limiting"]
        Redis["Redis Server 7.0<br>Puerto: 6379<br>(Rate Limiting, Cache L2, Idempotencia, Blacklist)"]
    end

    subgraph Messaging ["Mensajería Asíncrona (Kafka)"]
        Kafka["Apache Kafka<br>Topics: transfer-events, retry, dlq"]
    end

    subgraph Database ["Capa de Persistencia (Database-per-Service)"]
        AuthDB[("auth-mysql<br>authdb")]
        UserDB[("user-mysql<br>userdb")]
        TransactionDB[("tx-mysql<br>transactiondb")]
        NotificationDB[("notif-mysql<br>notificationdb")]
        WorkerDB[("worker-mysql<br>workerdb")]
    end

    subgraph Observability ["Suite de Observabilidad"]
        OTelCollector["OpenTelemetry Collector<br>Puertos: 4317 (gRPC) / 4318 (HTTP)"]
        ClickHouse[("ClickHouse DB<br>Puerto: 9000")]
        SigNoz["SigNoz UI<br>Puerto: 3301"]
    end

    subgraph Runtime ["Plataforma de Ejecución & Orquestación"]
        Engine["containerd Engine + nerdctl<br>(Rancher Desktop - k3s Kubernetes) / Docker Compose"]
    end

    %% Infrastructure Platform
    Microservices & Gateway & Database & Caching & Messaging & Observability & Client -.-> Engine

    %% Client and Gateway routing
    Frontend -->|HTTP Requests| ApiGateway
    ApiGateway -->|Rate Limiting| Redis
    ApiGateway -->|/auth/**| AuthService
    ApiGateway -->|/users/**| UserService
    ApiGateway -->|/transactions/**| TransactionService
    ApiGateway -->|/notifications/**| NotificationService
    ApiGateway -->|/worker/**| WorkerService

    %% Microservices to Redis
    AuthService -.->|Blacklist JWT / 2FA| Redis
    UserService -.->|Caché de Saldos| Redis
    TransactionService -.->|Claves Idempotencia| Redis

    %% Isolated Databases (Database-per-Service)
    AuthService -->|Persistencia Aislada| AuthDB
    UserService -->|Persistencia Aislada| UserDB
    TransactionService -->|Persistencia Aislada| TransactionDB
    NotificationService -->|Persistencia Aislada| NotificationDB
    WorkerService -->|Persistencia Aislada| WorkerDB

    %% Inter-service communication (gRPC)
    TransactionService -.->|gRPC: GetUser / UpdateBalance| UserService
    NotificationService -.->|gRPC: GetUser| UserService

    %% Async messaging
    TransactionService -->|Produce transfer-events| Kafka
    Kafka -->|Consume transfer-events| NotificationService
    Kafka -->|Consume transfer-events & DLQ| WorkerService

    %% Email Delivery
    NotificationService -->|SMTP Desarrollo| Mailpit["Mailpit (Mock SMTP)<br>Puerto: 8025 / 1025"]

    %% Telemetry Collection (OTel)
    Frontend -.->|Browser Telemetry| ApiGateway
    ApiGateway -.->|OTel Traces| OTelCollector
    AuthService & UserService & TransactionService & NotificationService & WorkerService -.->|OTel Traces, Metrics & Logs| OTelCollector
    OTelCollector -.->|Ingesta de Datos| ClickHouse
    ClickHouse -.->|Lectura de Métricas/Trazas/Logs| SigNoz
```

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, React Router v6, Axios, Recharts, jsPDF, xlsx, qrcode.react, html5-qrcode |
| **Backend** | Spring Boot 3, Spring Data JPA, Spring Cloud Gateway, Spring Kafka, Spring Data Redis, Spring Mail, JJWT, Protobuf (gRPC), PDFBox/OpenPDF |
| **Base de Datos** | MySQL 8.0 (5 instancias independientes en Kubernetes, Database-per-Service), ClickHouse (Almacén de Telemetría) |
| **Caché / In-Memory** | Redis 7.0 (Rate Limiting, Cache L2, Blacklist JWT, Idempotencia) |
| **Mensajería** | Apache Kafka en **modo KRaft** (Topics: `transfer-events`, Retry topics y DLQ) |
| **Email** | Gmail SMTP (Producción) / Mailpit (Desarrollo) |
| **Contenedores & Orquestación** | Rancher Desktop + containerd + `nerdctl` + Kubernetes (k3s) / Docker Compose |
| **Monitoreo/APM** | SigNoz + OpenTelemetry (OTel Collector) |

---

## 3. Microservicios - Detalle


### 3.1 Auth Service (Puerto 8081)
Maneja el registro, inicio de sesión, hashing de contraseñas (BCrypt), generación y verificación de JWT, y la autenticación de dos factores (2FA/TOTP).

*   **Base de Datos**: `authdb`
*   **Entidades**: `User` (email, password, role, verified, verificationToken, totpSecret, totpEnabled)
*   **Endpoints**:
    *   `POST /auth/register` (Registro)
    *   `POST /auth/login` (Inicio de sesión)
    *   `POST /auth/verify-totp` (Verificación de código de 2FA)
    *   `GET /auth/verify-email` (Activación de cuenta por token de email)
    *   `GET /auth/me` (Información del usuario autenticado)
    *   `POST /auth/setup-totp` (Inicializa clave secreta y código QR para 2FA)
    *   `POST /auth/enable-totp` (Habilita 2FA en el perfil)
    *   `POST /auth/disable-totp` (Deshabilita 2FA)

### 3.2 User Service (Puerto 8082 / gRPC: 9090)
Maneja los perfiles de usuario, saldos de cuenta, monedas activas y límites de transferencia diaria.
*   **Base de Datos**: `userdb`
*   **Entidades**: `UserProfile` (name, email, balance, dailyLimit, currency)
*   **Protocolo gRPC (user.proto)**:
    *   `rpc GetUser (UserRequest) returns (UserResponse);`
    *   `rpc UpdateBalance (UpdateBalanceRequest) returns (UserResponse);`
*   **Endpoints**:
    *   `POST /users` (Creación de perfil desde Auth)
    *   `GET /users/{id}` (Obtener perfil por ID)
    *   `PUT /users/{id}/settings` (Configurar límite diario y tipo de moneda)

### 3.3 Transaction Service (Puerto 8083)
Procesa transferencias de dinero y solicitudes de fondos, validando balances y límites diarios.
*   **Base de Datos**: `transactiondb`
*   **Entidades**:
    *   `Transaction` (fromUserId, toUserId, amount, status, createdAt)
    *   `MoneyRequest` (requesterId, targetId, amount, message, status, createdAt)
*   **Comunicación Síncrona**: Consulta y actualiza el saldo de `user-service` mediante **gRPC**.
*   **Comunicación Asíncrona**: Envía eventos al topic `transfer-events` de Kafka cuando se completa una transferencia.
*   **Endpoints**:
    *   `POST /transactions/transfer` (Efectuar transferencia)
    *   `GET /transactions/user/{userId}` (Historial de transacciones de un usuario)
    *   `POST /transactions/request` (Crear solicitud de dinero)
    *   `PUT /transactions/requests/{id}/accept` (Aceptar y pagar solicitud)
    *   `PUT /transactions/requests/{id}/reject` (Rechazar solicitud)

### 3.4 Notification Service (Puerto 8084)
Consume eventos de transferencias asíncronas desde Kafka para persistir notificaciones de transacciones enviadas/recibidas y enviar correos de confirmación.
*   **Base de Datos**: `notificationdb`
*   **Entidades**: `Notification` (userId, type, message, amount, fromUserId, isRead, createdAt)
*   **Comunicación Síncrona**: Consulta información de perfil en `user-service` mediante **gRPC**.
*   **Endpoints**:
    *   `GET /notifications/{userId}` (Listar notificaciones del usuario)
    *   `PUT /notifications/{id}/read` (Marcar notificación como leída)
    *   `GET /notifications/{userId}/unread-count` (Cantidad de notificaciones sin leer)

### 3.5 Worker Service (Puerto 8085)
Procesa trabajos asíncronos en segundo plano, genera extractos bancarios PDF, realiza auditoría de transacciones y gestiona mensajes en colas de reintento/DLQ de Kafka.
*   **Base de Datos**: `workerdb`
*   **Entidades**:
    *   `StatementJob` (id, userId, status, pdfPath, createdAt)
    *   `AuditLog` (id, transactionId, fromUserId, toUserId, amount, eventType, timestamp)
*   **Comunicación Asíncrona**: Consume eventos de Kafka con Retryable topics y colas muertas (DLQ).
*   **Endpoints**:
    *   `POST /worker/statements/request` (Solicitar generación de extracto bancario PDF)
    *   `GET /worker/statements/{id}` (Consultar estado del trabajo de extracto PDF)
    *   `GET /worker/statements/{id}/download` (Descargar extracto bancario PDF)
    *   `GET /worker/audit/user/{userId}` (Consultar registros de auditoría del usuario)

---


## 4. Flujos de Comunicación entre Servicios

### 4.1 Flujo de Autenticación y 2FA
```
Usuario -> Frontend (Login.jsx) -> API Gateway -> Auth Service (Verifica Password y 2FA)
   Si 2FA Inactivo: Devuelve Token JWT de Acceso Completo.
   Si 2FA Activo: Devuelve Estado Temporal indicando requerimiento de TOTP -> Usuario ingresa código -> Auth Service valida código y devuelve JWT.
```

### 4.2 Flujo de Transferencia y Notificaciones
```
Usuario -> Frontend (Transfer.jsx) -> API Gateway -> Transaction Service
   1. Transaction Service llama a User Service (vía gRPC) para validar fondos del Emisor y verificar el límite diario de transferencias.
   2. Transaction Service actualiza los balances del Emisor y Receptor en el User Service (vía gRPC).
   3. Transaction Service registra la transacción como COMPLETED y envía un evento al Broker de Kafka.
   4. Notification Service (consumidor) lee el evento, registra las notificaciones en notificationdb y envía un correo electrónico al receptor (vía SMTP Mailpit/Gmail).
```

---

## 5. Diseño de Base de Datos (MySQL - Database-per-Service)

En Kubernetes, el sistema aplica el patrón **Database-per-Service** con **5 instancias MySQL 8.0 totalmente aisladas** (`auth-mysql`, `user-mysql`, `tx-mysql`, `notif-mysql`, `worker-mysql`), evitando la saturación cruzada de recursos (CPU, RAM, disk I/O y pools de conexiones):

### 5.1 authdb
*   **users**:
    *   `id` (BIGINT, PK, AUTO_INCREMENT)
    *   `email` (VARCHAR, UNIQUE, NOT NULL)
    *   `password` (VARCHAR, NOT NULL)
    *   `role` (VARCHAR, NOT NULL)
    *   `verified` (BOOLEAN, default false)
    *   `verification_token` (VARCHAR)
    *   `totp_secret` (VARCHAR)
    *   `totp_enabled` (BOOLEAN, default false)

### 5.2 userdb
*   **user_profiles**:
    *   `id` (BIGINT, PK, AUTO_INCREMENT)
    *   `name` (VARCHAR, NOT NULL)
    *   `email` (VARCHAR, UNIQUE, NOT NULL)
    *   `balance` (DECIMAL(19,2), NOT NULL)
    *   `daily_limit` (DECIMAL(19,2), default 50000.00)
    *   `currency` (VARCHAR(3), default ARS)

### 5.3 transactiondb
*   **transactions**:
    *   `id` (BIGINT, PK, AUTO_INCREMENT)
    *   `from_user_id` (BIGINT, NOT NULL)
    *   `to_user_id` (BIGINT, NOT NULL)
    *   `amount` (DECIMAL(19,2), NOT NULL)
    *   `status` (VARCHAR, NOT NULL)
    *   `created_at` (DATETIME, NOT NULL)
*   **money_requests**:
    *   `id` (BIGINT, PK, AUTO_INCREMENT)
    *   `requester_id` (BIGINT, NOT NULL)
    *   `target_id` (BIGINT, NOT NULL)
    *   `amount` (DECIMAL(19,2), NOT NULL)
    *   `message` (VARCHAR(255))
    *   `status` (VARCHAR, NOT NULL)
    *   `created_at` (DATETIME, NOT NULL)

### 5.4 notificationdb
*   **notifications**:
    *   `id` (BIGINT, PK, AUTO_INCREMENT)
    *   `user_id` (BIGINT, NOT NULL)
    *   `type` (VARCHAR, NOT NULL) -- 'SENT' / 'RECEIVED'
    *   `message` (VARCHAR(255), NOT NULL)
    *   `amount` (DECIMAL(19,2))
    *   `from_user_id` (BIGINT)
    *   `is_read` (BOOLEAN, default false)
    *   `created_at` (DATETIME, NOT NULL)

---

## 6. Puertos del Sistema y Servicios/Contenedores

El stack se compone de **19 servicios/contenedores** en Kubernetes ejecutando los siguientes componentes:

| Puerto Interno | Pod / Service | Componente | Descripción |
|----------------|---------------|------------|-------------|
| **3000** | `frontend` | Nginx + React Frontend | Interfaz de Usuario Web |
| **8080** | `api-gateway` | Spring Cloud Gateway | Puerta de enlace y filtros de seguridad |
| **8081** | `auth-service` | Auth Service | Gestión de usuarios y credenciales |
| **8082** | `user-service` | User Service | Gestión de saldos y configuraciones de perfil |
| **9090** | `user-service` (gRPC) | User Service | Endpoint gRPC interno para microservicios |
| **8083** | `transaction-service` | Transaction Service | Procesamiento de transferencias y solicitudes |
| **8084** | `notification-service` | Notification Service | Consumo de mensajes Kafka e historial |
| **8085** | `worker-service` | Worker Service | Generación de extractos PDF y auditoría |
| **3306** | `auth-mysql` | MySQL 8.0 | Instancia física de BD aislada para `authdb` |
| **3306** | `user-mysql` | MySQL 8.0 | Instancia física de BD aislada para `userdb` |
| **3306** | `tx-mysql` | MySQL 8.0 | Instancia física de BD aislada para `transactiondb` |
| **3306** | `notif-mysql` | MySQL 8.0 | Instancia física de BD aislada para `notificationdb` |
| **3306** | `worker-mysql` | MySQL 8.0 | Instancia física de BD aislada para `workerdb` |
| **6379** | `redis` | Redis Server 7.0 | Caché L2, Rate Limiting e Idempotencia |
| **9092 / 29092** | `kafka` | Apache Kafka | Bus de eventos y mensajería en modo KRaft |
| **8025 / 1025** | `mailpit` | Mailpit (Mock SMTP) | Servidor SMTP y Web UI de correos locales |
| **3301 / 30301** | `signoz` | SigNoz Frontend UI | Panel web de observabilidad APM |
| **9000** | `clickhouse` | ClickHouse DB | Almacén columnar de telemetría de SigNoz |
| **4317 / 4318** | `otel-collector` | OpenTelemetry Collector | Puerto gRPC/HTTP de ingesta de telemetría |
