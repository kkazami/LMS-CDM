const assert = require('node:assert/strict');
const { test } = require('node:test');
const Module = require('node:module');
const { defaultPeriodPolicy } = require('../../apps/web/src/lib/grading/periods.ts');

let session, target, profileRead, course, gradeReads, lookupRequests;
const db = {
  institute: { findUnique: async () => ({ id: 'a', code: 'ics' }) },
  user: {
    findUnique: async () => target,
    findFirst: async ({ where, select }) => {
      profileRead = { where, select };
      if (target.instituteId !== where.instituteId || !where.role.in.includes(target.role.toUpperCase())) return null;
      return { id: target.id, name: 'Dummy instructor', email: 'teacher@example.invalid', role: target.role,
        uniqueId: 'dummy-id', isActive: true, permissions: '[]', createdAt: new Date(0), institute: { code: 'ics', name: 'Dummy' } };
    },
  },
  course: { findUnique: async () => course },
  enrollment: { findMany: async ({ where }) => { gradeReads.push(where); return []; } },
  syllabusItem: { findMany: async () => [] },
  studentSubmission: { findMany: async ({ where }) => { gradeReads.push(where); return []; } },
  gradingPolicy: { findUnique: async () => null },
};

const load = Module._load;
let profile, gradebook;
Module._load = function (name, ...args) {
  if (name === '@/lib/db') return { db };
  if (name === '@/lib/auth-session' || name === '@/lib/api-auth') {
    const getSession = async request => { lookupRequests.push(request); return session; };
    return { getSession, getSessionFromRequest: getSession };
  }
  if (name === '@/lib/grading/period-service') {
    return { readPeriodConfiguration: async () => ({ policy: defaultPeriodPolicy, assignments: {} }) };
  }
  return load.call(this, name, ...args);
};
try {
  profile = require('../../apps/web/src/app/api/admin/users/[userId]/route.ts').GET;
  gradebook = require('../../apps/web/src/app/api/courses/[courseId]/gradebook/export/route.ts').GET;
} finally {
  Module._load = load;
}

function actor(role) {
  session = role ? { user: { id: 'actor', role, instituteId: 'a' } } : null;
  target = { id: 'target', instituteId: 'a', role: 'TEACHER' };
  course = { id: 'course', instituteId: 'a', instructorId: 'actor', title: 'Dummy Course', code: 'DUMMY' };
  lookupRequests = [];
  profileRead = undefined;
  gradeReads = [];
}

function profileRequest() {
  return profile(new Request('https://lms.example.invalid/api/admin/users/target'), { params: Promise.resolve({ userId: 'target' }) });
}

function gradebookRequest() {
  const request = new Request('https://lms.example.invalid/api/courses/course/gradebook/export');
  return gradebook(request, { params: Promise.resolve({ courseId: 'course' }) });
}

test('account detail requires an admitted institute Administrator', async () => {
  for (const [role, expected] of [[null, 401], ['STUDENT', 403], ['TEACHER', 403], ['SUPER_USER', 403], ['UNKNOWN', 403]]) {
    actor(role);
    assert.equal((await profileRequest()).status, expected);
    assert.equal(profileRead, undefined);
  }
});

test('account detail keeps hierarchy and rejects a target in another institute', async () => {
  actor('ADMIN');
  target.instituteId = 'b';
  assert.equal((await profileRequest()).status, 404);
  target.instituteId = 'a';
  target.role = 'ADMIN';
  assert.equal((await profileRequest()).status, 403);
  assert.equal(profileRead, undefined);
});

test('eligible account detail scopes the final read and returns only the profile projection', async () => {
  actor('ADMIN');
  const response = await profileRequest();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).user.email, 'teacher@example.invalid');
  assert.equal(profileRead.where.id, 'target');
  assert.equal(profileRead.where.instituteId, 'a');
  assert.deepEqual(profileRead.where.role, { in: ['STUDENT', 'PROFESSOR', 'TEACHER', 'INSTRUCTOR'], mode: 'insensitive' });
  assert.deepEqual(Object.keys(profileRead.select).sort(), ['createdAt', 'email', 'id', 'institute', 'isActive', 'name', 'permissions', 'role', 'uniqueId']);
});

test('gradebook download resolves one request context and accepts instructor aliases', async () => {
  for (const role of ['PROFESSOR', 'TEACHER', 'INSTRUCTOR']) {
    actor(role);
    const response = await gradebookRequest();
    assert.equal(response.status, 200);
    assert.ok(lookupRequests[0] instanceof Request);
    assert.ok(lookupRequests.every(request => request === lookupRequests[0]));
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(await response.text(), /"Student Name","Email"/);
    assert.equal(gradeReads.length, 2);
    assert.ok(gradeReads.every(where => where.student.instituteId === 'a'));
  }
});

test('gradebook download retains the same-institute Administrator operation', async () => {
  actor('ADMIN');
  course.instructorId = 'other';
  assert.equal((await gradebookRequest()).status, 200);
});

test('gradebook download requires an authorized role and course relationship', async () => {
  for (const [role, expected] of [[null, 401], ['STUDENT', 403], ['SUPER_USER', 403], ['UNKNOWN', 403]]) {
    actor(role);
    assert.equal((await gradebookRequest()).status, expected);
    assert.equal(gradeReads.length, 0);
  }
  actor('TEACHER');
  course.instructorId = 'another-instructor';
  assert.equal((await gradebookRequest()).status, 403);
  course.instituteId = 'b';
  assert.equal((await gradebookRequest()).status, 404);
  assert.equal(gradeReads.length, 0);
});
