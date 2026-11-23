const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');

// Run last in the disposable security fixture: this deliberately replaces the
// synthetic administrator's initially seeded MFA factor and invalidates its sessions.
module.exports = async function adminMfaCases(db, invoke) {
  const mfa = require('../../apps/web/src/lib/admin-mfa.ts');
  const cryptography = require('../../apps/web/src/lib/admin-mfa-crypto.ts');
  const sessions = require('../../apps/web/src/lib/auth-session.ts');
  const admin = await db.user.findUniqueOrThrow({ where: { id: 'admin' } });
  await db.$executeRaw`DELETE FROM "AdminMfaFactor" WHERE "userId"=${admin.id}`;
  const before = await db.session.count({ where: { userId: admin.id } });
  const pending = await invoke(async () => {
    await assert.rejects(sessions.createSession(admin.id), error => error instanceof sessions.AdminMfaRequiredError);
    return Response.json({ pending: true });
  }, '', '/api/auth/login', 'POST', {});
  assert.equal(pending.status, 200);
  assert.equal(await db.session.count({ where: { userId: admin.id } }), before, 'Primary credentials must not create an administrator session');
  const legacy = randomBytes(32).toString('base64url');
  await db.session.create({ data: { userId: admin.id, tokenHash: sessions.hashToken(legacy), expiresAt: new Date(Date.now() + 60000) } });
  assert.equal(await sessions.validateSessionToken(legacy, false), null, 'Legacy administrator sessions have no MFA authority');

  const start = () => db.$transaction(tx => mfa.beginAdminMfa(tx, admin.id, admin));
  const challenge = await start();
  await assert.rejects(mfa.acknowledgeAdminMfaRecovery(challenge.rawToken), error => error.status === 400);
  const setup = await mfa.prepareAdminMfa(challenge.rawToken);
  const counter = BigInt(Math.floor(Date.now() / 30000));
  const verified = await mfa.verifyAdminMfa(challenge.rawToken, cryptography.totpCode(setup.secret, counter), false);
  assert.equal(verified.recoveryCodes.length, 10);
  assert.notEqual(verified.rawToken, challenge.rawToken, 'Second-factor verification must rotate the challenge token');
  await assert.rejects(mfa.adminMfaStatus(challenge.rawToken), error => error.status === 401);
  const complete = raw => invoke(async () => Response.json(await sessions.createSession(admin.id, undefined, undefined, undefined, raw)), '', '/api/auth/mfa', 'POST', {});
  await assert.rejects(complete(verified.rawToken), error => error.status === 400);
  await mfa.acknowledgeAdminMfaRecovery(verified.rawToken);
  const admitted = await complete(verified.rawToken);
  assert.equal(admitted.status, 200);
  const session = await admitted.json();
  assert.notEqual(session.token, verified.rawToken);
  assert.equal((await sessions.validateSessionToken(session.token, false))?.userId, admin.id);
  await assert.rejects(complete(verified.rawToken), error => error.status === 401, 'A verified challenge can issue only one session');

  const replay = await start();
  await assert.rejects(mfa.verifyAdminMfa(replay.rawToken, cryptography.totpCode(setup.secret, counter), false), error => error.status === 400);
  const [one, two] = await Promise.all([start(), start()]);
  const nextCode = cryptography.totpCode(setup.secret, counter + 1n);
  const concurrent = await Promise.allSettled([mfa.verifyAdminMfa(one.rawToken, nextCode, false), mfa.verifyAdminMfa(two.rawToken, nextCode, false)]);
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1, 'Concurrent TOTP reuse must have one winner');
  const [recoveryOne, recoveryTwo] = await Promise.all([start(), start()]);
  const recovered = await Promise.allSettled([mfa.verifyAdminMfa(recoveryOne.rawToken, verified.recoveryCodes[0], true), mfa.verifyAdminMfa(recoveryTwo.rawToken, verified.recoveryCodes[0], true)]);
  assert.equal(recovered.filter(result => result.status === 'fulfilled').length, 1, 'Recovery codes must be consumed atomically');
  const [remaining] = await db.$queryRaw`SELECT "recoveryHashes" FROM "AdminMfaFactor" WHERE "userId"=${admin.id}`;
  assert.equal(JSON.parse(remaining.recoveryHashes).length, 9);
  assert.ok(!remaining.recoveryHashes.includes(verified.recoveryCodes[0]));

  // Real status/email mutations must permanently cancel verified challenges,
  // even if the current field values are subsequently changed back.
  const statusPending = await start();
  const statusVerified = await mfa.verifyAdminMfa(statusPending.rawToken, verified.recoveryCodes[1], true);
  await db.user.update({ where: { id: admin.id }, data: { isActive: false } });
  await db.user.update({ where: { id: admin.id }, data: { isActive: true } });
  await assert.rejects(complete(statusVerified.rawToken), error => error.status === 401);
  assert.equal(await sessions.validateSessionToken(session.token, false), null);
  const emailPending = await start();
  const emailVerified = await mfa.verifyAdminMfa(emailPending.rawToken, verified.recoveryCodes[2], true);
  await db.user.update({ where: { id: admin.id }, data: { email: 'mfa-renamed@example.invalid' } });
  await db.user.update({ where: { id: admin.id }, data: { email: admin.email } });
  await assert.rejects(complete(emailVerified.rawToken), error => error.status === 401);

  const resetPending = await start();
  const resetVerified = await mfa.verifyAdminMfa(resetPending.rawToken, verified.recoveryCodes[3], true);
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${admin.id} FOR UPDATE`;
    await tx.$executeRaw`UPDATE "AdminMfaFactor" SET version=${randomBytes(16).toString('hex')} WHERE "userId"=${admin.id}`;
  });
  assert.equal(await sessions.validateSessionToken(session.token, false), null, 'Resetting the factor invalidates its old session proofs');
  await assert.rejects(complete(resetVerified.rawToken), error => error.status === 401);
  const canceled = await start(); await mfa.cancelAdminMfa(canceled.rawToken);
  await assert.rejects(mfa.adminMfaStatus(canceled.rawToken), error => error.status === 401);
  const expired = await start();
  await db.$executeRaw`UPDATE "AdminMfaChallenge" SET "expiresAt"=${new Date(Date.now() - 1000)} WHERE "tokenHash"=${createHash('sha256').update(expired.rawToken).digest('hex')}`;
  await assert.rejects(mfa.adminMfaStatus(expired.rawToken), error => error.status === 401);
  const bound = await db.$transaction(tx => mfa.beginAdminMfa(tx, admin.id, admin, 'dummy-agent'));
  await assert.rejects(mfa.adminMfaStatus(bound.rawToken, 'other-agent'), error => error.status === 401);

  // Exercise the real MFA HTTP handler and HttpOnly/path-aware cookie adapter.
  await db.$executeRaw`DELETE FROM "AdminMfaFactor" WHERE "userId"=${admin.id}`;
  const route = require('../../apps/web/src/app/api/auth/mfa/route.ts');
  const me = require('../../apps/web/src/app/api/auth/me/route.ts');
  const jar = new Map();
  const call = (method, body, cookieJar = jar, headers) => invoke(route[method], '', '/api/auth/mfa', method, body, {}, { cookieJar, headers });
  assert.equal((await call('GET', undefined, new Map())).status, 401);
  assert.equal((await call('POST', { action: 'enroll' }, new Map())).status, 401);
  assert.equal((await call('POST', { action: 'enroll' }, jar, { origin: 'https://foreign.example.invalid' })).status, 403);
  const primary = async () => invoke(async () => {
    await assert.rejects(sessions.createSession(admin.id), error => error instanceof sessions.AdminMfaRequiredError);
    return Response.json({ mfaRequired: true }, { status: 202 });
  }, '', '/api/auth/login', 'POST', {}, {}, { cookieJar: jar });
  assert.equal((await primary()).status, 202);
  assert.equal(jar.has('lumina_session'), false);
  assert.equal(jar.get(mfa.ADMIN_MFA_COOKIE).options.httpOnly, true);
  assert.equal(jar.get(mfa.ADMIN_MFA_COOKIE).options.sameSite, 'strict');
  assert.equal(jar.get(mfa.ADMIN_MFA_COOKIE).options.path, '/api/auth/mfa');
  assert.equal((await call('POST', { action: 'complete' })).status, 401);
  const prepared = await call('POST', { action: 'enroll' }); assert.equal(prepared.status, 200, await prepared.clone().text());
  const preparedBody = await prepared.json();
  assert.match(preparedBody.secret, /^[A-Z2-7]{32}$/); assert.match(preparedBody.qr, /^data:image\/png;base64,/);
  const previousChallenge = jar.get(mfa.ADMIN_MFA_COOKIE).value;
  const checked = await call('POST', { action: 'verify', code: cryptography.totpCode(preparedBody.secret, BigInt(Math.floor(Date.now() / 30000))) });
  assert.equal(checked.status, 200, await checked.clone().text());
  const checkedBody = await checked.json(); assert.equal(checkedBody.recoveryCodes.length, 10); assert.equal('token' in checkedBody, false);
  assert.notEqual(jar.get(mfa.ADMIN_MFA_COOKIE).value, previousChallenge);
  assert.equal(jar.has('lumina_session'), false);
  assert.equal((await invoke(me.GET, '', '/api/auth/me', 'GET', undefined, {}, { cookieJar: jar })).status, 401);
  assert.equal((await call('POST', { action: 'acknowledge', savedRecoveryCodes: false })).status, 400);
  const acknowledged = await call('POST', { action: 'acknowledge', savedRecoveryCodes: true });
  assert.equal(acknowledged.status, 200, await acknowledged.clone().text());
  assert.equal((await acknowledged.json()).redirect, '/ics/admin');
  assert.equal(jar.has(mfa.ADMIN_MFA_COOKIE), false); assert.ok(jar.has('lumina_session'));
  assert.equal((await invoke(me.GET, '', '/api/auth/me', 'GET', undefined, {}, { cookieJar: jar })).status, 200);
  assert.equal((await primary()).status, 202);
  const recoveryResponse = await call('POST', { action: 'verify', code: checkedBody.recoveryCodes[0], recovery: true });
  assert.equal(recoveryResponse.status, 200, await recoveryResponse.clone().text());
  assert.deepEqual(await recoveryResponse.json(), { verified: true }); assert.equal(jar.has('lumina_session'), false);
  assert.equal((await call('POST', { action: 'complete' })).status, 200);

  // A zero-session target still has its verified pending login revoked.
  const peer = await db.user.findUniqueOrThrow({ where: { id: 'mfa-admin-peer' } });
  const foreign = await db.user.findUniqueOrThrow({ where: { id: 'mfa-foreign-admin' } });
  const root = await db.user.findFirstOrThrow({ where: { uniqueId: 'cdm_super_user_01' } });
  const preparePeer = async () => {
    const pending = await db.$transaction(tx => mfa.beginAdminMfa(tx, peer.id, peer));
    const setup = await mfa.prepareAdminMfa(pending.rawToken);
    const checked = await mfa.verifyAdminMfa(pending.rawToken, cryptography.totpCode(setup.secret, BigInt(Math.floor(Date.now() / 30000))), false);
    await mfa.acknowledgeAdminMfaRecovery(checked.rawToken);
    return checked.rawToken;
  };
  const peerProof = await preparePeer();
  assert.equal(await db.session.count({ where: { userId: peer.id } }), 0);
  const revocations = require('../../apps/web/src/app/api/admin/security/sessions/route.ts');
  const revoke = body => invoke(revocations.DELETE, '', '/api/admin/security/sessions', 'DELETE', body, {}, { cookieJar: jar });
  const revokedPeer = await revoke({ targetUserId: peer.id }); assert.equal(revokedPeer.status, 200, await revokedPeer.clone().text());
  const revokedPeerBody = await revokedPeer.json(); assert.equal(revokedPeerBody.revokedCount, 0); assert.ok(revokedPeerBody.pendingMfaChallengesRevoked >= 1);
  await assert.rejects(mfa.adminMfaStatus(peerProof), error => error.status === 401);
  const foreignPending = await db.$transaction(tx => mfa.beginAdminMfa(tx, foreign.id, foreign));
  const rootPending = await db.$transaction(tx => mfa.beginAdminMfa(tx, root.id, root));
  assert.equal((await revoke({ targetUserId: foreign.id })).status, 404);
  const secondPeerProof = await preparePeer();
  const currentToken = jar.get('lumina_session').value;
  const instituteRevoked = await revoke({ instituteWide: true, confirmation: 'REVOKE ALL' });
  assert.equal(instituteRevoked.status, 200, await instituteRevoked.clone().text());
  assert.ok((await instituteRevoked.json()).pendingMfaChallengesRevoked >= 1);
  await assert.rejects(mfa.adminMfaStatus(secondPeerProof), error => error.status === 401);
  assert.equal((await mfa.adminMfaStatus(foreignPending.rawToken)).enrollment, true);
  assert.equal((await mfa.adminMfaStatus(rootPending.rawToken)).enrollment, true);
  assert.equal((await sessions.validateSessionToken(currentToken, false))?.userId, admin.id);
};
