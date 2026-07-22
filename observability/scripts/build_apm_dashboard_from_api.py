import json
from pathlib import Path

# Path to the saved API response content
src = Path(r"c:\Users\bleider.colina\AppData\Roaming\Code\User\workspaceStorage\b811c68afebe701c12c2e87fa2d3e5c8\GitHub.copilot-chat\chat-session-resources\0c8913aa-f518-4360-8d9b-96246ba59ba6\call_9K5wYWezREEmVqXvFcysXLDF__vscode-1784644754010\content.json")
if not src.exists():
    print('Source content.json not found:', src)
    raise SystemExit(1)

data = json.loads(src.read_text(encoding='utf-8'))
# The actual dashboard object is nested under data['data']
dashboard = data.get('data') or data.get('dashboard') or data

# Defensive: if wrapper like {"data": {"data": {...}}}
if isinstance(dashboard, dict) and 'data' in dashboard and isinstance(dashboard['data'], dict):
    dashboard = dashboard['data']

text = json.dumps(dashboard)
# Replace problematic filter expressions with an empty filter
old = '(deployment.environment = $deployment.environment AND service.name = $service.name AND operation IN $top_level_operation)'
text = text.replace(old, '')

out_path = Path('observability/dashboards/apm-dashboard-fixed.json')
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(text, encoding='utf-8')
print('Wrote', out_path)
