const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

describe('Admin Security Tools API Suite', async () => {
  // Bundle the real overview and sessions route handlers with mocked boundaries
  const result = await build({
    stdin: {
      contents: `
        export { GET as getOverview } from './apps/web/src/app/api/admin/security/overview/route.ts';
        export { GET as getSessions, DELETE as deleteSessions } from './apps/web/src/app/api/admin/security/sessions/route.ts';
        export { PATCH as patchUserStatus } from './apps/web/src/app/api/admin/users/[userId]/status/route.ts';
      `,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'cjs',
    tsconfig: 'apps/web/tsconfig.json',
    plugins: [
      {
        name: 'security-boundaries',
        setup(b) {
          b.onResolve(
            { filter: /(^|\/)db$|(^|\/)auth-session$|^next\/(server|navigation|cache)$|^@\/lib\/roster\/rate-limit$/ },
            ({ path: name }) => ({ path: name, namespace: 'test-boundary' })
          );
          b.onLoad({ filter: /.*/, namespace: 'test-boundary' }, ({ path: name }) => ({
            contents:
              name.startsWith('next/server')
                ? 'export const NextResponse = Response;'
                : name.startsWith('next/navigation')
                ? 'export function redirect(){throw Error("REDIRECT")} export function notFound(){throw Error("NOT_FOUND")}'
                : /(^|\/)db$/.test(name)
                ? 'export const db = new Proxy({}, { get: (_, p) => globalThis.__securityTestDb[p] });'
                : /(^|\/)auth-session$/.test(name)
                ? 'export async function getSession() { return globalThis.__securityTestSession; }'
                : 'export async function persistentLimit() {}',
          }));
        },
      },
    ],
  });

  const compiled = new Module(path.resolve('tmp/admin-security-test.cjs'), module);
  compiled.filename = path.resolve('tmp/admin-security-test.cjs');
  compiled.paths = [path.resolve('apps/web/node_modules'), ...module.paths];
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  const api = compiled.exports;

  // Fixture institutes
  const institutes = {
    'inst-ics': { id: 'inst-ics', code: 'ics', name: 'Institute of Computing Studies' },
    'inst-ite': { id: 'inst-ite', code: 'ite', name: 'Institute of Teacher Education' },
    'inst-ibe': { id: 'inst-ibe', code: 'ibe', name: 'Institute of Business and Entrepreneurship' },
  };

  // Fixture users
  const users = [
    { id: 'admin-ics', name: 'ICS Admin', email: 'admin@ics.cdm.edu', role: 'ADMIN', instituteId: 'inst-ics', isActive: true, securityPin: 'hash1', institute: institutes['inst-ics'] },
    { id: 'admin-ite', name: 'ITE Admin', email: 'admin@ite.cdm.edu', role: 'ADMIN', instituteId: 'inst-ite', isActive: true, securityPin: 'hash2', institute: institutes['inst-ite'] },
    { id: 'admin-ibe', name: 'IBE Admin', email: 'admin@ibe.cdm.edu', role: 'ADMIN', instituteId: 'inst-ibe', isActive: true, securityPin: null, institute: institutes['inst-ibe'] },
    { id: 'super-user', name: 'Global Super', email: 'super@cdm.edu', role: 'SUPER_USER', instituteId: 'inst-ics', isActive: true, securityPin: 'hash-s', institute: institutes['inst-ics'] },
    { id: 'student-ics', name: 'ICS Student', email: 's1@ics.cdm.edu', role: 'STUDENT', instituteId: 'inst-ics', isActive: true, securityPin: null, institute: institutes['inst-ics'] },
    { id: 'student-ite', name: 'ITE Student', email: 's2@ite.cdm.edu', role: 'STUDENT', instituteId: 'inst-ite', isActive: true, securityPin: 'hash-ite-s', institute: institutes['inst-ite'] },
    { id: 'instructor-ibe', name: 'IBE Teacher', email: 't1@ibe.cdm.edu', role: 'INSTRUCTOR', instituteId: 'inst-ibe', isActive: true, securityPin: null, institute: institutes['inst-ibe'] },
  ];

  // Fixture sessions (with tokenHash which must NEVER leak)
  let sessions = [
    {
      id: 'sess-admin-ics',
      userId: 'admin-ics',
      tokenHash: 'SECRET_TOKEN_HASH_ADMIN_ICS',
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0 AdminICS',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(Date.now() - 3600000),
      lastSeenAt: new Date(Date.now() - 60000),
      user: users.find((u) => u.id === 'admin-ics'),
    },
    {
      id: 'sess-student-ics',
      userId: 'student-ics',
      tokenHash: 'SECRET_TOKEN_HASH_STUDENT_ICS',
      ipAddress: '10.0.0.2',
      userAgent: 'Mozilla/5.0 StudentICS',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(Date.now() - 7200000),
      lastSeenAt: new Date(Date.now() - 120000),
      user: users.find((u) => u.id === 'student-ics'),
    },
    {
      id: 'sess-admin-ite',
      userId: 'admin-ite',
      tokenHash: 'SECRET_TOKEN_HASH_ADMIN_ITE',
      ipAddress: '10.0.1.1',
      userAgent: 'Mozilla/5.0 AdminITE',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(Date.now() - 3600000),
      lastSeenAt: new Date(Date.now() - 60000),
      user: users.find((u) => u.id === 'admin-ite'),
    },
    {
      id: 'sess-student-ite',
      userId: 'student-ite',
      tokenHash: 'SECRET_TOKEN_HASH_STUDENT_ITE',
      ipAddress: '10.0.1.2',
      userAgent: 'Mozilla/5.0 StudentITE',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(Date.now() - 7200000),
      lastSeenAt: new Date(Date.now() - 120000),
      user: users.find((u) => u.id === 'student-ite'),
    },
    {
      id: 'sess-admin-ibe',
      userId: 'admin-ibe',
      tokenHash: 'SECRET_TOKEN_HASH_ADMIN_IBE',
      ipAddress: '10.0.2.1',
      userAgent: 'Mozilla/5.0 AdminIBE',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(Date.now() - 3600000),
      lastSeenAt: new Date(Date.now() - 60000),
      user: users.find((u) => u.id === 'admin-ibe'),
    },
    {
      id: 'sess-super-user',
      userId: 'super-user',
      tokenHash: 'SECRET_TOKEN_HASH_SUPER_USER',
      ipAddress: '10.0.9.9',
      userAgent: 'Mozilla/5.0 SuperUser',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(Date.now() - 3600000),
      lastSeenAt: new Date(Date.now() - 60000),
      user: users.find((u) => u.id === 'super-user'),
    },
  ];

  const auditEntries = [];

  // Mock DB implementation
  globalThis.__securityTestDb = {
    institute: {
      findUnique: async ({ where }) => {
        if (where.code) {
          return Object.values(institutes).find((i) => i.code.toLowerCase() === where.code.toLowerCase()) || null;
        }
        if (where.id) return institutes[where.id] || null;
        return null;
      },
    },
    user: {
      findUnique: async ({ where }) => {
        return users.find((u) => u.id === where.id) || null;
      },
      count: async ({ where = {} }) => {
        return users.filter((u) => {
          if (where.instituteId && u.instituteId !== where.instituteId) return false;
          if (where.isActive !== undefined && u.isActive !== where.isActive) return false;
          if (where.securityPin && where.securityPin.not === null && !u.securityPin) return false;
          return true;
        }).length;
      },
      update: async ({ where, data }) => {
        const u = users.find((user) => user.id === where.id);
        if (u && data.isActive !== undefined) u.isActive = data.isActive;
        return u;
      },
    },
    session: {
      count: async ({ where = {} }) => {
        const now = new Date();
        return sessions.filter((s) => {
          if (where.expiresAt && where.expiresAt.gt && s.expiresAt <= now) return false;
          if (where.user && where.user.instituteId && s.user.instituteId !== where.user.instituteId) return false;
          return true;
        }).length;
      },
      findMany: async ({ where = {}, select }) => {
        const now = new Date();
        const matched = sessions.filter((s) => {
          if (where.expiresAt && where.expiresAt.gt && s.expiresAt <= now) return false;
          if (where.user && where.user.instituteId && s.user.instituteId !== where.user.instituteId) return false;
          if (where.user && where.user.role && where.user.role.in && !where.user.role.in.includes(s.user.role)) return false;
          return true;
        });

        // Verify select never includes tokenHash
        if (select) {
          assert.equal(select.tokenHash, undefined, 'CRITICAL: DB query must never select tokenHash');
        }

        return matched.map((s) => ({
          id: s.id,
          userId: s.userId,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          lastSeenAt: s.lastSeenAt,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          user: {
            id: s.user.id,
            name: s.user.name,
            email: s.user.email,
            role: s.user.role,
            isActive: s.user.isActive,
            securityPin: s.user.securityPin,
            institute: { code: s.user.institute.code, name: s.user.institute.name },
          },
        }));
      },
      findUnique: async ({ where }) => {
        const s = sessions.find((item) => item.id === where.id);
        if (!s) return null;
        return {
          ...s,
          user: {
            id: s.user.id,
            name: s.user.name,
            email: s.user.email,
            role: s.user.role,
            instituteId: s.user.instituteId,
          },
        };
      },
      delete: async ({ where }) => {
        const idx = sessions.findIndex((s) => s.id === where.id);
        if (idx !== -1) sessions.splice(idx, 1);
        return { id: where.id };
      },
      deleteMany: async ({ where = {} }) => {
        const initialCount = sessions.length;
        sessions = sessions.filter((s) => {
          if (where.userId && s.userId === where.userId) return false;
          if (where.id && where.id.not && s.id === where.id.not) return true;
          if (where.user && where.user.instituteId && s.user.instituteId === where.user.instituteId) {
            if (where.user.role && where.user.role.not && s.user.role === where.user.role.not) return true;
            return false;
          }
          return true;
        });
        return { count: initialCount - sessions.length };
      },
    },
    auditLog: {
      count: async () => 3,
      create: async ({ data }) => {
        auditEntries.push(data);
        return { id: 'audit-' + auditEntries.length, ...data };
      },
    },
    $transaction: async (arg) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      if (typeof arg === 'function') return arg(globalThis.__securityTestDb);
      return arg;
    },
  };

  function setSession(userId, sessionId = 'sess-' + userId) {
    const user = users.find((u) => u.id === userId);
    globalThis.__securityTestSession = user
      ? {
          id: sessionId,
          userId: user.id,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            instituteId: user.instituteId,
            permissions: '[]',
          },
        }
      : null;
  }

  function req(url, method = 'GET', body = null) {
    return new Request('http://localhost:3000' + url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        origin: 'http://localhost:3000',
        'sec-fetch-site': 'same-origin',
        host: 'localhost:3000',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  // ─── TEST 1: ICS, ITE, and IBE Admins each get their own institute data ───
  test('ICS, ITE, and IBE admin each view only their own institute security data', async () => {
    // ICS Admin
    setSession('admin-ics', 'sess-admin-ics');
    const icsRes = await api.getOverview(req('/api/admin/security/overview'));
    assert.equal(icsRes.status, 200);
    const icsData = await icsRes.json();
    assert.equal(icsData.overview.instituteCode, 'ics');
    assert.equal(icsData.overview.totalUsersCount, 3); // admin-ics, student-ics, super-user

    const icsSessionsRes = await api.getSessions(req('/api/admin/security/sessions'));
    const icsSessionsData = await icsSessionsRes.json();
    assert.ok(icsSessionsData.data.every((s) => s.instituteCode === 'ics'));
    assert.equal(icsSessionsData.data.length, 3);

    // ITE Admin
    setSession('admin-ite', 'sess-admin-ite');
    const iteRes = await api.getOverview(req('/api/admin/security/overview'));
    assert.equal(iteRes.status, 200);
    const iteData = await iteRes.json();
    assert.equal(iteData.overview.instituteCode, 'ite');
    assert.equal(iteData.overview.totalUsersCount, 2); // admin-ite, student-ite

    const iteSessionsRes = await api.getSessions(req('/api/admin/security/sessions'));
    const iteSessionsData = await iteSessionsRes.json();
    assert.ok(iteSessionsData.data.every((s) => s.instituteCode === 'ite'));

    // IBE Admin
    setSession('admin-ibe', 'sess-admin-ibe');
    const ibeRes = await api.getOverview(req('/api/admin/security/overview'));
    assert.equal(ibeRes.status, 200);
    const ibeData = await ibeRes.json();
    assert.equal(ibeData.overview.instituteCode, 'ibe');
    assert.equal(ibeData.overview.totalUsersCount, 2); // admin-ibe, instructor-ibe
  });

  // ─── TEST 2: Admin passing another institute code is ignored or rejected ───
  test('Admin passing another institute code in URL is rejected or ignored (no data leak)', async () => {
    setSession('admin-ics', 'sess-admin-ics');

    // Overview with ?institute=ite
    const resOverview = await api.getOverview(req('/api/admin/security/overview?institute=ite'));
    // denyLegacyApi returns 403 Forbidden for cross-institute param
    if (resOverview.status === 200) {
      const data = await resOverview.json();
      assert.equal(data.overview.instituteCode, 'ics', 'Must not return ITE data');
    } else {
      assert.equal(resOverview.status, 403);
    }

    // Sessions with ?institute=ite
    const resSessions = await api.getSessions(req('/api/admin/security/sessions?institute=ite'));
    if (resSessions.status === 200) {
      const data = await resSessions.json();
      assert.ok(data.data.every((s) => s.instituteCode === 'ics'), 'Must not return ITE sessions');
    } else {
      assert.equal(resSessions.status, 403);
    }
  });

  // ─── TEST 3: Cross-institute session revocation fails with 404 (no data leak) ───
  test('Admin trying to revoke a session or user from another institute fails with 404', async () => {
    setSession('admin-ics', 'sess-admin-ics');

    // Attempt to revoke session belonging to ITE student
    const resSess = await api.deleteSessions(req('/api/admin/security/sessions', 'DELETE', { sessionId: 'sess-student-ite' }));
    assert.equal(resSess.status, 404);

    // Attempt to revoke user belonging to ITE student
    const resUser = await api.deleteSessions(req('/api/admin/security/sessions', 'DELETE', { targetUserId: 'student-ite' }));
    assert.equal(resUser.status, 404);

    // Verify ITE session was NOT deleted
    assert.ok(sessions.some((s) => s.id === 'sess-student-ite'));
  });

  // ─── TEST 4: Hierarchy and Self-Protection rules ───
  test('Admin cannot revoke their own session or a super user session', async () => {
    setSession('admin-ics', 'sess-admin-ics');

    // Self-revocation attempt
    const selfRes = await api.deleteSessions(req('/api/admin/security/sessions', 'DELETE', { sessionId: 'sess-admin-ics' }));
    assert.equal(selfRes.status, 400);

    // Super user session revocation attempt
    const superRes = await api.deleteSessions(req('/api/admin/security/sessions', 'DELETE', { sessionId: 'sess-super-user' }));
    assert.equal(superRes.status, 403);

    // Super user user-level revocation attempt
    const superUserRes = await api.deleteSessions(req('/api/admin/security/sessions', 'DELETE', { targetUserId: 'super-user' }));
    assert.equal(superUserRes.status, 403);
  });

  // ─── TEST 5: Institute-wide emergency lockout requires typed confirmation and preserves acting session ───
  test('Institute-wide revocation requires typed confirmation and preserves current admin session', async () => {
    setSession('admin-ics', 'sess-admin-ics');

    // Without typed confirmation
    const badRes = await api.deleteSessions(req('/api/admin/security/sessions', 'DELETE', { instituteWide: true, confirmation: 'yes' }));
    assert.equal(badRes.status, 400);

    // With typed confirmation 'REVOKE ALL'
    const goodRes = await api.deleteSessions(req('/api/admin/security/sessions', 'DELETE', { instituteWide: true, confirmation: 'REVOKE ALL' }));
    assert.equal(goodRes.status, 200);

    // Verify ICS student session was deleted, but acting admin session remains
    assert.ok(!sessions.some((s) => s.id === 'sess-student-ics'));
    assert.ok(sessions.some((s) => s.id === 'sess-admin-ics'), 'Acting admin session must be preserved');
  });

  // ─── TEST 6: Super user can inspect and operate across institutes ───
  test('Super user can view and operate across institutes', async () => {
    setSession('super-user', 'sess-super-user');

    // Can view ICS
    const icsRes = await api.getOverview(req('/api/admin/security/overview?institute=ics'));
    assert.equal(icsRes.status, 200);
    const icsData = await icsRes.json();
    assert.equal(icsData.overview.instituteCode, 'ics');

    // Can view ITE
    const iteRes = await api.getOverview(req('/api/admin/security/overview?institute=ite'));
    assert.equal(iteRes.status, 200);
    const iteData = await iteRes.json();
    assert.equal(iteData.overview.instituteCode, 'ite');

    // Can view IBE
    const ibeRes = await api.getOverview(req('/api/admin/security/overview?institute=ibe'));
    assert.equal(ibeRes.status, 200);
    const ibeData = await ibeRes.json();
    assert.equal(ibeData.overview.instituteCode, 'ibe');
  });

  // ─── TEST 7: Instructor and Student are denied with 403 ───
  test('Instructor and Student are denied with 403', async () => {
    // Instructor
    setSession('instructor-ibe', 'sess-instructor-ibe');
    const instOverview = await api.getOverview(req('/api/admin/security/overview'));
    assert.equal(instOverview.status, 403);
    const instSessions = await api.getSessions(req('/api/admin/security/sessions'));
    assert.equal(instSessions.status, 403);

    // Student
    setSession('student-ite', 'sess-student-ite');
    const studOverview = await api.getOverview(req('/api/admin/security/overview'));
    assert.equal(studOverview.status, 403);
    const studSessions = await api.getSessions(req('/api/admin/security/sessions'));
    assert.equal(studSessions.status, 403);
    const studDelete = await api.deleteSessions(req('/api/admin/security/sessions', 'DELETE', { sessionId: 'sess-admin-ite' }));
    assert.equal(studDelete.status, 403);
  });

  // ─── TEST 8: TokenHash and secrets are never returned ───
  test('Sessions API payload never exposes tokenHash or secrets', async () => {
    setSession('admin-ite', 'sess-admin-ite');
    const res = await api.getSessions(req('/api/admin/security/sessions'));
    assert.equal(res.status, 200);
    const text = await res.text();

    assert.ok(!text.includes('SECRET_TOKEN_HASH'), 'Must never leak tokenHash');
    assert.ok(!text.includes('tokenHash'), 'JSON payload must not have tokenHash property');
    assert.ok(!text.includes('hash2'), 'Must never expose security PIN hash');
  });
});
