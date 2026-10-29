const { test } = require('node:test');
const assert = require('node:assert/strict');
const { compile } = require('./compile.cjs');

const source = `export { scanUpload, savePrivateUpload } from './apps/web/src/lib/private-upload';`;
const student = { id: 'scanner-test-student', role: 'STUDENT', instituteId: 'ics' };
const cleanText = Buffer.from('A clean lab evidence explanation.\n', 'utf8');
// Assemble only in memory so antivirus tools do not quarantine the test source.
const antivirusTest = Buffer.from([
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}',
  '$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!',
  '$H+H*',
].join(''), 'ascii');

test('real ClamAV accepts clean content and rejects the antivirus test signature before persistence',
  { skip: process.env.LAB_TEST_REAL_SCANNER !== '1' }, async t => {
    const previous = process.env.FILE_SCANNING_ENABLED;
    process.env.FILE_SCANNING_ENABLED = 'true';
    t.after(() => { if (previous === undefined) delete process.env.FILE_SCANNING_ENABLED; else process.env.FILE_SCANNING_ENABLED = previous; });
    assert.equal(process.env.CLAMAV_HOST, '127.0.0.1');
    assert.equal(Number(process.env.CLAMAV_PORT), 3310);
    let writes = 0;
    const db = { $transaction: async callback => callback({
      $queryRaw: async () => [{ pg_advisory_xact_lock: null }],
      privateAsset: {
        aggregate: async () => ({ _sum: { size: 0 } }),
        create: async () => { writes++; },
      },
    }) };
    const api = await compile(source, { db });
    await api.scanUpload(cleanText);
    await assert.rejects(api.scanUpload(antivirusTest), error => error.status === 400);
    await api.savePrivateUpload(student, new File([cleanText], 'explanation.txt', { type: 'text/plain' }));
    assert.equal(writes, 1);
    await assert.rejects(api.savePrivateUpload(student, new File([antivirusTest], 'unsafe.txt', { type: 'text/plain' })), error => error.status === 400);
    assert.equal(writes, 1, 'unsafe content must never reach the database transaction');
  });
