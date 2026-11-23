import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import { mayAdmitAccount, privilegedRole } from '@/lib/super-user-v1/capabilities';
import { AdminMfaError, requireAdminMfaKey, newTotpSecret, encryptTotpSecret, decryptTotpSecret, matchingTotpCounter, newRecoveryCodes, findRecoveryHash } from './admin-mfa-crypto';

export const ADMIN_MFA_COOKIE = 'lumina_admin_mfa';
export const ADMIN_MFA_COOKIE_PATH = '/api/auth/mfa';
export const ADMIN_MFA_TTL_SECONDS = 600;
export type MfaIdentity = { email: string; password: string | null; role: string; instituteId: string; credentialProvisioningState: string | null; googleSubject: string | null };
type Client = Prisma.TransactionClient;
type Challenge = { tokenHash: string; userId: string; identityHash: string; userAgentHash: string; factorVersion: string | null; encryptedSecret: string | null; recoveryHashes: string | null; verifiedAt: Date | null; verifiedCounter: bigint | null; recoveryAcknowledgedAt: Date | null; expiresAt: Date };
type Factor = { userId: string; encryptedSecret: string; recoveryHashes: string; lastCounter: bigint | null; version: string };
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const adminMfaIdentityHash = (user: MfaIdentity) => digest(JSON.stringify([user.email, user.password, user.role, user.instituteId, user.credentialProvisioningState, user.googleSubject]));
const agentHash = (value?: string | null) => digest(value ?? '');
async function transaction<T>(work: (tx: Client) => Promise<T>) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT set_config('lock_timeout', '3s', true), set_config('statement_timeout', '5s', true)`;
    return work(tx);
  }, { maxWait: 3000, timeout: 10000 });
}

export async function beginAdminMfa(tx: Client, userId: string, user: MfaIdentity, userAgent?: string) {
  requireAdminMfaKey();
  try {
    const factor = (await tx.$queryRaw<Factor[]>`SELECT * FROM "AdminMfaFactor" WHERE "userId"=${userId}`)[0];
    const rawToken = randomBytes(32).toString('base64url'), tokenHash = digest(rawToken);
    const expiresAt = new Date(Date.now() + ADMIN_MFA_TTL_SECONDS * 1000);
    await tx.$executeRaw`DELETE FROM "AdminMfaChallenge" WHERE "userId"=${userId} AND "expiresAt" <= now()`;
    await tx.$executeRaw`INSERT INTO "AdminMfaChallenge" ("tokenHash","userId","identityHash","userAgentHash","factorVersion","expiresAt")
      VALUES (${tokenHash},${userId},${adminMfaIdentityHash(user)},${agentHash(userAgent)},${factor?.version ?? null},${expiresAt})`;
    return { rawToken, expiresAt, enrollment: !factor };
  } catch { throw new AdminMfaError(503, 'Administrator MFA setup is unavailable. Contact the operator.'); }
}

async function lockedChallenge(tx: Client, rawToken: string, userAgent?: string | null) {
  requireAdminMfaKey();
  if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) throw new AdminMfaError(401, 'Sign in again to verify your authenticator.');
  const tokenHash = digest(rawToken);
  const initial = (await tx.$queryRaw<Array<{ userId: string }>>`SELECT "userId" FROM "AdminMfaChallenge" WHERE "tokenHash"=${tokenHash}`)[0];
  if (!initial) throw new AdminMfaError(401, 'The MFA challenge expired. Sign in again.');
  await lockAccounts(tx, [initial.userId]);
  const user = await tx.user.findUnique({ where: { id: initial.userId }, include: { institute: true } });
  const challenge = (await tx.$queryRaw<Challenge[]>`SELECT * FROM "AdminMfaChallenge" WHERE "tokenHash"=${tokenHash} FOR UPDATE`)[0];
  if (!user || !challenge || !mayAdmitAccount(user) || !privilegedRole(user.role) || challenge.expiresAt <= new Date()
    || challenge.identityHash !== adminMfaIdentityHash(user) || challenge.userAgentHash !== agentHash(userAgent)) throw new AdminMfaError(401, 'The MFA challenge expired. Sign in again.');
  const factor = (await tx.$queryRaw<Factor[]>`SELECT * FROM "AdminMfaFactor" WHERE "userId"=${user.id} FOR UPDATE`)[0];
  if ((factor?.version ?? null) !== challenge.factorVersion) throw new AdminMfaError(401, 'Authenticator settings changed. Sign in again.');
  return { user, challenge, factor };
}
function hashes(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.length > 10 || parsed.some(item => typeof item !== 'string' || !/^[a-f0-9]{64}$/.test(item))) throw new AdminMfaError(503, 'Administrator MFA is unavailable.');
  return parsed as string[];
}
export async function adminMfaStatus(rawToken: string, userAgent?: string | null) {
  return transaction(async tx => {
    const { challenge, factor } = await lockedChallenge(tx, rawToken, userAgent);
    return { enrollment: !factor, verified: Boolean(challenge.verifiedAt), recoveryAcknowledgmentRequired: !factor && Boolean(challenge.verifiedAt), expiresAt: challenge.expiresAt.toISOString() };
  });
}
export async function prepareAdminMfa(rawToken: string, userAgent?: string | null) {
  return transaction(async tx => {
    const { user, challenge, factor } = await lockedChallenge(tx, rawToken, userAgent);
    if (factor) throw new AdminMfaError(409, 'An authenticator is already enrolled.');
    if (challenge.verifiedAt) throw new AdminMfaError(409, 'Save and acknowledge the recovery codes, or sign in again to restart enrollment.');
    const secret = challenge.encryptedSecret ? decryptTotpSecret(user.id, challenge.encryptedSecret) : newTotpSecret();
    if (!challenge.encryptedSecret) await tx.$executeRaw`UPDATE "AdminMfaChallenge" SET "encryptedSecret"=${encryptTotpSecret(user.id, secret)} WHERE "tokenHash"=${challenge.tokenHash}`;
    const issuer = 'CdM LMS';
    return { secret, uri: `otpauth://totp/${encodeURIComponent(issuer + ':' + user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30` };
  });
}
export async function verifyAdminMfa(rawToken: string, code: string, useRecovery: boolean, userAgent?: string | null) {
  return transaction(async tx => {
    const { user, challenge, factor } = await lockedChallenge(tx, rawToken, userAgent);
    if (challenge.verifiedAt) throw new AdminMfaError(409, 'This challenge has already been verified.');
    if (!factor && (!challenge.encryptedSecret || useRecovery)) throw new AdminMfaError(400, 'Enroll and verify an authenticator first.');
    let counter: bigint | null = null;
    if (useRecovery) {
      const remaining = hashes(factor!.recoveryHashes), used = findRecoveryHash(user.id, code, remaining);
      if (!used) throw new AdminMfaError(400, 'Invalid authenticator or recovery code.');
      await tx.$executeRaw`UPDATE "AdminMfaFactor" SET "recoveryHashes"=${JSON.stringify(remaining.filter(hash => hash !== used))} WHERE "userId"=${user.id}`;
    } else {
      counter = matchingTotpCounter(decryptTotpSecret(user.id, factor?.encryptedSecret ?? challenge.encryptedSecret!), code, factor?.lastCounter ?? null);
      if (counter === null) throw new AdminMfaError(400, 'Invalid or already-used authenticator code. Wait for the next code.');
      if (factor) await tx.$executeRaw`UPDATE "AdminMfaFactor" SET "lastCounter"=${counter} WHERE "userId"=${user.id}`;
    }
    const recovery = !factor ? newRecoveryCodes(user.id) : null;
    const nextToken = randomBytes(32).toString('base64url');
    await tx.$executeRaw`UPDATE "AdminMfaChallenge" SET "tokenHash"=${digest(nextToken)},"verifiedAt"=now(),"verifiedCounter"=${counter},"recoveryHashes"=${recovery ? JSON.stringify(recovery.hashes) : null} WHERE "tokenHash"=${challenge.tokenHash}`;
    await tx.auditLog.create({ data: { adminId: user.id, targetId: user.id, action: useRecovery ? 'ADMIN_MFA_RECOVERY_USED' : 'ADMIN_MFA_VERIFIED', metadata: '{}' } });
    return { enrollment: !factor, recoveryCodes: recovery?.codes ?? null, rawToken: nextToken };
  });
}
export async function acknowledgeAdminMfaRecovery(rawToken: string, userAgent?: string | null) {
  await transaction(async tx => {
    const { challenge, factor } = await lockedChallenge(tx, rawToken, userAgent);
    if (factor || !challenge.verifiedAt || !challenge.recoveryHashes) throw new AdminMfaError(400, 'Verify your authenticator and save recovery codes first.');
    await tx.$executeRaw`UPDATE "AdminMfaChallenge" SET "recoveryAcknowledgedAt"=now() WHERE "tokenHash"=${challenge.tokenHash}`;
  });
}

/** Consumes a server-verified proof under the same account lock as Session creation. */
export async function consumeAdminMfa(tx: Client, userId: string, user: MfaIdentity, rawToken: string, userAgent?: string) {
  const { user: current, challenge, factor } = await lockedChallenge(tx, rawToken, userAgent);
  if (current.id !== userId || challenge.identityHash !== adminMfaIdentityHash(user) || !challenge.verifiedAt || challenge.verifiedAt.getTime() < Date.now() - 120000) throw new AdminMfaError(401, 'Verify your authenticator again.');
  let version = factor?.version;
  if (!factor) {
    if (!challenge.encryptedSecret || !challenge.recoveryHashes || !challenge.recoveryAcknowledgedAt || challenge.verifiedCounter === null) throw new AdminMfaError(400, 'Save and acknowledge your recovery codes first.');
    hashes(challenge.recoveryHashes);
    version = randomBytes(16).toString('hex');
    await tx.$executeRaw`INSERT INTO "AdminMfaFactor" ("userId","encryptedSecret","recoveryHashes","lastCounter",version)
      VALUES (${userId},${challenge.encryptedSecret},${challenge.recoveryHashes},${challenge.verifiedCounter},${version})`;
    await tx.auditLog.create({ data: { adminId: userId, targetId: userId, action: 'ADMIN_MFA_ENROLLED', metadata: '{}' } });
  }
  await tx.$executeRaw`DELETE FROM "AdminMfaChallenge" WHERE "tokenHash"=${challenge.tokenHash}`;
  return { factorVersion: version!, identityHash: challenge.identityHash };
}
export async function saveAdminMfaSession(tx: Client, sessionId: string, userId: string, proof: { factorVersion: string; identityHash: string }) {
  await tx.$executeRaw`INSERT INTO "AdminMfaSession" ("sessionId","userId","factorVersion","identityHash") VALUES (${sessionId},${userId},${proof.factorVersion},${proof.identityHash})`;
}
export async function validAdminMfaSession(sessionId: string, userId: string, user: MfaIdentity, client: Client = db) {
  requireAdminMfaKey();
  const rows = await client.$queryRaw<Array<{ identityHash: string }>>`SELECT s."identityHash" FROM "AdminMfaSession" s JOIN "AdminMfaFactor" f ON f."userId"=s."userId" AND f.version=s."factorVersion" WHERE s."sessionId"=${sessionId} AND s."userId"=${userId}`;
  return rows.length === 1 && rows[0].identityHash === adminMfaIdentityHash(user);
}

export async function adminMfaCompletionIdentity(rawToken: string, userAgent?: string | null) {
  return transaction(async tx => {
    const { user } = await lockedChallenge(tx, rawToken, userAgent);
    return user;
  });
}
export async function cancelAdminMfa(rawToken: string, userAgent?: string | null) {
  await transaction(async tx => {
    const { challenge } = await lockedChallenge(tx, rawToken, userAgent);
    await tx.$executeRaw`DELETE FROM "AdminMfaChallenge" WHERE "tokenHash"=${challenge.tokenHash}`;
  });
}
