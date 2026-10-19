import * as fs from 'node:fs';
import * as path from 'node:path';
import { verify } from 'node:crypto';
import { ensure } from './contracts';
import { canonical, digest, hash, RISK_ORDER } from './repository';
import { Run } from './types';

export const ISOLATION_PROBES = ['protected-file-read', 'outside-workspace-write', 'other-run-read', 'credential-read', 'signing-key-read', 'host-process-access'];
export interface ExternalReceiptPayload {
  version: 1; kind: 'controlled-environment'; runId: string; baseline: string; input: string;
  issuedAt: string; expiresAt: string; approvalKeyHash: string;
  checks: Record<string, { status: 'PASS' | 'FAIL'; evidenceHash: string }>;
  isolation: { backend: 'microvm' | 'os-container'; provider: 'codex'; probes: Record<string, 'DENIED'> };
  reviewedTests: { files: Record<string, string>; coverage: string[] };
}
export interface ExternalReceipt { payload: ExternalReceiptPayload; signature: string }
export function controlledRequired(run: Run): boolean {
  return run.input.agentProvider === 'codex' && run.input.profile !== 'harness' && RISK_ORDER.indexOf(run.risk) >= 2;
}
export function validateExternalReceipt(run: Run, receipt: ExternalReceipt, publicKey: string, now = new Date().toISOString()): void {
  const p = receipt.payload;
  ensure(run.preflightKeyHash && hash(publicKey) === run.preflightKeyHash, 'External preflight trust key missing or replaced');
  ensure(p?.version === 1 && p.kind === 'controlled-environment' && p.runId === run.runId && p.baseline === run.baseline.digest && p.input === digest(run.input), 'Foreign external preflight binding');
  ensure(verify(null, Buffer.from(canonical(p)), publicKey, Buffer.from(receipt.signature, 'base64')), 'External preflight signature invalid');
  const issued = Date.parse(p.issuedAt), expiry = Date.parse(p.expiresAt), at = Date.parse(now);
  ensure(Number.isFinite(issued) && Number.isFinite(expiry) && issued <= at && expiry > at && expiry - issued <= 900000, 'External preflight expired or invalid lifetime');
  ensure(p.approvalKeyHash === run.approvalKeyHash && Boolean(run.approvalKeyHash), 'Protected signer public key does not match pinned approval key');
  const required = ['provider-session', 'host-isolation', 'protected-signer', 'reviewed-lms-tests', 'human-approver'];
  const plan = run.artifacts.plan?.envelope.data as { files?: string[]; operations?: string[] } | undefined;
  if (run.input.profile === 'database' || plan?.files?.some(file => file.startsWith('prisma/')) || [...run.input.operations, ...(plan?.operations ?? [])].some(op => /database|migration/i.test(op))) required.push('postgresql-rehearsal');
  if (run.input.deployment) required.push('deployment-adapter');
  required.forEach(name => ensure(p.checks?.[name]?.status === 'PASS' && /^[a-f0-9]{64}$/.test(p.checks[name].evidenceHash), 'Missing verified external prerequisite: ' + name));
  ensure(['microvm', 'os-container'].includes(p.isolation?.backend) && p.isolation.provider === 'codex', 'Actual isolated Codex backend required');
  ISOLATION_PROBES.forEach(name => ensure(p.isolation.probes?.[name] === 'DENIED', 'Host isolation adversarial probe missing: ' + name));
  ensure(p.reviewedTests && Object.keys(p.reviewedTests.files).length > 0 && Object.entries(p.reviewedTests.files).every(([file, identity]) => /^tests\//.test(file) && /^[a-f0-9]{64}$/.test(identity)), 'Reviewed LMS test source hashes missing');
  const boundaries = ['authentication', 'authorization', 'ownership', 'institute-scope', 'program-scope', 'idor', 'privilege-escalation', 'direct-api', 'request-manipulation', 'sensitive-data'];
  boundaries.forEach(name => ensure(p.reviewedTests.coverage.includes(name), 'Reviewed LMS boundary coverage missing: ' + name));
  for (const [file, identity] of Object.entries(p.reviewedTests.files)) ensure((run.expectedSnapshot ?? run.baseline).files[file] === identity, 'Reviewed LMS test source changed or missing: ' + file);
  if (plan) {
    const specs = (run.artifacts.plan!.envelope.data as { commands: { domain: string; coverage: string[] }[] }).commands;
    boundaries.forEach(name => ensure(specs.some(command => command.domain === 'security' && command.coverage.includes(name)), 'Plan omits reviewed LMS test boundary: ' + name));
    // Existing controller source/claim/review checks remain authoritative for implementation changes.
  }
}
export function requireExternalPreflight(run: Run, root: string, publicKey?: string, receiptFile = process.env.HARNESS_PREFLIGHT_RECEIPT): void {
  if (!controlledRequired(run)) return;
  ensure(publicKey && receiptFile, 'HIGH/CRITICAL managed LMS work requires signed external preflight; host-native provider fallback is blocked');
  const target = fs.realpathSync(receiptFile), base = fs.realpathSync(root);
  ensure(target !== base && !target.startsWith(base + path.sep), 'External preflight receipt must be host-protected outside the task repository');
  validateExternalReceipt(run, JSON.parse(fs.readFileSync(target, 'utf8')), publicKey);
}
