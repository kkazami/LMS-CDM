import { createHash, randomBytes } from 'node:crypto';
import { Algorithm, hash, verify } from '@node-rs/argon2';
import { compare } from 'bcryptjs';

const argonProfile = { algorithm: Algorithm.Argon2id, memoryCost: 19 * 1024, timeCost: 2, parallelism: 1, outputLen: 32 };
const argonHash = /^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/;
const bcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
let activeJobs = 0;

async function boundedArgon<T>(job: () => Promise<T>) {
  if (activeJobs >= 2) throw new Error('Password verifier is temporarily busy.');
  activeJobs += 1;
  try { return await job(); } finally { activeJobs -= 1; }
}

export function verifyAccountPassword(password: string, stored: string): Promise<boolean> {
  if (bcryptHash.test(stored)) return compare(password, stored);
  const normalized = password.normalize('NFC');
  if (!argonHash.test(stored) || Buffer.byteLength(normalized, 'utf8') > 512) return Promise.resolve(false);
  return boundedArgon(() => verify(stored, normalized));
}

// New writes stay disabled until every credential writer and rollback target has been qualified.
export function hashArgonPassword(password: string) {
  const normalized = password.normalize('NFC');
  if (Buffer.byteLength(normalized, 'utf8') > 512) throw new RangeError('Password exceeds the supported byte limit.');
  return boundedArgon(() => hash(normalized, { ...argonProfile, salt: randomBytes(16) }));
}

export function canRehashLegacyPassword(password: string, stored: string) {
  return bcryptHash.test(stored) && Buffer.byteLength(password, 'utf8') < 72 && password === password.normalize('NFC');
}

/** Candidate policy takes a reviewed local SHA-256 digest set. No secret leaves the verifier. */
export function newPasswordIssue(password: string, mandatoryMfa: boolean, blockedDigests: ReadonlySet<string>) {
  const normalized = password.normalize('NFC');
  if (Buffer.byteLength(normalized, 'utf8') > 512) return 'length';
  const length = [...normalized].length;
  if (length < (mandatoryMfa ? 8 : 15) || length > 128) return 'length';
  if (blockedDigests.size === 0) throw new Error('Password blocklist is unavailable.');
  return blockedDigests.has(createHash('sha256').update(normalized).digest('hex')) ? 'compromised' : null;
}
