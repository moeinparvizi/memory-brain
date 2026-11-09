const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const prisma = require('../src/config/db');

test('an unconfigured private login never authenticates an empty request', async () => {
  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.JWT_SECRET;
  const findFirst = prisma.user.findFirst;
  delete process.env.AUTH_USERNAME;
  delete process.env.AUTH_PASSWORD;
  process.env.JWT_SECRET = 'test-only-secret';
  let databaseRead = false;
  prisma.user.findFirst = async () => { databaseRead = true; return { id: 1, name: 'Test', email: 'test@example.invalid' }; };
  const app = express();
  app.use(express.json());
  app.use('/auth', require('../src/routes/auth.routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401);
    assert.equal(databaseRead, false);
  } finally {
    prisma.user.findFirst = findFirst;
    for (const [key, value] of Object.entries({ AUTH_USERNAME: username, AUTH_PASSWORD: password, JWT_SECRET: secret })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
});

test('optional authentication endpoints are closed when their providers are not configured', async () => {
  const keys = ['GOOGLE_CLIENT_ID', 'SMS_PROVIDER'];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  const app = express();
  app.use(express.json());
  app.use('/auth', require('../src/routes/auth.routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const [endpoint, payload] of [['/google', { credential: 'untrusted-token' }], ['/phone/send-otp', { phone: '+989000000000' }], ['/phone/verify', { phone: '+989000000000', code: '000000' }]]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/auth${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      assert.equal(response.status, 404, endpoint + ' must be disabled');
    }
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await new Promise(resolve => server.close(resolve));
  }
});
