const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
const { NextRequest } = require('../../apps/web/node_modules/next/server');

for (const checkout of [process.env.ORIGIN_TEST_CHECKOUT || '.']) {
  const code = transformSync(fs.readFileSync(path.join(checkout, 'apps/web/src/lib/super-user-v1/actor.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Request, Response, URL, require: () => ({}) });
  const { assertMutationOrigin } = module.exports;
  const mutation = (headers, url = 'http://0.0.0.0:3000/api/institute-administration/faculty/bsit') => new NextRequest(url, { method: 'PATCH', headers });

  test(`${checkout}: faculty mutation accepts the browser Host despite the Next.js bind address`, () => {
    for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000']) {
      assert.doesNotThrow(() => assertMutationOrigin(mutation({ host, origin: `http://${host}`, 'sec-fetch-site': 'same-origin' })));
    }
    assert.doesNotThrow(() => assertMutationOrigin(new Request('https://lms.example.test/api/faculty', { method: 'POST', headers: { origin: 'https://lms.example.test' } })));
  });

  test(`${checkout}: foreign, opaque, sibling, wrong-port and wrong-protocol origins remain forbidden`, () => {
    for (const origin of ['https://foreign.invalid', 'null', 'http://localhost:3001', 'https://localhost:3000', 'http://127.0.0.1:3000']) {
      assert.throws(() => assertMutationOrigin(mutation({ host: 'localhost:3000', origin, 'sec-fetch-site': 'same-origin' })), error => error.status === 403);
    }
    for (const site of ['same-site', 'cross-site']) {
      assert.throws(() => assertMutationOrigin(mutation({ host: 'localhost:3000', origin: 'http://localhost:3000', 'sec-fetch-site': site })), error => error.status === 403);
    }
  });

  test(`${checkout}: spoofed forwarded hosts cannot authorize a foreign mutation`, () => {
    assert.throws(() => assertMutationOrigin(mutation({ host: 'localhost:3000', origin: 'https://foreign.invalid', 'x-forwarded-host': 'foreign.invalid', forwarded: 'host=foreign.invalid;proto=https' })), error => error.status === 403);
    assert.throws(() => assertMutationOrigin(mutation({ host: 'foreign.invalid', origin: 'http://localhost:3000' }, 'http://localhost:3000/api/faculty')), error => error.status === 403);
  });

  test(`${checkout}: reads and existing non-browser requests remain supported`, () => {
    assert.doesNotThrow(() => assertMutationOrigin(new Request('http://localhost:3000/api/faculty', { headers: { origin: 'https://foreign.invalid' } })));
    assert.doesNotThrow(() => assertMutationOrigin(mutation({ host: 'localhost:3000' })));
  });
}
