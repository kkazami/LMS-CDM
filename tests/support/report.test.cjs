const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('problem reports use the support inbox and keep attachments scoped to their institute and author', async () => {
  const owner = { id: 'reporter', instituteId: 'ics', role: 'STUDENT' };
  const tickets = [];
  let attachmentsReady = true;
  const fixture = {
    session: { user: owner },
    db: {
      supportTicket: {
        create: async ({ data }) => {
          const { attachment, ...fields } = data;
          if (attachment && !attachmentsReady) throw { code: 'P2021' };
          const ticket = { id: String(tickets.length + 1), ...fields };
          tickets.push({ ...ticket, attachment: attachment?.create });
          return ticket;
        },
        findMany: async ({ where, include }) => {
          if (include.attachment && !attachmentsReady) throw { code: 'P2021' };
          return tickets.filter(ticket => matches(ticket, where)).map(({ attachment, ...ticket }) => (
            include.attachment ? { ...ticket, attachment: attachment ? { fileName: attachment.fileName } : null } : ticket
          ));
        },
      },
      supportTicketAttachment: {
        findFirst: async ({ where }) => tickets.find(ticket => ticket.id === where.ticketId && matches(ticket, where.ticket))?.attachment,
      },
    },
  };
  function matches(ticket, where) {
    return ticket.instituteId === where.instituteId && (where.authorId === undefined || ticket.authorId === where.authorId);
  }

  globalThis.__supportReportTest = fixture;
  const bundle = await build({
    stdin: { contents: `
      export { GET, POST, PATCH } from './apps/web/src/app/api/support-tickets/route';
      export { GET as download } from './apps/web/src/app/api/support-tickets/[ticketId]/attachment/route';`, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json',
    nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'support-boundaries', setup(builder) {
      const mocks = {
        'next/server': 'export const NextResponse = Response;',
        '@/lib/db': 'export const db = globalThis.__supportReportTest.db;',
        '@/lib/api-auth': 'export async function getSessionFromRequest() { return globalThis.__supportReportTest.session; }',
        '@/lib/authenticated-rate-limits': 'export async function limitAuthenticatedOperation() {}',
        '@/lib/super-user-v1/actor': `
          export class AccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
          function unused() { throw new Error('Unexpected dedicated actor call'); }
          export { unused as requireActor, unused as revalidateActor, unused as assertMutationOrigin };
        `,
      };
      builder.onResolve({ filter: /^(next\/server|@\/lib\/)/ }, ({ path }) => (
        Object.hasOwn(mocks, path) ? { path, namespace: 'support-test' } : undefined
      ));
      builder.onLoad({ filter: /.*/, namespace: 'support-test' }, ({ path }) => ({ contents: mocks[path] }));
    } }],
  });
  const loaded = new Module(path.resolve('tmp/support-report-test.cjs'), module);
  loaded._compile(bundle.outputFiles[0].text, loaded.id);
  const api = loaded.exports;
  const url = 'https://lms.test/api/support-tickets';
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTMkAAAAASUVORK5CYII=', 'base64');
  function report(attachment, headers) {
    const data = new FormData();
    data.set('subject', '  Blank grades page  ');
    data.set('area', 'grades');
    data.set('description', 'The page stays blank.');
    data.set('steps', 'Open Grades.');
    if (attachment) data.set('attachment', attachment, 'grades.png');
    return new Request(url, { method: 'POST', body: data, headers });
  }

  const created = await api.POST(report(new Blob([image], { type: 'image/png' })));
  assert.equal(created.status, 201);
  const { ticket } = await created.json();
  assert.equal(ticket.subject, 'Blank grades page');
  assert.equal(ticket.message, 'Page: Grades\n\nThe page stays blank.\n\nSteps to repeat:\nOpen Grades.');
  assert.equal(ticket.attachment, undefined);
  assert.equal((await api.POST(report(new Blob(['text'], { type: 'image/png' })))).status, 400);
  assert.equal((await api.POST(report(null, { origin: 'https://elsewhere.test' }))).status, 403);
  assert.equal(tickets.length, 1);

  const attachmentUrl = `${url}/${ticket.id}/attachment`;
  const download = () => api.download(new Request(attachmentUrl), { params: Promise.resolve({ ticketId: ticket.id }) });
  for (const [user, status] of [
    [null, 401],
    [{ ...owner, id: 'another-student' }, 404],
    [{ ...owner, id: 'other-admin', role: 'ADMIN', instituteId: 'ibe' }, 404],
    [owner, 200],
    [{ ...owner, id: 'admin', role: 'ADMIN' }, 200],
  ]) {
    fixture.session = user ? { user } : null;
    const response = await download();
    assert.equal(response.status, status);
    if (status === 200) {
      assert.match(response.headers.get('content-disposition'), /^attachment;/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
    }
  }

  const adminInbox = await (await api.GET(new Request(url))).json();
  assert.deepEqual(adminInbox.tickets[0].attachment, { fileName: 'grades.png' });
  assert.deepEqual(await (await api.GET(new Request(`${url}?mine=1`))).json(), { tickets: [] });
  fixture.session = { user: owner };
  assert.equal((await api.POST(report())).status, 201);
  const legacy = new Request(url, { method: 'POST', body: JSON.stringify({ subject: 'Question', message: 'How do I find my grades?' }) });
  assert.equal((await api.POST(legacy)).status, 201);
  attachmentsReady = false;
  const unavailable = await api.POST(report(new Blob([image], { type: 'image/png' })));
  assert.equal(unavailable.status, 503);
  assert.equal(tickets.length, 3);
  assert.equal((await api.POST(report())).status, 201);
  const inboxWithoutAttachments = await api.GET(new Request(url));
  assert.equal(inboxWithoutAttachments.status, 200);
  assert.equal((await inboxWithoutAttachments.json()).tickets.length, 4);
});
