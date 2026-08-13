# Guía Completa de Helm (Kubernetes Package Manager) ☸️⚓

Este documento detalla la arquitectura de empaquetado de aplicaciones en Kubernetes utilizando **Helm 3**, la parametrización de manifiestos con `values.yaml`, la estructura de un Chart para **FinTech Wallet** y una **guía completa de comandos (Cheat Sheet)** de Helm CLI.

---

## 1. ¿Qué es Helm y Por Qué Utilizarlo?

**Helm** es el gestor de paquetes (*Package Manager*) oficial de Kubernetes. En lugar de mantener múltiples archivos YAML estáticos (`k8s/*.yaml`) duplicados para entornos de Desarrollo, Staging y Producción, Helm permite empaquetar todos los manifiestos en un **Chart** reutilizable y parametrizable.

### Conceptos Clave de Helm

| Término | Descripción |
| :--- | :--- |
| **Chart** | Paquete de Helm que contiene todos los recursos necesarios para desplegar una aplicación (Templates + `Chart.yaml` + `values.yaml`). |
| **Values (`values.yaml`)** | Archivo de configuración central donde se definen las variables (imágenes, réplicas, puertos, recursos CPU/RAM) que alimentan a los plantillas YAML. |
| **Templates** | Archivos YAML parametrizados en lenguaje Go Template (`.Values.service.port`, `.Values.image.tag`). |
| **Release** | Una instancia específica de un Chart desplegada en el clúster de Kubernetes con un nombre y namespace dado. |
| **Repository** | Servidor HTTP que almacena y distribuye Charts de Helm (ej. Artifact Hub, Bitnami). |

---

## 2. Estructura de un Helm Chart para FinTech Wallet

A continuación se presenta la estructura estándar recomendada para empaquetar el sistema **FinTech Wallet** en un Helm Chart (`helm/fintech-wallet`):

```text
helm/fintech-wallet/
├── Chart.yaml                  # Metadatos del Chart (nombre, versión, appVersion, descripción)
├── values.yaml                 # Valores por defecto de configuración (dev/staging/prod)
├── values-production.yaml      # Sobrescritura de valores para entorno de Producción
├── .helmignore                 # Patrones de archivos excluidos del empaquetado
└── templates/                  # Manifiestos parametrizados con lenguaje Go Template
    ├── _helpers.tpl            # Plantillas de nombres y etiquetas reutilizables (labels/selectors)
    ├── namespace.yaml
    ├── secrets.yaml
    ├── configmap.yaml
    ├── infrastructure/         # StatefulSets (MySQL, Redis, Kafka, ClickHouse)
    │   ├── mysql.yaml
    │   ├── redis.yaml
    │   └── kafka.yaml
    ├── microservices/          # Deployments de los 5 microservicios NestJS
    │   ├── auth-service.yaml
    │   ├── user-service.yaml
    │   ├── transaction-service.yaml
    │   ├── notification-service.yaml
    │   └── worker-service.yaml
    ├── observability/          # OpenTelemetry Collector & SigNoz UI
    │   ├── otel-collector.yaml
    │   └── signoz.yaml
    └── ingress.yaml            # Ingress de Traefik y Middlewares
```

---

## 3. Ejemplo de Parametrización con Go Template

### Archivo `values.yaml`:
```yaml
global:
  namespace: fintech
  environment: production

microservices:
  authService:
    replicas: 2
    image:
      repository: fintech/auth-service
      tag: nestjs
    resources:
      limits:
        cpu: 500m
        memory: 256Mi

  transactionService:
    replicas: 3
    image:
      repository: fintech/transaction-service
      tag: nestjs
```

### Plantilla `templates/microservices/auth-service.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "fintech.fullname" . }}-auth
  namespace: {{ .Values.global.namespace }}
spec:
  replicas: {{ .Values.microservices.authService.replicas }}
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
        - name: auth-service
          image: "{{ .Values.microservices.authService.image.repository }}:{{ .Values.microservices.authService.image.tag }}"
          resources:
            limits:
              cpu: {{ .Values.microservices.authService.resources.limits.cpu }}
              memory: {{ .Values.microservices.authService.resources.limits.memory }}
```

---

## 4. Helm Commands Cheat Sheet 🛠️

Guía rápida de comandos de la CLI de Helm 3:

### 📦 Gestión de Releases (Instalación y Despliegue)
```bash
# Crear la estructura vacía de un nuevo Chart
helm create fintech-wallet

# Validar la sintaxis de las plantillas de un Chart (Linting)
helm lint ./helm/fintech-wallet

# Renderizar las plantillas localmente en consola sin instalar (Dry-Run / Debug)
helm template fintech ./helm/fintech-wallet --debug

# Instalar el Chart en Kubernetes
helm install fintech ./helm/fintech-wallet -n fintech

# Instalar o Actualizar un Chart (Idempotente)
helm upgrade --install fintech ./helm/fintech-wallet -n fintech -f ./helm/fintech-wallet/values-production.yaml

# Listar todos los releases de Helm en el namespace actual
helm list -n fintech

# Ver el historial de revisiones/despliegues de un release
helm history fintech -n fintech

# Deshacer una actualización y volver a la revisión previa (Rollback)
helm rollback fintech 1 -n fintech

# Desinstalar un release y eliminar todos sus recursos de K8s
helm uninstall fintech -n fintech
```

### 🌐 Gestión de Repositorios Helm
```bash
# Agregar un repositorio remoto de Helm (ej. Bitnami)
helm repo add bitnami https://charts.bitnami.com/bitnami

# Actualizar la lista de paquetes de los repositorios registrados
helm repo update

# Buscar un paquete o chart en los repositorios locales agregados
helm search repo mysql

# Buscar un paquete en el registro global Artifact Hub
helm search hub redis
```

### 🔍 Inspección de Releases
```bash
# Ver los valores efectivamente aplicados en un release activo
helm get values fintech -n fintech

# Ver todos los manifiestos YAML generados por un release activo
helm get manifest fintech -n fintech
```
