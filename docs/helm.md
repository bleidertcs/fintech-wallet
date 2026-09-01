# Helm: Charts, Parametrización y Ciclo de Vida

Este documento detalla el empaquetado y despliegue del ecosistema **FinTech Wallet** mediante el gestor de paquetes **Helm 3**, explicando la estructura del Chart, la configuración de `values.yaml`, la gestión de versiones y los comandos de ciclo de vida.

---

## 📑 Contenido

1. [Estructura del Chart `fintech-wallet`](#1-estructura-del-chart-fintech-wallet)
2. [Parametrización en `values.yaml`](#2-parametrización-en-valuesyaml)
3. [Plantillas de Recursos (`templates/`)](#3-plantillas-de-recursos-templates)
4. [Ciclo de Vida de Despliegue con Helm](#4-ciclo-de-vida-de-despliegue-con-helm)
   - [Despliegue Rápido Automatizado](#despliegue-rápido-automatizado)
   - [Instalación Manual Inicial](#instalación-manual-inicial)
   - [Actualización (Upgrade)](#actualización-upgrade)
   - [Historial y Reversión (Rollback)](#historial-y-reversión-rollback)
   - [Desinstalación](#desinstalación)
5. [Comparativa: Helm vs Manifiestos Puros](#5-comparativa-helm-vs-manifiestos-puros)

---

## 1. Estructura del Chart `fintech-wallet`

El Chart reside en `k8s/helm/fintech-wallet/` y sigue el estándar de Helm v2 API:

```text
k8s/helm/fintech-wallet/
├── Chart.yaml                  # Metadatos del paquete (nombre, versión 1.0.0, descripción)
├── values.yaml                 # Valores de configuración por defecto para todos los componentes
└── templates/                  # Plantillas Go template de Kubernetes
    ├── _helpers.tpl            # Funciones auxiliares de nombrado y etiquetas comunes
    ├── secrets-configmaps.yaml # Secretos y ConfigMaps globales
    ├── postgres.yaml           # StatefulSets y Services de PostgreSQL Core y Support
    ├── pgbouncer.yaml          # Deployment y Service de PgBouncer (Transaction pooling)
    ├── redis.yaml              # StatefulSet y Service de Redis
    ├── kafka.yaml              # StatefulSet y Service de Kafka KRaft
    ├── maildev.yaml            # Deployment y Service de Maildev
    ├── auth-service.yaml       # Deployment y Service de auth-service
    ├── user-service.yaml       # Deployment y Service de user-service
    ├── transaction-service.yaml# Deployment y Service de transaction-service
    ├── notification-service.yaml# Deployment y Service de notification-service
    ├── worker-service.yaml     # Deployment y Service de worker-service
    ├── frontend.yaml           # Deployment y Service de frontend
    ├── ingress.yaml            # Enrutamiento HTTP Traefik, Middlewares e IngressRoutes
    ├── networkpolicy.yaml      # Reglas de aislamiento de red
    └── observability/          # ClickHouse 25.12, SigNoz y OTel Collector
        ├── clickhouse.yaml
        ├── signoz-migrator.yaml
        ├── signoz.yaml
        └── otel-collector.yaml
```

---

## 2. Parametrización en `values.yaml`

El archivo `values.yaml` centraliza los parámetros ajustables según el ambiente (desarrollo, staging, producción):

```yaml
global:
  storageClass: "local-path"
  environment: "production"
  dbUsername: "postgres"
  dbPassword: "<secure-password>"
  jwtSecret: "<base64-secret>"
  otelEndpoint: "http://otel-collector.{{ .Release.Namespace }}.svc.cluster.local:4318"
  clusterName: "fintech-k8s-cluster"

postgresCore:
  image: "postgres:16-alpine"
  storage: "5Gi"
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"

pgbouncer:
  replicaCount: 1
  image: "edoburu/pgbouncer:v1.22.1"

authService:
  replicaCount: 1
  image:
    repository: "bleiderc/fintech-wallet"
    tag: "auth-service-1.0.0"

transactionService:
  replicaCount: 1
  image:
    repository: "bleiderc/fintech-wallet"
    tag: "transaction-service-1.0.0"

observability:
  clickhouse:
    image: "clickhouse/clickhouse-server:25.12.5"
    storage: "5Gi"
  signoz:
    image: "signoz/signoz:v0.136.1"
  collector:
    image: "signoz/signoz-otel-collector:v0.144.7"
```

---

## 3. Plantillas de Recursos (`templates/`)

Las plantillas utilizan helpers de Helm (`{{ include "fintech-wallet.fullname" . }}`) para generar nombres consistentes y asignar etiquetas estándar de Kubernetes (`app.kubernetes.io/name`, `app.kubernetes.io/instance`, `app.kubernetes.io/managed-by`).

---

## 4. Ciclo de Vida de Despliegue con Helm

### Despliegue Rápido Automatizado

Puedes ejecutar el script de despliegue automatizado en PowerShell o Bash:

```powershell
# En Windows PowerShell
.\deploy-helm.ps1
```

```bash
# En Linux / macOS
./deploy-helm.sh
```

### Instalación Manual Inicial

Para desplegar todo el ecosistema en un clúster o namespace:

```bash
# 1. Validar sintaxis del Chart
helm lint ./k8s/helm/fintech-wallet

# 2. Renderizar y verificar manifiestos en seco (dry-run)
helm template fintech ./k8s/helm/fintech-wallet -n fintech

# 3. Instalar o actualizar el release
helm upgrade --install fintech ./k8s/helm/fintech-wallet \
  --namespace fintech \
  --create-namespace

# 4. Verificar el estado del release instalado
helm status fintech -n fintech
```

### Actualización (Upgrade)

Cuando se modifican imágenes, réplicas o configuraciones en `values.yaml`:

```bash
# Actualizar el release aplicando los nuevos valores
helm upgrade fintech ./k8s/helm/fintech-wallet \
  --namespace fintech \
  --set transactionService.replicaCount=2 \
  --set authService.resources.requests.memory="512Mi"
```

### Historial y Reversión (Rollback)

Helm mantiene un historial inmutable de revisiones para revertir cambios ante incidencias:

```bash
# 1. Ver el historial de despliegues y revisiones
helm history fintech -n fintech

# 2. Revertir a una revisión previa estable (ej. revisión 1)
helm rollback fintech 1 -n fintech
```

### Desinstalación

Para remover completamente el release y sus cargas de trabajo:

```bash
helm uninstall fintech -n fintech
```

---

## 5. Comparativa: Helm vs Manifiestos Puros

| Criterio | Despliegue con Manifiestos YAML (`k8s/*.yaml`) | Despliegue con Helm (`k8s/helm/`) |
| :--- | :--- | :--- |
| **Uso Principal** | Desarrollo local y entornos K8s directos (`deploy-k8s.ps1`) | Entornos multi-ambiente (Staging, QA, Prod) con valores variables |
| **Parametrización** | Valores fijos embebidos en los archivos YAML | Dinámica a través de `values.yaml` o flags `--set` |
| **Gestión de Versiones**| Control de versiones en Git | Control de versiones en Git + historial de releases K8s (`helm history`) |
| **Rollback** | Manual (`kubectl rollout undo`) servicio por servicio | Atómico para todo el release (`helm rollback`) |

Para conocer la suite de telemetría y métricas desplegada por el Chart, consulta la guía de [Observabilidad y SigNoz](observability.md).
