import json
import urllib.request
import urllib.error
import time

SIGNOZ_URL = "http://10.20.0.6:30301/api/v2/dashboards"
API_KEY = "u/qUnbL4dpx5rOobkLjAUidg9NWRddEpVZsIOUCCc9g="

HEADERS = {
    "Content-Type": "application/json",
    "SIGNOZ-API-KEY": API_KEY
}

def create_builder_query(query_name, metric_name, time_agg, space_agg, group_by=None, filter_expr=None, legend=None):
    spec = {
        "signal": "metrics",
        "name": query_name,
        "aggregations": [
            {
                "metricName": metric_name,
                "timeAggregation": time_agg,
                "spaceAggregation": space_agg
            }
        ]
    }
    if group_by:
        spec["groupBy"] = [{"name": g} for g in group_by]
    if filter_expr:
        spec["filter"] = {"expression": filter_expr}
    if legend:
        spec["legend"] = legend
        
    return {
        "kind": "time_series",
        "spec": {
            "name": query_name,
            "plugin": {
                "kind": "signoz/BuilderQuery",
                "spec": spec
            }
        }
    }

def create_panel(panel_id, title, description, queries, unit="", plugin_kind="signoz/TimeSeriesPanel"):
    return {
        "kind": "Panel",
        "spec": {
            "display": {
                "name": title,
                "description": description
            },
            "plugin": {
                "kind": plugin_kind,
                "spec": {
                    "formatting": {
                        "unit": unit,
                        "decimalPrecision": "2"
                    }
                }
            },
            "queries": queries
        }
    }

def create_dashboard_spec(slug, title, description, tags_list, panels_dict, layout_items):
    tags = [{"key": "tag", "value": t} for t in tags_list]
    tags.append({"key": "env", "value": "fintech"})
    
    grid_items = []
    for item in layout_items:
        grid_items.append({
            "x": item["x"],
            "y": item["y"],
            "width": item["w"],
            "height": item["h"],
            "content": {
                "$ref": f"#/spec/panels/{item['id']}"
            }
        })

    return {
        "schemaVersion": "v6",
        "name": slug,
        "tags": tags,
        "spec": {
            "display": {
                "name": title,
                "description": description
            },
            "variables": [],
            "panels": panels_dict,
            "layouts": [
                {
                    "kind": "Grid",
                    "spec": {
                        "display": {
                            "title": "Main"
                        },
                        "items": grid_items
                    }
                }
            ]
        }
    }

def check_existing_dashboards():
    req = urllib.request.Request(SIGNOZ_URL, headers=HEADERS, method='GET')
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            dashboards = data.get("data", {}).get("dashboards", [])
            return {d.get("name"): d.get("id") for d in dashboards}
    except Exception as e:
        print(f"Error listing dashboards: {e}")
        return {}

def delete_dashboard(dash_id):
    del_url = f"{SIGNOZ_URL}/{dash_id}"
    req = urllib.request.Request(del_url, headers=HEADERS, method='DELETE')
    try:
        with urllib.request.urlopen(req) as resp:
            pass
    except Exception as e:
        print(f"Failed to delete {dash_id}: {e}")

def upload_dashboard(payload):
    req = urllib.request.Request(SIGNOZ_URL, data=json.dumps(payload, indent=2).encode('utf-8'), headers=HEADERS, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            res_data = json.loads(resp.read().decode('utf-8'))
            dash_id = res_data.get("data", {}).get("id")
            title = payload.get("spec", {}).get("display", {}).get("name")
            print(f"  [OK] Dashboard '{title}' -> ID: {dash_id}")
            return True
    except urllib.error.HTTPError as e:
        print(f"  [ERROR] Error al crear {payload.get('name')}: HTTP {e.code}")
        print(f"  Detalle: {e.read().decode('utf-8')}")
        return False

# ==============================================================================
# DASHBOARD DEFINITIONS
# ==============================================================================

def get_dashboard_01():
    # 01. Kubernetes Cluster & Pods Infrastructure
    panels = {
        "p_k8s_cpu_pods": create_panel(
            "p_k8s_cpu_pods",
            "Uso de CPU por Pod (Milicores / Cores)",
            "Consumo de procesamiento en tiempo real por cada contenedor y pod del clúster",
            [create_builder_query("A", "k8s.pod.cpu.usage", "avg", "sum", ["k8s.pod.name"], "k8s.namespace.name = 'fintech'", "{{k8s.pod.name}}")],
            "cores"
        ),
        "p_k8s_ram_pods": create_panel(
            "p_k8s_ram_pods",
            "Uso de Memoria RAM por Pod (Working Set / MiB)",
            "Memoria activa no recuperable por pod (usada por el OOM Killer para evaluar desalojos)",
            [create_builder_query("A", "k8s.pod.memory.working_set", "avg", "sum", ["k8s.pod.name"], "k8s.namespace.name = 'fintech'", "{{k8s.pod.name}}")],
            "bytes"
        ),
        "p_k8s_restarts": create_panel(
            "p_k8s_restarts",
            "Reinicios de Pods / Contenedores",
            "Contador acumulado de reinicios por pod en el namespace fintech",
            [create_builder_query("A", "k8s.container.restarts", "latest", "sum", ["k8s.pod.name"], "k8s.namespace.name = 'fintech'", "{{k8s.pod.name}}")]
        ),
        "p_k8s_node_cpu": create_panel(
            "p_k8s_node_cpu",
            "Utilización de CPU del Nodo",
            "Saturación de CPU de los nodos de Kubernetes (hostmetrics)",
            [create_builder_query("A", "k8s.node.cpu.usage", "avg", "sum", ["k8s.node.name"], None, "Node {{k8s.node.name}}")],
            "cores"
        ),
        "p_k8s_node_ram": create_panel(
            "p_k8s_node_ram",
            "Utilización de Memoria del Nodo",
            "Memoria utilizada en el nodo host",
            [create_builder_query("A", "k8s.node.memory.usage", "avg", "sum", ["k8s.node.name"], None, "Node {{k8s.node.name}}")],
            "bytes"
        ),
        "p_k8s_volume_usage": create_panel(
            "p_k8s_volume_usage",
            "Almacenamiento en Volúmenes / PVCs (Capacidad Total)",
            "Capacidad total de los volúmenes persistentes y monturas en el clúster",
            [create_builder_query("A", "k8s.volume.capacity", "latest", "sum", ["k8s.pod.name"], None, "{{k8s.pod.name}}")],
            "bytes"
        ),
        "p_k8s_deployments": create_panel(
            "p_k8s_deployments",
            "Estado de Réplicas de Despliegues (Available vs Desired)",
            "Monitoreo de réplicas listas para auth-service, user-service, transaction-service, etc.",
            [create_builder_query("A", "k8s.deployment.available", "latest", "sum", ["k8s.deployment.name"], None, "Disponibles {{k8s.deployment.name}}")]
        ),
        "p_k8s_network_io": create_panel(
            "p_k8s_network_io",
            "Tráfico de Red por Pod (Network IO)",
            "Rendimiento de paquetes y bytes de red a nivel de contenedor/pod",
            [create_builder_query("A", "k8s.pod.network.io", "rate", "sum", ["k8s.pod.name"], "k8s.namespace.name = 'fintech'", "{{k8s.pod.name}}")],
            "bytes"
        )
    }
    layout = [
        {"id": "p_k8s_cpu_pods", "x": 0, "y": 0, "w": 6, "h": 4},
        {"id": "p_k8s_ram_pods", "x": 6, "y": 0, "w": 6, "h": 4},
        {"id": "p_k8s_restarts", "x": 0, "y": 4, "w": 4, "h": 4},
        {"id": "p_k8s_node_cpu", "x": 4, "y": 4, "w": 4, "h": 4},
        {"id": "p_k8s_node_ram", "x": 8, "y": 4, "w": 4, "h": 4},
        {"id": "p_k8s_volume_usage", "x": 0, "y": 8, "w": 6, "h": 4},
        {"id": "p_k8s_deployments", "x": 6, "y": 8, "w": 6, "h": 4},
        {"id": "p_k8s_network_io", "x": 0, "y": 12, "w": 12, "h": 4}
    ]
    return create_dashboard_spec(
        "fintech-01-k8s-cluster",
        "FinTech Wallet - 01. Kubernetes Cluster & Pods Infrastructure",
        "Monitoreo integral de infraestructura Kubernetes: Uso de CPU y Memoria por Pod y Nodo, Reinicios, Consumo de Volúmenes y Réplicas en fintech.",
        ["kubernetes", "infrastructure", "pods", "nodes", "pvc", "fintech"],
        panels,
        layout
    )

def get_dashboard_02():
    # 02. NestJS Microservices RED Metrics & APM
    panels = {
        "p_apm_v8_heap_used": create_panel(
            "p_apm_v8_heap_used",
            "Uso de Memoria Heap V8 por Microservicio",
            "Memoria Heap V8 utilizada en tiempo real por cada servicio NestJS",
            [create_builder_query("A", "v8js.memory.heap.used", "avg", "sum", ["service.name"], None, "Heap Used {{service.name}}")],
            "bytes"
        ),
        "p_apm_v8_heap_total": create_panel(
            "p_apm_v8_heap_total",
            "Espacio Físico de Memoria Heap V8 Asignado",
            "Tamaño total de la memoria asignada en el motor JavaScript V8",
            [create_builder_query("A", "v8js.memory.heap.space.physical_size", "avg", "sum", ["service.name"], None, "Heap Total {{service.name}}")],
            "bytes"
        ),
        "p_apm_event_loop_p50": create_panel(
            "p_apm_event_loop_p50",
            "Lag del Event Loop de Node.js (ms) [P50 Mediana]",
            "Retraso de ejecución en el hilo principal de Node.js (P50)",
            [create_builder_query("A", "nodejs.eventloop.delay.p50", "avg", "avg", ["service.name"], None, "Event Loop P50 (ms) {{service.name}}")],
            "ms"
        ),
        "p_apm_event_loop_p99": create_panel(
            "p_apm_event_loop_p99",
            "Lag del Event Loop de Node.js (ms) [P99 Pico]",
            "Picos de latencia en el Event Loop (> 50ms indica bloqueo por cálculo síncrono)",
            [create_builder_query("A", "nodejs.eventloop.delay.p99", "avg", "avg", ["service.name"], None, "Event Loop P99 (ms) {{service.name}}")],
            "ms"
        ),
        "p_apm_active_resources": create_panel(
            "p_apm_active_resources",
            "Recursos Activos de Node.js (Handles & Sockets)",
            "Conexiones TCP abiertas, temporizadores y descriptores activos en Node.js",
            [create_builder_query("A", "v8js.resource.active", "avg", "sum", ["service.name"], None, "Active Resources {{service.name}}")]
        ),
        "p_apm_gc_duration": create_panel(
            "p_apm_gc_duration",
            "Duración del Garbage Collector (V8 GC)",
            "Tiempo invertido por el recolector de basura de Node.js",
            [create_builder_query("A", "v8js.gc.duration.sum", "rate", "sum", ["service.name"], None, "GC Duration/s {{service.name}}")],
            "ms"
        ),
        "p_apm_db_ops": create_panel(
            "p_apm_db_ops",
            "Tasa de Operaciones DB por Microservicio (Ops/sec)",
            "Throughput de consultas de persistencia ejecutadas desde NestJS",
            [create_builder_query("A", "db.client.operation.duration.count", "rate", "sum", ["service.name"], None, "DB Ops/s {{service.name}}")]
        ),
        "p_apm_http_client_reqs": create_panel(
            "p_apm_http_client_reqs",
            "Peticiones HTTP Salientes entre Microservicios (RPS)",
            "Comunicaciones HTTP/REST entre componentes internos",
            [create_builder_query("A", "http.client.request.duration.count", "rate", "sum", ["service.name"], None, "HTTP Client RPS {{service.name}}")]
        )
    }
    layout = [
        {"id": "p_apm_v8_heap_used", "x": 0, "y": 0, "w": 6, "h": 4},
        {"id": "p_apm_v8_heap_total", "x": 6, "y": 0, "w": 6, "h": 4},
        {"id": "p_apm_event_loop_p50", "x": 0, "y": 4, "w": 6, "h": 4},
        {"id": "p_apm_event_loop_p99", "x": 6, "y": 4, "w": 6, "h": 4},
        {"id": "p_apm_active_resources", "x": 0, "y": 8, "w": 6, "h": 4},
        {"id": "p_apm_gc_duration", "x": 6, "y": 8, "w": 6, "h": 4},
        {"id": "p_apm_db_ops", "x": 0, "y": 12, "w": 6, "h": 4},
        {"id": "p_apm_http_client_reqs", "x": 6, "y": 12, "w": 6, "h": 4}
    ]
    return create_dashboard_spec(
        "fintech-02-nestjs-apm",
        "FinTech Wallet - 02. NestJS Microservices RED Metrics & APM",
        "Dashboard de Rendimiento, Latencia, Estado de Runtime de Node.js (V8 Heap, Event Loop Lag, GC) y Operaciones de los microservicios.",
        ["nestjs", "apm", "nodejs", "event-loop", "v8", "fintech"],
        panels,
        layout
    )

def get_dashboard_03():
    # 03. PostgreSQL & PgBouncer Connection Pool
    panels = {
        "p_db_connections": create_panel(
            "p_db_connections",
            "Conexiones de Clientes a Base de Datos (Active Pool)",
            "Conexiones activas mantenidas por los servicios hacia PostgreSQL / PgBouncer",
            [create_builder_query("A", "db.client.connection.count", "latest", "sum", ["service.name"], None, "Active Conns {{service.name}}")]
        ),
        "p_db_pending": create_panel(
            "p_db_pending",
            "Peticiones de Conexión en Espera (Pending Queue)",
            "Peticiones esperando una conexión libre en el pool",
            [create_builder_query("A", "db.client.connection.pending_requests", "latest", "sum", ["service.name"], None, "Pending Reqs {{service.name}}")]
        ),
        "p_db_ops_throughput": create_panel(
            "p_db_ops_throughput",
            "Throughput de Operaciones SQL (Consultas / seg)",
            "Tasa de ejecución de operaciones SELECT, INSERT, UPDATE, DELETE",
            [create_builder_query("A", "db.client.operation.duration.count", "rate", "sum", ["service.name"], None, "SQL Ops/s {{service.name}}")]
        ),
        "p_db_duration_sum": create_panel(
            "p_db_duration_sum",
            "Tiempo Total de Operaciones SQL (ms/seg)",
            "Carga acumulada de tiempo de ejecución de queries en la capa de datos",
            [create_builder_query("A", "db.client.operation.duration.sum", "rate", "sum", ["service.name"], None, "SQL Duration/s {{service.name}}")],
            "ms"
        ),
        "p_db_postgres_cpu": create_panel(
            "p_db_postgres_cpu",
            "Consumo de CPU en Pods de Base de Datos (Postgres / PgBouncer)",
            "Uso de procesador en postgres-core y pgbouncer-core",
            [create_builder_query("A", "k8s.pod.cpu.usage", "avg", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%postgres%' OR k8s.pod.name LIKE '%pgbouncer%'", "{{k8s.pod.name}}")],
            "cores"
        ),
        "p_db_postgres_ram": create_panel(
            "p_db_postgres_ram",
            "Consumo de Memoria en Pods de Base de Datos (Postgres / PgBouncer)",
            "Memoria RAM Working Set en postgres-core y pgbouncer-core",
            [create_builder_query("A", "k8s.pod.memory.working_set", "avg", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%postgres%' OR k8s.pod.name LIKE '%pgbouncer%'", "{{k8s.pod.name}}")],
            "bytes"
        )
    }
    layout = [
        {"id": "p_db_connections", "x": 0, "y": 0, "w": 6, "h": 4},
        {"id": "p_db_pending", "x": 6, "y": 0, "w": 6, "h": 4},
        {"id": "p_db_ops_throughput", "x": 0, "y": 4, "w": 6, "h": 4},
        {"id": "p_db_duration_sum", "x": 6, "y": 4, "w": 6, "h": 4},
        {"id": "p_db_postgres_cpu", "x": 0, "y": 8, "w": 6, "h": 4},
        {"id": "p_db_postgres_ram", "x": 6, "y": 8, "w": 6, "h": 4}
    ]
    return create_dashboard_spec(
        "fintech-03-postgresql-pgbouncer",
        "FinTech Wallet - 03. PostgreSQL & PgBouncer Connection Pool",
        "Monitoreo de conexiones, throughput de operaciones SQL, cola de espera y recursos para bases de datos relacionales.",
        ["postgresql", "pgbouncer", "database", "sql", "pool", "fintech"],
        panels,
        layout
    )

def get_dashboard_04():
    # 04. Apache Kafka KRaft & Event Streaming
    panels = {
        "p_kafka_brokers": create_panel(
            "p_kafka_brokers",
            "Brokers de Kafka Activos (KRaft Quorum Health)",
            "Número de brokers activos en el clúster Apache Kafka",
            [create_builder_query("A", "kafka.brokers", "latest", "sum", None, None, "Brokers Activos")]
        ),
        "p_kafka_offset": create_panel(
            "p_kafka_offset",
            "Offset Actual de Particiones de Tópicos",
            "Posición actual del offset de mensajes en los tópicos de Kafka",
            [create_builder_query("A", "kafka.partition.current_offset", "latest", "sum", ["k8s.pod.name"], None, "Offset {{k8s.pod.name}}")]
        ),
        "p_kafka_groups": create_panel(
            "p_kafka_groups",
            "Miembros de Consumer Groups (Worker & Notifications)",
            "Consumidores activos conectados a los tópicos de eventos",
            [create_builder_query("A", "kafka.consumer_group.members", "latest", "sum", ["k8s.pod.name"], None, "Members {{k8s.pod.name}}")]
        ),
        "p_kafka_cpu": create_panel(
            "p_kafka_cpu",
            "Consumo de CPU en Pods de Kafka Broker",
            "Uso de CPU en kafka-0 / kafka broker pods",
            [create_builder_query("A", "k8s.pod.cpu.usage", "avg", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%kafka%'", "CPU {{k8s.pod.name}}")],
            "cores"
        ),
        "p_kafka_ram": create_panel(
            "p_kafka_ram",
            "Consumo de Memoria en Pods de Kafka (RAM Working Set)",
            "Uso de memoria por la JVM del broker Apache Kafka",
            [create_builder_query("A", "k8s.pod.memory.working_set", "avg", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%kafka%'", "RAM {{k8s.pod.name}}")],
            "bytes"
        ),
        "p_kafka_network": create_panel(
            "p_kafka_network",
            "Tráfico de Red del Broker Kafka (Network IO)",
            "Tasa de datos transmitidos y recibidos por el pod de Kafka",
            [create_builder_query("A", "k8s.pod.network.io", "rate", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%kafka%'", "Network IO {{k8s.pod.name}}")],
            "bytes"
        )
    }
    layout = [
        {"id": "p_kafka_brokers", "x": 0, "y": 0, "w": 4, "h": 4},
        {"id": "p_kafka_offset", "x": 4, "y": 0, "w": 4, "h": 4},
        {"id": "p_kafka_groups", "x": 8, "y": 0, "w": 4, "h": 4},
        {"id": "p_kafka_cpu", "x": 0, "y": 4, "w": 4, "h": 4},
        {"id": "p_kafka_ram", "x": 4, "y": 4, "w": 4, "h": 4},
        {"id": "p_kafka_network", "x": 8, "y": 4, "w": 4, "h": 4}
    ]
    return create_dashboard_spec(
        "fintech-04-kafka-streaming",
        "FinTech Wallet - 04. Apache Kafka KRaft & Event Streaming",
        "Monitoreo de brokers, offsets de particiones, consumer groups y consumo de recursos en Kafka KRaft.",
        ["kafka", "streaming", "events", "kraft", "broker", "fintech"],
        panels,
        layout
    )

def get_dashboard_05():
    # 05. Redis Cache & Idempotency Store
    panels = {
        "p_redis_commands": create_panel(
            "p_redis_commands",
            "Comandos Redis Procesados por Segundo (Throughput)",
            "Tasa de ejecución de comandos en el motor Redis en memoria",
            [create_builder_query("A", "redis.commands.processed", "rate", "sum", None, None, "Comandos / seg")]
        ),
        "p_redis_changes": create_panel(
            "p_redis_changes",
            "Cambios RDB desde Último Guardado",
            "Operaciones pendientes de persistir en snapshot RDB de Redis",
            [create_builder_query("A", "redis.rdb.changes_since_last_save", "latest", "sum", None, None, "Cambios RDB")]
        ),
        "p_redis_ram": create_panel(
            "p_redis_ram",
            "Memoria RAM Consumida en Pod Redis (Working Set)",
            "Consumo de memoria activa en el contenedor redis-0",
            [create_builder_query("A", "k8s.pod.memory.working_set", "avg", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%redis%'", "RAM Usada")],
            "bytes"
        ),
        "p_redis_cpu": create_panel(
            "p_redis_cpu",
            "Uso de CPU en Pod Redis",
            "Utilización del hilo de ejecución del servidor Redis",
            [create_builder_query("A", "k8s.pod.cpu.usage", "avg", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%redis%'", "CPU Redis")],
            "cores"
        ),
        "p_redis_network": create_panel(
            "p_redis_network",
            "Tráfico de Red en Pod Redis (Network IO)",
            "Ancho de banda de consultas y respuestas en el pod redis-0",
            [create_builder_query("A", "k8s.pod.network.io", "rate", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%redis%'", "Network IO")],
            "bytes"
        ),
        "p_redis_restarts": create_panel(
            "p_redis_restarts",
            "Reinicios de Contenedor Redis",
            "Monitoreo de estabilidad y reinicios del servidor Redis",
            [create_builder_query("A", "k8s.container.restarts", "latest", "sum", ["k8s.pod.name"], "k8s.pod.name LIKE '%redis%'", "Reinicios")]
        )
    }
    layout = [
        {"id": "p_redis_commands", "x": 0, "y": 0, "w": 6, "h": 4},
        {"id": "p_redis_changes", "x": 6, "y": 0, "w": 6, "h": 4},
        {"id": "p_redis_ram", "x": 0, "y": 4, "w": 6, "h": 4},
        {"id": "p_redis_cpu", "x": 6, "y": 4, "w": 6, "h": 4},
        {"id": "p_redis_network", "x": 0, "y": 8, "w": 6, "h": 4},
        {"id": "p_redis_restarts", "x": 6, "y": 8, "w": 6, "h": 4}
    ]
    return create_dashboard_spec(
        "fintech-05-redis-cache",
        "FinTech Wallet - 05. Redis Cache & Idempotency Store",
        "Monitoreo operacional de caché e idempotencia: Comandos por segundo, cambios RDB, CPU, RAM y red.",
        ["redis", "cache", "idempotency", "in-memory", "fintech"],
        panels,
        layout
    )

def get_dashboard_06():
    # 06. Ingress Controller & Network Edge Traffic
    panels = {
        "p_edge_http_reqs": create_panel(
            "p_edge_http_reqs",
            "Throughput de Peticiones HTTP por Servicio (RPS)",
            "Tasa de peticiones procesadas por microservicio en el borde",
            [create_builder_query("A", "http.client.request.duration.count", "rate", "sum", ["service.name"], None, "HTTP RPS {{service.name}}")]
        ),
        "p_edge_http_duration": create_panel(
            "p_edge_http_duration",
            "Tiempo Total de Peticiones HTTP (ms/seg)",
            "Duración acumulada de procesamiento HTTP por servicio",
            [create_builder_query("A", "http.client.request.duration.sum", "rate", "sum", ["service.name"], None, "Duración HTTP/s {{service.name}}")],
            "ms"
        ),
        "p_edge_network_io": create_panel(
            "p_edge_network_io",
            "Tráfico de Red por Pod (Network IO Bytes)",
            "Ancho de banda recibido y transmitido por cada pod en el clúster",
            [create_builder_query("A", "k8s.pod.network.io", "rate", "sum", ["k8s.pod.name"], "k8s.namespace.name = 'fintech'", "{{k8s.pod.name}}")],
            "bytes"
        ),
        "p_edge_network_errors": create_panel(
            "p_edge_network_errors",
            "Errores de Red por Pod (Network Errors)",
            "Paquetes descartados o errores de interfaz de red por pod",
            [create_builder_query("A", "k8s.pod.network.errors", "latest", "sum", ["k8s.pod.name"], "k8s.namespace.name = 'fintech'", "{{k8s.pod.name}}")]
        ),
        "p_edge_pod_phase": create_panel(
            "p_edge_pod_phase",
            "Fase de Ejecución de Pods (Running=2 / Pending=1)",
            "Estado del ciclo de vida de los pods en el namespace fintech",
            [create_builder_query("A", "k8s.pod.phase", "latest", "sum", ["k8s.pod.name"], "k8s.namespace.name = 'fintech'", "{{k8s.pod.name}}")]
        ),
        "p_edge_container_ready": create_panel(
            "p_edge_container_ready",
            "Estado de Readiness de Contenedores (1=Ready)",
            "Pase de readiness probes de los pods de la aplicación",
            [create_builder_query("A", "k8s.container.ready", "latest", "sum", ["k8s.pod.name"], "k8s.namespace.name = 'fintech'", "{{k8s.pod.name}}")]
        )
    }
    layout = [
        {"id": "p_edge_http_reqs", "x": 0, "y": 0, "w": 6, "h": 4},
        {"id": "p_edge_http_duration", "x": 6, "y": 0, "w": 6, "h": 4},
        {"id": "p_edge_network_io", "x": 0, "y": 4, "w": 6, "h": 4},
        {"id": "p_edge_network_errors", "x": 6, "y": 4, "w": 6, "h": 4},
        {"id": "p_edge_pod_phase", "x": 0, "y": 8, "w": 6, "h": 4},
        {"id": "p_edge_container_ready", "x": 6, "y": 8, "w": 6, "h": 4}
    ]
    return create_dashboard_spec(
        "fintech-06-ingress-networking",
        "FinTech Wallet - 06. Ingress Controller & Network Edge Traffic",
        "Monitoreo perimetral y de red: Tráfico HTTP, I/O de red, errores de paquetes, fases de pods y readiness probes.",
        ["ingress", "networking", "traffic", "edge", "pods", "fintech"],
        panels,
        layout
    )

def main():
    print("==========================================================")
    print("  SIGNOZ REAL-METRIC DASHBOARDS GENERATOR & UPLOADER")
    print(f"  Target: {SIGNOZ_URL}")
    print("==========================================================")

    existing = check_existing_dashboards()
    print(f"Dashboards actuales en SigNoz: {len(existing)}")

    dashboards = [
        ("fintech-01-k8s-cluster", get_dashboard_01(), "k8s/dashboards/01-signoz-k8s-cluster.v6.json"),
        ("fintech-02-nestjs-apm", get_dashboard_02(), "k8s/dashboards/02-signoz-nestjs-apm.v6.json"),
        ("fintech-03-postgresql-pgbouncer", get_dashboard_03(), "k8s/dashboards/03-signoz-postgresql-pgbouncer.v6.json"),
        ("fintech-04-kafka-streaming", get_dashboard_04(), "k8s/dashboards/04-signoz-kafka-streaming.v6.json"),
        ("fintech-05-redis-cache", get_dashboard_05(), "k8s/dashboards/05-signoz-redis-cache.v6.json"),
        ("fintech-06-ingress-networking", get_dashboard_06(), "k8s/dashboards/06-signoz-ingress-networking.v6.json")
    ]

    success = 0
    for slug, payload, file_path in dashboards:
        print(f"\nProcesando '{slug}'...")
        
        # Save to file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        print(f"  -> Guardado localmente en {file_path}")

        # Delete previous version if exists
        if slug in existing:
            print(f"  -> Eliminando versión previa (ID: {existing[slug]})...")
            delete_dashboard(existing[slug])

        if upload_dashboard(payload):
            success += 1

    print("\n==========================================================")
    print(f" [RESULTADO FINAL] {success}/{len(dashboards)} Dashboards creados con éxito con métricas REALES!")
    print("==========================================================")

if __name__ == "__main__":
    main()
