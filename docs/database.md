# Guía Exhaustiva de Bases de Datos Transaccionales y PgBouncer 🗄️⚡

Este documento constituye el **manual técnico definitivo** sobre el diseño, arquitectura, esquemas relacionales, connection pooling, patrones transaccionales, garantías de integridad y estrategias de **Disaster Recovery (DR)** implementadas en el sistema **FinTech Wallet** sobre **PostgreSQL 16**.

---

## 📑 Tabla de Contenidos
1. [Filosofía de Persistencia y Migración a PostgreSQL 16](#1-filosofía-de-persistencia-y-migración-a-postgresql-16)
2. [Topología de Aislamiento en 2 Instancias](#2-topología-de-aislamiento-en-2-instancias)
3. [Deep-Dive en Connection Pooling con PgBouncer](#3-deep-dive-en-connection-pooling-con-pgbouncer)
4. [Esquemas Relacionales y Definición DDL Exhaustiva](#4-esquemas-relacionales-y-definición-ddl-exhaustiva)
5. [Diagrama Entidad-Relación (ERD) y Relaciones Lógicas](#5-diagrama-entidad-relación-erd-y-relaciones-lógicas)
6. [Patrones Transaccionales de Grado Financiero](#6-patrones-transaccionales-de-grado-financiero)
7. [Infraestructura en Kubernetes y Gestión de Recursos](#7-infraestructura-en-kubernetes-y-gestión-de-recursos)
8. [DevOps: Automatización de Backups y Disaster Recovery](#8-devops-automatización-de-backups-y-disaster-recovery)
9. [Cheat Sheet de Mantenimiento y Comandos Operativos](#9-cheat-sheet-de-mantenimiento-y-comandos-operativos)

---

## 1. Filosofía de Persistencia y Migración a PostgreSQL 16

FinTech Wallet aplica el principio arquitectónico **Database-per-Service** para garantizar que cada microservicio sea dueño exclusivo de su esquema relacional.

```mermaid
graph LR
    A["<b>Atomicidad (Atomicity)</b><br>Todo o Nada en débitos, créditos y eventos de Outbox"]
    C["<b>Consistencia (Consistency)</b><br>Reglas invariables: CHECK balance >= 0, emails únicos"]
    I["<b>Aislamiento (Isolation)</b><br>Transacciones concurrentes no interfieren ni generan race conditions"]
    D["<b>Durabilidad (Durability)</b><br>WAL (Write-Ahead Logging) + Almacenamiento K8s persistente (PVC)"]
    
    A --- C --- I --- D
```

### ¿Por qué PostgreSQL 16 y no MySQL?
1. **Columnas JSONB de Alto Rendimiento**: Permite indexar y consultar payloads estructurados en la tabla `outbox_events` e `idempotency_records` con operaciones nativas GIN.
2. **Generación Criptográfica Nativa (`gen_random_uuid()`)**: IDs únicos UUIDv4 autogenerados sin requerir lógica en la capa de aplicación.
3. **Restricciones `CHECK` Estrictas**: Validación determinista de saldos a nivel de motor de base de datos (`balance >= 0`).
4. **Ecosistema PgBouncer Nativo**: Soporte maduro para multiplexación de transacciones a ultra-baja latencia.

---

## 2. Topología de Aislamiento en 2 Instancias

Para equilibrar **aislamiento de fallos** con un **consumo eficiente de recursos**, el sistema distribuye sus 5 esquemas en dos motores físicos independientes:

```mermaid
graph TD
    subgraph CoreEngine ["🔥 postgres-core (Camino Crítico de Dinero - Puerto 5432)"]
        PgBouncer["<b>PgBouncer Core (:6432)</b><br>Pooler en modo Transaction"]
        AuthDB[("authdb<br>• users<br>• outbox_events")]
        UserDB[("userdb<br>• user_profiles (CHECK balance >= 0)<br>• outbox_events")]
        TxDB[("transactiondb<br>• transactions<br>• money_requests<br>• idempotency_records<br>• outbox_events")]
        
        PgBouncer --> AuthDB
        PgBouncer --> UserDB
        PgBouncer --> TxDB
    end

    subgraph SupportEngine ["⚙️ postgres-support (Servicios Auxiliares - Puerto 5433 / 5432)"]
        NotifDB[("notificationdb<br>• notifications")]
        WorkerDB[("workerdb<br>• statement_jobs<br>• audit_logs")]
    end

    AuthService["auth-service"] -->|"authdb"| PgBouncer
    UserService["user-service"] -->|"userdb"| PgBouncer
    TxService["transaction-service"] -->|"transactiondb"| PgBouncer

    NotifService["notification-service"] -->|"notificationdb"| NotifDB
    WorkerService["worker-service"] -->|"workerdb"| WorkerDB
```

### Matriz de Instancias y Bases de Datos

| Instancia | Puerto Host/K8s | Bases de Datos | Acceso Microservicios | Propósito |
|:---|:---:|:---|:---|:---|
| **`postgres-core`** | `5432` | `authdb`, `userdb`, `transactiondb` | Vía `pgbouncer-core:6432` | **Camino crítico de dinero**. Máxima prioridad de CPU/RAM. Cero interferencia externa. |
| **`postgres-support`** | `5433` (`5432` interno) | `notificationdb`, `workerdb` | Directo a `postgres-support:5432` | **Servicios auxiliares**. Tareas asíncronas pesadas (extractos PDF y bitácora de auditoría). |

---

## 3. Deep-Dive en Connection Pooling con PgBouncer

### El Problema del Escalado de Conexiones
PostgreSQL utiliza un modelo de proceso por conexión (`fork`), asignando entre **5 MB y 10 MB de RAM** por cada conexión establecida. Si Kubernetes escala los Pods de los microservicios mediante HPA (por ejemplo, 10 réplicas por servicio con pools locales de 20 conexiones), se generarían **más de 1,000 conexiones concurrentes**, provocando:
- Agotamiento de memoria del nodo (OOMKilled).
- Latencia por cambio de contexto en la CPU de PostgreSQL.

### La Solución: PgBouncer en Modo `transaction`

```mermaid
sequenceDiagram
    autonumber
    actor Pods as Microservicios (Hasta 1,000 conexiones cliente)
    participant PgB as PgBouncer Core (:6432)
    participant PG as PostgreSQL Core (:5432)

    Pods->>PgB: Solicita conexión TCP / Prisma Client
    Note over PgB: Mantiene pool de ~25 conexiones físicas reales hacia PostgreSQL
    Pods->>PgB: BEGIN TRANSACTION
    PgB->>PG: Asigna una conexión física del pool
    Pods->>PG: UPDATE user_profiles SET balance = balance - 100...
    Pods->>PG: INSERT INTO transactions...
    Pods->>PG: COMMIT
    PgB->>PgB: Libera inmediatamente la conexión física de PostgreSQL
    Note over PgB: La conexión física queda libre para atender a otro Pod en < 1ms
```

### Comparativa de Modos de PgBouncer

| Modo | ¿Cómo funciona? | ¿Cuándo se libera la conexión? | ¿Apto para FinTech Wallet? |
|:---|:---|:---|:---:|
| **`session`** | Una conexión física se reserva para el cliente desde que se conecta hasta que se desconecta. | Al cerrar la sesión TCP del microservicio. | ❌ No resuelve el problema de HPA. |
| **`transaction`** (Implementado) | La conexión física se asigna **únicamente mientras se ejecuta una transacción SQL**. | Inmediatamente al ejecutar `COMMIT` o `ROLLBACK`. | ✅ **Ideal**: Multiplexa 1,000 clientes sobre 25 conexiones reales. |
| **`statement`** | Cada consulta individual SQL usa una conexión diferente. | Al terminar cada `SELECT`/`INSERT`. | ❌ Incompatible con transacciones multi-sentencia (`BEGIN ... COMMIT`). |

### Parámetros de Configuración (`k8s/01-infrastructure.yaml` y `docker-compose.yml`)

```yaml
env:
  - name: DB_HOST
    value: "postgres-core"
  - name: DB_PORT
    value: "5432"
  - name: LISTEN_PORT
    value: "6432"
  - name: POOL_MODE
    value: "transaction"
  - name: MAX_CLIENT_CONN
    value: "1000"
  - name: DEFAULT_POOL_SIZE
    value: "25"
```

### Configuración en Prisma ORM
Para que Prisma opere en modo `transaction` sin intentar usar *prepared statements* a nivel de sesión (incompatibles con el modo transacción), las URLs de conexión incluyen el parámetro `pgbouncer=true`:

```env
DATABASE_URL=postgresql://postgres:12345@pgbouncer-core:6432/transactiondb?schema=public&pgbouncer=true
```

---

## 4. Esquemas Relacionales y Definición DDL Exhaustiva

### 4.1 Instancia `postgres-core` (`infra/postgres/init-core.sql`)

#### Base de Datos: `authdb` (Gestión de Identidad y Acceso)
```sql
CREATE DATABASE authdb;
\c authdb;

CREATE TABLE IF NOT EXISTS "users" (
    "id" BIGSERIAL PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) DEFAULT 'USER' NOT NULL,
    "verified" BOOLEAN DEFAULT false NOT NULL,
    "verification_token" VARCHAR(255),
    "totp_secret" VARCHAR(255),
    "totp_enabled" BOOLEAN DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "outbox_events" (
    "id" VARCHAR(36) PRIMARY KEY,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processed_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "idx_outbox_events_status_created" ON "outbox_events" ("status", "created_at");
```

#### Base de Datos: `userdb` (Perfiles y Saldos Financieros)
```sql
CREATE DATABASE userdb;
\c userdb;

CREATE TABLE IF NOT EXISTS "user_profiles" (
    "id" BIGSERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "balance" DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    "daily_limit" DECIMAL(15, 2) DEFAULT 50000.00 NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'ARS' NOT NULL,
    CONSTRAINT "check_positive_balance" CHECK ("balance" >= 0)
);

CREATE TABLE IF NOT EXISTS "outbox_events" (
    "id" VARCHAR(36) PRIMARY KEY,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processed_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "idx_user_outbox_status_created" ON "outbox_events" ("status", "created_at");
```

#### Base de Datos: `transactiondb` (Transferencias e Idempotencia)
```sql
CREATE DATABASE transactiondb;
\c transactiondb;

CREATE TABLE IF NOT EXISTS "transactions" (
    "id" BIGSERIAL PRIMARY KEY,
    "from_user_id" BIGINT NOT NULL,
    "to_user_id" BIGINT NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'SUCCESS' NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "money_requests" (
    "id" BIGSERIAL PRIMARY KEY,
    "requester_id" BIGINT NOT NULL,
    "target_id" BIGINT NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "message" VARCHAR(255),
    "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "idempotency_records" (
    "id" VARCHAR(36) PRIMARY KEY,
    "user_id" BIGINT NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "request_hash" VARCHAR(255),
    "response" JSONB,
    "status" VARCHAR(50) DEFAULT 'COMPLETED' NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "user_key_unique" UNIQUE ("user_id", "key")
);

CREATE TABLE IF NOT EXISTS "outbox_events" (
    "id" VARCHAR(36) PRIMARY KEY,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processed_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "idx_tx_outbox_status_created" ON "outbox_events" ("status", "created_at");
```

---

### 4.2 Instancia `postgres-support` (`infra/postgres/init-support.sql`)

#### Base de Datos: `notificationdb` (Historial de Alertas y Emails)
```sql
CREATE DATABASE notificationdb;
\c notificationdb;

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" BIGSERIAL PRIMARY KEY,
    "user_id" BIGINT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "amount" DECIMAL(15, 2) NOT NULL,
    "from_user_id" BIGINT,
    "is_read" BOOLEAN DEFAULT false NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
```

#### Base de Datos: `workerdb` (Trabajos Asíncronos y Auditoría Inmutable)
```sql
CREATE DATABASE workerdb;
\c workerdb;

CREATE TABLE IF NOT EXISTS "statement_jobs" (
    "id" BIGSERIAL PRIMARY KEY,
    "user_id" BIGINT NOT NULL,
    "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
    "pdf_path" VARCHAR(255),
    "error_message" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completed_at" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" BIGSERIAL PRIMARY KEY,
    "from_user_id" BIGINT,
    "to_user_id" BIGINT,
    "amount" DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_statement_jobs_user_status" ON "statement_jobs" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "audit_logs" ("timestamp");
```

---

## 5. Diagrama Entidad-Relación (ERD) y Relaciones Lógicas

```mermaid
erDiagram
    %% =========================================================================
    %% INSTANCIA: POSTGRES-CORE
    %% =========================================================================
    AUTH_USERS {
        bigint id PK "ID de cuenta"
        varchar email UK "Email único"
        varchar password "BCrypt Hash"
        varchar role "Rol de usuario"
        boolean verified "Email verificado"
        varchar verification_token "Token de verificación"
        varchar totp_secret "Secreto 2FA"
        boolean totp_enabled "2FA Activo"
    }

    USER_PROFILES {
        bigint id PK "ID financiero"
        varchar name "Nombre titular"
        varchar email UK "Email de enlace"
        decimal balance "CHECK (balance >= 0)"
        decimal daily_limit "Límite diario"
        varchar currency "Moneda (ARS)"
    }

    TRANSACTIONS {
        bigint id PK "ID de transferencia"
        bigint from_user_id "ID del emisor"
        bigint to_user_id "ID del receptor"
        decimal amount "Monto (15,2)"
        varchar status "SUCCESS / FAILED"
        timestamptz created_at "Timestamp UTC"
    }

    MONEY_REQUESTS {
        bigint id PK "ID de cobro"
        bigint requester_id "ID solicitante"
        bigint target_id "ID pagador"
        decimal amount "Monto solicitado"
        varchar message "Concepto"
        varchar status "PENDING / ACCEPTED"
        timestamptz created_at "Timestamp"
    }

    IDEMPOTENCY_RECORDS {
        varchar id PK "UUID idempotencia"
        bigint user_id "ID de usuario"
        varchar key "X-Idempotency-Key"
        varchar request_hash "SHA-256 payload"
        jsonb response "Copia HTTP respuesta"
        varchar status "COMPLETED"
        timestamptz created_at "Timestamp TTL 24h"
    }

    OUTBOX_EVENTS {
        varchar id PK "UUID evento"
        varchar aggregate_type "Transaction / User / Auth"
        varchar aggregate_id "ID agregado"
        varchar event_type "TRANSFER_COMPLETED"
        jsonb payload "Payload evento JSONB"
        varchar status "PENDING / PUBLISHED"
        timestamptz created_at "Fecha creación"
        timestamptz processed_at "Fecha publicación"
    }

    %% =========================================================================
    %% INSTANCIA: POSTGRES-SUPPORT
    %% =========================================================================
    NOTIFICATIONS {
        bigint id PK "ID notificación"
        bigint user_id "Destinatario"
        varchar type "TRANSFER_RECEIVED"
        text message "Texto alerta"
        decimal amount "Monto"
        bigint from_user_id "Emisor"
        boolean is_read "Leído"
        timestamptz created_at "Fecha emisión"
    }

    STATEMENT_JOBS {
        bigint id PK "ID trabajo extracto"
        bigint user_id "Titular"
        varchar status "PENDING / COMPLETED"
        varchar pdf_path "Ruta PDFKit"
        text error_message "Detalle error"
        timestamptz created_at "Fecha solicitud"
        timestamptz completed_at "Fecha generación"
    }

    AUDIT_LOGS {
        bigint id PK "ID auditoría"
        bigint from_user_id "Emisor"
        bigint to_user_id "Receptor"
        decimal amount "Monto"
        varchar event_type "TRANSFER_AUDIT"
        text details "Detalle"
        timestamptz timestamp "Timestamp inmutable"
    }

    %% Relaciones Lógicas entre Microservicios
    AUTH_USERS ||--|| USER_PROFILES : "1:1 Lógica por campo 'email'"
    USER_PROFILES ||--o{ TRANSACTIONS : "1:N por 'from_user_id' / 'to_user_id'"
    USER_PROFILES ||--o{ MONEY_REQUESTS : "1:N por 'requester_id' / 'target_id'"
    USER_PROFILES ||--o{ IDEMPOTENCY_RECORDS : "1:N por 'user_id'"
    USER_PROFILES ||--o{ NOTIFICATIONS : "1:N por 'user_id'"
    USER_PROFILES ||--o{ STATEMENT_JOBS : "1:N por 'user_id'"
    USER_PROFILES ||--o{ AUDIT_LOGS : "1:N por 'from_user_id' / 'to_user_id'"
    TRANSACTIONS ||--o{ AUDIT_LOGS : "1:N Sincronización asíncrona Kafka"
```

### ¿Por qué no hay Foreign Keys físicas entre Bases de Datos?
En una arquitectura orientada a microservicios:
1. **Desacoplamiento Operativo**: Si `userdb` se migra a otro host o clúster, `transactiondb` no sufre bloqueos de llaves foráneas.
2. **Escalabilidad Independiente**: Cada base de datos puede optimizarse con índices y almacenamiento acordes a su volumen de escrituras y lecturas.
3. **Consistencia de Aplicación**: Las relaciones se validan mediante llamadas RPC de ultra-alta velocidad (**tRPC**) y la propagación de eventos vía **Transactional Outbox + Apache Kafka**.

---

## 6. Patrones Transaccionales de Grado Financiero

### 6.1 Transactional Outbox Pattern (Cero Dual-Write)
El patrón Transactional Outbox elimina la inconsistencia entre la base de datos relacional y el broker de mensajería (Kafka):

```typescript
// transaction.use-cases.ts
await this.prisma.$transaction(async (tx) => {
  // 1. Persistir el registro transaccional en PostgreSQL
  const record = await tx.transaction.create({
    data: { fromUserId, toUserId, amount, status: 'SUCCESS' }
  });

  // 2. Insertar el evento en outbox_events en el MISMO COMMIT
  await tx.outboxEvent.create({
    data: {
      id: crypto.randomUUID(),
      aggregateType: 'Transaction',
      aggregateId: record.id.toString(),
      eventType: 'TRANSFER_COMPLETED',
      payload: { transactionId: record.id.toString(), fromUserId, toUserId, amount },
      status: 'PENDING'
    }
  });
});
```

El servicio `OutboxPublisherService` ejecuta un ciclo de polling cada 3 segundos:
1. Lee filas con `status = 'PENDING'` ordenadas por `created_at ASC`.
2. Publica cada mensaje en Apache Kafka (`transfer.completed`).
3. Actualiza el estado a `status = 'PUBLISHED'` con `processed_at = NOW()`.

### 6.2 Idempotencia Financiera en 2 Capas

```mermaid
graph TD
    Request["POST /transactions/transfer<br>Header: X-Idempotency-Key"] --> RedisCheck{"¿Existe clave en Redis?"}
    
    RedisCheck -- "Sí (Clave Encontrada)" --> ReturnCached["Retorna HTTP 200/400 previo<br>(Respuesta instantánea < 1ms)"]
    RedisCheck -- "No (Clave Nueva)" --> AcquireLock["SET key IN_PROGRESS NX EX 30 en Redis"]
    
    AcquireLock --> ExecuteTx["Ejecuta Débito/Crédito tRPC y Transacción"]
    ExecuteTx --> SaveDB["Guarda en idempotency_records (PostgreSQL)"]
    SaveDB --> SaveRedis["Guarda resultado final en Redis (TTL 24h)"]
    SaveRedis --> HTTPResponse["Retorna HTTP 200 al Cliente"]
```

1. **Capa 1 (Memoria - Redis 7)**: Candado atómico con `SET NX EX 86400` que absorbe ráfagas de clics repetidos en la UI.
2. **Capa 2 (Durable - PostgreSQL)**: Registro en `idempotency_records` con restricción `CONSTRAINT user_key_unique UNIQUE(user_id, key)` que protege ante caídas de caché.

---

## 7. Infraestructura en Kubernetes y Gestión de Recursos

### StatefulSets con Almacenamiento Persistente (`local-path`)
Tanto `postgres-core` como `postgres-support` están configurados como **`StatefulSets`** con identificadores de red estables (`postgres-core-0`, `postgres-support-0`) y volúmenes vinculados mediante `volumeClaimTemplates`:

```yaml
volumeClaimTemplates:
  - metadata:
      name: postgres-core-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: local-path
      resources:
        requests:
          storage: 2Gi
```

### Gestión de Recursos: Requests vs Limits
- **Requests definidos**: Se configuraron `requests` de CPU (`100m`) y Memoria (`128Mi`) para garantizar que el Kubernetes Scheduler asigne los pods en nodos con capacidad garantizada.
- **Sin Limits de CPU/RAM**: Se eliminaron intencionalmente los `limits` en los contenedores de bases de datos para **evitar CFS Throttling en picos de transacciones** y prevenir terminaciones intempestivas por **OOMKilled** durante operaciones de volcado de backups o consultas complejas.

---

## 8. DevOps: Automatización de Backups y Disaster Recovery

### 8.1 Arquitectura del CronJob de Backup (`07-backup-cronjob.yaml`)
El clúster ejecuta automáticamente un `CronJob` diario a las **02:00 AM UTC**:

1. **Volcado en Caliente**: Ejecuta `pg_dump` con banderas `--clean --if-exists --no-owner --no-privileges` contra las 5 bases de datos.
2. **Compresión Gzip**: Genera archivos comprimidos `.sql.gz` optimizando el espacio en disco.
3. **Validación de Integridad Criptográfica**: Calcula sumas de verificación **SHA-256** guardadas en `checksums.sha256`.
4. **Política de Retención**: Elimina automáticamente cualquier respaldo con más de **7 días** de antigüedad.

### 8.2 Ejecución de Backup Manual

```powershell
# En Windows PowerShell contra el clúster K8s
powershell -ExecutionPolicy Bypass -File ./scripts/backup-databases.ps1 -Target k8s

# En Linux / Bash contra Docker Compose
./scripts/backup-databases.sh docker
```

### 8.3 Procedimiento de Restauración (Disaster Recovery)

```powershell
# Restaurar transactiondb en Kubernetes desde un archivo comprimido
powershell -ExecutionPolicy Bypass -File ./scripts/restore-database.ps1 `
    -Target k8s `
    -DatabaseName transactiondb `
    -BackupFile ./backups/20260814_111939/core_transactiondb_20260814_151946.sql.gz
```

---

## 9. Cheat Sheet de Mantenimiento y Comandos Operativos

### Conexión Interactiva a PostgreSQL vía `kubectl`

```bash
# Conectar a postgres-core
kubectl exec -it postgres-core-0 -n fintech -- psql -U postgres

# Conectar a postgres-support
kubectl exec -it postgres-support-0 -n fintech -- psql -U postgres

# Conectar a una base de datos específica directamente
kubectl exec -it postgres-core-0 -n fintech -- psql -U postgres -d transactiondb
```

### Diagnóstico de PgBouncer

```bash
# Conectar a la consola administrativa de PgBouncer
kubectl exec -it $(kubectl get pod -l app=pgbouncer-core -n fintech -o jsonpath="{.items[0].metadata.name}") -n fintech -- psql -U postgres -p 6432 -d pgbouncer

# Consultas administrativas en PgBouncer:
SHOW POOLS;     -- Ver estado del pool de conexiones activas y en espera
SHOW CLIENTS;   -- Ver microservicios conectados actualmente
SHOW SERVERS;   -- Ver conexiones reales abiertas hacia postgres-core
SHOW STATS;     -- Ver estadísticas de throughput y peticiones atendidas
```

### Consultas SQL de Diagnóstico Frecuentes

```sql
-- 1. Ver tamaño de todas las bases de datos
SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size 
FROM pg_database 
WHERE datname IN ('authdb', 'userdb', 'transactiondb', 'notificationdb', 'workerdb');

-- 2. Ver eventos pendientes de publicación en Outbox
SELECT id, event_type, status, created_at 
FROM outbox_events 
WHERE status = 'PENDING' 
ORDER BY created_at ASC;

-- 3. Ver conexiones activas por base de datos en postgres-core
SELECT datname, count(*) 
FROM pg_stat_activity 
GROUP BY datname;
```
