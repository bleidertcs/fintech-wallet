# Guía de Observabilidad con SigNoz - FinTech Wallet

Esta carpeta contiene la suite de monitoreo, plantillas de dashboards y guías para analizar el rendimiento y la confiabilidad del sistema FinTech Wallet usando **SigNoz** y **OpenTelemetry (OTel)**.

---

## 🚀 Acceso a SigNoz UI

Una vez levantado el clúster de Kubernetes:

*   **URL Local**: [http://localhost:30301](http://localhost:30301)
*   **URL Remota (Servidor)**: `http://10.20.0.6:30301`
*   **Primer inicio**: Permite registrar o ingresar con la cuenta de administrador local. Los datos de trazas, métricas y logs se almacenan en ClickHouse.

---

## 📚 Documentación Principal

*   📖 **[Guía Maestra de Interpretación de Observabilidad SRE](GUIA_INTERPRETACION_OBSERVABILIDAD.md)**:
    *   Explicación de metodologías RED y USE aplicadas al clúster.
    *   Interpretación detallada panel por panel de los 6 dashboards.
    *   Cheat-Sheet de métricas con umbrales normales vs críticos.
    *   Guía de correlación integral Traza ➔ Log ➔ Métrica en SigNoz.
    *   Playbooks de resolución de incidentes paso a paso (Runbooks SRE).

---

## 📊 Suite de 6 Dashboards de SigNoz

Los dashboards están disponibles en `k8s/dashboards/` y `observability/dashboards/`:

1.  **[01. Kubernetes Cluster & Pods Infrastructure](dashboards/01-signoz-k8s-cluster.json)**:
    *   Uso de CPU y RAM por Pod y Nodo, Restarts, OOMKilled, almacenamiento en PVCs y escalado HPA.
2.  **[02. NestJS Microservices RED Metrics & APM](dashboards/02-signoz-nestjs-apm.json)**:
    *   Throughput (RPS), Latencias P50/P95/P99, Tasa de Errores HTTP 4xx/5xx, Node.js Heap Memory, Event Loop Lag y llamadas gRPC.
3.  **[03. PostgreSQL & PgBouncer Connection Pool](dashboards/03-signoz-postgresql-pgbouncer.json)**:
    *   Conexiones activas/en espera en PgBouncer, QPS de lectura/escritura, latencia de queries P99, commits vs rollbacks y deadlocks.
4.  **[04. Apache Kafka KRaft & Event Streaming](dashboards/04-signoz-kafka-streaming.json)**:
    *   Tasa de eventos producidos, Consumer Group Lag de `notification-service` y `worker-service`, eventos en Dead Letter Queue (DLQ) y salud del broker KRaft.
5.  **[05. Redis Cache & Idempotency Store](dashboards/05-signoz-redis-cache.json)**:
    *   Tasa de aciertos de caché (Hit Rate %), memoria usada vs límite 256MB, comandos/seg y desalojos (Evictions).
6.  **[06. Ingress Controller & Network Edge Traffic](dashboards/06-signoz-ingress-networking.json)**:
    *   Volumen de peticiones entrantes en el borde, distribución de códigos HTTP, latencia perimetral y Rate Limiting (429).

---

## ⚙️ Métodos de Importación

### Método 1: Automático con Kubernetes (Recomendado)
```bash
kubectl apply -f k8s/12-signoz-dashboards-importer.yaml
```

### Método 2: Script Bash (Servidor Remoto Linux)
```bash
./import-signoz-dashboards.sh http://localhost:30301
# O hacia la IP remota:
./import-signoz-dashboards.sh http://10.20.0.6:30301
```

### Método 3: Script PowerShell (Windows Local)
```powershell
.\import-signoz-dashboards.ps1 -SigNozUrl "http://localhost:30301"
# O hacia la IP remota:
.\import-signoz-dashboards.ps1 -SigNozUrl "http://10.20.0.6:30301"
```
