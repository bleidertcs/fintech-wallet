# Guía de Troubleshooting y Resolución de Fallos

Este documento proporciona una guía de diagnóstico paso a paso y soluciones prácticas para los problemas más comunes en **Kubernetes**, **PostgreSQL**, **PgBouncer**, **Redis**, **Apache Kafka**, **Traefik**, **SigNoz** y los microservicios **NestJS**.

---

## 📑 Categorías de Diagnóstico

1. [Problemas en Kubernetes](#1-problemas-en-kubernetes)
2. [Problemas en PostgreSQL y PgBouncer](#2-problemas-en-postgresql-y-pgbouncer)
3. [Problemas en Redis](#3-problemas-en-redis)
4. [Problemas en Apache Kafka (KRaft)](#4-problemas-en-apache-kafka-kraft)
5. [Problemas en Traefik e Ingress](#5-problemas-en-traefik-e-ingress)
6. [Problemas en Observabilidad (SigNoz / ClickHouse / OTel)](#6-problemas-en-observabilidad-signoz--clickhouse--otel)
7. [Problemas en Microservicios NestJS](#7-problemas-en-microservicios-nestjs)

---

## 1. Problemas en Kubernetes

### 1.1. Pod en Estado `Pending`

* **Causa 1: Volumen Persistente (PVC) no asignado o StorageClass ausente**.
  - **Diagnóstico**: `kubectl describe pod <pod-name> -n fintech` (buscar eventos `FailedScheduling` o `VolumeBindingFailed`).
  - **Solución**: Verificar que el clúster (Kind/Minikube/K3s) tenga habilitado el proveedor de almacenamiento estándar (`kubectl get sc`).
* **Causa 2: Recursos de CPU o Memoria insuficientes en el nodo**.
  - **Diagnóstico**: `kubectl describe nodes` (comprobar la sección `Allocated resources`).
  - **Solución**: Aumentar la memoria asignada a la máquina virtual de Podman (`podman machine set --cpus 4 --memory 8192` o recrearla con `podman machine init --memory 8192`).

### 1.2. Pod en Estado `ImagePullBackOff` o `ErrImagePull`

* **Causa: La imagen de contenedor no fue cargada al clúster local de Kubernetes**.
  - **Diagnóstico**: `kubectl describe pod <pod-name> -n fintech` (evento `Failed to pull image`).
  - **Solución**: Cargar las imágenes construidas con Podman en el clúster:
    ```bash
    # En Kind:
    export KIND_EXPERIMENTAL_PROVIDER=podman
    kind load docker-image fintech/auth-service:1.0.0 --name <nombre-cluster>

    # En Minikube:
    minikube image load fintech/auth-service:1.0.0
    ```
    O simplemente ejecuta `.\deploy-k8s.ps1` (o `./deploy-k8s.sh`), que detecta el clúster y carga todas las imágenes automáticamente.

### 1.3. Pod en Estado `CrashLoopBackOff`

* **Causa: Fallo crítico durante la inicialización del proceso Node.js o error de conexión inicial**.
  - **Diagnóstico**:
    ```bash
    # Ver logs del contenedor que falló previamente
    kubectl logs <pod-name> -n fintech --previous
    ```
  - **Solución**: Verificar que las variables de entorno `DATABASE_URL`, `REDIS_HOST` o `KAFKA_BROKERS` apunten a los servicios correctos y que la base de datos esté lista.

### 1.4. Fallo en `ReadinessProbe` o `LivenessProbe`

* **Causa: El microservicio tarda más tiempo en inicializar la conexión con Prisma y Kafka que el `initialDelaySeconds`**.
  - **Diagnóstico**: `kubectl describe pod <pod-name> -n fintech` (buscar `Unhealthy readiness probe`).
  - **Solución**: En `k8s/02-microservices.yaml`, los pods incluyen un `startupProbe` con `failureThreshold: 20` y `periodSeconds: 3` (hasta 60 segundos de gracia). Si el host es lento, incrementa `failureThreshold: 30`.

### 1.5. Error al Compilar o Montar con Podman: Socket o Permisos Rootless

* **Causa: El servicio Podman no está activo o se presentan restricciones SELinux en volúmenes montados**.
  - **Diagnóstico**: `Error: cannot connect to the Podman socket` o `Permission denied` en carpetas locales.
  - **Solución**:
    1. En Windows/macOS: Iniciar la máquina con `podman machine start`.
    2. En Linux: Habilitar el socket de usuario con `systemctl --user enable --now podman.socket`.
    3. Para volúmenes montados en Linux con SELinux, usar el sufijo `:z` o `:Z` (ya configurado en `compose.yaml`).
  - **Guía Completa**: Consulta la [Guía de Configuración de Podman y Kubernetes](podman-setup.md).

---

## 2. Problemas en PostgreSQL y PgBouncer

### 2.1. Error `Connection Refused` o Fallo en PgBouncer

* **Causa: El pod `postgres-core-0` no ha completado el script de inicialización o `pgbouncer-core` no puede resolver el host**.
  - **Diagnóstico**:
    ```bash
    kubectl logs -n fintech -l app=pgbouncer-core
    kubectl exec -it -n fintech postgres-core-0 -- pg_isready -U postgres -d authdb
    ```
  - **Solución**: Esperar a que `postgres-core-0` esté en estado `1/1 Running`.

### 2.2. Error de Autenticación de Base de Datos (`password authentication failed`)

* **Causa: Discrepancia entre la contraseña en el Secret `fintech-secrets` y los datos del volumen persistente existente**.
  - **Diagnóstico**: Comprobar logs de PostgreSQL (`kubectl logs -n fintech postgres-core-0`).
  - **Solución**: Si se modificó la contraseña en `00-namespace-config.yaml` pero el volumen ya fue inicializado con la contraseña anterior, recrear el namespace o actualizar la contraseña mediante SQL:
    ```bash
    kubectl exec -it -n fintech postgres-core-0 -- psql -U postgres -c "ALTER USER postgres WITH PASSWORD '<nueva-clave>';"
    ```

### 2.3. Error de Prisma: `Prepared statement already exists` o Incompatibilidad PgBouncer

* **Causa: PgBouncer opera en modo `transaction`, el cual no retiene prepared statements a nivel de sesión**.
  - **Solución**: Asegurarse de que la variable `DATABASE_URL` incluya el parámetro `pgbouncer=true`:
    ```text
    postgresql://postgres:12345@pgbouncer-core:6432/transactiondb?schema=public&pgbouncer=true
    ```

---

## 3. Problemas en Redis

### 3.1. Error `ECONNREFUSED` al Conectar con Redis

* **Diagnóstico**:
  ```bash
  kubectl exec -it -n fintech redis-0 -- redis-cli ping
  ```
* **Solución**: Verificar que el servicio Kubernetes `redis` esté activo en el puerto `6379` en el namespace `fintech`.

### 3.2. Claves de Idempotencia Bloqueadas Permanentemente

* **Causa: Un proceso terminó abruptamente antes de liberar el candado `idemp:lock:*`**.
* **Solución**: Los candados cuentan con expiración automática forzada (`EX 30`). Para liberar manualmente:
  ```bash
  kubectl exec -it -n fintech redis-0 -- redis-cli del "idemp:lock:<userId>:<key>"
  ```

---

## 4. Problemas en Apache Kafka (KRaft)

### 4.1. El Broker Kafka no Levanta o Falla el Quórum

* **Diagnóstico**: `kubectl logs -n fintech kafka-0 --tail=100`.
* **Causa común**: Incompatibilidad en los identificadores de cluster en `/tmp/kafka-logs/meta.properties`.
* **Solución**: Si el volumen de datos fue corrompido, reiniciar el StatefulSet limpiando el volumen:
  ```bash
  kubectl delete statefulset kafka -n fintech
  kubectl delete pvc kafka-data-kafka-0 -n fintech
  kubectl apply -f k8s/01-infrastructure.yaml
  ```

### 4.2. Los Consumidores no Reciben Mensajes de Transferencia

* **Diagnóstico**:
  ```bash
  # Verificar si el tópico contiene mensajes
  kubectl exec -it -n fintech kafka-0 -- /opt/kafka/bin/kafka-console-consumer.sh \
    --bootstrap-server localhost:9092 --topic transfer_completed --from-beginning
  ```
* **Solución**: Comprobar que `KAFKA_BROKERS` esté configurado en `kafka:29092` en los deployments de `transaction-service`, `notification-service` y `worker-service`.

---

## 5. Problemas en Traefik e Ingress

### 5.1. Error HTTP 404 Not Found al Invocar `/api/*`

* **Causa: El Middleware `strip-api-prefix` no está adjunto a la ruta Ingress**.
* **Diagnóstico**: `kubectl describe ingress fintech-ingress -n fintech`.
* **Solución**: Verificar la anotación `traefik.ingress.kubernetes.io/router.middlewares: fintech-strip-api-prefix@kubernetescrd` en `k8s/05-ingress.yaml`.

### 5.2. Error HTTP 502 Bad Gateway

* **Causa: Traefik no puede contactar el puerto de servicio del microservicio destino**.
* **Diagnóstico**: Comprobar que el `service.port.number` en el Ingress coincida con el puerto del `Service` en `02-microservices.yaml` (ej. `user-service` escucha en `8082`, `transaction-service` en `8083`).

### 5.3. Error `no matches for kind "Middleware" in version "traefik.io/v1alpha1"` al aplicar `05-ingress.yaml`

* **Causa**: Estás ejecutando en un clúster como **Kind** o **Minikube** que no incluye Traefik Ingress Controller ni sus Custom Resource Definitions (CRDs) instalados por defecto (a diferencia de K3s).
* **Diagnóstico**: Ocurre al ejecutar `kubectl apply -f k8s/05-ingress.yaml` en un clúster sin Traefik.
* **Solución**: Instalar las definiciones CRD de Traefik antes de aplicar el manifiesto Ingress:
  ```bash
  # Opción A: Instalar los CRDs de Traefik directamente
  kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.1/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml

  # Opción B: Instalar Traefik e Ingress Controller mediante Helm
  helm repo add traefik https://traefik.github.io/charts
  helm repo update
  helm install traefik traefik/traefik --namespace kube-system --create-namespace
  ```

---

## 6. Problemas en Observabilidad (SigNoz / ClickHouse / OTel)

### 6.1. No Aparecen Trazas ni Métricas en SigNoz UI

* **Diagnóstico**:
  1. Verificar si ClickHouse está recibiendo datos:
     ```bash
     kubectl exec -it -n fintech clickhouse-0 -- clickhouse-client --query "SELECT count() FROM signoz_traces.signoz_index_v2;"
     ```
  2. Verificar los logs del Collector:
     ```bash
     kubectl logs -n fintech -l app=otel-collector --tail=50
     ```
* **Causa común**: El Job de migración `signoz-migrator` no se ejecutó previamente.
* **Solución**:
  ```bash
  kubectl delete job signoz-migrator -n fintech --ignore-not-found
  kubectl apply -f k8s/04-observability.yaml
  ```

---

## 7. Problemas en Microservicios NestJS

### 7.1. Error al Iniciar: `Cannot find module './infrastructure/telemetry'`

* **Causa: La compilación TypeScript no incluyó los archivos de telemetría**.
* **Solución**: Ejecutar `pnpm build` en el microservicio correspondiente y verificar que la carpeta `dist/` contenga `infrastructure/telemetry/index.js`.

### 7.2. Fallo de CORS al Invocar APIs desde el Navegador

* **Solución**: Todos los microservicios ejecutan `app.enableCors()` en su `main.ts` y Traefik permite orígenes cruzados en el middleware OTLP.

Para configurar el entorno de trabajo individual y depurar microservicios localmente, consulta la [Guía de Desarrollo Local](development.md).
