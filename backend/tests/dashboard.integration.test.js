const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/db');
let user, server, baseUrl, headers;
const now = new Date();
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = new Date(now); today.setHours(0, 0, 0, 0);
const saturday = new Date(today); saturday.setDate(saturday.getDate() - ((saturday.getDay() + 1) % 7));

before(async () => {
  const app = express(); app.use(express.json());
  app.use('/summary', require('../src/routes/summary.routes'));
  app.use('/checklist', require('../src/routes/checklist.routes'));
  app.use('/settings', require('../src/routes/settings.routes'));
  app.use('/finance', require('../src/routes/finance.routes'));
  app.use('/roadmap', require('../src/routes/roadmap.routes'));
  app.use(require('../src/middleware/errorHandler'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  user = await prisma.user.create({ data: { name: 'Disposable dashboard regression fixture', googleId: `regression-${Date.now()}` } });
  headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '5m' }) };
  const session = await prisma.workoutSession.create({ data: { userId: user.id, day: 'شنبه', startTime: '10:00', endTime: '11:00', type: 'test', duration: '60' } });
  const friday = new Date(saturday); friday.setDate(friday.getDate() - 1);
  await prisma.workoutLog.createMany({ data: [friday, saturday].map(date => ({ userId: user.id, sessionId: session.id, date, completed: true })) });
  await prisma.setting.create({ data: { userId: user.id, key: 'weeklyWorkoutGoal', value: 1 } });
  const slot = await prisma.timeSlot.create({ data: { userId: user.id, label: 'test', time: '08:00', order: 0, supplements: { create: [{ name: 'test1', order: 0 }, { name: 'test2', order: 1 }] } }, include: { supplements: true } });
  await prisma.supplementLog.createMany({ data: [slot.supplements[0], slot.supplements[1], slot.supplements[0]].map(s => ({ supplementId: s.id, date: today, taken: true })) });
});
after(async () => {
  if (user) await prisma.user.delete({ where: { id: user.id } });
  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
});
const get = async route => { const response = await fetch(baseUrl + route, { headers }); assert.equal(response.status, 200); return response.json(); };

test('daily summary uses this Persian week and the user workout goal', async () => {
  const summary = await get('/summary/daily');
  const workout = summary.sections.find(s => s.title === 'ورزش');
  assert.match(workout.text, /1 روز/);
  assert.equal(workout.mood, 'great');
});

test('weekly report labels the real Saturday through Friday dates', async () => {
  const report = await get('/summary/weekly');
  const friday = new Date(saturday); friday.setDate(friday.getDate() + 6);
  assert.equal(report.weekStart, dateKey(saturday));
  assert.equal(report.weekEnd, dateKey(friday));
});

test('duplicate supplement records do not inflate dashboard report percentages', async () => {
  const summary = await get('/summary/daily');
  assert.match(summary.sections.find(s => s.title === 'مکمل‌ها').text, /تمام 2 مکمل/);
  const report = await get('/summary/weekly');
  assert.equal(report.stats.supplementRate, 14);
});

test('checklist creation returns the item and persists it for the user', async () => {
  const response = await fetch(baseUrl + '/checklist', { method: 'POST', headers, body: JSON.stringify({ text: 'آیتم آزمایشی', done: false, category: null }) });
  assert.equal(response.status, 201);
  const item = await response.json();
  assert.ok((await get('/checklist')).some(saved => saved.id === item.id && saved.text === item.text));
});

test('workout goals of 1, 4, and 5 days persist through the settings API', async () => {
  for (const goal of [1, 4, 5]) {
    const response = await fetch(baseUrl + '/settings', { method: 'PUT', headers, body: JSON.stringify({ weeklyWorkoutGoal: goal }) });
    assert.equal(response.status, 200);
    assert.equal((await get('/settings')).weeklyWorkoutGoal, goal);
  }
});

test('finance edits persist using the entry id', async () => {
  let response = await fetch(baseUrl + '/finance', { method: 'POST', headers, body: JSON.stringify({ month: '2026-11', income: 2000, allocations: { debt: 20, savings: 10, self: 3 } }) });
  assert.equal(response.status, 201);
  const entry = await response.json();
  response = await fetch(baseUrl + '/finance/' + entry.id, { method: 'PUT', headers, body: JSON.stringify({ income: 3000, allocations: { debt: 100, savings: 200, self: 300 } }) });
  assert.equal(response.status, 200);
  const entries = await get('/finance');
  assert.equal(entries[0].income, 3000);
  assert.deepEqual(entries[0].allocations, { debt: 100, savings: 200, self: 300 });
});


test('roadmap progress is calculated from saved tasks instead of the stale progress field', async () => {
  await prisma.phase.create({ data: { userId: user.id, title: 'فاز کاربر / Test phase', duration: '1 month', goal: 'Test', status: 'in-progress', progress: 0, order: 0, tasks: { create: [{ month: 1, topic: 'Done', done: true, order: 0 }, { month: 1, topic: 'Pending', done: false, order: 1 }] } } });
  const phases = await get('/roadmap/phases');
  assert.equal(phases[0].progress, 50);
  const summary = await get('/summary/daily');
  assert.match(summary.sections.find(s => s.title === 'نقشه راه').text, /50%/);
});

test('English daily reports translate generated copy and preserve user phase titles', async () => {
  const summary = await get('/summary/daily?lang=en');
  assert.ok(summary.sections.some(section => section.title === 'Supplements'));
  assert.match(summary.sections.find(section => section.title === 'Roadmap').text, /فاز کاربر \/ Test phase/);
  assert.doesNotMatch(summary.overall.mood, /[\u0600-\u06ff]/);
  assert.ok((await get('/summary/daily')).sections.some(section => section.title === 'مکمل‌ها'));
});

test('English weekly report keeps numeric data and translates weekdays and summary', async () => {
  const english = await get('/summary/weekly?lang=en');
  const persian = await get('/summary/weekly');
  assert.deepEqual(english.stats, persian.stats);
  assert.equal(english.dailyHabits[0].day, 'Saturday');
  assert.match(english.summary, /This week/);
  assert.doesNotMatch(english.summary, /[\u0600-\u06ff]/);
});
