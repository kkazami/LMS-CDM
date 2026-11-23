const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const root = process.cwd();
function from(parent, child) {
  const store = path.join(root, 'node_modules/.pnpm');
  const matches = fs.readdirSync(store).filter(name => name.startsWith(parent.replace('/', '+') + '@'));
  assert.ok(matches.length > 0, `Expected installed ${parent}`);
  const resolved = [...new Set(matches.map(name => createRequire(path.join(store, name, 'node_modules', parent, 'package.json')).resolve(child)))];
  assert.equal(resolved.length, 1, `Every ${parent} peer context must select the same patched ${child}`);
  return require(resolved[0]);
}

test('updated web and desktop runtime packages resolve on their retained major versions', () => {
  const web = createRequire(path.join(root, 'apps/web/package.json'));
  const desktop = createRequire(path.join(root, 'apps/desktop/package.json'));
  assert.equal(web('next/package.json').version, '16.4.6');
  assert.equal(desktop('electron/package.json').version, '41.10.7');
  const { NextResponse } = web('next/server');
  assert.equal(NextResponse.json({ dummy: true }).status, 200);
});
test('patched shell quoting retains ordinary argument round trips', () => {
  const quote = from('react-devtools-core', 'shell-quote');
  const input = ['node', 'a file.txt', 'plain', 'literal-value'];
  assert.deepEqual(quote.parse(quote.quote(input)), input);
});
test('Expo certificate, compression and YAML APIs remain compatible', () => {
  const forge = from('@expo/cli', 'node-forge');
  assert.equal(forge.md.sha256.create().update('dummy').digest().toHex(), createHash('sha256').update('dummy').digest('hex'));
  assert.equal(typeof from('@expo/cli', 'compression')(), 'function');
  assert.deepEqual(from('@expo/xcpretty', 'js-yaml').load('dummy: true\ncount: 2\n'), { dummy: true, count: 2 });
});
test('patched compatible matcher, address and browser-target APIs retain ordinary inputs', () => {
  const picomatch = from('micromatch', 'picomatch');
  assert.equal(picomatch('*.js')('lesson.js'), true);
  assert.equal(picomatch('*.js')('lesson.txt'), false);
  const { Address4, Address6 } = from('socks', 'ip-address', 'desktop');
  assert.equal(new Address4('192.0.2.1').correctForm(), '192.0.2.1');
  assert.equal(new Address6('2001:db8::1').correctForm(), '2001:db8::1');
  const browsers = from('autoprefixer', 'browserslist', 'web');
  assert.ok(browsers('last 1 Chrome version').some(value => value.startsWith('chrome ')));
});
