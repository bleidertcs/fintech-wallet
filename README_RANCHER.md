# Despliegue de FinTech Wallet en Rancher Desktop (containerd + nerdctl)

Este documento detalla el procedimiento completo para desplegar la arquitectura de microservicios de **FinTech Wallet** en un clúster de **Kubernetes (k3s)** gestionado por **Rancher Desktop**, utilizando **containerd** como motor de contenedores y **nerdctl** como CLI.

---

## 🛠️ Requisitos Previos

1. **Rancher Desktop** instalado y activo.
   - En **Settings -> Container Engine**: seleccionar **containerd**.
   - En **Settings -> Kubernetes**: asegurarse de que **Enable Kubernetes** esté activado.
2. **kubectl** instalado y configurado en el PATH (apuntando al contexto de Rancher Desktop).
3. **nerdctl** CLI instalado (incluido por defecto en la instalación de Rancher Desktop).

---

## 📁 Estructura de Manifiestos DevSecOps (`k8s/`)

- [`00-namespace-config.yaml`](./k8s/00-namespace-config.yaml): Namespace `fintech`, ConfigMap `mysql-init-sql` y Secret `fintech-secrets`.
- [`01-infrastructure.yaml`](./k8s/01-infrastructure.yaml): **StatefulSets** con PVCs (`local-path`) para MySQL 8.0, Redis 7 y Apache Kafka KRaft; y Deployment para MailDev 2.1.0.
- [`02-microservices.yaml`](./k8s/02-microservices.yaml): Deployments y Services endurecidos para los 5 microservicios NestJS (`auth`, `user`, `transaction`, `notification`, `worker`) con SecurityContext, Probes y Requests para el Scheduler.
- [`03-frontend.yaml`](./k8s/03-frontend.yaml): Deployment y Service para el frontend web React (Vite + Nginx).
- [`04-observability.yaml`](./k8s/04-observability.yaml): **StatefulSet** para ClickHouse DB con PVC (`local-path`), SigNoz UI (NodePort 30301) y OpenTelemetry Collector.
- [`05-ingress.yaml`](./k8s/05-ingress.yaml): Recurso Ingress y Middleware Traefik (`strip-api-prefix`, `auth-ratelimit`) para ruteo nativo en Rancher Desktop.
- [`06-networkpolicy.yaml`](./k8s/06-networkpolicy.yaml): Políticas de red NetworkPolicy para seguridad y control de tráfico interno.

---

## 🔐 Buenas Prácticas DevSecOps Implementadas

1. **Cargas con Estado (StatefulSets & PVCs)**:
   - MySQL, Redis, Kafka y ClickHouse utilizan `StatefulSets` vinculados a la StorageClass `local-path` de Rancher Desktop, asegurando la persistencia de datos ante reinicios de pods.
2. **Hardening de Seguridad (SecurityContext)**:
   - `allowPrivilegeEscalation: false` y restricción de `capabilities` activada en contenedores.
3. **Gestión de Recursos (Requests)**:
   - Cuotas de CPU y Memoria (RAM) `requests` configuradas para garantizar el agendamiento del Kubernetes Scheduler sin CFS Throttling.
4. **Resiliencia & Salud (Probes)**:
   - Configuración de `startupProbe`, `livenessProbe` y `readinessProbe` en los endpoints `/health` de NestJS y servicios de infraestructura.
5. **Aislamiento de Red (NetworkPolicy)**:
   - Control de tráfico interno en el namespace `fintech`.

---

## 🚀 OPCIÓN 1: Despliegue Automatizado

Ejecuta el script automatizado para tu sistema operativo. El script compilará las imágenes en el namespace `k8s.io` de containerd y aplicará la infraestructura completa en Kubernetes.

> [!NOTE]
> Toda la ejecución de los scripts se registra automáticamente con marca de tiempo en el archivo **`deploy-rancher.log`** en la raíz del proyecto.

### En Windows (PowerShell):
```powershell
# Ejecución interactiva
.\deploy-rancher.ps1

# Forzar recreación directa por parámetro
.\deploy-rancher.ps1 -Recreate
```

### En Linux / macOS / Git Bash:
```bash
# Ejecución interactiva
chmod +x deploy-rancher.sh
./deploy-rancher.sh

# Forzar recreación directa por parámetro
./deploy-rancher.sh --recreate
```

---

## 🧱 OPCIÓN 2: Despliegue Manual Paso a Paso

### Paso 1: Construir imágenes en containerd (Namespace `k8s.io`)

```bash
nerdctl --namespace k8s.io build -t fintech/frontend:latest ./frontend
nerdctl --namespace k8s.io build -t fintech/auth-service:nestjs ./backend-nestjs/auth-service
nerdctl --namespace k8s.io build -t fintech/user-service:nestjs ./backend-nestjs/user-service
nerdctl --namespace k8s.io build -t fintech/transaction-service:nestjs ./backend-nestjs/transaction-service
nerdctl --namespace k8s.io build -t fintech/notification-service:nestjs ./backend-nestjs/notification-service
nerdctl --namespace k8s.io build -t fintech/worker-service:nestjs ./backend-nestjs/worker-service
```

### Paso 2: Aplicar Manifiestos en Orden

```bash
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/01-infrastructure.yaml
kubectl apply -f k8s/02-microservices.yaml
kubectl apply -f k8s/03-frontend.yaml
kubectl apply -f k8s/04-observability.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-networkpolicy.yaml
```

---

## 🧪 Ejecución de Scripts de Pruebas y Validación

La suite de pruebas permite validar el estado del clúster, la comunicación inter-servicio tRPC, la consistencia financiera e idempotencia, y el rendimiento:

### 1. Prueba de Humo (Smoke Test)
Valida la salud de todos los Pods en `fintech`, la respuesta HTTP 200 de Traefik API Gateway en todas las rutas, la disponibilidad de Swagger UI y la conectividad a MySQL/Redis/Kafka:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/smoke-test.ps1
```

### 2. Prueba de Integración E2E (auth-service ↔ user-service ↔ tRPC)
Simula el flujo completo de registro de un usuario en `auth-service`, verificación de la creación automática de perfil en `user-service` vía tRPC, autenticación (login) y actualización de saldo:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/test-services-integration.ps1
```

### 3. Prueba de Concurrencia e Idempotencia (transaction-service)
Dispara peticiones HTTP concurrentes con la misma clave `X-Idempotency-Key` a `POST /transactions/transfer` para comprobar que **solo 1 transacción es procesada (HTTP 200)** y las solicitudes duplicadas son **bloqueadas (HTTP 400)**, garantizando que el saldo no sufra cobros dobles:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/concurrency-test.ps1
```

### 4. Prueba de Carga y Rendimiento (Performance Test)
Mide el Throughput (RPS), latencias P95/P99 y tasa de errores HTTP mediante `k6` o el motor nativo de benchmark:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/performance-test.ps1
```

---

## 🌐 URLs de Acceso

| Servicio | URL Local | Descripción |
|---|---|---|
| **Frontend Web** | [http://localhost](http://localhost) | Aplicación React (vía Ingress /) |
| **Auth Service Swagger** | [http://localhost/auth/docs/](http://localhost/auth/docs/) | OpenAPI Swagger UI de Auth Service |
| **User Service Swagger** | [http://localhost/users/docs/](http://localhost/users/docs/) | OpenAPI Swagger UI de User Service |
| **Transaction Service Swagger** | [http://localhost/transactions/docs/](http://localhost/transactions/docs/) | OpenAPI Swagger UI de Transaction Service |
| **Notification Service Swagger** | [http://localhost/notifications/docs/](http://localhost/notifications/docs/) | OpenAPI Swagger UI de Notification Service |
| **Worker Service Swagger** | [http://localhost/worker/docs/](http://localhost/worker/docs/) | OpenAPI Swagger UI de Worker Service |
| **Maildev UI (Correos)** | [http://localhost/maildev/](http://localhost/maildev/) | UI de testing de correos |
| **SigNoz Observability** | [http://localhost:30301](http://localhost:30301) | Dashboard de métricas RED, trazas OTLP y logs contextuales K8s |
