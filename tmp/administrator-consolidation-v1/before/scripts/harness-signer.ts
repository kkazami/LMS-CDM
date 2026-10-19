import * as fs from 'node:fs';
import { DockerRuntime } from './harness/docker-runtime';
import { IsolatedSigner, SignerService } from './harness/isolated-signer';
import { ensure } from './harness/contracts';
import { ApprovalPayload } from './harness/types';

try {
  const args = process.argv.slice(2), arg = (name: string) => { const i = args.indexOf('--' + name); return i < 0 ? undefined : args[i + 1]; };
  ensure(process.env.HARNESS_DOCKER_CLI && arg('service'), 'Supply host HARNESS_DOCKER_CLI and --service');
  const signer = new IsolatedSigner(new DockerRuntime(process.env.HARNESS_DOCKER_CLI));
  if (args[0] === 'provision') {
    const service = signer.provision(); fs.writeFileSync(arg('service')!, JSON.stringify(service, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ volume: service.volume, uid: service.uid, image: service.image, protectedWorkerReadDenied: signer.probeDeniedRead(service) }));
  } else if (args[0] === 'sign') {
    ensure(arg('request') && arg('output') && arg('human') && args.includes('--human-confirmed'), 'Signing requires exact reviewed --request, --human, --output and explicit --human-confirmed');
    const service = JSON.parse(fs.readFileSync(arg('service')!, 'utf8')) as SignerService;
    const request = JSON.parse(fs.readFileSync(arg('request')!, 'utf8'));
    const payload: ApprovalPayload = { version: 2, runId: request.runId, purpose: request.purpose, subject: request.subject, risk: request.risk, human: arg('human')!, issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 900000).toISOString() };
    fs.writeFileSync(arg('output')!, JSON.stringify(signer.sign(service, payload), null, 2), { flag: 'wx' }); console.log('Signed exact human-confirmed request; expiry 15 minutes.');
  } else throw new Error('Use provision or sign');
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
