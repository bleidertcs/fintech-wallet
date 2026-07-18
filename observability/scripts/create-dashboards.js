const fs = require('fs');

async function main() {
  const apiKey = 'T+wsBgMnc3VkytFE/HFfW6Rdt6jYR2wIGjHzxFJT8YY=';
  const rawData = fs.readFileSync('kafka-dashboard.json', 'utf8');
  const dashboard = JSON.parse(rawData);

  // Remove any system-generated fields like id or uuid if they exist to let SigNoz generate a new one
  delete dashboard.id;
  delete dashboard.uuid;

  console.log('Sending request to SigNoz...');
  const res = await fetch('http://localhost:8085/api/v1/dashboards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'signoz-api-key': apiKey
    },
    body: JSON.stringify(dashboard)
  });

  const resText = await res.text();
  console.log('Response Status:', res.status);
  console.log('Response Body:', resText);
}

main().catch(err => {
  console.error('Error:', err);
});
