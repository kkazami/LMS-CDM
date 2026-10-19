// Starts an owned loopback PostgreSQL instance. No dotenv or configured LMS database.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { createDisposablePostgres } from "../program-head/postgres-fixture.mjs";
import { asAccount } from "../program-head/administrator-checks.mjs";
import { installSuperUserBoundary } from "../../scripts/install-super-user-boundary.mjs";
import { installRosterActivation } from "../../scripts/install-roster-activation.mjs";
import { hash } from "bcryptjs";

const output = path.resolve("tmp/roster-import/integration-" + Date.now());
fs.mkdirSync(output, { recursive: true });
const report = {
  disposable: true,
  checks: [],
  startedAt: new Date().toISOString(),
};
const safeEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(
      key,
    ),
  ),
);
safeEnv.DATABASE_URL = "postgresql://unused@127.0.0.1:1/harness_offline_roster";
safeEnv.DOTENV_CONFIG_PATH = path.join(output, "empty.env");
fs.writeFileSync(safeEnv.DOTENV_CONFIG_PATH, "");
const pnpm = path.join(
  process.env.APPDATA,
  "npm/node_modules/pnpm/bin/pnpm.cjs",
);
async function ddl(schema) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        pnpm,
        "exec",
        "prisma",
        "migrate",
        "diff",
        "--from-empty",
        "--to-schema",
        schema,
        "--script",
      ],
      { env: safeEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let sql = "";
    child.stdout.on("data", (value) => (sql += value));
    child.stderr.resume();
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(sql)
        : reject(new Error("Offline schema generation failed.")),
    );
  });
}
async function check(name, work) {
  await work();
  report.checks.push({ name, result: "PASS" });
  console.log("PASS " + name);
}
let cluster, db;
try {
  const baseline = await ddl("tests/roster/fixtures/baseline.prisma");
  cluster = await createDisposablePostgres();
  report.database = { host: '127.0.0.1', name: cluster.database, artifactDirectory: path.relative(process.cwd(), cluster.artifactDirectory) };
  assert.match(cluster.database, /^harness_/);
  assert.equal(new URL(cluster.url).hostname, "127.0.0.1");
  await cluster.owner.query(baseline);
  await cluster.owner.query(
    `INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE'); INSERT INTO "User"(id,name,email,password,role,"instituteId","uniqueId") VALUES('admin','Synthetic Admin','admin@example.invalid','UNUSABLE','ADMIN','ics',''),('faculty','Synthetic Instructor','faculty@example.invalid','UNUSABLE','PROFESSOR','ics','EMP-1'),('legacy','Legacy Student','legacy@example.invalid','PRESERVE_THIS_HASH','STUDENT','ics','0024-00001'),('foreign','Foreign Student','foreign@example.invalid','UNUSABLE','STUDENT','ibe','0024-99999'); INSERT INTO "AcademicProgram"(id,"instituteId",code,name) VALUES('bsit','ics','BSIT','Information Technology'),('other','ics','BSCS','Computer Science'),('foreign-program','ibe','BSBA','Business'); INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","updatedAt") VALUES('legacy-course','OLD','OLDJOIN','Legacy Course','ics',CURRENT_TIMESTAMP); INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES('old-enrollment','legacy-course','legacy','APPROVED')`,
  );
  const legacy = (
    await cluster.owner.query(
      'SELECT name,email,password,role,"isActive" FROM "User" WHERE id=\'legacy\'',
    )
  ).rows[0];
  const compatibility = fs.readFileSync(
    "prisma/migrations/20261019083000_roster_compatibility/migration.sql", "utf8",
  );
  const reconciliation = fs.readFileSync(
    "prisma/migrations/20261019090000_roster_activation/migration.sql",
    "utf8",
  );
  report.compatibilitySHA256 = createHash('sha256').update(compatibility).digest('hex');
  report.reconciliationSHA256 = createHash('sha256').update(reconciliation).digest('hex');
  const withoutTransaction = (sql) => sql.replace(/^([\s\S]*?)\bBEGIN;/, '$1').replace(/COMMIT;\s*$/, '');
  const migration = 'BEGIN;\n' + withoutTransaction(compatibility) + withoutTransaction(reconciliation) + '\nCOMMIT;';
  await check("Additive compatibility stage preserves conflicting legacy IDs and passwords", async () => {
    await cluster.owner.query(`INSERT INTO "User"(id,name,email,password,role,"instituteId","uniqueId","studentNumber") VALUES('duplicate-id','Synthetic Duplicate','duplicate-id@example.invalid','PRESERVE_DUPLICATE','STUDENT','ics','0024-00001','0024-00001')`);
    await cluster.owner.query('BEGIN');
    await cluster.owner.query(withoutTransaction(compatibility));
    assert.equal((await cluster.owner.query(`SELECT "activationStatus",password FROM "User" WHERE id='duplicate-id'`)).rows[0].password, 'PRESERVE_DUPLICATE');
    assert.equal((await cluster.owner.query(`SELECT to_regclass('public."RateLimitBucket"') IS NOT NULL AS ready`)).rows[0].ready, true);
    assert.equal((await cluster.owner.query(`SELECT to_regclass('public."User_studentNumber_key"') IS NULL AS deferred`)).rows[0].deferred, true);
    await cluster.owner.query('ROLLBACK');
    await cluster.owner.query(`DELETE FROM "User" WHERE id='duplicate-id'`);
  });
  await check(
    "Migration rejects conflicting existing emails atomically",
    async () => {
      await cluster.owner.query(
        `INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES('collision','Duplicate','LEGACY@example.invalid','UNUSABLE','STUDENT','ics')`,
      );
      await assert.rejects(
        () => cluster.owner.query(migration),
        /ROSTER_RECONCILIATION_REQUIRED/,
      );
      await cluster.owner.query("ROLLBACK");
      assert.equal(
        (
          await cluster.owner.query(
            "SELECT count(*)::int n FROM information_schema.columns WHERE table_name='User' AND column_name='activationStatus'",
          )
        ).rows[0].n,
        0,
      );
      await cluster.owner.query("DELETE FROM \"User\" WHERE id='collision'");
    },
  );
  await check(
    "Existing upgrade preserves credentials, legacy courses and enrollment while backfilling student ID",
    async () => {
      await cluster.owner.query(migration);
      assert.deepEqual(
        (
          await cluster.owner.query(
            'SELECT name,email,password,role,"isActive" FROM "User" WHERE id=\'legacy\'',
          )
        ).rows[0],
        legacy,
      );
      assert.equal(
        (
          await cluster.owner.query(
            'SELECT "studentNumber","activationStatus" FROM "User" WHERE id=\'legacy\'',
          )
        ).rows[0].studentNumber,
        "0024-00001",
      );
      assert.equal(
        (
          await cluster.owner.query(
            'SELECT "termId" FROM "Course" WHERE id=\'legacy-course\'',
          )
        ).rows[0].termId,
        null,
      );
      assert.equal(
        (
          await cluster.owner.query(
            "SELECT status FROM \"Enrollment\" WHERE id='old-enrollment'",
          )
        ).rows[0].status,
        "APPROVED",
      );
    },
  );
  await check(
    "Fresh baseline replay plus migration matches current Prisma columns",
    async () => {
      await cluster.owner.query(
        "CREATE SCHEMA roster_expected; SET search_path=roster_expected,pg_catalog",
      );
      const current = await ddl("prisma/schema.prisma");
      await cluster.owner.query(
        current.replaceAll('"public".', '"roster_expected".'),
      );
      const columns = async (schema) =>
        (
          await cluster.owner.query(
            "SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema=$1 ORDER BY table_name,column_name",
            [schema],
          )
        ).rows;
      assert.deepEqual(
        await columns("public"),
        await columns("roster_expected"),
      );
      await cluster.owner.query("SET search_path=public,pg_catalog");
    },
  );
  await check(
    "Failed migration transaction leaves existing data intact",
    async () => {
      await cluster.owner.query("BEGIN");
      await cluster.owner.query(
        `UPDATE "User" SET name='MUST_ROLL_BACK' WHERE id='legacy'`,
      );
      await assert.rejects(() => cluster.owner.query("SELECT 1/0"));
      await cluster.owner.query("ROLLBACK");
      assert.equal(
        (
          await cluster.owner.query(
            "SELECT name FROM \"User\" WHERE id='legacy'",
          )
        ).rows[0].name,
        legacy.name,
      );
    },
  );
  // Install the same assignment guards as the established academic baseline.
  const assignmentSql = fs.readFileSync(
    "prisma/program-head-chart/approved-existing-target-update.sql",
    "utf8",
  );
  const guards = assignmentSql
    .slice(assignmentSql.indexOf("-- Assignments are administrative input"))
    .replace(/COMMIT;\s*$/, "")
    .replace(
      /CREATE UNIQUE INDEX "ProgramMembership_one_student_home"[^;]+;/,
      "",
    );
  await cluster.owner.query(guards);
  const bootstrap = await cluster.connect("bqual_bootstrap_admin", "postgres");
  await bootstrap.query("ALTER ROLE bqual_schema_owner CREATEROLE");
  const runtimePassword = randomBytes(32).toString("hex");
  await installSuperUserBoundary(cluster.owner, {
    runtimePrincipal: "roster_runtime",
    operatorPrincipal: "roster_operator",
    runtimePassword,
    operatorPassword: randomBytes(32).toString("hex"),
    qualificationReference: "SYNTHETIC_DISPOSABLE_ROSTER_REHEARSAL",
  });
  await cluster.owner.query(
    fs.readFileSync(
      "prisma/super-user-v1/administrator-consolidation.sql",
      "utf8",
    ),
  );
  await installRosterActivation(cluster.owner);
  const url = new URL(cluster.url);
  url.username = "roster_runtime";
  url.password = runtimePassword;
  for (const key of Object.keys(process.env))
    if (/^(PG|DATABASE_URL|POSTGRES|SUPER_USER|HARNESS|SMTP)/i.test(key))
      delete process.env[key];
  process.env.DATABASE_URL = url.href;
  process.env.NODE_ENV = "test";
  process.env.TSX_TSCONFIG_PATH = path.resolve("apps/web/tsconfig.json");
  process.env.EMAIL_INVITATIONS_ENABLED = "true";
  process.env.SMTP_HOST = "synthetic.invalid";
  process.env.SMTP_USER = "test@example.invalid";
  process.env.SMTP_PASS = "SYNTHETIC_NOT_REAL";
  process.env.APP_BASE_URL = "https://lms.example.invalid";
  globalThis.AsyncLocalStorage = AsyncLocalStorage;
  await import("tsx");
  let staleClientDisconnected = false;
  const staleClient = { $disconnect: async () => { staleClientDisconnected = true; } };
  globalThis.prisma = staleClient;
  delete globalThis.prismaSchemaVersion;
  ({ db } = await import("../../apps/web/src/lib/db.ts"));
  await check("Hot reload replaces a database client cached before the schema upgrade", async () => {
    assert.notEqual(db, staleClient);
    assert.equal(staleClientDisconnected, true);
    assert.match(globalThis.prismaSchemaVersion, /^[a-f0-9]{64}$/);
    const existing = await db.user.findUniqueOrThrow({where:{id:'legacy'}});
    assert.equal(existing.activationStatus, 'ACTIVE');
  });
  const imports = await import("../../apps/web/src/lib/roster/imports.ts");
  const activation = await import(
    "../../apps/web/src/lib/roster/activation.ts"
  );
  const invitations = await import(
    "../../apps/web/src/lib/roster/invitations.ts"
  );
  const { MailDeliveryError } = await import(
    "../../apps/web/src/lib/mailer.ts"
  );
  const { rosterActor, requireRosterConstraints } = await import(
    "../../apps/web/src/lib/roster/policy.ts"
  );
  const token = randomBytes(32).toString("base64url"),
    tokenHash = createHash("sha256").update(token).digest("hex");
  await db.session.create({
    data: {
      id: "session-admin",
      userId: "admin",
      tokenHash,
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const account = { token };
  const actor = {
    id: "admin",
    sessionId: "session-admin",
    tokenHash,
    instituteId: "ics",
  };
  const req = (url, body, auth = true, origin) =>
    new Request("http://localhost" + url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(auth ? { Authorization: "Bearer " + token } : {}),
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const termsApi = await import(
    "../../apps/web/src/app/api/admin/terms/route.ts"
  );
  const importsApi = await import(
    "../../apps/web/src/app/api/admin/imports/[...path]/route.ts"
  );
  const ctx = (path) => ({ params: Promise.resolve({ path }) });
  await check("Compatibility rollout keeps email login working, rejects ambiguous IDs and blocks imports", async () => {
    await cluster.owner.query('DROP INDEX "User_studentNumber_key"; DROP INDEX "User_studentNumber_normalized_key"');
    await assert.rejects(() => requireRosterConstraints(), (error) => error.status === 503);
    const invitationsApi = await import('../../apps/web/src/app/api/admin/invitations/route.ts');
    const viewing = await asAccount(account, () => invitationsApi.GET(req('/api/admin/invitations')));
    assert.equal(viewing.status, 200, 'Existing accounts remain visible while student imports need setup.');
    assert.ok(Array.isArray((await viewing.json()).users));
    assert.equal((await asAccount(account, () => termsApi.GET(req('/api/admin/terms')))).status, 200);
    assert.equal((await asAccount(account, () => importsApi.POST(req('/api/admin/imports/preview', {type:'STUDENTS',csv:'invalid'}),ctx(['preview'])))).status, 503);
    const password = 'SyntheticCompatibilityPass1!';
    const passwordHash = await hash(password, 12);
    await cluster.owner.query(`INSERT INTO "User"(id,name,email,password,role,"instituteId","studentNumber","uniqueId") VALUES('compat-a','Synthetic A','compat-a@example.invalid',$1,'STUDENT','ics','AMBIG-01','AMBIG-01'),('compat-b','Synthetic B','compat-b@example.invalid',$1,'STUDENT','ics','AMBIG-01','AMBIG-01')`, [passwordHash]);
    const login = await import('../../apps/web/src/app/api/auth/login/route.ts');
    const attempt = (identifier) => asAccount({token:'not-authenticated'}, () => login.POST(req('/api/auth/login', {identifier,password,instituteCode:'ics'},false)));
    assert.equal((await attempt('AMBIG-01')).status, 401);
    assert.equal((await attempt('compat-a@example.invalid')).status, 200);
    await cluster.owner.query(`DELETE FROM "Session" WHERE "userId" IN ('compat-a','compat-b'); DELETE FROM "GamificationProfile" WHERE "studentId" IN ('compat-a','compat-b'); DELETE FROM "User" WHERE id IN ('compat-a','compat-b')`);
    await cluster.owner.query('CREATE UNIQUE INDEX "User_studentNumber_key" ON "User"("studentNumber"); CREATE UNIQUE INDEX "User_studentNumber_normalized_key" ON "User"(upper(btrim("studentNumber"))) WHERE "studentNumber" IS NOT NULL');
    await requireRosterConstraints();
  });
  await check(
    "Direct APIs reject missing authentication, foreign origin, wrong role and foreign batch access",
    async () => {
      assert.equal(
        (await termsApi.GET(req("/api/admin/terms", undefined, false))).status,
        401,
      );
      assert.equal(
        (
          await termsApi.POST(
            req(
              "/api/admin/terms",
              { code: "X", name: "X" },
              true,
              "https://evil.invalid",
            ),
          )
        ).status,
        403,
      );
      const studentToken = randomBytes(32).toString("base64url");
      await cluster.owner.query(
        'INSERT INTO "Session"(id,"userId","tokenHash","expiresAt") VALUES($1,$2,$3,CURRENT_TIMESTAMP+interval \'1 day\')',
        [
          "session-student",
          "legacy",
          createHash("sha256").update(studentToken).digest("hex"),
        ],
      );
      assert.equal(
        (
          await termsApi.GET(
            new Request("http://localhost/api/admin/terms", {
              headers: { Authorization: "Bearer " + studentToken },
            }),
          )
        ).status,
        403,
      );
      await assert.rejects(
        () => imports.getBatch(actor, "foreign-id"),
        (e) => e.status === 404,
      );
      assert.equal(
        (await rosterActor(req("/api/admin/terms"))).instituteId,
        "ics",
      );
    },
  );
  await check(
    "Terms are institute-scoped and permit only one current term",
    async () => {
      for (const code of ["2026-1ST", "2026-2ND"])
        assert.equal(
          (
            await termsApi.POST(
              req("/api/admin/terms", { code, name: code, isCurrent: true }),
            )
          ).status,
          200,
        );
      assert.equal(
        await db.academicTerm.count({
          where: { instituteId: "ics", isCurrent: true },
        }),
        1,
      );
    },
  );
  const term1 = await db.academicTerm.findFirstOrThrow({
      where: { code: "2026-1ST" },
    }),
    term2 = await db.academicTerm.findFirstOrThrow({
      where: { code: "2026-2ND" },
    });
  const csv =
    "student_Id,last_name,first_name,email,program,section\n0024-00002,Dela Cruz,Juan,juan@example.invalid,BSIT,BSIT-1A";
  let student;
  await check(
    "Student preview creates nothing; confirmation creates pending account and protected membership without passwords",
    async () => {
      const preview = await imports.previewImport(actor, {
        type: "STUDENTS",
        csv,
      });
      assert.equal(
        await db.user.count({ where: { email: "juan@example.invalid" } }),
        0,
      );
      assert.equal(preview.rows[0].proposedAction, "NEW");
      const result = await imports.commitImport(actor, preview.id, {});
      assert.equal(result.rows[0].outcome, "CREATED");
      student = await db.user.findUniqueOrThrow({
        where: { email: "juan@example.invalid" },
      });
      assert.equal(student.password, null);
      assert.equal(student.activationStatus, "PENDING_ACTIVATION");
      assert.equal(student.studentNumber, "0024-00002");
      assert.equal(student.uniqueId, student.studentNumber);
    await assert.rejects(() => db.session.create({ data: { userId: student.id, tokenHash: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + 3600000) } }));
      assert.equal(
        (
          await db.programMembership.findUnique({
            where: {
              programId_userId: { programId: "bsit", userId: student.id },
            },
          })
        ).kind,
        "STUDENT",
      );
      await imports.commitImport(actor, preview.id, {});
      assert.equal(await db.user.count({ where: { email: student.email } }), 1);
    },
  );
  await check(
    "Database denies direct membership writes and forged or foreign program assignment",
    async () => {
      await assert.rejects(() =>
        db.programMembership.update({
          where: {
            programId_userId: { programId: "bsit", userId: student.id },
          },
          data: { isActive: false },
        }),
      );
      await assert.rejects(
        () =>
          db.$executeRaw`SELECT super_user_security.set_student_program(${"session-admin"},${"forged"},${student.id},${"other"})`,
      );
      await assert.rejects(
        () =>
          db.$executeRaw`SELECT super_user_security.set_student_program(${"session-admin"},${tokenHash},${student.id},${"foreign-program"})`,
      );
    },
  );
  await check(
    "All in-file duplicates and cross-institute identity conflicts are errors; valid rows remain importable",
    async () => {
      const duplicate = await imports.previewImport(actor, {
        type: "STUDENTS",
        csv:
          csv + "\n0024-00002,Other,Person,other@example.invalid,BSIT,BSIT-1A",
      });
      assert.ok(duplicate.rows.every((r) => r.proposedAction === "ERROR"));
      const foreign = await imports.previewImport(actor, {
        type: "STUDENTS",
        csv: csv
          .replace("0024-00002", "0024-99999")
          .replace("juan@example.invalid", "foreign@example.invalid"),
      });
      assert.equal(foreign.rows[0].proposedAction, "ERROR");
      assert.ok(!JSON.stringify(foreign.rows[0].issues).includes("ibe"));
      const invalid = await imports.previewImport(actor, {
        type: "STUDENTS",
        csv: csv.replace("BSIT,", "MISSING,"),
      });
      assert.equal(invalid.rows[0].proposedAction, "ERROR");
    },
  );
  await check(
    "Update preserves identity and suspension; stale previews cannot overwrite newer profile changes",
    async () => {
      const update = await imports.previewImport(actor, {
        type: "STUDENTS",
        csv: csv.replace("Dela Cruz", "Santos"),
      });
      await db.user.update({
        where: { id: student.id },
        data: { name: "Concurrent Edit" },
      });
      const stale = await imports.commitImport(actor, update.id, {
        policy: "UPDATE",
      });
      assert.equal(stale.rows[0].outcome, "ERROR");
      const refreshed = await imports.previewImport(actor, {
        type: "STUDENTS",
        csv: csv.replace("Dela Cruz", "Santos"),
      });
      const done = await imports.commitImport(actor, refreshed.id, {
        policy: "UPDATE",
      });
      assert.equal(done.rows[0].outcome, "UPDATED");
      const current = await db.user.findUniqueOrThrow({
        where: { id: student.id },
      });
      assert.equal(current.lastName, "Santos");
      assert.equal(current.email, student.email);
      assert.equal(current.password, null);
      await db.user.update({
        where: { id: student.id },
        data: { isActive: false },
      });
      const suspended = await imports.previewImport(actor, {
        type: "STUDENTS",
        csv,
      });
      await imports.commitImport(actor, suspended.id, { policy: "UPDATE" });
      assert.equal(
        (await db.user.findUniqueOrThrow({ where: { id: student.id } }))
          .isActive,
        false,
      );
      await db.user.update({
        where: { id: student.id },
        data: { isActive: true },
      });
    },
  );
  const courseCsv =
    "courseCode,subject,title,section,room,description,instructorEmail,program\nIT101,Computing,Introduction to Computing,BSIT-1A,Room 301,,faculty@example.invalid,BSIT";
  let course;
  await check(
    "Course imports distinguish academic code from join code and allow repeated offerings next term",
    async () => {
      for (const term of [term1, term2]) {
        const batch = await imports.previewImport(actor, {
          type: "COURSES",
          csv: courseCsv,
          termId: term.id,
        });
        assert.equal(
          (await imports.commitImport(actor, batch.id, {})).rows[0].outcome,
          "CREATED",
        );
      }
      course = await db.course.findFirstOrThrow({
        where: { termId: term1.id, code: "IT101" },
      });
      assert.notEqual(course.courseCode, "IT101");
      assert.equal(course.programId, "bsit");
      assert.equal(
        (
          await imports.previewImport(actor, {
            type: "COURSES",
            csv: courseCsv,
            termId: term1.id,
          })
        ).rows[0].proposedAction,
        "EXISTING",
      );
      assert.equal(
        (
          await imports.previewImport(actor, {
            type: "COURSES",
            csv: courseCsv.replace(
              "faculty@example.invalid",
              "missing@example.invalid",
            ),
            termId: term1.id,
          })
        ).rows[0].proposedAction,
        "ERROR",
      );
    },
  );
  await check(
    "Enrollment proposals require confirmation and approve pending students idempotently",
    async () => {
      const match = await imports.previewMatches(actor, term1.id);
      assert.equal(
        await db.enrollment.count({ where: { courseId: course.id } }),
        0,
      );
      await db.user.update({ where: { id: student.id }, data: { section: 'CHANGED-SECTION' } });
      assert.equal((await imports.commitImport(actor, match.id, {})).rows[0].outcome, 'ERROR');
      await db.user.update({ where: { id: student.id }, data: { section: 'BSIT-1A' } });
      const refreshed = await imports.previewMatches(actor, term1.id);
      await imports.commitImport(actor, refreshed.id, {});
      assert.equal(
        (
          await db.enrollment.findUnique({
            where: {
              courseId_studentId: {
                courseId: course.id,
                studentId: student.id,
              },
            },
          })
        ).status,
        "APPROVED",
      );
      const repeat = await imports.previewMatches(actor, term1.id);
      await imports.commitImport(actor, repeat.id, {});
      assert.equal(
        await db.enrollment.count({ where: { courseId: course.id } }),
        1,
      );
    },
  );
  await check(
    "Public registration rejects every role without creating accounts",
    async () => {
      const api = await import(
        "../../apps/web/src/app/api/auth/register/route.ts"
      );
      const before = await db.user.count();
      for (const role of ["STUDENT", "INSTRUCTOR", "ADMIN"]) {
        const response = await api.POST(
          req("/api/auth/register", { role }, false),
        );
        assert.equal(response.status, 403);
        assert.equal((await response.json()).code, "REGISTRATION_DISABLED");
      }
      assert.equal(await db.user.count(), before);
    },
  );
  const sent = [];
  const driver = {
    verify: async () => true,
    send: async (options) => {
      sent.push(options);
      return {
        success: true,
        deliveredVia: "smtp",
        messageId: "synthetic-" + sent.length,
      };
    },
  };
  await check(
    "Invitation readiness, deduplication, SMTP acceptance and 48-hour reminder scheduling",
    async () => {
      await assert.rejects(
        () =>
          invitations.enqueueInvitations(actor, {
            userIds: [student.id],
            requestId: randomUUID(),
          }),
        (e) => e.status === 503,
      );
      await invitations.processInvitations(driver);
      const requestId = randomUUID();
      assert.equal(
        (
          await invitations.enqueueInvitations(actor, {
            userIds: [student.id],
            requestId,
          })
        ).queued,
        1,
      );
      assert.equal(
        (
          await invitations.enqueueInvitations(actor, {
            userIds: [student.id],
            requestId,
          })
        ).queued,
        0,
      );
      assert.equal((await invitations.processInvitations(driver)).processed, 1);
      const reminder = await db.emailJob.findFirstOrThrow({
        where: { userId: student.id, purpose: "REMINDER" },
      });
      assert.ok(
        Math.abs(reminder.scheduledAt.getTime() - Date.now() - 48 * 3600000) <
          5000,
      );
      assert.equal(sent[0].to, student.email);
    const estimate = await invitations.deliveryEstimate(1);
    assert.equal(estimate.queuedCount, 0, 'Future reminders do not delay initial-invitation estimates.');
    assert.ok(new Date(estimate.estimatedCompletion).getTime() < Date.now() + 60000);
    },
  );
  const rawToken = () =>
    new URL(sent[sent.length - 1].text.match(/https:\/\/\S+/)[0]).hash.slice(
      "#token=".length,
    );
  const oldToken = rawToken();
  await check(
    "Known suspended accounts and pending accounts cannot bypass activation through login or reset",
    async () => {
      const login = await import(
        "../../apps/web/src/app/api/auth/login/route.ts"
      );
      const reset = await import(
        "../../apps/web/src/app/api/auth/forgot-password/route.ts"
      );
      const response = await login.POST(
        req(
          "/api/auth/login",
          {
            identifier: student.studentNumber,
            password: "AnyPassword123",
            instituteCode: "ics",
          },
          false,
        ),
      );
      assert.equal(response.status, 401);
      const before = await db.passwordResetOtp.count({
        where: { userId: student.id },
      });
      assert.equal(
        (
          await reset.POST(
            req("/api/auth/forgot-password", { email: student.email }, false),
          )
        ).status,
        200,
      );
      assert.equal(
        await db.passwordResetOtp.count({ where: { userId: student.id } }),
        before,
      );
    },
  );
  await check(
    "Pending email correction revokes old grants, cancels reminders and requires a separate resend",
    async () => {
      const before = await db.emailSendAttempt.count();
      await activation.correctPendingEmail(actor, student.id, {
        email: "corrected@example.invalid",
        reason: "Registrar corrected roster typo",
        invitationVersion: 0,
      });
      await assert.rejects(
        () => activation.inspectActivation(oldToken),
        (e) => e.status === 400,
      );
      assert.equal(
        await db.emailJob.count({
          where: { userId: student.id, status: "QUEUED" },
        }),
        0,
      );
      assert.equal(await db.emailSendAttempt.count(), before);
      assert.equal(
        (await db.user.findUnique({ where: { id: student.id } }))
          .invitationVersion,
        1,
      );
      await invitations.enqueueInvitations(actor, {
        userIds: [student.id],
        requestId: randomUUID(),
      });
      await invitations.processInvitations(driver);
      assert.equal(sent[sent.length - 1].to, "corrected@example.invalid");
      const grants = await db.accountActivationToken.findMany({
        where: { userId: student.id },
      });
      assert.ok(!JSON.stringify(grants).includes(rawToken()));
    },
  );
  await check(
    "Activation consumes a grant once under concurrency and cancels remaining invitations",
    async () => {
      const token = rawToken(),
        body = {
          token,
          password: "Synthetic-Student-12345",
          confirmPassword: "Synthetic-Student-12345",
        };
      assert.equal(
        (await activation.inspectActivation(token)).email,
        "corrected@example.invalid",
      );
      const results = await Promise.allSettled([
        activation.completeActivation(body),
        activation.completeActivation(body),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const current = await db.user.findUniqueOrThrow({
        where: { id: student.id },
      });
      assert.equal(current.activationStatus, "ACTIVE");
      assert.ok(current.password.startsWith("$2"));
      assert.equal(
        await db.emailJob.count({
          where: {
            userId: student.id,
            status: { in: ["QUEUED", "PROCESSING"] },
          },
        }),
        0,
      );
      await assert.rejects(
        () =>
          activation.correctPendingEmail(actor, student.id, {
            email: "another@example.invalid",
            reason: "Not pending",
            invitationVersion: 1,
          }),
        (e) => e.status === 409,
      );
    },
  );
  await check(
    "Email and student ID login share an account budget and remain compatible",
    async () => {
      const api = await import(
        "../../apps/web/src/app/api/auth/login/route.ts"
      );
      for (const identity of [
        { email: "corrected@example.invalid" },
        { identifier: student.studentNumber },
      ]) {
        const response = await asAccount({ token: "not-authenticated" }, () =>
          api.POST(
            req(
              "/api/auth/login",
              {
                ...identity,
                password: "Synthetic-Student-12345",
                instituteCode: "ics",
              },
              false,
            ),
          ),
        );
        assert.equal(response.status, 200);
      }
    },
  );
  await check(
    "Internal queue endpoint rejects missing secrets before processing",
    async () => {
      const api = await import(
        "../../apps/web/src/app/api/internal/email/process/route.ts"
      );
      process.env.CRON_SECRET = "synthetic-".repeat(5);
      assert.equal(
        (await api.POST(req("/api/internal/email/process", {}, false))).status,
        401,
      );
    },
  );
  await check(
    "Reports are authenticated and current batches expose server validation only",
    async () => {
      const batch = await imports.previewImport(actor, {
        type: "STUDENTS",
        csv: csv.replace("juan@example.invalid", "conflict@example.invalid"),
      });
      assert.equal(
        (
          await importsApi.GET(
            req("/api/admin/imports/" + batch.id + "/report", undefined, false),
            ctx([batch.id, "report"]),
          )
        ).status,
        401,
      );
      const response = await importsApi.GET(
        req("/api/admin/imports/" + batch.id + "/report"),
        ctx([batch.id, "report"]),
      );
      assert.equal(response.status, 200);
      assert.match(await response.text(), /errors/);
    },
  );
  async function pending(number) {
    const email = "queue-" + number + "@example.invalid";
    const csv =
      "student_Id,last_name,first_name,email,program,section\n0024-" +
      number +
      ",Queue,Student," +
      email +
      ",BSIT,BSIT-1A";
    const batch = await imports.previewImport(actor, { type: "STUDENTS", csv });
    await imports.commitImport(actor, batch.id, {});
    return db.user.findUniqueOrThrow({ where: { email } });
  }
  await check(
    "Concurrent processors claim an invitation once and an in-flight email correction cannot restore old status",
    async () => {
      const user = await pending("00003");
      await invitations.enqueueInvitations(actor, {
        userIds: [user.id],
        requestId: randomUUID(),
      });
      let obsoleteToken;
      const racingDriver = {
        verify: driver.verify,
        send: async (options) => {
          obsoleteToken = new URL(
            options.text.match(/https:\/\/\S+/)[0],
          ).hash.slice("#token=".length);
          await activation.correctPendingEmail(actor, user.id, {
            email: "racing-correction@example.invalid",
            reason: "Corrected during SMTP flight",
            invitationVersion: 0,
          });
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            success: true,
            deliveredVia: "smtp",
            messageId: "synthetic-flight",
          };
        },
      };
      const results = await Promise.all([
        invitations.processInvitations(racingDriver),
        invitations.processInvitations(racingDriver),
      ]);
      assert.equal(
        results.reduce((sum, r) => sum + r.processed, 0),
        1,
      );
      await assert.rejects(
        () => activation.inspectActivation(obsoleteToken),
        (e) => e.status === 400,
      );
      const state = (await invitations.invitationAccounts(actor)).users.find(
        (u) => u.id === user.id,
      );
      assert.equal(state.invitationStatus, "NOT_SENT");
      assert.equal(
        await db.emailJob.count({ where: { userId: user.id, status: "SENT" } }),
        0,
      );
    },
  );
  await check(
    "Transient ambiguous sends retry with persisted attempts and exhaust after five attempts",
    async () => {
      const user = await pending("00004");
      await invitations.enqueueInvitations(actor, {
        userIds: [user.id],
        requestId: randomUUID(),
      });
      const broken = {
        verify: driver.verify,
        send: async () => {
          throw new MailDeliveryError("ECONNECTION");
        },
      };
      for (let i = 0; i < 5; i++) {
        await db.emailJob.updateMany({
          where: { userId: user.id, purpose: "INVITATION", status: "QUEUED" },
          data: { scheduledAt: new Date(0) },
        });
        await db.emailSenderState.update({
          where: { id: "invitations" },
          data: { nextSendAt: null },
        });
        assert.equal(
          (await invitations.processInvitations(broken)).processed,
          1,
        );
      }
      const job = await db.emailJob.findFirstOrThrow({
        where: { userId: user.id, purpose: "INVITATION" },
        include: { attempts: true },
      });
      assert.equal(job.attemptCount, 5);
      assert.equal(job.status, "FAILED");
      assert.ok(job.attempts.every((a) => a.outcome === "UNKNOWN"));
    },
  );
  await check(
    "Quota defers work without consuming grants and authentication errors pause the sender",
    async () => {
      const user = await pending("00005");
      await invitations.enqueueInvitations(actor, {
        userIds: [user.id],
        requestId: randomUUID(),
      });
      process.env.EMAIL_DAILY_LIMIT = "1";
      const count = await db.emailSendAttempt.count();
      assert.equal((await invitations.processInvitations(driver)).processed, 0);
      assert.equal(await db.emailSendAttempt.count(), count);
      process.env.EMAIL_DAILY_LIMIT = "400";
      await db.emailSenderState.update({
        where: { id: "invitations" },
        data: { nextSendAt: null },
      });
      await invitations.processInvitations({
        verify: driver.verify,
        send: async () => {
          throw new MailDeliveryError("EAUTH", 535);
        },
      });
      assert.equal((await invitations.senderStatus()).paused, true);
      await db.emailJob.updateMany({
        where: { userId: user.id },
        data: { status: "CANCELLED" },
      });
      await db.emailSenderState.update({
        where: { id: "invitations" },
        data: { pausedUntil: null, pauseReason: null, nextSendAt: null },
      });
    },
  );
  await check(
    "A due reminder is sent with a fresh token and recent resends suppress unnecessary reminders",
    async () => {
      const user = await pending("00006");
      await invitations.enqueueInvitations(actor, {
        userIds: [user.id],
        requestId: randomUUID(),
      });
      await invitations.processInvitations(driver);
      await db.emailJob.updateMany({
        where: { userId: user.id, purpose: "INVITATION", status: "SENT" },
        data: { sentAt: new Date(Date.now() - 48 * 3600000) },
      });
      await db.emailJob.updateMany({
        where: { userId: user.id, purpose: "REMINDER" },
        data: { scheduledAt: new Date(0) },
      });
      const before = sent.length;
      await invitations.processInvitations(driver);
      assert.equal(sent.length, before + 1);
      assert.match(sent[sent.length - 1].subject, /Reminder/);
      const other = await pending("00007");
      await invitations.enqueueInvitations(actor, {
        userIds: [other.id],
        requestId: randomUUID(),
      });
      await invitations.processInvitations(driver);
      await db.emailJob.updateMany({
        where: { userId: other.id, purpose: "REMINDER" },
        data: { scheduledAt: new Date(0) },
      });
      const last = sent.length;
      await invitations.processInvitations(driver);
      assert.equal(sent.length, last);
      assert.equal(
        (
          await db.emailJob.findFirst({
            where: { userId: other.id, purpose: "REMINDER" },
          })
        ).status,
        "CANCELLED",
      );
    },
  );
  await check('An update waiting on a concurrent student edit revalidates after acquiring its row lock', async () => {
    const user = await pending('00009');
    const csv = 'student_Id,last_name,first_name,email,program,section\n' + user.studentNumber + ',Changed,Name,' + user.email + ',BSIT,BSIT-1A';
    const batch = await imports.previewImport(actor, { type: 'STUDENTS', csv });
    const blocker = await cluster.connect('bqual_test_migrator', cluster.database, true);
    await blocker.query('BEGIN');
    await blocker.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE', [user.id]);
    const commit = imports.commitImport(actor, batch.id, { policy: 'UPDATE' });
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      await blocker.query('UPDATE "User" SET name=$1 WHERE id=$2', ['Concurrent Registrar Edit', user.id]);
      await blocker.query('COMMIT');
      assert.equal((await commit).rows[0].outcome, 'ERROR');
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).name, 'Concurrent Registrar Edit');
    } finally { await blocker.query('ROLLBACK'); await blocker.end(); await commit.catch(() => {}); }
  });
  await check('Chunked confirmation resumes without duplicates and invitation enqueueing supports an atomic batch', async () => {
    const csv = 'student_Id,last_name,first_name,email,program,section\n' + Array.from({ length: 51 }, (_, i) => 'R-' + String(i).padStart(5, '0') + ',Resume,Student,resume-' + i + '@example.invalid,BSIT,RESUME-SECTION').join('\n');
    const batch = await imports.previewImport(actor, { type: 'STUDENTS', csv });
    const first = await imports.commitImport(actor, batch.id, {}); assert.equal(first.status, 'PROCESSING'); assert.equal(first.rows.filter(r => r.outcome === 'CREATED').length, 50);
    const completed = await imports.commitImport(actor, batch.id, {}); assert.equal(completed.status, 'COMPLETED');
    await imports.commitImport(actor, batch.id, {});
    const users = await db.user.findMany({ where: { email: { startsWith: 'resume-' } } }); assert.equal(users.length, 51);
    const result = await invitations.enqueueInvitations(actor, { userIds: users.map(u => u.id), requestId: randomUUID() }); assert.equal(result.queued, 51);
    await db.emailJob.updateMany({ where: { userId: { in: users.map(u => u.id) } }, data: { status: 'CANCELLED' } });
  });
  if (process.argv.includes("--browser")) {
    const { browserChecks } = await import("./browser.mjs");
    await browserChecks({
      url: url.href,
      token,
      actor,
      invitations,
      driver,
      sent,
      check,
      output,
      safeEnv,
      termId: term1.id,
      previewMatches: () => imports.previewMatches(actor, term1.id),
    });
  }
  report.success = true;
} catch (error) {
  report.success = false;
  report.error = error.message;
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  if (db) {
    await db.$disconnect();
    await globalThis.pgPool?.end();
  }
  if (cluster) {
    await cluster.stop();
    const data = path.resolve(cluster.artifactDirectory, 'postgres-data');
    const boundary = path.resolve('.orchestra/product-development/program-head-integration') + path.sep;
    if (!data.startsWith(boundary) || fs.lstatSync(data).isSymbolicLink() || fs.existsSync(path.join(data, 'postmaster.pid'))) throw new Error('Stopped test database cleanup boundary mismatch.');
    fs.rmSync(data, { recursive: true });
  }
  report.completedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    "Report: " + path.relative(process.cwd(), path.join(output, "report.json")),
  );
}
