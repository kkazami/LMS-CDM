// Explicitly configured synthetic staging only. Does not load dotenv or a default target.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { flags, integer, requiredText, outputPath, pointer, sourceFingerprint } from './evidence.mjs';
import { summarize } from './load-report.mjs';

function credential(name, env) {
  if (typeof name !== 'string' || !/^LMS_LOAD_SESSION_[A-Z0-9_]+$/.test(name) || !env[name] || !/^[A-Za-z0-9_-]{32,512}$/.test(env[name])) throw Error('Missing/invalid synthetic session environment reference.');
  return env[name];
}
function render(value, bindings) {
  if (typeof value === 'string') return value.replace(/\{([A-Za-z0-9_]+)\}/g, (_, key) => {
    if (typeof bindings[key] !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(bindings[key])) throw Error('Missing/invalid account binding.');
    return bindings[key];
  });
  if (Array.isArray(value)) return value.map(v => render(v, bindings));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, render(v, bindings)]));
  return value;
}
function endpoint(origin, pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/api/') || pathname.includes('\\') || pathname.includes('#')) throw Error('Only same-origin API paths are allowed.');
  const url = new URL(pathname, origin);
  if (url.origin !== origin || !url.pathname.startsWith('/api/')) throw Error('Cross-origin path refused.');
  return url;
}
export function validate(config, options, env = process.env) {
  const e = config.environment;
  if (!e || e.kind !== 'staging' || e.syntheticOnly !== true) throw Error('Explicit synthetic staging environment required.');
  requiredText(e.id, 'environment ID'); requiredText(config.candidateId, 'candidate ID'); requiredText(config.datasetId, 'dataset ID');
  const url = new URL(e.origin);
  if (url.origin !== e.origin || url.username || url.password || /\.invalid$/.test(url.hostname)) throw Error('Invalid staging origin.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname))) throw Error('Verified HTTPS required outside loopback.');
  if (env.LMS_LOAD_REVIEWED_ORIGIN !== url.origin || env.LMS_LOAD_ENVIRONMENT_ID !== e.id || !Array.isArray(e.productionOrigins) || !e.productionOrigins.length || e.productionOrigins.includes(url.origin)) throw Error('Reviewed staging identity / production exclusion required.');
  const limits = config.limits;
  integer(limits.maxUsers, 1, 1000, 'maximum users'); integer(limits.maxDurationSeconds, 1, 7200, 'maximum duration');
  integer(limits.requestTimeoutMs, 100, 60000, 'request timeout'); integer(limits.maxRequests, 1, 1000000, 'request cap');
  integer(limits.maxResponseBytes, 1, 25 * 1024 * 1024, 'response cap');
  integer(limits.thinkTimeMs, 1, 300000, 'think time'); integer(limits.rampSeconds, 1, 3600, 'ramp');
  const users = integer(options.users, 1, limits.maxUsers, 'requested users');
  const duration = integer(options.duration, 1, limits.maxDurationSeconds, 'duration');
  const steps = config.scenarios?.[options.scenario];
  if (!Array.isArray(steps) || !steps.length) throw Error('Unknown/empty scenario.');
  if (new Set(steps.map(s => s.name)).size !== steps.length) throw Error('Distinct step names required.');
  const accounts = config.accounts?.slice(0, users);
  if (!accounts || accounts.length !== users || new Set(accounts.map(a => a.id)).size !== users || new Set(accounts.map(a => credential(a.sessionEnv, env))).size !== users) throw Error('Distinct synthetic accounts/sessions required for every requested user.');
  for (const account of accounts) {
    requiredText(account.id, 'account ID');
    const ownSteps = steps.filter(s => s.role === account.role);
    if (!ownSteps.length) throw Error('Account role has no workload.');
    for (const step of ownSteps) {
      requiredText(step.name, 'step name');
      if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(step.method) || step.method !== 'GET' && config.allowSyntheticMutations !== true) throw Error('Mutation requires explicit synthetic authorization.');
      endpoint(url.origin, render(step.path, { ...account.bindings, userId: account.id }));
      integer(step.status, 200, 299, 'success status');
      integer(step.budget?.p95Ms, 1, 300000, 'p95 budget'); integer(step.budget?.p99Ms, 1, 300000, 'p99 budget');
      if (!Array.isArray(step.assertions) || !step.assertions.length) throw Error('Every step needs a response assertion.');
      for (const assertion of step.assertions) pointer({}, assertion.pointer);
      for (const assertion of step.assertions) if (!Object.hasOwn(assertion, 'equals') && !['array', 'string', 'number', 'boolean', 'object'].includes(assertion.type)) throw Error('Invalid assertion.');
      if (step.upload) { integer(step.upload.bytes, 1, 25 * 1024 * 1024, 'synthetic upload size'); if (step.method !== 'POST' || step.path !== '/api/upload' || step.body !== undefined) throw Error('Upload requires the dedicated file endpoint.'); }
      if (step.headers && Object.keys(step.headers).some(k => !['Idempotency-Key', 'X-LMS-User-Active'].includes(k))) throw Error('Only reviewed workload headers permitted.');
    }
  }
  if (!Array.isArray(config.integrity) || !config.integrity.length) throw Error('Exact post-load data assertions required.');
  for (const check of config.integrity) {
    requiredText(check.name, 'integrity name');
    if (!accounts.some(a => a.id === check.accountId) || !check.assertions?.length) throw Error('Invalid integrity identity/assertions.');
    endpoint(url.origin, check.path);
    for (const assertion of [...check.assertions, ...(check.afterAssertions ?? [])]) { pointer({}, assertion.pointer); if (!Object.hasOwn(assertion, 'equals')) throw Error('Integrity assertions must declare exact expected values.'); }
  }
  if (!(config.maxFailureRate > 0 && config.maxFailureRate <= .01)) throw Error('Failure budget must be at most 1%.');
  if (limits.rampSeconds >= duration) throw Error('Duration must include a steady phase after ramp.');
  return { origin: url.origin, accounts, steps, users, duration, limits };
}
export async function runLoad(config, options, env = process.env) {
  const target = validate(config, options, env), file = outputPath(config.output);
  const report = { version: 1, startedAt: new Date().toISOString(), environment: { id: config.environment.id, kind: 'staging', origin: target.origin },
    candidateId: config.candidateId, datasetId: config.datasetId, productSourceSHA256: sourceFingerprint(),
    configSHA256: createHash('sha256').update(JSON.stringify(config)).digest('hex'),
    workload: { scenario: options.scenario, model: 'paced closed-loop HTTP users; one in-flight request per synthetic identity', requestedUsers: target.users, durationSeconds: target.duration, rampSeconds: target.limits.rampSeconds, thinkTimeMs: target.limits.thinkTimeMs },
    limitations: ['HTTP users are not browser sessions or a fixed arrival-rate benchmark.', 'Origin approval is an operator assertion; the tool cannot discover a provider production alias.', 'Provider CPU/RAM, DB pool wait and external queue metrics must be captured separately.', 'A local result does not establish deployment capacity.'], integrity: [], endpoints: {} };
  const samples = [], iterations = new Map(), reached = new Set(); let issued = 0, capHit = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function request(account, step) {
    const bindings = { ...account.bindings, userId: account.id }, start = performance.now(); let bytes = 0, status = 0, timeout = false, assertionFailed = false, json;
    const controller = new AbortController(), timer = setTimeout(() => { timeout = true; controller.abort(); }, target.limits.requestTimeoutMs);
    try {
      let body = step.body === undefined ? undefined : JSON.stringify(render(step.body, bindings));
      if (step.upload) { body = new FormData(); body.set('file', new Blob([Buffer.alloc(step.upload.bytes, 65)], { type: 'text/plain' }), 'synthetic-load.txt'); }
      const response = await fetch(endpoint(target.origin, render(step.path, bindings)), { method: step.method, body, redirect: 'error', signal: controller.signal,
        headers: { Cookie: 'lumina_session=' + credential(account.sessionEnv, env), Origin: target.origin, ...(body && !step.upload ? { 'Content-Type': 'application/json' } : {}), ...render(step.headers ?? {}, bindings) } });
      status = response.status; const chunks = [];
      for await (const chunk of response.body ?? []) { bytes += chunk.length; if (bytes > target.limits.maxResponseBytes) { controller.abort(); throw Error('Response budget exceeded.'); } chunks.push(chunk); }
      if (step.assertions?.length) {
        try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { assertionFailed = true; }
        for (const a of step.assertions) {
          const value = pointer(json, a.pointer);
          if (Object.hasOwn(a, 'equals') ? !isDeepStrictEqual(value, render(a.equals, bindings)) : a.type === 'array' ? !Array.isArray(value) : typeof value !== a.type) assertionFailed = true;
        }
      }
      return { ms: performance.now() - start, bytes, status, timeout, assertionFailed, ok: status === step.status && !assertionFailed };
    } catch { return { ms: performance.now() - start, bytes, status, timeout, assertionFailed, ok: false }; }
    finally { clearTimeout(timer); }
  }
  async function integrity(phase) {
    for (const c of config.integrity) {
      const result = await request(target.accounts.find(a => a.id === c.accountId), { ...c, assertions: phase === 'after' ? c.afterAssertions ?? c.assertions : c.assertions, method: 'GET', status: 200 });
      report.integrity.push({ name: c.name, phase, result: result.ok ? 'PASS' : 'FAIL' });
      if (!result.ok) throw Error('Data assertion failed: ' + c.name);
    }
  }
  try {
    // Bound preflight rate too; each cookie must resolve to its declared synthetic user.
    for (const account of target.accounts) {
      const result = await request(account, { method: 'GET', path: '/api/auth/me', status: 200, assertions: [{ pointer: '/user/id', equals: account.id }] });
      if (!result.ok) throw Error('Synthetic identity preflight failed.');
      await sleep(Math.ceil(target.limits.rampSeconds * 1000 / target.users));
    }
    await integrity('before');
    report.loadStartedAt = new Date().toISOString();
    const start = performance.now(), deadline = start + target.duration * 1000;
    await Promise.all(target.accounts.map(async (account, i) => {
      await sleep(i * target.limits.rampSeconds * 1000 / target.users);
      const steps = target.steps.filter(s => s.role === account.role); let count = 0;
      while (performance.now() < deadline) {
        if (issued >= target.limits.maxRequests) { capHit = true; break; }
        issued++;
        const step = steps[count++ % steps.length], sample = { ...await request(account, step), step: step.name };
        samples.push(sample); if (sample.ok && performance.now() >= start + target.limits.rampSeconds * 1000) reached.add(account.id);
        iterations.set(account.id, count);
        await sleep(Math.min(target.limits.thinkTimeMs, Math.max(0, deadline - performance.now())));
      }
    }));
    const elapsed = (performance.now() - start) / 1000;
    report.achieved = { usersWithSuccessfulSteadyRequest: reached.size, usersWithRequests: iterations.size, elapsedSeconds: elapsed, requestsPerSecond: samples.length / elapsed, requestCapHit: capHit };
    await integrity('after');
    report.summary = summarize(samples, { p95Ms: 2000, p99Ms: 5000, maxFailureRate: config.maxFailureRate });
    for (const step of target.steps.filter(s => target.accounts.some(a => a.role === s.role))) report.endpoints[step.name] = summarize(samples.filter(s => s.step === step.name), { ...step.budget, maxFailureRate: config.maxFailureRate });
    // Heavy scenarios declare their endpoint budgets; mixed ordinary traffic also meets the common budget.
    report.result = reached.size === target.users && !capHit && Object.values(report.endpoints).every(e => e.result === 'PASS') && (options.scenario !== 'mixed' || report.summary.result === 'PASS') ? 'PASS' : 'FAIL';
  } catch (error) { report.result = 'FAIL'; report.error = /^(Synthetic identity preflight failed|Data assertion failed: [a-zA-Z0-9_.:-]+)\.?$/.test(error.message) ? error.message : 'Load execution failed; inspect target metrics without logging credentials.'; }
  report.finishedAt = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const a = flags(process.argv.slice(2), ['--config', '--scenario', '--users', '--duration-seconds']);
    const report = await runLoad(JSON.parse(fs.readFileSync(a['--config'], 'utf8')), { scenario: a['--scenario'], users: Number(a['--users']), duration: Number(a['--duration-seconds']) });
    console.log(JSON.stringify({ result: report.result, achieved: report.achieved, summary: report.summary }));
    if (report.result !== 'PASS') process.exitCode = 1;
  } catch { console.error('Load refused: check explicit staging configuration, environment references and bounded workload.'); process.exitCode = 1; }
}
