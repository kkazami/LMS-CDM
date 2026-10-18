import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { fixture } from '../harness/helpers';
import { Controller } from '../../scripts/harness/controller';
import { DockerRuntime } from '../../scripts/harness/docker-runtime';
import { IsolatedSigner, SignerService } from '../../scripts/harness/isolated-signer';
import { implementationSubject, validApproval } from '../../scripts/harness/gates';
import { hash } from '../../scripts/harness/repository';
import { ApprovalPayload, OWNERS, Stage } from '../../scripts/harness/types';

// Explicit infrastructure command only: not part of the portable controller suite and never a feature approval.
test('actual protected signer and controller reject wrong run subject risk scope expiry replaced key and changed source', t => {
  assert.ok(process.env.HARNESS_DOCKER_CLI && process.env.HARNESS_SIGNER_SERVICE);
  const service = JSON.parse(fs.readFileSync(process.env.HARNESS_SIGNER_SERVICE!, 'utf8')) as SignerService;
  const signer = new IsolatedSigner(new DockerRuntime(process.env.HARNESS_DOCKER_CLI!)); assert.equal(signer.probeDeniedRead(service), true);
  const f = fixture(t, ['authorization']); f.prepare();
  const c = new Controller(f.root, 'run_external_signer_regression', service.publicKey); c.init(f.input);
  for (const stage of ['requirements', 'recon', 'red-team', 'adjudication', 'plan'] as Stage[]) {
    const actor = f.input.actors[OWNERS[stage]], lease = c.begin(stage, actor, f.capabilities[OWNERS[stage]]);
    c.submit(stage, actor, lease.token, f.c.read().artifacts[stage]!.envelope.data);
  }
  const run = c.read(); assert.throws(() => c.begin('implementation', f.input.actors.executor, f.capabilities.executor), /signed human/);
  const payload: ApprovalPayload = { version: 2, runId: run.runId, purpose: 'implementation', subject: implementationSubject(run), risk: 'HIGH', human: 'infrastructure-regression-only-not-feature-approval', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() };
  for (const change of [{ runId: 'run_wrong' }, { subject: hash('wrong architecture subject') }, { risk: 'LOW' as const }, { subject: hash('wrong file scope') }]) {
    const approval = signer.sign(service, { ...payload, ...change }); assert.throws(() => c.approve(approval));
  }
  const approval = signer.sign(service, payload); c.approve(approval);
  assert.equal(validApproval(approval, run, 'implementation', payload.subject, new Date(Date.parse(payload.expiresAt) + 1).toISOString(), service.publicKey), false);
  const replacement = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString();
  assert.throws(() => new Controller(f.root, c.runId, replacement).read(), /Pinned approval/);
  f.write('docs/note.md', 'changed after actual external signature'); const invalidated = c.status();
  assert.equal(invalidated.next, 'recon'); assert.equal(invalidated.approvals.length, 0); assert.throws(() => c.approve(approval));
});
