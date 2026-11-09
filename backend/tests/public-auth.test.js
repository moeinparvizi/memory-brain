const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/db');
let server, base, demoExisted;
const fixtureUid = `auth-regression-${Date.now()}`;
const original = { DEMO_LOGIN_ENABLED: process.env.DEMO_LOGIN_ENABLED, FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID };
before(async () => {
  demoExisted = await prisma.user.findUnique({ where: { googleId: 'memory-brain-public-demo-v1' } });
  process.env.DEMO_LOGIN_ENABLED = 'true';
  delete process.env.FIREBASE_PROJECT_ID;
  const app = express(); app.use(express.json());
  app.use('/auth', require('../src/routes/auth.routes'));
  app.use(require('../src/middleware/errorHandler'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await prisma.user.deleteMany({ where: { firebaseUid: fixtureUid } });
  if (!demoExisted) await prisma.user.deleteMany({ where: { googleId: 'memory-brain-public-demo-v1' } });
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
});
const post = (route, body) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('a public demo login issues a session for sample data, never the private owner', async () => {
  const owner = await prisma.user.findUnique({ where: { email: 'admin@moein.local' } });
  const response = await post('/auth/login', { username: 'demo', password: 'demo1234' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.user.isDemo, true);
  assert.notEqual(result.user.id, owner?.id);
  assert.equal(jwt.verify(result.token, process.env.JWT_SECRET).userId, result.user.id);
  assert.ok(await prisma.checklistItem.count({ where: { userId: result.user.id } }));
  const second = await (await post('/auth/login', { username: 'demo', password: 'demo1234' })).json();
  assert.equal(second.user.id, result.user.id);
});

test('demo cannot authenticate with a different password and can be disabled', async () => {
  assert.equal((await post('/auth/login', { username: 'demo', password: 'wrong' })).status, 401);
  process.env.DEMO_LOGIN_ENABLED = 'false';
  try { assert.equal((await post('/auth/login', { username: 'demo', password: 'demo1234' })).status, 401); }
  finally { process.env.DEMO_LOGIN_ENABLED = 'true'; }
});

test('Firebase token exchange stays unavailable until a project is configured', async () => {
  const response = await post('/auth/firebase', { idToken: 'untrusted-token' });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'FIREBASE_NOT_CONFIGURED');
});

async function identityRequest(identity, body = { idToken: 'verified-at-provider-boundary' }) {
  process.env.FIREBASE_PROJECT_ID = 'memory-brain-test';
  const app = express(); app.use(express.json());
  // Only the external token-verification boundary is replaced; the HTTP route,
  // Prisma writes, identity mapping and session signing are real.
  app.use('/auth', require('../src/routes/public-auth.routes')({ verifyIdToken: async () => {
    if (identity instanceof Error) throw identity;
    return identity;
  } }));
  app.use(require('../src/middleware/errorHandler'));
  const local = app.listen(0, '127.0.0.1');
  await new Promise(resolve => local.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${local.address().port}/auth/firebase`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  } finally { await new Promise(resolve => local.close(resolve)); delete process.env.FIREBASE_PROJECT_ID; }
}

test('an unverified identity cannot create an application account or session', async () => {
  const result = await identityRequest({ uid: fixtureUid, email: `${fixtureUid}@example.invalid`, email_verified: false });
  assert.equal(result.status, 403);
  assert.equal(result.body.code, 'EMAIL_NOT_VERIFIED');
  assert.equal(await prisma.user.count({ where: { firebaseUid: fixtureUid } }), 0);
});

test('verified email and Google identities persist by Firebase UID across logins', async () => {
  const identity = { uid: fixtureUid, email: `${fixtureUid}@example.invalid`, email_verified: true, name: 'Test account', firebase: { sign_in_provider: 'password' } };
  const first = await identityRequest(identity);
  assert.equal(first.status, 200);
  assert.equal(first.body.user.isDemo, false);
  assert.equal(jwt.verify(first.body.token, process.env.JWT_SECRET).userId, first.body.user.id);
  const second = await identityRequest({ ...identity, name: 'Updated name', firebase: { sign_in_provider: 'google.com' } });
  assert.equal(second.status, 200);
  assert.equal(second.body.user.id, first.body.user.id);
  assert.equal(second.body.user.name, 'Updated name');
  assert.equal(await prisma.user.count({ where: { firebaseUid: fixtureUid } }), 1);
});

test('invalid provider verification and missing ID tokens never issue sessions', async () => {
  assert.equal((await identityRequest(new Error('invalid audience'))).status, 401);
  for (const idToken of [undefined, '', {}, 'x'.repeat(16385)]) {
    assert.equal((await identityRequest({}, { idToken })).status, 400);
  }
});

test('the real Firebase verifier rejects unsigned tokens and emulator configuration', async () => {
  const { verifyIdToken } = require('../src/services/firebase-identity');
  process.env.FIREBASE_PROJECT_ID = 'memory-brain-test';
  try {
    const token = jwt.sign({ sub: fixtureUid, email_verified: true }, '', { algorithm: 'none', audience: 'memory-brain-test', issuer: 'https://securetoken.google.com/memory-brain-test' });
    await assert.rejects(verifyIdToken(token));
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    await assert.rejects(verifyIdToken(token));
  } finally { delete process.env.FIREBASE_PROJECT_ID; delete process.env.FIREBASE_AUTH_EMULATOR_HOST; }
});

test('public authentication throttles repeated requests but leaves account reads available', async () => {
  let response;
  for (let n = 0; n < 65; n++) {
    response = await post('/auth/login', { username: 'invalid', password: 'invalid' });
    if (response.status === 429) break;
  }
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  const me = await fetch(base + '/auth/me');
  assert.equal(me.status, 401);
});

test('refresh preserves the short public session lifetime and demo identity', async () => {
  const { getDemoAccount } = require('../src/services/demo-account');
  const user = await getDemoAccount();
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  const response = await fetch(base + '/auth/refresh', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 200);
  const result = await response.json();
  const claims = jwt.verify(result.token, process.env.JWT_SECRET);
  assert.equal(result.user.isDemo, true);
  assert.equal(claims.exp - claims.iat, 86400);
});
