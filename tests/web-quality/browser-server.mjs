import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { createRequire } from 'node:module';
const requireWeb = createRequire(path.resolve('apps/web/package.json'));
const app = requireWeb('next')({ dev: false, hostname: '127.0.0.1', port: Number(process.env.WEB_QUALITY_PORT), dir: process.env.WEB_QUALITY_APP });
await app.prepare();
const handler = app.getRequestHandler();
const server = https.createServer({ key: fs.readFileSync(path.join(process.env.WEB_QUALITY_OUTPUT, 'localhost-key.pem')), cert: fs.readFileSync(path.join(process.env.WEB_QUALITY_OUTPUT, 'localhost-cert.pem')) }, (req, res) => { req.headers['x-forwarded-proto'] = 'https'; return handler(req, res); });
// Metrics belong to this owned test process only; no product endpoint or secrets are exposed.
const metrics = setInterval(() => {
  const pool = globalThis.pgPool;
  fs.appendFileSync(path.join(process.env.WEB_QUALITY_OUTPUT, 'server-metrics.jsonl'), JSON.stringify({ at: new Date().toISOString(), pid: process.pid, rssBytes: process.memoryUsage().rss, cpuMicros: process.cpuUsage(), pool: pool ? { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount } : null }) + '\n');
}, 1000); metrics.unref();
server.listen(Number(process.env.WEB_QUALITY_PORT), '127.0.0.1', () => console.log('OWNED_WEB_QUALITY_READY'));
async function close() { server.close(); await app.close(); process.exit(0); }
process.on('SIGTERM', close); process.on('SIGINT', close);
