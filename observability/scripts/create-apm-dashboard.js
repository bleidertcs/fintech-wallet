const fs = require('fs');
const path = require('path');
const { getApiKey, getSigNozBaseUrl } = require('./dashboard-config');

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('SIGNOZ_API_KEY is not configured.');

  const filePath = path.resolve(__dirname, '..', 'dashboards', 'apm-dashboard-fixed.json');
  if (!fs.existsSync(filePath)) throw new Error('APM dashboard JSON not found at ' + filePath);

  const raw = fs.readFileSync(filePath, 'utf8');
  const dashboard = JSON.parse(raw);
  delete dashboard.id;
  delete dashboard.uuid;

  const sigNozUrl = `${getSigNozBaseUrl().replace(/\/+$/, '')}/api/v1/dashboards`;
  console.log('Posting to', sigNozUrl);

  const res = await fetch(sigNozUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'signoz-api-key': apiKey,
    },
    body: JSON.stringify(dashboard),
  });

  console.log('Status:', res.status);
  console.log(await res.text());
}

main().catch(err => { console.error(err); process.exit(1); });
