import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_DEV_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function getEncryptionKey(): Buffer {
  const hexKey = process.env.TOKEN_ENCRYPTION_KEY || DEFAULT_DEV_KEY;
  if (hexKey.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character (32-byte) hexadecimal string.');
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypts a plaintext GitHub personal access or OAuth token using AES-256-GCM.
 * Output format: `ivHex:authTagHex:ciphertextHex`
 */
export function encryptGithubToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new Error('A non-empty string token must be provided for encryption.');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a stored AES-256-GCM encrypted token.
 * Input format: `ivHex:authTagHex:ciphertextHex`
 */
export function decryptGithubToken(storedPayload: string): string {
  if (!storedPayload || typeof storedPayload !== 'string') {
    throw new Error('Invalid encrypted token payload.');
  }

  const parts = storedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Corrupted or malformed encrypted token format. Expected iv:tag:ciphertext.');
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
