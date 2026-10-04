import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensure } from './harness/contracts';
import { provisionDisposable, signFromProtectedFile } from './harness/signing';
import { ApprovalPayload } from './harness/types';

try {
  const args = process.argv.slice(2), arg = (name: string) => { const i = args.indexOf('--' + name); return i < 0 ? undefined : args[i + 1]; };
  const root = path.resolve(__dirname, '..'), passphrase = process.env.HARNESS_SIGNING_PASSPHRASE;
  ensure(passphrase, 'Signer requires host-only HARNESS_SIGNING_PASSPHRASE; never pass it as argv');
  if (args[0] === 'generate-disposable') {
    ensure(arg('directory'), 'Explicit external --directory required');
    console.log(JSON.stringify(provisionDisposable(arg('directory')!, passphrase, [root])));
  } else if (args[0] === 'sign') {
    ensure(arg('key') && arg('request') && arg('output') && arg('human'), 'Explicit --key --request --output --human required');
    const request = JSON.parse(fs.readFileSync(arg('request')!, 'utf8'));
    const payload: ApprovalPayload = { version: 2, runId: request.runId, purpose: request.purpose, subject: request.subject, risk: request.risk, human: arg('human')!, issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 15 * 60000).toISOString() };
    const approval = signFromProtectedFile(arg('key')!, passphrase, payload, [root, path.resolve(arg('task-root') || root)]);
    fs.writeFileSync(arg('output')!, JSON.stringify(approval, null, 2), { flag: 'wx' }); console.log('Signed the exact reviewed request; expires in 15 minutes.');
  } else throw new Error('Use generate-disposable or sign. This tool never loads production environment files.');
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
