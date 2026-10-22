import crypto from 'node:crypto';
function encryptionKey(value = process.env.TOKEN_ENCRYPTION_KEY): Buffer {
  if (!value || !/^[a-f0-9]{64}$/i.test(value)) throw new Error('GitHub token encryption is not configured.');
  return Buffer.from(value, 'hex');
}
export function encryptGithubToken(token: string): string {
  if (!token || typeof token !== 'string') throw new Error('Invalid token.');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}
export function decryptGithubToken(payload: string): string {
  if (typeof payload !== 'string' || !/^[a-f0-9]{32}:[a-f0-9]{32}:(?:[a-f0-9]{2})+$/i.test(payload)) throw new Error('Invalid encrypted token.');
  const current = encryptionKey();
  let previous: unknown = [];
  try { previous = JSON.parse(process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS || '[]'); } catch { throw new Error('Invalid previous encryption keys.'); }
  if (!Array.isArray(previous) || previous.length > 3 || previous.some(key => typeof key !== 'string')) throw new Error('Invalid previous encryption keys.');
  const keys = [current, ...previous.map(key => encryptionKey(key))];
  const [iv, tag, ciphertext] = payload.split(':').map(value => Buffer.from(value, 'hex'));
  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch { /* Only explicitly configured keys are eligible for rotation. */ }
  }
  throw new Error('Unable to decrypt GitHub token; reconnect or rotate its configured key.');
}
