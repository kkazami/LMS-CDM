const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compile } = require('./compile.cjs');
const source = `export { GET } from './apps/web/src/app/api/public/leaderboard/route';`;
const profile = (overrides = {}) => ({ id: 'profile', exp: 100, totalPoints: 30, levelTier: 'newcomer', isLeaderboardAnonymized: false,
  student: { id: 'student-5678', name: 'Synthetic Student', avatarUrl: '/api/assets/private-avatar', department: 'BSIT', institute: { code: 'ics', name: 'Synthetic ICS' } }, ...overrides });

test('public leaderboard keeps anonymous names and private avatars protected', async () => {
  let query;
  const rows = [profile(), profile({ isLeaderboardAnonymized: true, student: { ...profile().student, name: 'Private Name', avatarUrl: 'https://example.invalid/avatar.png' } })];
  const api = await compile(source, { db: { gamificationProfile: { findMany: async input => { query = input; return rows; } } } });
  const response = await api.GET(); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(query.take, 10); assert.deepEqual(query.where.student, { role: 'STUDENT', isActive: true });
  assert.equal(body.entries[0].displayName, 'Synthetic Student'); assert.equal(body.entries[0].avatar, null);
  assert.equal(body.entries[1].displayName, 'Student #5678'); assert.equal(body.entries[1].avatar, null);
  assert.doesNotMatch(JSON.stringify(body), /Private Name|private-avatar/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('quota failure gives a retryable 503, logs no database payload, and pauses repeated queries', async t => {
  let reads = 0, now = 1000, blocked = true;
  const logs = []; t.mock.method(console, 'warn', (...args) => logs.push(args));
  const api = await compile(source, { db: { gamificationProfile: { findMany: async () => {
    reads++; if (blocked) throw { code: 'P2010', message: 'private database payload', meta: { driverAdapterError: { cause: { originalCode: '53000' } } } };
    return [];
  } } } });
  t.mock.method(Date, 'now', () => now);
  const first = await api.GET(); assert.equal(first.status, 503); assert.equal(first.headers.get('retry-after'), '60');
  assert.deepEqual((await first.json()).entries, []);
  assert.equal((await api.GET()).status, 503); assert.equal(reads, 1); assert.equal(logs.length, 1);
  assert.match(JSON.stringify(logs), /database_quota_exceeded/); assert.doesNotMatch(JSON.stringify(logs), /private database payload/);
  now += 61000; blocked = false; assert.equal((await api.GET()).status, 200); assert.equal(reads, 2);
});

test('concurrent public requests share one database query and receive separate response bodies', async () => {
  let reads = 0, finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const api = await compile(source, { db: { gamificationProfile: { findMany: () => { reads++; return pending; } } } });
  const first = api.GET(), second = api.GET(); assert.equal(reads, 1); finish([profile()]);
  const results = await Promise.all([first, second]);
  for (const response of results) { assert.equal(response.status, 200); assert.equal((await response.json()).entries.length, 1); }
});

test('an outage never falls back to stale public student identities', async t => {
  t.mock.method(console, 'warn', () => {});
  let reads = 0;
  const api = await compile(source, { db: { gamificationProfile: { findMany: async () => { if (++reads === 1) return [profile()]; throw Error('Connection reset'); } } } });
  assert.equal((await api.GET()).status, 200);
  const failed = await api.GET(); assert.equal(failed.status, 503); assert.doesNotMatch(JSON.stringify(await failed.json()), /Synthetic Student/);
});
