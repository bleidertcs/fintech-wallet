import urllib.request
import json
import time

url = "http://10.20.0.6:30301/api/v5/query_range"
headers = {
    "Content-Type": "application/json",
    "SIGNOZ-API-KEY": "u/qUnbL4dpx5rOobkLjAUidg9NWRddEpVZsIOUCCc9g="
}

now = int(time.time() * 1000)
start = now - (30 * 60 * 1000)

test_queries = [
    ("01. K8s Pod CPU", "k8s.pod.cpu.usage", "avg", "sum", "k8s.pod.name", "k8s.namespace.name = 'fintech'"),
    ("01. K8s Pod RAM", "k8s.pod.memory.working_set", "avg", "sum", "k8s.pod.name", "k8s.namespace.name = 'fintech'"),
    ("01. K8s Pod Restarts", "k8s.container.restarts", "latest", "sum", "k8s.pod.name", "k8s.namespace.name = 'fintech'"),
    ("01. Node CPU", "k8s.node.cpu.usage", "avg", "sum", "k8s.node.name", None),
    ("01. Node RAM", "k8s.node.memory.usage", "avg", "sum", "k8s.node.name", None),
    ("01. Volume Capacity", "k8s.volume.capacity", "latest", "sum", "k8s.pod.name", None),
    ("01. Deployments Available", "k8s.deployment.available", "latest", "sum", "k8s.deployment.name", None),
    ("01. Network IO", "k8s.pod.network.io", "rate", "sum", "k8s.pod.name", "k8s.namespace.name = 'fintech'"),
    ("02. Node.js Heap Used", "v8js.memory.heap.used", "avg", "sum", "service.name", None),
    ("02. Node.js Heap Space", "v8js.memory.heap.space.physical_size", "avg", "sum", "service.name", None),
    ("02. Event Loop P50", "nodejs.eventloop.delay.p50", "avg", "avg", "service.name", None),
    ("02. Event Loop P99", "nodejs.eventloop.delay.p99", "avg", "avg", "service.name", None),
    ("02. Active Resources", "v8js.resource.active", "avg", "sum", "service.name", None),
    ("02. GC Duration", "v8js.gc.duration.sum", "rate", "sum", "service.name", None),
    ("03. DB Client Conns", "db.client.connection.count", "latest", "sum", "service.name", None),
    ("03. DB Pending Conns", "db.client.connection.pending_requests", "latest", "sum", "service.name", None),
    ("03. DB Ops Count", "db.client.operation.duration.count", "rate", "sum", "service.name", None),
    ("03. DB Ops Duration", "db.client.operation.duration.sum", "rate", "sum", "service.name", None),
    ("04. Kafka Brokers", "kafka.brokers", "latest", "sum", None, None),
    ("04. Kafka Offset", "kafka.partition.current_offset", "latest", "sum", "k8s.pod.name", None),
    ("04. Kafka Group Members", "kafka.consumer_group.members", "latest", "sum", "k8s.pod.name", None),
    ("05. Redis Commands", "redis.commands.processed", "rate", "sum", None, None),
    ("05. Redis Changes", "redis.rdb.changes_since_last_save", "latest", "sum", None, None),
    ("06. HTTP Client Count", "http.client.request.duration.count", "rate", "sum", "service.name", None),
    ("06. HTTP Client Duration", "http.client.request.duration.sum", "rate", "sum", "service.name", None),
    ("06. Pod Phase", "k8s.pod.phase", "latest", "sum", "k8s.pod.name", "k8s.namespace.name = 'fintech'"),
    ("06. Container Ready", "k8s.container.ready", "latest", "sum", "k8s.pod.name", "k8s.namespace.name = 'fintech'")
]

print("=== VERIFYING REAL METRIC QUERIES IN SIGNOZ ===")
passed = 0
for name, metric_name, t_agg, s_agg, group_by_col, filter_expr in test_queries:
    spec = {
        "signal": "metrics",
        "name": "A",
        "aggregations": [
            {
                "metricName": metric_name,
                "timeAggregation": t_agg,
                "spaceAggregation": s_agg
            }
        ]
    }
    if group_by_col:
        spec["groupBy"] = [{"name": group_by_col}]
    if filter_expr:
        spec["filter"] = {"expression": filter_expr}

    payload = {
        "schemaVersion": "v5",
        "start": start,
        "end": now,
        "requestType": "time_series",
        "compositeQuery": {
            "queries": [
                {
                    "type": "builder_query",
                    "spec": spec
                }
            ]
        }
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get("data", {}).get("data", {}).get("results", [])
            series_count = 0
            points_count = 0
            if results:
                for ag in results[0].get("aggregations", []):
                    for s in ag.get("series", []):
                        series_count += 1
                        points_count += len(s.get("values", []))
            if series_count > 0:
                print(f"[PASS] {name}: {series_count} series, {points_count} points")
                passed += 1
            else:
                print(f"[WARN] {name}: 0 series returned")
    except urllib.error.HTTPError as e:
        print(f"[FAIL] {name}: HTTP {e.code} - {e.read().decode('utf-8')[:150]}")

print(f"\nResult: {passed}/{len(test_queries)} queries successfully returning real metrics and data points!")
