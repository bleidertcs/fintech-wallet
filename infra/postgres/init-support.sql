-- ==============================================================================
-- POSTGRES SUPPORT INIT SCRIPT (Servicios de Soporte)
-- Inicializa esquemas y tablas para notificationdb y workerdb
-- ==============================================================================

-- 1. Database: notificationdb
SELECT 'CREATE DATABASE notificationdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'notificationdb')\gexec

GRANT ALL PRIVILEGES ON DATABASE notificationdb TO postgres;

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

-- 2. Database: workerdb
SELECT 'CREATE DATABASE workerdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'workerdb')\gexec

GRANT ALL PRIVILEGES ON DATABASE workerdb TO postgres;

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
