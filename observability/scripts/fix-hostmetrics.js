const fs = require('fs');

async function main() {
  const apiKey = 'T+wsBgMnc3VkytFE/HFfW6Rdt6jYR2wIGjHzxFJT8YY=';
  const rawData = fs.readFileSync('hostmetrics-dashboard.json', 'utf8');
  const dashboard = JSON.parse(rawData);

  // Remove system fields
  delete dashboard.id;
  delete dashboard.uuid;

  // Fix panelMap: keep only referenced widgets that actually exist in the widgets array
  const validWidgetIds = new Set(dashboard.widgets.map(w => w.id));
  if (dashboard.panelMap) {
    for (const rowId of Object.keys(dashboard.panelMap)) {
      const row = dashboard.panelMap[rowId];
      if (row && Array.isArray(row.widgets)) {
        row.widgets = row.widgets.filter(ref => validWidgetIds.has(ref.i));
      }
    }
  }

  // Also replace any empty "op" fields in filters
  let content = JSON.stringify(dashboard);
  content = content.replaceAll('"op":""', '"op":"AND"').replaceAll('"op": ""', '"op": "AND"');
  const cleanedDashboard = JSON.parse(content);

  console.log('Sending HostMetrics to SigNoz...');
  const res = await fetch('http://localhost:3301/api/v1/dashboards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'signoz-api-key': apiKey
    },
    body: JSON.stringify(cleanedDashboard)
  });

  const resText = await res.text();
  console.log('Response Status:', res.status);
  console.log('Response Body:', resText);
}

main().catch(err => {
  console.error('Error:', err);
});
