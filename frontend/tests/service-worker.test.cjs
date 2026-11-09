const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function loadWorker({ origin = 'https://memory.example', network = async () => new Response('new app'), cached = new Response('old app'), cacheNames = [] } = {}) {
  const handlers = {};
  const stored = [];
  const deleted = [];
  const cache = { addAll: async () => {}, put: async (request, response) => stored.push({ request, response }), match: async () => cached };
  vm.runInNewContext(readFileSync(require.resolve('../src/sw.js'), 'utf8'), {
    self: { location: new URL(origin + '/sw.js'), registration: { scope: origin + '/' }, addEventListener: (name, handler) => handlers[name] = handler, skipWaiting() {}, clients: { claim: async () => {} } },
    caches: { open: async () => cache, match: async () => cached, keys: async () => cacheNames, delete: async name => deleted.push(name) },
    fetch: network, Response, Request, URL,
  });
  return {
    stored, deleted,
    async request(path, options = {}) {
      const request = new Request(origin + path, options);
      let result;
      const pending = [];
      handlers.fetch({ request, respondWith: promise => result = promise, waitUntil: promise => pending.push(promise) });
      const response = await (result ?? network(request));
      await Promise.all(pending);
      return response;
    },
    async activate() { let pending; handlers.activate({ waitUntil: p => pending = p }); await pending; },
  };
}

test('a reload receives the current app instead of a permanently cached bundle', async () => {
  const worker = loadWorker();
  assert.equal(await (await worker.request('/main.js')).text(), 'new app');
});

test('local development never serves the cached app even when offline', async () => {
  const worker = loadWorker({ origin: 'http://localhost:4201', network: async () => { throw new Error('offline'); } });
  await assert.rejects(worker.request('/main.js'), /offline/);
});

test('an offline API request fails instead of pretending to be a successful save', async () => {
  const worker = loadWorker({ network: async () => { throw new Error('offline'); } });
  const response = await worker.request('/api/v1/checklist', { method: 'POST', body: '{}' });
  assert.equal(response.status, 503);
});

test('error pages are not cached as application code', async () => {
  const worker = loadWorker({ cached: null, network: async () => new Response('server error', { status: 500 }) });
  await worker.request('/main.js');
  assert.equal(worker.stored.length, 0);
});

test('activation only removes caches owned by this application', async () => {
  const worker = loadWorker({ cacheNames: ['memory-gohar-v1', 'unrelated-app-cache'] });
  await worker.activate();
  assert.ok(worker.deleted.includes('memory-gohar-v1'));
  assert.ok(!worker.deleted.includes('unrelated-app-cache'));
});
