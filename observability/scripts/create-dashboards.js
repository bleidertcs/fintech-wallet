const fs = require('fs');
const { resolveDashboardPath, getApiKey, getSigNozBaseUrl } = require('./dashboard-config');

async function main() {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('SIGNOZ_API_KEY is not configured. Set it in the environment or .env file.');
  }

  const rawData = fs.readFileSync(resolveDashboardPath('kafka-dashboard.json'), 'utf8');
  const dashboard = JSON.parse(rawData);

  // Remove any system-generated fields like id or uuid if they exist to let SigNoz generate a new one
  delete dashboard.id;
  delete dashboard.uuid;

  const sigNozUrl = `${getSigNozBaseUrl().replace(/\/$/, '')}/api/v1/dashboards`;

  console.log(`Sending request to SigNoz at ${sigNozUrl}...`);
  const res = await fetch(sigNozUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'signoz-api-key': apiKey,
    },
    body: JSON.stringify(dashboard),
  });

  const resText = await res.text();
  console.log('Response Status:', res.status);
  console.log('Response Body:', resText);
}

main().catch((err) => {
  console.error('Error:', err);
});
