import { createPrivateKey, generateKeyPairSync, KeyObject, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensure } from './contracts';
import { canonicalApproval } from './gates';
import { ApprovalPayload, Approval } from './types';

export function disposableSigner(): { publicKey: string; sign: (payload: ApprovalPayload) => Approval } {
  const pair = generateKeyPairSync('ed25519');
  return { publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(), sign: payload => signed(payload, pair.privateKey) };
}
export function provisionDisposable(directory: string, passphrase: string, repositories: string[]): { publicKeyFile: string; privateKeyFile: string } {
  ensure(passphrase.length >= 16, 'Disposable key passphrase must be at least 16 characters');
  const target = path.resolve(directory);
  ensure(repositories.every(root => { const real = fs.realpathSync(root); return target !== real && !target.startsWith(real + path.sep); }), 'Keys must be provisioned outside repositories');
  fs.mkdirSync(target, { recursive: true, mode: 0o700 });
  const real = fs.realpathSync(target); ensure(real === target, 'Key directory must not redirect through a symlink');
  const pair = generateKeyPairSync('ed25519'), privateKeyFile = path.join(target, 'disposable-approval.private.pem'), publicKeyFile = path.join(target, 'disposable-approval.public.pem');
  const pem = pair.privateKey.export({ type: 'pkcs8', format: 'pem', cipher: 'aes-256-cbc', passphrase });
  fs.writeFileSync(privateKeyFile, pem, { flag: 'wx', mode: 0o600 });
  if (process.platform === 'win32') {
    const current = execFileSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true });
    const sid = current.match(/S-1-[0-9-]+/)?.[0]; ensure(sid, 'Cannot determine signer principal SID');
    execFileSync('icacls.exe', [privateKeyFile, '/inheritance:r', '/grant:r', `*${sid}:(F)`, '*S-1-5-18:(F)'], { stdio: 'pipe', windowsHide: true });
  }
  fs.writeFileSync(publicKeyFile, pair.publicKey.export({ type: 'spki', format: 'pem' }), { flag: 'wx', mode: 0o644 });
  return { publicKeyFile, privateKeyFile };
}
function signed(payload: ApprovalPayload, privateKey: KeyObject): Approval {
  ensure(privateKey.asymmetricKeyType === 'ed25519', 'Approval signer must use Ed25519');
  return { payload, signature: sign(null, Buffer.from(canonicalApproval(payload)), privateKey).toString('base64') };
}

// Only an external human/host signer invokes this. No agent/runner adapter imports private material.
export function signFromProtectedFile(file: string, passphrase: string, payload: ApprovalPayload, repositories: string[]): Approval {
  const target = fs.realpathSync(file);
  ensure(repositories.every(root => { const real = fs.realpathSync(root); return target !== real && !target.startsWith(real + path.sep); }), 'Signing material must be outside all repositories');
  const stat = fs.statSync(target); ensure(stat.isFile(), 'Signing key must be a regular file');
  if (process.platform !== 'win32') ensure((stat.mode & 0o077) === 0, 'Signing key permissions allow other users');
  else {
    // Refuse keys whose ACL gives broad user groups access; host still needs a separate signer principal.
    const acl = execFileSync('icacls.exe', [target], { encoding: 'utf8', windowsHide: true });
    ensure(!/Everyone:|BUILTIN\\Users:|Authenticated Users:|\(I\)/i.test(acl), 'Signing key needs an explicit restricted Windows ACL');
  }
  ensure(passphrase.length >= 16, 'Encrypted private key passphrase must be at least 16 characters');
  const pem = fs.readFileSync(target, 'utf8'); ensure(pem.includes('BEGIN ENCRYPTED PRIVATE KEY'), 'Private signing key must be encrypted');
  return signed(payload, createPrivateKey({ key: pem, format: 'pem', passphrase }));
}
