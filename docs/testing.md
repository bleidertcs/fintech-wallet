# Guía de Testing y Benchmarking

Este documento detalla el catálogo de pruebas automatizadas disponibles en **FinTech Wallet**, los scripts de validación en `scripts/`, las pruebas de estrés con **k6**, los tests de concurrencia e idempotencia y los comandos de ejecución de pruebas unitarias.

---

## 📑 Contenido

1. [Visión General de la Suite de Pruebas](#1-visión-general-de-la-suite-de-pruebas)
2. [Prueba de Humo (Smoke Test)](#2-prueba-de-humo-smoke-test)
3. [Prueba E2E de Integración de Servicios](#3-prueba-e2e-de-integración-de-servicios)
4. [Pruebas de Concurrencia e Idempotencia](#4-pruebas-de-concurrencia-e-idempotencia)
5. [Pruebas de Carga y Rendimiento con K6](#5-pruebas-de-carga-y-rendimiento-con-k6)
6. [Benchmark de Rendimiento y Latencias P95/P99](#6-benchmark-de-rendimiento-y-latencias-p95p99)
7. [Pruebas Unitarias en Microservicios](#7-pruebas-unitarias-en-microservicios)

---

## 1. Visión General de la Suite de Pruebas

El repositorio provee una batería completa de pruebas que validan desde la salud del clúster hasta la consistencia transaccional bajo condiciones de alta concurrencia:

```text
                               ┌────────────────────────────────────────────────┐
                               │           SUITE DE TESTING FINTECH             │
                               └──────────────────────┬─────────────────────────┘
                                                      │
         ┌─────────────────────┬──────────────────────┼──────────────────────┬─────────────────────┐
         ▼                     ▼                      ▼                      ▼                     ▼
  ┌──────────────┐      ┌──────────────┐       ┌──────────────┐       ┌──────────────┐      ┌──────────────┐
  │  Smoke Test  │      │ Integration  │       │ Concurrency  │       │ K6 Load Test │      │  Unit Tests  │
  │ (Salud K8s/  │      │ (E2E Flujo   │       │ & Idempotency│       │ (Benchmark   │      │ (Jest en     │
  │  Endpoints)  │      │  Financiero) │       │ Multi-hilo)  │       │  P95 / P99)  │      │ Microserv.)  │
  └──────────────┘      └──────────────┘       └──────────────┘       └──────────────┘      └──────────────┘
```

---

## 2. Prueba de Humo (Smoke Test)

### Objetivo
Verificar en pocos segundos que todos los Pods en Kubernetes están saludables, que los 5 microservicios responden en sus endpoints `/health` a través de Traefik, que las consolas Swagger están disponibles y que PostgreSQL y Redis responden a comandos básicos.

### Precondiciones
* Clúster Kubernetes desplegado con `deploy-rancher.ps1` o `deploy-rancher.sh`.

### Comando de Ejecución
```powershell
.\scripts\smoke-test.ps1
```

### Resultado Esperado
```text
[1/4] Verificando Pods en el namespace 'fintech'...
  [OK] Todos los pods en 'fintech' estan en Running / Completed!

[2/4] Verificando endpoints de salud a traves de Traefik API Gateway...
  [OK] Frontend React Web -> http://localhost/ (HTTP 200)
  [OK] Auth Service Health -> http://localhost/auth/health (HTTP 200)
  [OK] User Service Health -> http://localhost/users/health (HTTP 200)
  [OK] Transaction Service Health -> http://localhost/transactions/health (HTTP 200)
  [OK] Notification Service Health -> http://localhost/notifications/health (HTTP 200)
  [OK] Worker Service Health -> http://localhost/worker/health (HTTP 200)

[3/4] Verificando Swagger UI de los 5 Microservicios...
  [OK] Swagger en http://localhost/auth/docs/ (HTTP 200)
  [OK] Swagger en http://localhost/users/docs/ (HTTP 200)
  [OK] Swagger en http://localhost/transactions/docs/ (HTTP 200)

[4/4] Verificando conectividad de Postgres y Redis...
  [OK] Postgres respondiendo con bases de datos creadas!
  [OK] Redis respondiendo (PONG)!
```

---

## 3. Prueba E2E de Integración de Servicios

### Objetivo
Validar el flujo de negocio completo de punta a punta:
1. Registro de nuevo usuario en `auth-service`.
2. Login y obtención del token JWT.
3. Creación automática y consulta del perfil financiero en `user-service`.
4. Consulta de saldo inicial.
5. Ejecución de transferencia entre dos usuarios en `transaction-service`.
6. Validación de balance final actualizado y notificación emitida.

### Precondiciones
* Servicios activos en `http://localhost`.

### Comando de Ejecución
```powershell
.\scripts\test-services-integration.ps1
```

### Resultado Esperado
* Mensaje final `[SUCCESS] Flujo E2E completado sin errores transaccionales.`

---

## 4. Pruebas de Concurrencia e Idempotencia

### Objetivo
Simular 10 o más solicitudes simultáneas multihilo con la misma clave `X-Idempotency-Key` para comprobar que el sistema solo ejecuta la transferencia una única vez y rechaza las 9 restantes como duplicadas.

### Precondiciones
* Servicios activos y Redis en ejecución.

### Comando de Ejecución
```powershell
# Ejecutar prueba con 10 hilos concurrentes
.\scripts\concurrency-test.ps1 -Mode Idempotency -Concurrency 10
```

### Resultado Esperado
* Exactamente **1 solicitud exitosa (HTTP 200)**.
* Exactamente **9 solicitudes rechazadas con HTTP 400** (`Solicitud duplicada procesada previamente`).
* El saldo del emisor se decrementa únicamente por el importe de una sola transacción.

---

## 5. Pruebas de Carga y Rendimiento con K6

### Objetivo
Medir el comportamiento del sistema bajo estrés continuo de usuarios concurrentes mediante el script `scripts/k6-concurrency-test.js`.

### Precondiciones
* Binario de `k6` instalado localmente o disponible a través de contenedor Docker/nerdctl.

### Comando de Ejecución
```powershell
# Ejecutar suite de k6
.\scripts\run-k6.ps1
```

### Métricas Analizadas
* `http_req_duration`: Tiempo total de respuesta (promedio, P90, P95, P99).
* `http_req_failed`: Tasa de fallos HTTP (debe ser `< 1%`).
* `iterations`: Cantidad total de transferencias procesadas por segundo (TPS).

---

## 6. Benchmark de Rendimiento y Latencias P95/P99

### Objetivo
Medir con precisión milimétrica la latencia en los endpoints transaccionales y de consulta.

### Comando de Ejecución
```powershell
.\scripts\performance-test.ps1
```

### Resultado Esperado
* Generación de una tabla resumen con:
  - Latencia Mínima, Media y Máxima.
  - Percentil 95 (P95 < 50ms en entorno local).
  - Percentil 99 (P99 < 100ms).

---

## 7. Pruebas Unitarias en Microservicios

Cada microservicio incluye pruebas unitarias con **Jest** y mocks de repositorios y puertos:

```bash
# Ejecutar pruebas unitarias en auth-service
cd backend-nestjs/auth-service
pnpm test

# Ejecutar pruebas unitarias en transaction-service
cd ../transaction-service
pnpm test

# Ejecutar pruebas con cobertura de código (Coverage)
pnpm test:cov
```

Para operar el sistema y gestionar respaldos en producción, consulta la [Guía de Operaciones Day-2 y Backups](operations.md).
