const { writeFileSync } = require('node:fs');
const path = require('node:path');

let api;
try {
  api = new URL(process.env.API_BASE_URL || '');
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash || !api.pathname.endsWith('/api/v1') && !api.pathname.endsWith('/api/v1/')) throw new Error();
} catch {
  console.error('API_BASE_URL must be an HTTPS API URL ending in /api/v1, without credentials, query parameters, or fragments.');
  process.exit(1);
}
const config = { apiUrl: api.href.replace(/\/$/, ''), useHashRouting: true, googleClientId: process.env.PUBLIC_GOOGLE_CLIENT_ID || '', phoneLoginEnabled: false };
const output = process.argv[2] || path.join(__dirname, '../dist/moein-dashboard/browser/runtime-config.js');
writeFileSync(output, `window.__MEMORY_BRAIN_CONFIG__ = ${JSON.stringify(config)};\n`);
console.log('Public Pages API configuration generated.');
