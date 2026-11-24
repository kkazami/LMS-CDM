const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, as, request, webRequire } = require('./helpers.cjs');

const student = { id: 'student', role: 'STUDENT', instituteId: 'ics' };
const previewRequest = () => request('/api/materials/preview?attachmentId=attachment');

function materialDb(fileName, content) {
  return {
    attachment: { findUnique: async () => ({ url: '/api/assets/attachment', type: 'FILE', fileName, syllabusItem: { courseId: 'course', targetGroups: [] } }) },
    course: { findUnique: async () => ({ instituteId: 'ics' }) },
    enrollment: { findUnique: async () => ({ status: 'APPROVED' }) },
    privateAsset: { findFirst: async () => ({ content, size: content.length }) },
  };
}

function pdfFixture(pages) {
  const pageRefs = pages.map((_, index) => `${4 + 2 * index} 0 R`);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Count ${pages.length} /Kids [ ${pageRefs.join(' ')} ] >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  for (const [index, text] of pages.entries()) {
    const stream = `BT /F1 12 Tf 20 120 Td (${text}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 250 150] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * index} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  let pdf = '%PDF-1.4\n';
  const offsets = ['0000000000 65535 f \n'];
  for (const [index, object] of objects.entries()) {
    offsets.push(`${String(pdf.length).padStart(10, '0')} 00000 n \n`);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  return Buffer.from(`${pdf}xref\n0 ${offsets.length}\n${offsets.join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${pdf.length}\n%%EOF\n`);
}

test('an authorized student can preview a private PDF and generate cards from selected pages through the Next.js request proxy', async () => {
  const pdf = pdfFixture([
    'Photosynthesis: Plants convert sunlight into chemical energy that supports growth.',
    'Mitosis: Cell division produces two daughter cells with identical genetic information.',
  ]);
  const api = await load(materialDb('Lesson.pdf', pdf), { user: student });
  const preview = await api.materialPreview(previewRequest());
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('content-type'), 'application/pdf');
  assert.equal(preview.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), pdf);
  const info = await api.fileInfo(request('/api/flashcards/file-info?attachmentId=attachment'));
  assert.equal((await info.json()).totalPages, 2);

  const generate = request('/api/flashcards/auto-generate', {
    attachmentId: 'attachment', courseId: 'course', selectedPages: [2],
  }, { host: 'lms.example.test', origin: 'https://lms.example.test', 'sec-fetch-site': 'same-origin' });
  const proxiedRequest = new Proxy(generate, {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const result = await api.generate(proxiedRequest);
  const body = await result.json();
  assert.equal(result.status, 200, body.message);
  assert.ok(body.cards.some(card => /mitosis|daughter cells/i.test(`${card.front} ${card.back}`)));
  assert.ok(body.cards.every(card => !/photosynthesis|sunlight/i.test(`${card.front} ${card.back}`)));
});

test('Office previews extract text and retain course authorization', async () => {
  const Zip = webRequire('adm-zip');
  const zip = new Zip();
  zip.addFile('[Content_Types].xml', Buffer.from('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'));
  zip.addFile('word/document.xml', Buffer.from('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Office lesson preview</w:t></w:r></w:p></w:body></w:document>'));
  const db = materialDb('Lesson.docx', zip.toBuffer());
  const api = await load(db, { user: student });
  assert.deepEqual(await (await api.materialPreview(previewRequest())).json(), { text: 'Office lesson preview', truncated: false });

  db.enrollment.findUnique = async () => null;
  db.privateAsset.findFirst = async () => assert.fail('unauthorized preview read attachment bytes');
  assert.equal((await api.materialPreview(previewRequest())).status, 403);
  as(null);
  assert.equal((await api.materialPreview(previewRequest())).status, 401);
});
