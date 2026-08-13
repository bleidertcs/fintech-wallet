# Guía Completa de Kubernetes en FinTech Wallet ☸️

Este documento detalla la arquitectura de **Kubernetes (K8s)** aplicada al proyecto **FinTech Wallet**, los tipos de recursos desplegados en Rancher Desktop (k3s) y una **guía completa de referencia rápida (Cheat Sheet)** con los comandos `kubectl` más utilizados.

---

## 1. Arquitectura y Conceptos Clave de Kubernetes

Kubernetes es una plataforma de orquestación de contenedores open-source que automatiza el despliegue, el escalado y la gestión de aplicaciones en contenedores. En este proyecto, se ejecuta sobre **K3s / Rancher Desktop** utilizando **containerd** como motor de contenedores en el namespace `fintech`.

### Recursos de Kubernetes Utilizados en el Proyecto

| Recurso | Tipo en `k8s/` | Descripción y Uso en FinTech Wallet |
| :--- | :--- | :--- |
| **Namespace** | `v1/Namespace` | Aislamiento lógico de la aplicación (`fintech`). Evita colisiones de nombres con el sistema. |
| **Pod** | Unidad Mínima | La unidad más pequeña de ejecución. Agrupa 1 o más contenedores compartiendo IP y volúmenes. |
| **Deployment** | `apps/v1` | Orquesta Pods sin estado (*stateless*) como los 5 microservicios NestJS y el Frontend React. |
| **StatefulSet** | `apps/v1` | Orquesta Pods con estado (*stateful*) que requieren identidad de red y almacenamiento estable: **MySQL 8.0**, **Redis 7**, **Kafka KRaft** y **ClickHouse**. |
| **Service** | `v1/Service` | Abstracción de red que expone un conjunto de Pods: <br> - `ClusterIP`: IP interna (`mysql:3306`, `redis:6379`, `user-service:8082`). <br> - `NodePort`: Puerto expuesto en el host (`frontend:30000`, `maildev:30080`, `signoz:30301`). |
| **PersistentVolumeClaim (PVC)** | `v1/PVC` | Solicitud de almacenamiento persistente dinámico provisto por la StorageClass `local-path`. |
| **ConfigMap** | `v1/ConfigMap` | Configuración no sensible inyectada como archivos o variables (ej. `init.sql` de MySQL, `otel-collector-config.yaml`). |
| **Secret** | `v1/Secret` | Almacenamiento seguro de credenciales codificadas (`DB_PASSWORD`, `JWT_SECRET`). |
| **Ingress** | `networking.k8s.io` | Reglas de enrutamiento HTTP/HTTPS gestionadas por **Traefik API Gateway**. |
| **NetworkPolicy** | `networking.k8s.io` | Reglas de seguridad de red que aíslan y controlan el tráfico entrante (`Ingress`) y saliente (`Egress`). |

---

## 2. Probes de Diagnóstico (Health Checks)

Cada microservicio implementa tres sondas de salud para garantizar resiliencia:

1. **StartupProbe**: Retarda las comprobaciones iniciales mientras el proceso Node.js/NestJS carga módulos en memoria.
2. **LivenessProbe**: Comprueba si el contenedor está vivo. Si falla secuencialmente, Kubernetes destruye el Pod y crea uno nuevo.
3. **ReadinessProbe**: Comprueba si la aplicación está lista para recibir tráfico. Si falla, el servicio remueve temporalmente el Pod del balanceador.

---

## 3. Kubernetes Commands Cheat Sheet 🛠️

A continuación se presenta la guía completa de comandos `kubectl` para administrar el clúster:

### 🌐 Clúster y Contexto
```bash
# Mostrar información básica del clúster
kubectl cluster-info

# Listar todos los nodos del clúster con sus IPs y estado
kubectl get nodes -o wide

# Cambiar contexto activo al de Rancher Desktop
kubectl config use-context rancher-desktop

# Cambiar namespace por defecto
kubectl config set-context --current --namespace=fintech
```

### 📦 Gestión de Pods
```bash
# Listar todos los pods en el namespace actual
kubectl get pods

# Listar pods con información detallada (IP, Nodo)
kubectl get pods -o wide

# Listar pods filtrados por etiqueta (label)
kubectl get pods -l app=transaction-service

# Ver detalles completos y eventos de un pod
kubectl describe pod <pod-name> -n fintech

# Ver logs en tiempo real de un pod
kubectl logs -f <pod-name> -n fintech

# Ejecutar una terminal interactiva bash dentro de un pod
kubectl exec -it <pod-name> -n fintech -- /bin/sh

# Eliminar un pod (Kubernetes creará uno nuevo si pertenece a un Deployment/StatefulSet)
kubectl delete pod <pod-name> -n fintech

# Explicación del esquema del recurso Pod
kubectl explain pod
```

### 🚀 Despliegues y Replicación (Deployments)
```bash
# Listar todos los Deployments
kubectl get deployments -n fintech

# Ver detalles de un Deployment
kubectl describe deployment transaction-service -n fintech

# Escalar el número de réplicas de un Deployment
kubectl scale deployment transaction-service --replicas=3 -n fintech

# Reiniciar un Deployment (forzar actualización de pods sin tiempo de inactividad)
kubectl rollout restart deployment/transaction-service -n fintech

# Ver el estado del despliegue rollout
kubectl rollout status deployment/transaction-service -n fintech

# Crear un deployment directamente desde CLI
kubectl create deployment demo-service --image=nginx:alpine
```

### 🔌 Servicios de Red (Services)
```bash
# Listar todos los servicios del namespace
kubectl get services -n fintech

# Ver detalles de un servicio específico
kubectl describe service user-service -n fintech

# Reenviar un puerto local del Host directamente a un Pod (Port-Forward)
kubectl port-forward pod/mysql-0 3306:3306 -n fintech

# Eliminar un servicio
kubectl delete service <service-name> -n fintech
```

### 🔐 ConfigMaps & Secrets
```bash
# Listar ConfigMaps y Secrets
kubectl get configmaps -n fintech
kubectl get secrets -n fintech

# Ver contenido codificado de un Secret
kubectl describe secret fintech-secrets -n fintech

# Crear un secret desde literales en terminal
kubectl create secret generic mi-secreto --from-literal=key1=val1 -n fintech
```

### 🏷️ Namespaces
```bash
# Listar todos los namespaces del clúster
kubectl get namespaces

# Crear un nuevo namespace
kubectl create namespace mi-namespace

# Eliminar un namespace y todos sus recursos contenidos
kubectl delete namespace mi-namespace
```

### 📄 Aplicación de Archivos YAML (Declarativo)
```bash
# Aplicar todos los manifiestos de un directorio
kubectl apply -f k8s/

# Probar la sintaxis sin aplicar cambios (Dry Run)
kubectl apply -f k8s/02-microservices.yaml --dry-run=client

# Eliminar recursos definidos en un archivo YAML
kubectl delete -f k8s/02-microservices.yaml
```

### 📊 Estadísticas y Monitoreo de Recursos
```bash
# Ver consumo de CPU y memoria de los Nodos
kubectl top nodes

# Ver consumo de CPU y memoria de los Pods
kubectl top pods -n fintech

# Listar eventos recientes del clúster (Útil para depurar fallas)
kubectl get events -n fintech --sort-by='.metadata.creationTimestamp'
```
