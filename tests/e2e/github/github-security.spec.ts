import { test, expect } from '@playwright/test';
import { encryptGithubToken, decryptGithubToken } from '../../../apps/web/src/lib/github/token-vault';

test.describe('GitHub Token Security Vault (AES-256-GCM)', () => {
  test('encrypts and restores GitHub access tokens accurately', () => {
    const rawToken = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';
    const encrypted = encryptGithubToken(rawToken);

    // Format check: ivHex:authTagHex:ciphertextHex
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);
    expect(parts[0].length).toBe(32); // 16 bytes = 32 hex chars
    expect(parts[1].length).toBe(32); // 16 bytes auth tag = 32 hex chars
    expect(parts[2].length).toBeGreaterThan(0);

    const decrypted = decryptGithubToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  test('generates different ciphertexts for the same plaintext due to random IV', () => {
    const token = 'ghp_secretTokenExample1234567890';
    const enc1 = encryptGithubToken(token);
    const enc2 = encryptGithubToken(token);

    expect(enc1).not.toBe(enc2);
    expect(decryptGithubToken(enc1)).toBe(token);
    expect(decryptGithubToken(enc2)).toBe(token);
  });

  test('throws an error on corrupted ciphertext or tampered auth tag', () => {
    const rawToken = 'gho_test_token_tamper';
    const encrypted = encryptGithubToken(rawToken);
    const parts = encrypted.split(':');

    // Tamper with the ciphertext
    const tamperedCipher = parts[2].slice(0, -2) + (parts[2].endsWith('a') ? 'b' : 'a');
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

    expect(() => decryptGithubToken(tamperedPayload)).toThrow();
  });

  test('rejects empty or non-string tokens', () => {
    expect(() => encryptGithubToken('')).toThrow();
    // @ts-expect-error test invalid argument
    expect(() => encryptGithubToken(null)).toThrow();
  });
});
