const fs = require('fs');
const path = require('path');

function getWorkspaceRoot() {
  return path.resolve(__dirname, '..', '..');
}

function resolveDashboardPath(fileName) {
  return path.resolve(getWorkspaceRoot(), 'observability', 'dashboards', fileName);
}

function getApiKey() {
  if (process.env.SIGNOZ_API_KEY) {
    return process.env.SIGNOZ_API_KEY;
  }

  const envPath = path.resolve(getWorkspaceRoot(), '.env');
  if (!fs.existsSync(envPath)) {
    return '';
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/^SIGNOZ_API_KEY=(.+)$/m);
  return match ? match[1].trim() : '';
}

function getSigNozBaseUrl() {
  return process.env.SIGNOZ_URL || 'http://localhost:3301';
}

module.exports = {
  getWorkspaceRoot,
  resolveDashboardPath,
  getApiKey,
  getSigNozBaseUrl,
};
