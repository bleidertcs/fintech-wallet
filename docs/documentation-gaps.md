# Auditoría de Gaps, Deuda Técnica y Mejoras Recomendadas

Este documento presenta una auditoría técnica rigurosa de las áreas de oportunidad, deuda técnica y mejoras recomendadas para la plataforma **FinTech Wallet**, clasificadas por nivel de prioridad (**Crítico**, **Importante**, **Recomendado**).

---

## 📑 Tabla Resumen de Hallazgos

| Área | Problema Detectado | Impacto en el Sistema | Recomendación de Evolución | Prioridad |
| :--- | :--- | :--- | :--- | :---: |
| **Seguridad de Secretos** | Secretos en texto plano o base64 estándar en `00-namespace-config.yaml` y `.env` | Riesgo de divulgación de credenciales de BD y firmas JWT en repositorios | Implementar **HashiCorp Vault**, **Sealed Secrets** o **External Secrets Operator** integrado con AWS Secrets Manager o Azure Key Vault | **Crítico** |
| **Alta Disponibilidad (HA) BD** | PostgreSQL opera como StatefulSet de réplica única (`replicas: 1`) sin replicación de streaming | Punto único de fallo (SPOF) en caso de caída del nodo de persistencia | Migrar a un operador de PostgreSQL Cloud-Native como **CloudNativePG** o **Zalando Postgres Operator** con Patroni y réplicas en standby | **Crítico** |
| **Outbox Poller / CDC** | Los eventos de `outbox_events` se publican directamente en el EventBus en memoria tras la transacción | Si el broker Kafka se encuentra momentáneamente no disponible, el evento queda en `PENDING` en DB sin un worker de reintento en background | Implementar un **Debezium CDC (Change Data Capture)** o un CronJob Poller en `transaction-service` para garantizar despacho atómico garantizado (*At-least-once Delivery*) | **Crítico** |
| **Gobernanza de Tópicos Kafka** | Los eventos viajan como JSON plano sin validación estricta de esquemas ni compatibilidad de versiones | Riesgo de incompatibilidad de tipos ante cambios de contratos entre productores y consumidores | Incorporar un **Confluent Schema Registry** o **Apicurio** con serialización **Apache Avro** o **Protobuf** | **Importante** |
| **Autoscaling (HPA)** | Los Deployments carecen de Horizontal Pod Autoscalers (HPA) | Incapacidad de adaptarse dinámicamente ante picos de tráfico transaccional masivo | Configurar **HPA** basado en métricas de CPU/RAM y **KEDA (Kubernetes Event-driven Autoscaling)** basado en el lag de consumidores Kafka | **Importante** |
| **Pipelines CI/CD** | El proceso de build y despliegue depende de scripts locales (`deploy-rancher.ps1`) | Falta de integración y entrega continua automatizada en entornos multi-nodo | Construir pipelines de **GitHub Actions** o **GitLab CI** con testing automatizado, escaneo de vulnerabilidades con **Trivy** y despliegue GitOps vía **ArgoCD** | **Importante** |
| **Reglas de Alerta APM** | SigNoz recolecta trazas y métricas pero no tiene reglas de alerta automáticas configuradas | Retraso en la detección de anomalías transaccionales o fallos en el pool de PgBouncer | Definir alertas en SigNoz para tasas de error HTTP 5xx (`> 1%`), latencias P99 (`> 200ms`) y caídas de Pods con notificaciones a Slack/PagerDuty | **Importante** |
| **Service Mesh y mTLS** | El tráfico inter-servicio viaja en texto plano dentro de la red del clúster | Vulnerabilidad ante intrusiones laterales en clústeres multi-tenant | Incorporar un Service Mesh ligero como **Linkerd** o **Istio** con cifrado mTLS automático y políticas estrictas de Service-to-Service | **Recomendado** |
| **Portal Swagger Unificado** | Cada microservicio expone su propio Swagger UI independiente (`/auth/docs`, `/users/docs`, etc.) | Experiencia fragmentada para consumidores de API externos | Configurar un **Swagger UI Aggregator** o un portal de desarrollador en Traefik que unifique todas las definiciones OpenAPI en una sola vista | **Recomendado** |
| **Pruebas de Caos (Chaos Engineering)** | No existen pruebas automatizadas de tolerancia a caídas de pods o desconexión de brokers | Incertidumbre sobre el comportamiento del sistema ante caídas imprevistas | Implementar pruebas de resiliencia con **Chaos Mesh** o **LitmusChaos** para simular caídas de Kafka, Redis y PgBouncer | **Recomendado** |

---

## 1. Detalle de Mejoras Críticas

### 1.1. Gestión Segura de Secretos
* **Situación Actual**: Las contraseñas de base de datos y la clave `JWT_SECRET` se encuentran en el manifiesto `k8s/00-namespace-config.yaml` en la sección `stringData`.
* **Ruta de Mejora**: Integrar **Sealed Secrets** de Bitnami para permitir versionar secretos cifrados en Git de forma segura, o desplegar **External Secrets Operator** para sincronizar credenciales en tiempo de ejecución desde bóvedas administradas.

### 1.2. Alta Disponibilidad de Persistencia (CloudNativePG)
* **Situación Actual**: Tanto `postgres-core` como `postgres-support` operan con un único Pod y un PVC local.
* **Ruta de Mejora**: Desplegar el operador open-source **CloudNativePG** para habilitar clústeres primario-réplica con failover automático en menos de 10 segundos y respaldos continuos basados en WAL (Write-Ahead Logging) hacia almacenamiento de objetos S3/MinIO.

### 1.3. Outbox Poller Worker con CDC
* **Situación Actual**: `transaction-service` guarda el evento en `outbox_events` y despacha a Kafka en la misma ejecución.
* **Ruta de Mejora**: Añadir un proceso en segundo plano (Worker Poller o Debezium Engine) que lea registros en estado `PENDING` de `outbox_events`, los despache a Kafka con confirmación de entrega (*Ack*) y actualice el estado a `PUBLISHED`, garantizando entrega infalible incluso si Kafka experimenta una desconexión temporal.

---

## 2. Detalle de Mejoras Importantes

### 2.1. Escalado Elástico con KEDA y HPA
* **Situación Actual**: Las réplicas están fijadas estáticamente en `1`.
* **Ruta de Mejora**: Implementar escaladores KEDA que observen las métricas de lag en los tópicos de Kafka (`transfer_completed`). Si el lag supera los 100 mensajes acumulados, `notification-service` y `worker-service` se escalarán automáticamente a múltiples réplicas para procesar la cola en paralelo.

### 2.2. CI/CD y GitOps con ArgoCD
* **Situación Actual**: Las imágenes se compilan con `nerdctl` localmente.
* **Ruta de Mejora**: Establecer un flujo GitOps donde cada commit en la rama principal dispare un pipeline de CI que compile y publique imágenes en un Container Registry (GHCR/DockerHub) y **ArgoCD** sincronice automáticamente el clúster con el Helm Chart de `k8s/helm/`.

---

## 3. Detalle de Mejoras Recomendadas

### 3.1. Gobernanza de Contratos con Schema Registry
* **Situación Actual**: Los eventos Kafka son strings JSON sin esquema validado.
* **Ruta de Mejora**: Centralizar los esquemas Avro en un Schema Registry y generar interfaces TypeScript automáticamente durante el build (`avro-typescript`), impidiendo que productores publiquen mensajes con esquemas rotos.

Para comenzar a operar o desplegar el ecosistema, consulta la [Guía de Inicio Rápido](getting-started.md).
