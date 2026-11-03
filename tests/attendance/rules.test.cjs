const test = require('node:test');
const assert = require('node:assert/strict');
const { compile } = require('../web-quality/compile.cjs');
const compiled = compile("export * from './apps/web/src/lib/attendance/rules.ts'; export * from './apps/web/src/lib/attendance/schema.ts'; export * from './apps/web/src/lib/attendance/tokens.ts';", {});
test('attendance polling cannot keep a session alive, while explicit submissions count as activity', async () => {
  const { sessionActivity } = await compile("export { sessionActivity } from './apps/web/src/lib/session-policy.ts';", {});
  assert.equal(sessionActivity('/api/courses/class/attendance', 'GET', false), false);
  assert.equal(sessionActivity('/api/courses/class/attendance/session/codes', 'GET', false), false);
  assert.equal(sessionActivity('/api/attendance/assignments', 'GET', false), false);
  assert.equal(sessionActivity('/api/courses/class/attendance', 'POST', false), true);
});
test('Present/Tardy use an exact server cutoff and UTC dates display in institute timezone', async () => {
  const r = await compiled; const cutoff = new Date('2026-11-01T01:10:00Z');
  assert.equal(r.classify(new Date(cutoff - 1), cutoff), 'PRESENT'); assert.equal(r.classify(cutoff, cutoff), 'TARDY');
  assert.equal(r.sessionDate(new Date('2026-11-01T18:00:00Z'), 'Asia/Manila'), '2026-11-02');
});
test('async late joiners receive a fair window without retroactive Tardy', async () => {
  const r = await compiled; const opens = new Date('2026-11-01T00:00:00Z'); const closes = new Date('2026-11-08T00:00:00Z'); const cutoff = new Date('2026-11-02T00:00:00Z');
  const secondDay = r.asyncEligibility(opens, closes, cutoff, new Date('2026-11-03T00:00:00Z'));
  assert.equal(secondDay.required, true); assert.equal(secondDay.presentUntil.toISOString(), '2026-11-04T00:00:00.000Z');
  assert.equal(r.asyncEligibility(opens, closes, cutoff, new Date('2026-11-07T12:00:00Z')).required, false);
  assert.equal(r.asyncEligibility(opens, new Date(opens.getTime() + 3600000), new Date(opens.getTime() + 3600000), new Date(opens.getTime() + 1)).required, false);
});
test('location separates nearby, definitely outside, unclear, stale and mock readings', async () => {
  const r = await compiled; const now = new Date(); const center = { latitude: 14.75, longitude: 121.1, radius: 150 };
  const fix = { latitude: 14.75, longitude: 121.1, accuracy: 20, timestamp: now.getTime() };
  assert.equal(r.verification(fix, center, now).outcome, 'NEARBY');
  assert.equal(r.verification({ ...fix, latitude: 15 }, center, now).outcome, 'OUTSIDE');
  assert.equal(r.verification({ ...fix, accuracy: 101 }, center, now).outcome, 'UNCLEAR');
  assert.equal(r.verification({ ...fix, timestamp: now.getTime() - 30001 }, center, now).outcome, 'UNCLEAR');
  assert.equal(r.verification({ ...fix, mocked: true }, center, now).outcome, 'MOCK_REPORTED');
  assert.equal(r.verification(undefined, center, now).outcome, 'DECLINED');
  assert.equal(r.bulkEligible(true, 'OUTSIDE'), false); assert.equal(r.bulkEligible(false, 'NOT_CHECKED'), true);
});
test('session input rejects remote location, invalid durations and unsupported codes', async () => {
  const { createSchema } = await compiled; const base = { title: 'Class', mode: 'IN_PERSON', durationMinutes: 30 };
  assert.equal(createSchema.safeParse(base).success, true);
  assert.equal(createSchema.parse(base).qrGraceSeconds, 30);
  assert.equal(createSchema.safeParse({ ...base, qrGraceSeconds: 60 }).success, true);
  for (const qrGraceSeconds of [2, 61, 30.5]) assert.equal(createSchema.safeParse({ ...base, qrGraceSeconds }).success, false);
  assert.equal(createSchema.safeParse({ ...base, mode: 'LIVE_REMOTE', requiresLocation: true }).success, false);
  assert.equal(createSchema.safeParse({ ...base, durationMinutes: 481 }).success, false);
  assert.equal(createSchema.safeParse({ ...base, presentMinutes: 31 }).success, false);
  assert.equal(createSchema.safeParse({ ...base, liveCodeEnabled: true }).success, false);
  assert.equal(createSchema.safeParse({ ...base, mode: 'ASYNCHRONOUS', durationMinutes: 10080 }).success, true);
});
test('ordinary attendance needs no activation review; location still requires privacy and retention settings', async () => {
  const { policySchema } = await compiled; const policy = { rollout: 'DISABLED', phase: 1, pilotCourseIds: [], locationEnabled: false, timezone: 'Asia/Manila', privacyReview: '', recordDays: null, eventDays: null, requestDays: null, verificationDays: null, arrangementDays: null };
  assert.equal(policySchema.safeParse(policy).success, true); assert.equal(policySchema.safeParse({ ...policy, rollout: 'ENABLED' }).success, true);
  assert.equal(policySchema.safeParse({ ...policy, locationEnabled: true }).success, false);
  assert.equal(policySchema.safeParse({ ...policy, locationEnabled: true, privacyReview: 'Synthetic review', verificationDays: 30 }).success, true);
  assert.equal(policySchema.safeParse({ ...policy, timezone: 'Invalid/Zone' }).success, false);
});
test('CSV quotes values and neutralizes formula prefixes even after whitespace', async () => {
  const { csvCell } = await compiled; assert.equal(csvCell('a,"b'), '"a,""b"'); assert.equal(csvCell(' =HYPERLINK("evil")').startsWith('"\''), true); assert.equal(csvCell('\t@SUM(1)').startsWith('"\''), true);
});
test('signed QR and challenge reject wrong users, sessions, versions and expiry', async () => {
  process.env.ATTENDANCE_QR_SECRET = 'synthetic-attendance-test-signing-key-only';
  const r = await compiled; const now = new Date(); const session = { id: 'one', courseId: 'class', tokenVersion: 1, closesAt: new Date(now.getTime() + 60000) };
  const token = await r.signAttendanceToken('qr', session, now, 15);
  await r.verifyAttendanceToken(token, 'qr', session, now);
  await assert.rejects(r.verifyAttendanceToken(token, 'qr', { ...session, id: 'two' }, now));
  await assert.rejects(r.verifyAttendanceToken(token, 'qr', { ...session, tokenVersion: 2 }, now));
  await assert.rejects(r.verifyAttendanceToken(token, 'qr', session, new Date(now.getTime() + 16000)));
  const longSession = { ...session, closesAt: new Date(now.getTime() + 120000) };
  const slowNetworkToken = await r.signAttendanceToken('qr', longSession, now, 15 + 60);
  await r.verifyAttendanceToken(slowNetworkToken, 'qr', longSession, new Date(now.getTime() + 74000));
  await assert.rejects(r.verifyAttendanceToken(slowNetworkToken, 'qr', longSession, new Date(now.getTime() + 75000)));
  const closingToken = await r.signAttendanceToken('qr', session, now, 15 + 60);
  await assert.rejects(r.verifyAttendanceToken(closingToken, 'qr', session, session.closesAt));
  const challenge = await r.signAttendanceToken('challenge', session, now, 30, 'student');
  await assert.rejects(r.verifyAttendanceToken(challenge, 'challenge', session, now, 'other'));
});
test('live remote codes bind to session/version and allow only the first ten seconds of previous slot', async () => {
  const r = await compiled; const session = { id: 'one', tokenVersion: 1 }; const code = r.liveCode('one', 1, 100);
  assert.equal(r.verifyLiveCode(code, session, new Date(101 * 60000 + 9999)), true);
  assert.equal(r.verifyLiveCode(code, session, new Date(101 * 60000 + 10000)), false);
  assert.equal(r.verifyLiveCode(code, { ...session, tokenVersion: 2 }, new Date(100 * 60000)), false);
});
