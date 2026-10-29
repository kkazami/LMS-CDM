const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

for (const [tables, columns, expected] of [[0, 0, 'legacy'], [10, 2, 'ready'], [1, 0, 'incomplete'], [10, 1, 'incomplete'], [0, 2, 'incomplete']]) {
  test(`schema readiness: ${tables} lab tables and ${columns} provenance columns`, async () => {
    const api = await load({ $queryRaw: async () => [{ tables, columns }] });
    assert.equal(await api.labSchemaState(), expected);
    if (expected === 'incomplete') {
      await assert.rejects(() => api.labsAvailable(), error => error.status === 503);
      await assert.rejects(() => api.academicProvenance('STARTED'), error => error.status === 503);
    } else {
      assert.equal(await api.labsAvailable(), expected === 'ready');
      assert.deepEqual(await api.academicProvenance('UNTOUCHED'), expected === 'ready' ? { workHistoryState: 'UNTOUCHED' } : {});
      if (expected === 'legacy') await assert.rejects(() => api.requireLabSchema(), error => error.status === 503);
    }
  });
}

test('catalog errors are propagated instead of disabling lab security', async () => {
  const unavailable = new Error('Catalog permission denied');
  const api = await load({ $queryRaw: async () => { throw unavailable; } });
  await assert.rejects(() => api.labsAvailable(), unavailable);
});

test('a worker immediately sees an upgrade after previously seeing the legacy schema', async () => {
  let upgraded = false;
  const api = await load({ $queryRaw: async () => [{ tables: upgraded ? 10 : 0, columns: upgraded ? 2 : 0 }] });
  assert.equal(await api.labsAvailable(), false);
  upgraded = true;
  assert.equal(await api.labsAvailable(), true);
});
