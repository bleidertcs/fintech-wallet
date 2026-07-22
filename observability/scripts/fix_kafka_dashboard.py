from pathlib import Path

p = Path(r'c:\dev\DevOps\fintech-wallet\observability\dashboards\kafka-dashboard.json')
text = p.read_text(encoding='utf-8')
old = '"expression": "deployment.environment = $deployment_environment AND kafka.cluster.alias = $kafka_cluster_alias"'
new = '"expression": ""'
count = text.count(old)
text = text.replace(old, new)
p.write_text(text, encoding='utf-8')
print(f'updated {count} occurrences')
