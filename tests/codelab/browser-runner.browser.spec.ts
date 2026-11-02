import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
let server: Server, origin: string, client: string, apiCalls = 0;

test.beforeAll(async () => {
  const bundled = await build({ entryPoints: ['apps/web/src/app/codelab-sandbox/route.ts'], bundle: true,
    write: false, platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json' });
  const module = { exports: {} as any };
  new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(require, module, module.exports);
  const proxied = module.exports.GET(new Request('http://localhost:3000/codelab-sandbox', {
    headers: { host:'lms.example.test', 'x-forwarded-proto':'https' },
  }));
  expect(proxied.headers.get('content-security-policy')).toContain('https://lms.example.test/codelab-runtime/');
  expect(await proxied.text()).toContain('const appOrigin = "https://lms.example.test"');
  const browser = await build({ stdin: { contents: `import {runBrowserPractice} from './apps/web/src/features/interactive-activities/codelab/utils/browser-runner';
    window.practice = async (language, code, stdin='') => { window.controller = new AbortController();
      try { return await runBrowserPractice(language, code, stdin, window.controller.signal, phase => window.phase=phase); }
      catch (error) { return {error:error.message}; } };`, resolveDir: process.cwd() }, bundle: true, write: false });
  client = browser.outputFiles[0].text;
  server = createServer(async (req, res) => {
    const url = new URL(req.url!, origin);
    if (url.pathname === '/codelab-sandbox') {
      const response = module.exports.GET(new Request(url));
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
    }
    if (url.pathname.startsWith('/codelab-runtime/') && !url.pathname.includes('..')) {
      try {
        const data = await readFile(path.join(process.cwd(), 'apps/web/public', url.pathname));
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin',
          'Content-Type': url.pathname.endsWith('.wasm') ? 'application/wasm' : /\.m?js$/.test(url.pathname) ? 'text/javascript' : 'application/octet-stream' });
        res.end(data);
      } catch { res.writeHead(404); res.end(); }
      return;
    }
    if (url.pathname.startsWith('/api/')) { apiCalls++; res.writeHead(403); res.end(); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><title>Practice tests</title><h1>CodeLab practice</h1>');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as any).port}`;
});
test.afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
test.beforeEach(async ({ page }) => {
  await page.goto(origin);
  await page.addScriptTag({ content: client });
});

test('JavaScript stdout, wrapper input and explicit stdin run locally', async ({ page }) => {
  const run = (code: string, stdin: string) => page.evaluate(([code, stdin]) => (window as any).practice('javascript', code, stdin), [code, stdin]);
  expect((await run('console.log("Hello")', '')).stdout).toBe('Hello\n');
  expect((await run('function sum(a,b){return a+b}', '2 3')).stdout).toBe('5\n');
  expect((await run('console.log(require("fs").readFileSync(0,"utf8").trim())', 'input')).stdout).toBe('input\n');
  expect(apiCalls).toBe(0);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('Python standard input and function wrappers work with packaged Pyodide', async ({ page }) => {
  test.setTimeout(90_000);
  const result = await page.evaluate(() => (window as any).practice('python', 'print(input())', 'hello'));
  expect(result.stderr).toBe(''); expect(result.stdout).toBe('hello\n');
  const wrapped = await page.evaluate(() => (window as any).practice('python', 'def sum(a,b):\n return a+b', '2 3'));
  expect(wrapped.stdout).toBe('5\n');
});

test('SQLite prints pipe-separated rows and resets the database every run', async ({ page }) => {
  const result = await page.evaluate(() => (window as any).practice('sql', "CREATE TABLE t(x); INSERT INTO t VALUES(4); SELECT x, 'ok', NULL FROM t;"));
  expect(result.stdout).toBe('4|ok|\n'); expect(result.stderr).toBe('');
  const reset = await page.evaluate(() => (window as any).practice('sql', 'SELECT * FROM t;'));
  expect(reset.stderr).toContain('no such table');
});

test('unsupported modules and packages suggest an explicit server run', async ({ page }) => {
  const result = await page.evaluate(() => (window as any).practice('javascript', "require('child_process')"));
  expect(result.stderr).toContain('Run on server');
  const python = await page.evaluate(() => (window as any).practice('python', 'import nonexistent_codelab_package'));
  expect(python.stderr).toContain('Run on server');
  expect(apiCalls).toBe(0);
});

test('worker cannot reach LMS APIs, parent DOM or origin storage', async ({ page }) => {
  const result = await page.evaluate(origin => (window as any).practice('javascript', `
    console.log(typeof document, typeof parent, typeof localStorage);
    try { await fetch(${JSON.stringify(origin)} + '/api/private', {credentials:'include'}); }
    catch (_) { console.log('network blocked'); }
    try { indexedDB.open('private'); } catch (_) { console.log('storage blocked'); }
  `), origin);
  expect(result.stdout).toContain('undefined undefined undefined');
  expect(result.stdout).toContain('network blocked');
  expect(result.stdout).toContain('storage blocked');
  expect(apiCalls).toBe(0);
});

test('Stop terminates loops, ignores forged messages, and allows a fresh run', async ({ page }) => {
  const pending = page.evaluate(() => (window as any).practice('javascript', 'while(true){}'));
  await expect.poll(() => page.evaluate(() => (window as any).phase)).toContain('Running');
  await page.evaluate(() => {
    window.postMessage({ type:'result', result:{ stdout:'forged' } }, '*');
    (window as any).controller.abort();
  });
  expect((await pending).error).toContain('stopped');
  await expect(page.locator('iframe')).toHaveCount(0);
  expect((await page.evaluate(() => (window as any).practice('javascript', 'console.log(2)'))).stdout).toBe('2\n');
});

test('infinite loops stop after ten seconds and output stays bounded', async ({ page }) => {
  const loop = await page.evaluate(() => (window as any).practice('javascript', 'while(true){}'));
  expect(loop.error).toContain('10 seconds');
  const output = await page.evaluate(() => (window as any).practice('javascript', 'console.log("x".repeat(70000))'));
  expect(output.status.id).toBe(11);
  expect(Buffer.byteLength(output.stdout)).toBeLessThanOrEqual(65536);
  const source = await page.evaluate(() => (window as any).practice('javascript', 'x'.repeat(70000)));
  expect(source.error).toContain('64 KB');
});

test('runtime asset failure offers server execution without consuming API quota', async ({ page }) => {
  await page.route('**/codelab-runtime/pyodide-*/**', route => route.abort());
  const result = await page.evaluate(() => (window as any).practice('python', 'print(1)'));
  expect(result.stderr || result.error).toContain('Run on server');
  expect(apiCalls).toBe(0);
});
