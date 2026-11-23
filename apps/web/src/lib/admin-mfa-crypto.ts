import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export class AdminMfaError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

function key() {
  const encoded = process.env.ADMIN_MFA_ENCRYPTION_KEY ?? '';
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.length !== 32 || decoded.toString('base64') !== encoded) throw new AdminMfaError(503, 'Administrator MFA is not configured. Contact the operator.');
  return decoded;
}
export function requireAdminMfaKey() { key(); }
export function newTotpSecret() {
  const input = randomBytes(20);
  let bits = 0, value = 0, output = '';
  for (const byte of input) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return output;
}
function secretBytes(secret: string) {
  if (!/^[A-Z2-7]{32}$/.test(secret)) throw new AdminMfaError(503, 'Administrator MFA is unavailable.');
  let value = 0, bits = 0;
  const bytes: number[] = [];
  for (const symbol of secret) {
    value = (value << 5) | alphabet.indexOf(symbol); bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}
export function encryptTotpSecret(userId: string, secret: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from('lumina-admin-mfa-v1\0' + userId));
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}
export function decryptTotpSecret(userId: string, encoded: string) {
  try {
    const [version, iv, tag, data, extra] = encoded.split('.');
    if (version !== 'v1' || extra !== undefined || !iv || !tag || !data) throw new Error();
    const nonce = Buffer.from(iv, 'base64url'), authTag = Buffer.from(tag, 'base64url');
    if (nonce.length !== 12 || authTag.length !== 16 || data.length > 100) throw new Error();
    const decipher = createDecipheriv('aes-256-gcm', key(), nonce);
    decipher.setAAD(Buffer.from('lumina-admin-mfa-v1\0' + userId)); decipher.setAuthTag(authTag);
    const secret = Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
    secretBytes(secret);
    return secret;
  } catch { throw new AdminMfaError(503, 'Administrator MFA is unavailable. Contact the operator.'); }
}
export function totpCode(secret: string, counter: bigint, digits = 6) {
  const buffer = Buffer.alloc(8); buffer.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', secretBytes(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits).toString().padStart(digits, '0');
}
export function matchingTotpCounter(secret: string, code: string, lastCounter: bigint | null, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const current = BigInt(Math.floor(now / 30000));
  for (const drift of [-1n, 0n, 1n]) {
    const counter = current + drift;
    if (counter < 0 || lastCounter !== null && counter <= lastCounter) continue;
    if (timingSafeEqual(Buffer.from(totpCode(secret, counter)), Buffer.from(code))) return counter;
  }
  return null;
}
export function recoveryHash(userId: string, value: string) {
  const normalized = value.replaceAll('-', '').toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(normalized)) return null;
  return createHash('sha256').update('lumina-admin-recovery-v1\0' + userId + '\0' + normalized).digest('hex');
}
export function newRecoveryCodes(userId: string) {
  const codes = Array.from({ length: 10 }, () => randomBytes(16).toString('hex').match(/.{8}/g)!.join('-'));
  return { codes, hashes: codes.map(code => recoveryHash(userId, code)!) };
}
export function findRecoveryHash(userId: string, value: string, hashes: string[]) {
  const candidate = recoveryHash(userId, value);
  if (!candidate) return null;
  return hashes.find(hash => /^[a-f0-9]{64}$/.test(hash) && timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'))) ?? null;
}
