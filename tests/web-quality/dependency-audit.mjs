import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { flags, outputPath } from './evidence.mjs';

export function assess(audit) {
  if (audit.error || !audit.metadata?.vulnerabilities || !audit.advisories || typeof audit.advisories !== 'object' || Array.isArray(audit.advisories)) throw Error('Advisory lookup failed; not a clean scan.');
  const findings = Object.values(audit.advisories).flatMap(a => {
    const paths = (a.findings ?? []).flatMap(f => f.paths ?? []).filter(p => p.startsWith('apps__web>') || p.startsWith('.>'));
    return paths.length ? [{ id: a.github_advisory_id, module: a.module_name, severity: a.severity, title: a.title, patched: a.patched_versions, url: a.url, paths }] : [];
  });
  return { scannedAt: new Date().toISOString(), scope: 'web production dependency paths plus root production/Prisma toolchain; mobile-only paths reported separately',
    workspaceCounts: audit.metadata.vulnerabilities, findings, result: findings.some(f => ['critical', 'high'].includes(f.severity)) ? 'FAIL' : 'PASS',
    note: 'Package advisories are exposure candidates, not proof of an exploitable application path. Moderate/low findings still require review.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = flags(process.argv.slice(2), ['--input', '--output']);
    const result = assess(JSON.parse(fs.readFileSync(args['--input'], 'utf8').replace(/^\uFEFF/, '')));
    fs.writeFileSync(outputPath(args['--output']), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ result: result.result, findings: result.findings.length, criticalHigh: result.findings.filter(f => ['critical', 'high'].includes(f.severity)).length }));
    if (result.result !== 'PASS') process.exitCode = 1;
  } catch { console.error('Dependency audit unavailable or malformed; security gate failed.'); process.exitCode = 1; }
}
