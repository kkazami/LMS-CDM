import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { canonicalRole } from './super-user-v1/capabilities';

export function passwordWritePilotEnabled(role: string) {
  const admittedRole = canonicalRole(role);
  return process.env.NODE_ENV !== 'production' && process.env.LMS_SYNTHETIC_PASSWORD_PILOT === '1' &&
    (admittedRole === 'STUDENT' || admittedRole === 'INSTRUCTOR');
}

let loadedBlocklist: Promise<ReadonlySet<string>> | undefined;

export function passwordPilotBlocklist() {
  loadedBlocklist ??= loadBlocklist().catch(error => {
    loadedBlocklist = undefined;
    throw error;
  });
  return loadedBlocklist;
}

async function loadBlocklist(): Promise<ReadonlySet<string>> {
  const path = process.env.LMS_PASSWORD_PILOT_BLOCKLIST_FILE;
  const expected = process.env.LMS_PASSWORD_PILOT_BLOCKLIST_SHA256;
  if (!path || !expected || !/^[a-f0-9]{64}$/.test(expected)) throw new Error('Password policy data unavailable.');
  const file = await open(path, 'r');
  try {
    const { size } = await file.stat();
    if (size < 65 * 3000 || size > 8 * 1024 * 1024) throw new Error('Unexpected password blocklist size.');
    const contents = Buffer.alloc(size);
    const { bytesRead } = await file.read(contents);
    if (bytesRead !== size || createHash('sha256').update(contents).digest('hex') !== expected) {
      throw new Error('Password policy checksum mismatch.');
    }
    const entries = contents.toString('utf8').trimEnd().split(/\r?\n/);
    const digests = new Set(entries);
    if (digests.size < 3000 || entries.some(entry => !/^[a-f0-9]{64}$/.test(entry))) {
      throw new Error('Invalid password policy data.');
    }
    return digests;
  } finally {
    await file.close();
  }
}
