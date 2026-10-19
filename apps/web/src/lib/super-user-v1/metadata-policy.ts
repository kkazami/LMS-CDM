import { createHash } from 'node:crypto';
import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { AccessError } from './actor';

const policySchema = z.object({
  version: z.literal(1), instituteId: z.string().min(1), datasetSHA256: z.union([z.string().regex(/^[a-f0-9]{64}$/), z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(200)]),
  approverBinding: z.string().min(1), maintainerBinding: z.string().min(1),
  approvalReference: z.string().min(1), expiresAt: z.string().datetime(), revoked: z.literal(false),
}).strict();
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export function metadataDigest(dataset: unknown): string {
  function stable(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
    return value;
  }
  return sha(JSON.stringify(stable(dataset)));
}

/** Trusted deployment configuration pins an owner-approved non-assessment metadata dataset.
 * A request/header/ORM field cannot supply this policy. Missing operational assignments deny disclosure.
 * Revocation is checked on every read, with no cross-request cache.
 */
export async function requireApprovedMetadata(instituteId: string, dataset: unknown) {
  const file = process.env.SUPER_USER_METADATA_POLICY_PATH;
  const expectedHash = process.env.SUPER_USER_METADATA_POLICY_SHA256;
  if (!file || !expectedHash || !/^[a-f0-9]{64}$/.test(expectedHash) || !path.isAbsolute(file)) {
    throw new AccessError(503, 'Academic metadata approval unavailable.');
  }
  const root = path.resolve(/* turbopackIgnore: true */ process.cwd());
  if (path.resolve(file).toLowerCase().startsWith(root.toLowerCase() + path.sep)) throw new AccessError(503, 'Academic metadata approval unavailable.');
  try {
    for (let current = path.resolve(file); current !== path.dirname(current); current = path.dirname(current)) {
      if ((await lstat(/* turbopackIgnore: true */ current)).isSymbolicLink()) throw new Error('REPARSE');
    }
    const bytes = await readFile(/* turbopackIgnore: true */ file);
    if (bytes.length > 16384 || sha(bytes) !== expectedHash) throw new Error('PIN');
    const registry = z.union([policySchema, z.array(policySchema).min(1).max(3)]).parse(JSON.parse(bytes.toString('utf8')));
    const policies = Array.isArray(registry) ? registry : [registry];
    if (new Set(policies.map(item => item.instituteId)).size !== policies.length) throw new Error('DUPLICATE_SCOPE');
    const policy = policies.find(item => item.instituteId === instituteId);
    if (!policy) throw new Error('SCOPE');
    const datasets = Array.isArray(policy.datasetSHA256) ? policy.datasetSHA256 : [policy.datasetSHA256];
    if (policy.expiresAt <= new Date().toISOString() || !datasets.includes(metadataDigest(dataset))) throw new Error('BINDING');
  } catch { throw new AccessError(503, 'Academic metadata approval unavailable.'); }
}
