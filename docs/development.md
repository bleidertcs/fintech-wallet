# Guía de Desarrollo Local

Este documento describe el flujo de trabajo para desarrolladores que desean modificar, depurar y probar microservicios individuales o el frontend de **FinTech Wallet** en su máquina local sin necesidad de compilar imágenes completas de Kubernetes.

---

## 📑 Contenido

1. [Prerrequisitos de Desarrollo Local](#1-prerrequisitos-de-desarrollo-local)
2. [Instalación de Dependencias con `pnpm`](#2-instalación-de-dependencias-con-pnpm)
3. [Infraestructura Auxiliar para Desarrollo Local](#3-infraestructura-auxiliar-para-desarrollo-local)
4. [Flujo de Trabajo con Prisma ORM](#4-flujo-de-trabajo-con-prisma-orm)
5. [Ejecución de Microservicios en Modo Watch](#5-ejecución-de-microservicios-en-modo-watch)
6. [Depuración y Debugging en IDE](#6-depuración-y-debugging-en-ide)
7. [Desarrollo en el Frontend (React + Vite)](#7-desarrollo-en-el-frontend-react--vite)
8. [Ejecución de Pruebas Unitarias](#8-ejecución-de-pruebas-unitarias)

---

## 1. Prerrequisitos de Desarrollo Local

* **Node.js**: `v20.18.0` o superior.
* **pnpm**: `v10.4.1` (o `v9.x+`). Se recomienda habilitar Corepack:
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```
* **Docker / Docker Compose**: Para levantar las bases de datos y brokers de apoyo local.

---

## 2. Instalación de Dependencias con `pnpm`

Cada microservicio y el frontend son paquetes autónomos:

```bash
# 1. Instalar dependencias en cada microservicio
cd backend-nestjs/auth-service && pnpm install
cd ../user-service && pnpm install
cd ../transaction-service && pnpm install
cd ../notification-service && pnpm install
cd ../worker-service && pnpm install

# 2. Instalar dependencias del frontend
cd ../../frontend && pnpm install
```

---

## 3. Infraestructura Auxiliar para Desarrollo Local

Para programar un servicio individual, puedes levantar las dependencias de base (Postgres, Redis, Kafka, Maildev) utilizando el archivo `docker-compose.yml` en la raíz del proyecto:

```bash
# Levantar dependencias de infraestructura en segundo plano
docker compose up -d postgres-core postgres-support redis kafka maildev
```

### Puertos Locales Mapeados:
* `postgres-core`: `localhost:5432` (`authdb`, `userdb`, `transactiondb`)
* `postgres-support`: `localhost:5433` (`notificationdb`, `workerdb`)
* `redis`: `localhost:6379`
* `kafka`: `localhost:9092`
* `maildev`: `http://localhost:1080` (Web UI) / `localhost:1025` (SMTP)

---

## 4. Flujo de Trabajo con Prisma ORM

Cada microservicio define su modelo de datos en `prisma/schema.prisma`.

```bash
cd backend-nestjs/transaction-service

# 1. Generar los tipos TypeScript del cliente Prisma
pnpm prisma generate

# 2. Aplicar cambios del esquema a la base de datos de desarrollo
pnpm prisma db push

# 3. Abrir la interfaz visual de administración de datos
pnpm prisma studio
```

---

## 5. Ejecución de Microservicios en Modo Watch

Configura el archivo `.env` del microservicio con las cadenas locales (ejemplo para `transaction-service`):

```env
PORT=3003
NODE_ENV=development
DATABASE_URL="postgresql://postgres:12345@localhost:5432/transactiondb?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
USER_SERVICE_URL="http://localhost:3002"
KAFKA_BROKERS="localhost:9092"
OTEL_SERVICE_NAME=transaction-service
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
```

Inicia el servicio en modo desarrollo continuo:

```bash
pnpm start:dev
```

El servicio se recargará automáticamente ante cualquier cambio en el código TypeScript.

---

## 6. Depuración y Debugging en IDE

En Visual Studio Code o Cursor, puedes utilizar la siguiente configuración de `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Transaction Service",
      "args": ["${workspaceFolder}/backend-nestjs/transaction-service/src/main.ts"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "envFile": "${workspaceFolder}/backend-nestjs/transaction-service/.env",
      "sourceMaps": true,
      "cwd": "${workspaceFolder}/backend-nestjs/transaction-service"
    }
  ]
}
```

---

## 7. Desarrollo en el Frontend (React + Vite)

El frontend se conecta al backend mediante la variable `VITE_API_URL` (por defecto `/api` o `http://localhost:3001` si se conecta directo):

```bash
cd frontend

# Iniciar servidor de desarrollo Vite con Hot Module Replacement (HMR)
pnpm dev
```

La aplicación estará disponible en [http://localhost:5173/](http://localhost:5173/).

---

## 8. Ejecución de Pruebas Unitarias

```bash
cd backend-nestjs/auth-service

# Ejecutar tests unitarios una sola vez
pnpm test

# Ejecutar tests en modo observador continuo (TDD)
pnpm test:watch

# Generar reporte de cobertura de código
pnpm test:cov
```

Para consultar los lineamientos sobre cómo construir y agregar un nuevo microservicio al sistema, consulta la [Guía: Cómo Crear un Nuevo Microservicio](creating-a-microservice.md).
