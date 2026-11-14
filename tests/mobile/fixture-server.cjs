// Local native test transport for the same corpus used by preview-smoke.cjs.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createMobileFixture } = require('./fixtures/ics-fixture.cjs');
let fixture = createMobileFixture();
const images = new Map(), imageRequests = [];
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const pathname = new URL(req.url, 'http://synthetic.invalid').pathname;
  if (/^\/api\/assets\/fixture-cover-[a-f0-9-]+$/.test(pathname)) {
    const authorized = /^Bearer\s+\S+$/.test(req.headers.authorization || '');
    imageRequests.push({ path: pathname, authorized });
    if (!authorized) { res.statusCode = 401; res.end('{}'); return; }
    const image = images.get(pathname);
    if (!image) { res.statusCode = 404; res.end('{}'); return; }
    res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Content-Type', image.mime); res.end(image.bytes); return;
  }
  if (pathname === '/__fixture/image-requests') { res.end(JSON.stringify(imageRequests)); return; }
  // Test-only web transport for the SAME real components as the browser specs.
  // Loopback fixture credentials are synthetic; no production auth is involved.
  const webRoot = path.resolve(__dirname, '../../tmp/native-embedded-fixtures');
  if (pathname === '/api/auth/mobile-session') {
    const target = new URL(req.url, 'http://synthetic.invalid').searchParams.get('returnTo');
    if (!target || !/^\/ics\/(?:activities\/(?:codelab|ohmward)(?:\/[a-zA-Z0-9_-]+){0,2}|knowledge-exchange(?:\/[a-zA-Z0-9_-]+){0,2})(?:\?[^\\\s]*)?$/.test(target)) { res.statusCode = 400; res.end('{}'); return; }
    res.writeHead(302, { Location: target }); res.end(); return;
  }
  const file = /^\/__fixture\/web\/(codelab|embedded)\.(js|css)$/.exec(pathname);
  if (file) {
    const source = path.join(webRoot, `${file[1]}.${file[2]}`);
    if (!fs.existsSync(source)) { res.statusCode = 503; res.end('Build the browser fixtures first.'); return; }
    res.setHeader('Content-Type', file[2] === 'js' ? 'application/javascript' : 'text/css'); res.end(fs.readFileSync(source)); return;
  }
  if (pathname.startsWith('/ics/')) {
    const codelab = pathname.includes('/codelab');
    const mode = pathname.includes('/knowledge-exchange') ? pathname.includes('/post/') ? 'detail' : 'feed' : 'ohmward';
    const bundle = codelab ? 'codelab' : 'embedded';
    const postFile = path.join(webRoot, 'post.json');
    if (!fs.existsSync(postFile)) { res.statusCode = 503; res.end('Build the browser fixtures first.'); return; }
    const post = fs.readFileSync(postFile, 'utf8').replace(/</g, '\\u003c');
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/__fixture/web/${bundle}.css"><style>html,body{margin:0;font-family:Arial,sans-serif;--font-cdm-body:Arial}</style></head><body data-institute="ics"><div id="root" style="${codelab ? '' : 'padding:16px'}"></div><script>window.fixturePost=${post};history.replaceState(null,'',location.pathname+'?mode=${codelab ? 'workspace&language=html' : mode}');</script><script src="/__fixture/web/${bundle}.js"></script></body></html>`); return;
  }
  if (pathname === '/api/codelab/progress') { res.end(JSON.stringify({ completed: false })); return; }
  if (pathname === '/api/knowledge-exchange/posts') { res.end(JSON.stringify({ posts: [JSON.parse(fs.readFileSync(path.join(webRoot, 'post.json'), 'utf8'))], pagination: { totalPages: 1 } })); return; }
  if (pathname === '/api/github/repos/link') { res.end('[]'); return; }
  if (pathname === '/api/ohmward/primer/complete') { res.end('{"success":true}'); return; }
  if (/^\/course-banners\/(programming|database|networking|webdev|cybersecurity)\.svg$/.test(pathname)) {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.end(fs.readFileSync(path.resolve(__dirname, '../../apps/web/public', '.' + pathname))); return;
  }
  if (req.url === '/__fixture/reset' && req.method === 'POST') { fixture = createMobileFixture(); images.clear(); imageRequests.length = 0; res.end('{}'); return; }
  if (req.url === '/__fixture/requests') { res.end(JSON.stringify(fixture.requests)); return; }
  if (req.url === '/__fixture/answer.txt') { res.setHeader('Content-Type', 'text/plain'); res.end('Synthetic student answer.'); return; }
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 2 * 1024 * 1024) throw Error('Fixture payload too large'); chunks.push(Buffer.from(chunk)); }
    const bytes = Buffer.concat(chunks), text = bytes.toString('utf8');
    const multipart = req.headers['content-type']?.startsWith('multipart/form-data');
    if (multipart && pathname === '/api/upload') {
      const headerEnd = bytes.indexOf('\r\n\r\n');
      const mime = /Content-Type:\s*(image\/(?:png|jpeg))/i.exec(bytes.subarray(0, headerEnd).toString('utf8'))?.[1].toLowerCase();
      if (mime) {
        const boundary = /boundary="?([^";]+)/i.exec(req.headers['content-type'])?.[1];
        const end = boundary ? bytes.lastIndexOf(Buffer.from(`\r\n--${boundary}`)) : -1;
        if (headerEnd < 0 || end < headerEnd + 4) throw Error('Invalid synthetic image multipart');
        const image = bytes.subarray(headerEnd + 4, end);
        const valid = mime === 'image/png' ? image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : image[0] === 255 && image[1] === 216 && image[2] === 255;
        if (!valid) throw Error('Synthetic image MIME does not match bytes');
        const url = `/api/assets/fixture-cover-${randomUUID()}`; images.set(url, { bytes: image, mime });
        fixture.requests.push('POST /api/upload (native photo)');
        res.end(JSON.stringify({ url, fileName: mime === 'image/png' ? 'class-cover.png' : 'class-cover.jpg', fileSize: image.length })); return;
      }
    }
    const result = fixture.handle(req.method, req.url, multipart ? {} : text ? JSON.parse(text) : {}, req.headers);
    res.statusCode = result.status; res.end(result.body);
  } catch { res.statusCode = 400; res.end(JSON.stringify({ message: 'Invalid synthetic request' })); }
});
server.listen(4010, '127.0.0.1', () => console.log('Synthetic mobile fixture API: http://127.0.0.1:4010 (no real accounts)'));
