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
- [`01-infrastructure.yaml`](./k8s/01-infrastructure.yaml): **StatefulSets** con PVCs (`local-path`) para MySQL 8.0, Redis 7 y Apache Kafka KRaft; y Deployment para Mailpit.
- [`02-microservices.yaml`](./k8s/02-microservices.yaml): Deployments y Services endurecidos para `auth-service`, `user-service`, `transaction-service`, `notification-service`, `worker-service` y `api-gateway` (SecurityContext, Probes y Limits/Requests).
- [`03-frontend.yaml`](./k8s/03-frontend.yaml): Deployment y Service para el frontend web React.
- [`04-observability.yaml`](./k8s/04-observability.yaml): **StatefulSet** para ClickHouse DB con PVC (`local-path`), SigNoz UI (NodePort 30301) y OpenTelemetry Collector.
- [`05-ingress.yaml`](./k8s/05-ingress.yaml): Recurso Ingress y Middleware Traefik (`strip-api-prefix`) para ruteo nativo en Rancher Desktop.
- [`06-networkpolicy.yaml`](./k8s/06-networkpolicy.yaml): Políticas de red NetworkPolicy para seguridad y control de tráfico interno.

---

## 🔐 Buenas Prácticas DevSecOps Implementadas

1. **Cargas con Estado (StatefulSets & PVCs)**:
   - MySQL, Redis, Kafka y ClickHouse utilizan `StatefulSets` vinculados a la StorageClass `local-path` de Rancher Desktop, asegurando la persistencia de datos ante reinicios de pods.
2. **Hardening de Seguridad (SecurityContext)**:
   - `allowPrivilegeEscalation: false` y restricción de `capabilities` activada en contenedores.
3. **Gestión de Recursos (Requests & Limits)**:
   - Cuotas de CPU y Memoria (RAM) configuradas explícitamente en todos los Pods para evitar agotamiento de recursos del nodo (OOMKilled).
4. **Resiliencia & Salud (Probes)**:
   - Configuración de `startupProbe`, `livenessProbe` y `readinessProbe` en los endpoints de Actuator `/actuator/health` y servicios de infraestructura.
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
nerdctl --namespace k8s.io build -t fintech/api-gateway:latest ./backend/api-gateway
nerdctl --namespace k8s.io build -t fintech/auth-service:latest ./backend/auth-service
nerdctl --namespace k8s.io build -t fintech/user-service:latest ./backend/user-service
nerdctl --namespace k8s.io build -t fintech/transaction-service:latest ./backend/transaction-service
nerdctl --namespace k8s.io build -t fintech/notification-service:latest ./backend/notification-service
nerdctl --namespace k8s.io build -t fintech/worker-service:latest ./backend/worker-service
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

## 🌐 URLs de Acceso

| Servicio | URL Local | Descripción |
|---|---|---|
| **Frontend Web** | [http://localhost](http://localhost) | Aplicación React (vía Ingress /) |
| **API Gateway** | [http://localhost/api](http://localhost/api) | API Gateway (vía Ingress /api) |
| **Mailpit UI (Correos)** | [http://localhost/mailpit](http://localhost/mailpit) o [http://localhost:30025](http://localhost:30025) | UI de testing de correos (Ingress /mailpit o NodePort 30025) |
| **SigNoz Observability** | [http://localhost:30301](http://localhost:30301) | Dashboard de métricas, trazas y logs |
