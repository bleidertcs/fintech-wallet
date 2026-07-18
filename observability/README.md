# Guía de Observabilidad con SigNoz - FinTech Wallet

Esta carpeta contiene la documentación y guías para monitorear y analizar el rendimiento de la aplicación FinTech Wallet usando **SigNoz** y **OpenTelemetry (OTel)**.

---

## 🚀 Acceso a SigNoz UI

Una vez levantado el stack de Docker, puedes acceder a la interfaz de usuario de SigNoz:

*   **URL**: [http://localhost:3301](http://localhost:3301)
*   **Primer inicio**: Te pedirá crear una cuenta de administrador local. Los datos se almacenan de forma segura de manera local en el volumen de ClickHouse.

---

## 🏗️ Arquitectura de Observabilidad e Infraestructura

Hemos estructurado los archivos de configuración en el repositorio para mantener una raíz limpia y profesional:

```
├── infra/
│   ├── mysql/
│   │   └── init-databases.sql         # Inicialización de bases de datos
│   ├── clickhouse/
│   │   ├── cluster.xml               # Configuración del clúster de ClickHouse para SigNoz
│   │   └── users.xml                 # Definición de usuarios y permisos
│   └── otel/
│       ├── otel-collector-config.yaml # Configuración del colector de OpenTelemetry
│       └── otel-migration-config.yaml # Esquema y migraciones de ClickHouse
├── observability/
│   ├── README.md                     # Esta guía de documentación
│   ├── dashboards/
│   │   └── kafka-dashboard.json      # Plantilla exportada del dashboard de Kafka
│   └── scripts/
│       ├── create-dashboards.js      # Script para importar dashboards vía API
│       └── fix-hostmetrics.js        # Script para depurar panelMap y filtros
```

### 📡 Comunicación entre Microservicios (gRPC)
La comunicación síncrona interna se realiza a través del protocolo **gRPC** en el puerto `9090` de `user-service`. SigNoz detecta automáticamente las llamadas gRPC y las mapea en la sección **Services** y **Traces** (ej. `user.UserService/GetUser` y `user.UserService/UpdateBalance`), permitiendo medir latencia, rendimiento y errores.

---

## 📊 Dashboards Activos en SigNoz

### 1. APM Metrics (Predefinido)
Monitorea las métricas RED estándar de tus servicios Java y el API Gateway:
*   **P50/P90/P99 Latency**
*   **Request Rate** (Peticiones por segundo)
*   **Error Percentage** (Porcentaje de fallos HTTP y gRPC)

### 2. Kafka Server Monitoring (Importado)
Monitorea los brokers, topics y el lag de los grupos de consumidores (consumidor de `notification-service`).
*   **Metadatos**: Muestra brokers activos, topics creados y particiones offline.
*   **Lag**: Gráfica el consumo y el retraso en tiempo real del procesamiento de eventos de transferencias.
*   *Nota: Se removieron los filtros incompatibles de las variables de entorno para que el dashboard muestre datos correctamente.*

### 3. Host Metrics (Infraestructura de Host)
Muestra el consumo del host donde corren los servicios:
*   Métricas colectadas: `system.cpu.time`, `system.memory.usage`, `system.network.io`, `system.disk.io` y `system.filesystem.usage`.
*   *Nota: Habilitamos el receptor `hostmetrics` y el procesador `resourcedetection` en el OTel Collector para resolver el valor del host `host.name` desde el mapa `resource_attrs` de ClickHouse.*

### 4. Docker Container Metrics (Personalizado)
Monitorea el rendimiento individual de cada contenedor de Docker en la pila:
*   **CPU Utilization**: Porcentaje de CPU usado por contenedor.
*   **Memory Usage**: Porcentaje y cantidad en bytes de memoria RAM por contenedor.
*   **Network RX/TX**: Tasa de subida y bajada de red por servicio.
*   **Disk Block IO**: Tasa de lectura/escritura en disco.

---

## ⚙️ Reglas de Alerta Recomendadas

Puedes crear alertas en la sección **Alerts** de la UI de SigNoz:

1.  **Tasa de Error Crítica (Error Rate > 5%)**:
    *   **Métrica**: `sum(hasError) / count() * 100` sobre `signoz_traces.signoz_index_v2`
    *   **Condición**: Mayor a `5` por más de `5m`
    *   **Severidad**: Critical
2.  **Latencia Elevada (p99 > 2s)**:
    *   **Métrica**: `quantile(0.99)(durationNano) / 1000000`
    *   **Condición**: Mayor a `2000` por más de `5m`
    *   **Severidad**: Warning
3.  **Servicio Caído (Absent Data)**:
    *   **Métrica**: `count()`
    *   **Condición**: Menor o igual a `0` por más de `2m`
    *   **Severidad**: Critical

---

## 🛠️ Solución de Problemas (Troubleshooting)

*   **¿ClickHouse consume demasiados recursos?**
    ClickHouse está optimizado para almacenar terabytes de datos, pero en desarrollo puede consumir memoria. Si experimentas lentitud, detén el stack y reduce el límite de memoria del contenedor en el archivo `docker-compose.yml`.
*   **Error: "Connection Refused" en OTel Collector**
    Esto indica que el Collector intentó conectarse a ClickHouse antes de que este estuviera listo. La sección `depends_on` con `condition: service_healthy` en `docker-compose.yml` previene esto, pero si ocurre, simplemente corre `docker compose restart otel-collector`.
