# Reporte de Error en SigNoz: "Request failed with status code 500"

## 1. Descripción del Error
Al intentar abrir el dashboard de rendimiento de cualquier servicio en la interfaz de usuario de SigNoz (por ejemplo, `frontend-wallet` o `user-service`), la interfaz muestra un cuadro de diálogo con el mensaje:
> **Request failed with status code 500**

Además, los gráficos de Latencia, Tasa de Peticiones (Rate) y Apdex muestran el mensaje **"No Data"** en la interfaz.

---

## 2. Diagnóstico y Causa Raíz

Al revisar los logs del contenedor de backend de SigNoz (`fintech-signoz` / `query-service`), se encontraron múltiples registros como el siguiente:
```json
{"timestamp":"2026-07-17T13:58:33.110939554Z","level":"INFO","msg":"::RECEIVED-REQUEST::","http.route":"/api/v4/metric/metric_metadata","http.response.status_code":500,"response.body":"{\"status\":\"error\",\"errorType\":\"internal\",\"error\":\"metric metadata not found: signoz_latency.bucket\"}"}
```

### ¿Por qué ocurre esto?
1. **Ausencia de Procesador de Métricas de Spans**:
   El archivo de configuración del OTel Collector del proyecto ([otel-collector-config.yaml](file:///c:/dev/DevOps/fintech-wallet/otel-collector-config.yaml)) es una configuración personalizada que recibe trazas directas de los servicios y las envía a ClickHouse. Sin embargo, **no tiene configurado el procesador de métricas de spans** (`signozspanmetrics`).
   
2. **Tablas de Métricas Vacías**:
   Como no hay ningún procesador calculando métricas a partir de las trazas recibidas, ClickHouse nunca recibe las métricas de APM (`signoz_latency.bucket`, `signoz_calls_total`, `signoz_latency.sum`, etc.). Esto se comprobó corriendo la consulta en la base de datos de metadatos de métricas, la cual retornó 0 registros para métricas que comiencen con `signoz`.

3. **Fallo Crítico en el Backend de SigNoz**:
   Cuando entras a la vista de un servicio en la UI, el backend de SigNoz realiza una llamada HTTP interna a `/api/v4/metric/metric_metadata` consultando por `signoz_latency.bucket`. Al no encontrar este metadato en ClickHouse, en lugar de manejarlo de manera elegante mostrando gráficos vacíos, el `query-service` lanza una excepción HTTP 500, rompiendo la carga de la página en la UI.

---

## 3. Solución Propuesta (Para aplicar más adelante)

Para solucionar este problema de forma definitiva cuando decidas hacerlo, se deben seguir los siguientes pasos:

### Paso 1: Configurar el procesador `signozspanmetrics`
Modificar el archivo [otel-collector-config.yaml](file:///c:/dev/DevOps/fintech-wallet/otel-collector-config.yaml) para añadir la definición del procesador y conectarlo en los pipelines de `traces` y `metrics`:

```yaml
processors:
  batch:
    send_batch_size: 10000
    timeout: 1s
  memory_limiter:
    check_interval: 1s
    limit_percentage: 75
  # Añadir este procesador
  signozspanmetrics:
    metrics_exporter: signozclickhousemetrics
    latency_histogram_buckets: [100us, 1ms, 2ms, 6ms, 10ms, 50ms, 100ms, 250ms, 500ms, 1s, 1.4s, 2s, 5s, 10s, 15s, 40s]
    dimensions:
      - name: service.namespace
        default: default
      - name: deployment.environment
        default: default

# ...

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, signozspanmetrics, batch] # Agregar aquí
      exporters: [clickhousetraces]
    metrics:
      receivers: [otlp, docker_stats, kafkametrics]
      processors: [memory_limiter, batch]
      exporters: [signozclickhousemetrics]
```

### Paso 2: Reiniciar el colector y generar tráfico
1. Reiniciar el contenedor:
   ```bash
   docker compose restart otel-collector
   ```
2. Realizar algunas acciones en la aplicación frontend (registro, transferencias) para forzar el envío de nuevas trazas.
3. El procesador `signozspanmetrics` detectará las trazas entrantes, generará la métrica `signoz_latency.bucket` y la guardará en ClickHouse. A partir de ese momento, la consulta de metadatos responderá exitosamente (HTTP 200) y la vista de servicios en la UI de SigNoz cargará de manera normal y con datos.
