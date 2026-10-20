import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { flags } from './evidence.mjs';

export function summarize(samples, thresholds) {
  const sorted = samples.map(s => s.ms).sort((a, b) => a - b);
  const percentile = p => sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null;
  const failed = samples.filter(s => !s.ok).length;
  const result = { requests: samples.length, successful: samples.length - failed, failures: failed,
    policy429: samples.filter(s => s.status === 429).length, timeouts: samples.filter(s => s.timeout).length,
    assertionFailures: samples.filter(s => s.assertionFailed).length,
    bytes: samples.reduce((sum, s) => sum + s.bytes, 0), p50Ms: percentile(.5), p95Ms: percentile(.95), p99Ms: percentile(.99),
    failureRate: samples.length ? failed / samples.length : 1 };
  result.result = samples.length && result.failureRate < thresholds.maxFailureRate && result.p95Ms <= thresholds.p95Ms && result.p99Ms <= thresholds.p99Ms && !result.assertionFailures ? 'PASS' : 'FAIL';
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = flags(process.argv.slice(2), ['--input', '--metrics']);
  const report = JSON.parse(fs.readFileSync(args['--input'], 'utf8'));
  let resources;
  if (args['--metrics']) {
    const metrics = fs.readFileSync(args['--metrics'], 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(m => m.at >= report.loadStartedAt && m.at <= report.finishedAt);
    if (!metrics.length) throw Error('No resource samples for this load interval.');
    const first = metrics[0], last = metrics.at(-1), pools = metrics.map(m => m.pool).filter(Boolean);
    resources = { samples: metrics.length, intervalSeconds: (Date.parse(last.at) - Date.parse(first.at)) / 1000, peakRssBytes: Math.max(...metrics.map(m => m.rssBytes)),
      processCpuMs: (last.cpuMicros.user + last.cpuMicros.system - first.cpuMicros.user - first.cpuMicros.system) / 1000,
      poolPeak: pools.length ? { connections: Math.max(...pools.map(p => p.total)), waiting: Math.max(...pools.map(p => p.waiting)) } : null,
      note: 'One-second owned app-process samples; excludes DB/OS CPU, unsampled spikes and external queues.' };
  }
  console.log(JSON.stringify({ result: report.result, environment: report.environment, workload: report.workload, achieved: report.achieved, summary: report.summary, resources, limitations: report.limitations }, null, 2));
  if (report.result !== 'PASS') process.exitCode = 1;
}
