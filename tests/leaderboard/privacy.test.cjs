const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compile } = require('../web-quality/compile.cjs');

const source = `
  export { POST as save } from './apps/web/src/app/api/gamification/privacy/route';
  export { GET as list } from './apps/web/src/app/api/leaderboard/route';
  export { GET as card } from './apps/web/src/app/api/users/[userId]/public/route';
`;
const origin = 'https://lms.test';
const choice = body => new Request(`${origin}/api/gamification/privacy`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body),
});

test('the signed-in student can change visibility without legacy clients resetting photo consent', async () => {
  const user = { id: 'student', role: 'STUDENT', instituteId: 'ics' };
  const student = { preferences: '{"theme":"dark"}' };
  const saved = { isLeaderboardAnonymized: false, student };
  const transaction = { gamificationProfile: {
    upsert: async ({ where, update, create }) => {
      assert.equal(where.studentId, user.id);
      assert.equal(create.studentId, user.id);
      return Object.assign(saved, update);
    },
  }, user: { update: async ({ where, data }) => {
    assert.deepEqual(where, { id: user.id, preferences: student.preferences });
    student.preferences = data.preferences;
  } } };
  const state = { session: { user }, db: { $transaction: fn => fn(transaction) } };
  const api = await compile(source, state);
  for (const [input, visibility] of [
    [{ visibility: 'photo' }, 'photo'],
    [{ isLeaderboardAnonymized: true }, 'anonymous'],
    [{ isAnonymized: false }, 'photo'],
    [{ visibility: 'name' }, 'name'],
    [{ visibility: 'anonymous' }, 'anonymous'],
  ]) {
    const response = await api.save(choice(input));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).visibility, visibility);
  }
  assert.deepEqual(JSON.parse(student.preferences), { theme: 'dark', showLeaderboardPhoto: false });
  transaction.user.update = async () => { throw { code: 'P2025' }; };
  assert.equal((await api.save(choice({ visibility: 'photo' }))).status, 409);
  for (const input of [{}, { isAnonymized: 'false' }, { visibility: 'invalid' }]) {
    assert.equal((await api.save(choice(input))).status, 400);
  }
  state.session = { user: { ...user, role: 'PROFESSOR' } };
  assert.equal((await api.save(choice({ visibility: 'photo' }))).status, 403);
  state.session = null;
  assert.equal((await api.save(choice({ visibility: 'photo' }))).status, 401);
});

test('rankings and live mini profiles enforce the current visibility even outside the top results', async () => {
  const peer = { id: 'private-peer', name: 'Hidden Name', role: 'STUDENT', avatarUrl: '/api/assets/proof', department: 'BSIT', coverColor: '', isActive: true, instituteId: 'ics', preferences: '{"showLeaderboardPhoto":true}' };
  const viewer = { id: 'viewer', role: 'STUDENT', instituteId: 'ics' };
  const privacy = { isLeaderboardAnonymized: true, exp: 450, currentStreak: 1, badges: [] };
  const state = { session: { user: viewer }, db: {
    institute: { findFirst: async () => ({ id: 'ics' }) },
    gamificationProfile: {
      findMany: async () => [{ student: peer, ...privacy }],
      findUnique: async ({ where }) => {
        assert.equal(where.studentId, viewer.id);
        return { isLeaderboardAnonymized: true, student: { preferences: '{"showLeaderboardPhoto":true}' } };
      },
    },
    user: { findFirst: async ({ where, select }) => {
      assert.equal(where.instituteId, viewer.instituteId);
      assert.equal(where.role, 'STUDENT');
      assert.equal(where.isActive, true);
      assert.equal(select.email, undefined);
      assert.equal(select.studentNumber, undefined);
      return where.id === peer.id && where.instituteId === peer.instituteId ? {
        id: peer.id, name: peer.name, avatarUrl: peer.avatarUrl, role: peer.role,
        department: peer.department, coverColor: peer.coverColor, preferences: peer.preferences, gamificationProfile: privacy,
      } : null;
    } },
  } };
  const api = await compile(source, state);
  const board = () => api.list(new Request(`${origin}/api/leaderboard?institute=ics`));
  const card = () => api.card(new Request(`${origin}/api/users/${peer.id}/public?source=leaderboard`), {
    params: Promise.resolve({ userId: peer.id }),
  });

  const anonymous = await (await board()).json();
  assert.equal(anonymous.visibility, 'anonymous');
  assert.equal(anonymous.entries[0].userId, 'anonymous-1');
  assert.equal(anonymous.entries[0].userName, 'Anonymous student');
  assert.doesNotMatch(JSON.stringify(anonymous), /private-peer|Hidden Name|api\/assets/);
  assert.equal((await card()).status, 404);

  privacy.isLeaderboardAnonymized = false;
  peer.preferences = '{"showLeaderboardPhoto":false}';
  assert.equal((await (await board()).json()).entries[0].avatarUrl, null);
  const hiddenCard = await card();
  assert.equal(hiddenCard.headers.get('cache-control'), 'private, no-store');
  const { user } = await hiddenCard.json();
  assert.equal(user.name, peer.name);
  assert.equal(user.avatarUrl, null);
  assert.equal(user.canViewFullProfile, false);
  assert.equal(user.preferences, undefined);

  peer.preferences = '{"showLeaderboardPhoto":true}';
  assert.equal((await (await card()).json()).user.avatarUrl, peer.avatarUrl);
  viewer.instituteId = 'ite';
  assert.equal((await board()).status, 403);
  assert.equal((await card()).status, 404);
});
