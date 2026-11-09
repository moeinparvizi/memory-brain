const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const script = path.join(__dirname, '../scripts/configure-pages.cjs');

test('Pages configuration connects the real HTTPS API and uses reload-safe routing without secrets', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'memory-pages-'));
  try {
    const output = path.join(dir, 'runtime-config.js');
    execFileSync(process.execPath, [script, output], { env: { ...process.env, API_BASE_URL: 'https://memory-api.onrender.com/api/v1/', JWT_SECRET: 'must-not-be-published', DATABASE_URL: 'private-database' } });
    const context = { window: {} };
    const source = readFileSync(output, 'utf8');
    vm.runInNewContext(source, context);
    assert.equal(context.window.__MEMORY_BRAIN_CONFIG__.apiUrl, 'https://memory-api.onrender.com/api/v1');
    assert.equal(context.window.__MEMORY_BRAIN_CONFIG__.useHashRouting, true);
    assert.ok(!source.includes('must-not-be-published'));
    assert.ok(!source.includes('private-database'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Pages build rejects missing, relative, insecure, or credential-bearing API URLs', () => {
  for (const apiUrl of ['', '/api/v1', 'http://memory-api.onrender.com/api/v1', 'https://user:pass@memory-api.onrender.com/api/v1', 'https://memory-api.onrender.com/api/v1?token=private']) {
    const result = spawnSync(process.execPath, [script], { env: { ...process.env, API_BASE_URL: apiUrl }, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /API_BASE_URL/);
  }
});

test('the Angular runtime reads the deployed API and leaves local development on its proxy', () => {
  const ts = require('typescript');
  const source = readFileSync(path.join(__dirname, '../src/environments/runtime-config.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const config of [{}, { apiUrl: 'https://memory-api.onrender.com/api/v1', useHashRouting: true }]) {
    const context = { exports: {}, window: { __MEMORY_BRAIN_CONFIG__: config } };
    vm.runInNewContext(code, context);
    assert.equal(context.exports.runtimeConfig.apiUrl, config.apiUrl || '/api/v1');
    assert.equal(context.exports.runtimeConfig.useHashRouting, !!config.useHashRouting);
  }
});
