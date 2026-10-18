// Harmless isolated HTML fixture only: no application, database, credential or deployment access.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve('docs/fixtures');
const port = Number(new URL(process.env.E2E_BASE_URL).port);
if (!Number.isInteger(port) || port < 1024) throw new Error('Explicit disposable fixture port required');
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  if (pathname === '/health') { response.end('fixture'); return; }
  if (pathname !== '/smoke.html') { response.writeHead(404); response.end('not found'); return; }
  const file = path.join(base, 'smoke.html');
  if (!fs.existsSync(file)) { response.writeHead(404); response.end('fixture missing'); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(fs.readFileSync(file));
});
server.listen(port, '127.0.0.1');
process.on('SIGTERM', () => server.close(() => process.exit(0)));
