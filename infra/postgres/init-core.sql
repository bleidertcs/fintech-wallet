-- ==============================================================================
-- POSTGRES CORE INIT SCRIPT (Camino Crítico de Dinero)
-- Inicializa esquemas y tablas para authdb, userdb y transactiondb
-- ==============================================================================

-- 1. Database: authdb
SELECT 'CREATE DATABASE authdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'authdb')\gexec

GRANT ALL PRIVILEGES ON DATABASE authdb TO postgres;

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

-- 2. Database: userdb
SELECT 'CREATE DATABASE userdb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'userdb')\gexec

GRANT ALL PRIVILEGES ON DATABASE userdb TO postgres;

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

-- 3. Database: transactiondb
SELECT 'CREATE DATABASE transactiondb'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'transactiondb')\gexec

GRANT ALL PRIVILEGES ON DATABASE transactiondb TO postgres;

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

CREATE INDEX IF NOT EXISTS "idx_tx_outbox_status_created" ON "outbox_events" ("status", "created_at");
