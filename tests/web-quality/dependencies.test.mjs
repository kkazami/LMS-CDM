import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { assess } from './dependency-audit.mjs';
const requireWeb = createRequire(path.resolve('apps/web/package.json'));
test('dependency gate includes web and root toolchain, excludes mobile-only paths, and refuses failed lookup', () => {
  const audit = { metadata: { vulnerabilities: {} }, advisories: { one: { module_name: 'example', severity: 'high', findings: [{ paths: ['apps__mobile>example'] }] } } };
  assert.equal(assess(audit).result, 'PASS');
  audit.advisories.one.findings[0].paths.push('.>example'); assert.equal(assess(audit).result, 'FAIL');
  audit.advisories.one.findings[0].paths = ['apps__web>example']; assert.equal(assess(audit).result, 'FAIL');
  assert.throws(() => assess({ error: { code: 'ENOTFOUND' } }));
  assert.throws(() => assess({ metadata: {}, advisories: {} }));
});
test('updated mail library builds a message without SMTP or network access', async () => {
  const transport = requireWeb('nodemailer').createTransport({ jsonTransport: true });
  const message = await transport.sendMail({ from: 'sender@example.invalid', to: 'student@example.invalid', subject: 'Synthetic activation', text: 'Synthetic message', disableFileAccess: true, disableUrlAccess: true });
  assert.equal(JSON.parse(message.message.toString()).subject, 'Synthetic activation');
});
test('updated archive and document parser retain synthetic document extraction', async () => {
  const AdmZip = requireWeb('adm-zip'), zip = new AdmZip();
  zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
  zip.addFile('word/document.xml', Buffer.from('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Synthetic quality document</w:t></w:r></w:p></w:body></w:document>'));
  const bytes = zip.toBuffer(); assert.equal(new AdmZip(bytes).getEntries().length, 2);
  const result = await requireWeb('officeparser').parseOffice(bytes);
  assert.match(JSON.stringify(result), /Synthetic quality document/);
});
test('patched transitive PDF parser extracts a real synthetic PDF without provider access', async () => {
  const content = 'BT /F1 12 Tf 20 80 Td (Synthetic PDF quality) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (const [i, object] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const result = await requireWeb('officeparser').parseOffice(Buffer.from(pdf));
  assert.match(JSON.stringify(result), /Synthetic PDF quality/);
});
