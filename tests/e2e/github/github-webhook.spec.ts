import { test, expect } from '@playwright/test';
import crypto from 'crypto';

test.describe('GitHub Webhook Signature Verification Logic', () => {
  const secret = 'super_secret_webhook_passphrase_123';

  function generateSignature(payload: string, key: string) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  function verifySignature(payload: string, signature: string, key: string): boolean {
    const expected = generateSignature(payload, key);
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  test('validates genuine GitHub HMAC SHA-256 signature', () => {
    const payload = JSON.stringify({
      action: 'completed',
      repository: { full_name: 'lumina-lms/repo-test' },
    });

    const signature = generateSignature(payload, secret);
    const isValid = verifySignature(payload, signature, secret);

    expect(isValid).toBe(true);
  });

  test('rejects tampered webhook payloads or invalid secret', () => {
    const payload = JSON.stringify({ action: 'push', commits: [] });
    const signature = generateSignature(payload, secret);

    const tamperedPayload = JSON.stringify({ action: 'push', commits: [{ message: 'malicious' }] });
    const isValidTampered = verifySignature(tamperedPayload, signature, secret);
    expect(isValidTampered).toBe(false);

    const isValidWrongSecret = verifySignature(payload, signature, 'wrong_secret');
    expect(isValidWrongSecret).toBe(false);
  });
});
