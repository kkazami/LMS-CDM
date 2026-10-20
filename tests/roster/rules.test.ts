import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRosterCsv,
  csvFile,
  HEADERS,
  STUDENT_SCHEMA,
  COURSE_SCHEMA,
} from "../../apps/web/src/lib/roster/csv";
import {
  grantMatches,
  estimateDelivery,
  LINK_LIFETIME_MS,
  REMINDER_DELAY_MS,
  escapeHtml,
} from "../../apps/web/src/lib/roster/invitation-rules";
import {
  mayAdmitAccount,
  mayUsePublicReset,
} from "../../apps/web/src/lib/super-user-v1/capabilities";
import {
  loginSchema,
  passwordSchema,
} from "../../apps/web/src/lib/auth-schema";

const header = HEADERS.STUDENTS.join(",");
const row = "0024-00001,Dela Cruz,Juan,juan@example.invalid,BSIT,BSIT-2A";
test("CSV accepts BOM, CRLF, reordered case-insensitive headers and compound Unicode names", () => {
  const result = parseRosterCsv(
    '\uFEFFEmail,First_Name,last_name,student_id,section,program\r\njuan@example.invalid,"Juan, José",Dela Cruz,0024-00001,BSIT-2A,BSIT\r\n',
    "STUDENTS",
  );
  assert.equal(result[0].values.student_Id, "0024-00001");
  assert.equal(result[0].values.first_name, "Juan, José");
  assert.equal(result[0].rowNumber, 2);
});
test("CSV supports escaped quotes, multiline descriptions, and source line references", () => {
  const text =
    HEADERS.COURSES.join(",") +
    '\r\nIT101,Computing,Introduction,BSIT-1A,,,prof@example.invalid,BSIT\r\nIT102,Computing,Programming,BSIT-1A,,"Line one\nLine ""two""",,BSIT';
  const rows = parseRosterCsv(text, "COURSES");
  assert.equal(rows[1].values.description, 'Line one\nLine "two"');
  assert.equal(rows[1].rowNumber, 4);
});
test("CSV rejects old templates, duplicate or unexpected headers, and malformed records", () => {
  for (const raw of [
    "name,email,uniqueId,role\nA,a@example.invalid,1,STUDENT",
    "student_Id,last_name,first_name,email,program,program\n" + row,
    header + ",password\n" + row + ",secret",
    header + '\n"unclosed',
  ])
    assert.throws(() => parseRosterCsv(raw, "STUDENTS"));
});
test("CSV requires data and enforces file and row limits", () => {
  assert.throws(() => parseRosterCsv(header, "STUDENTS"));
  assert.throws(
    () =>
      parseRosterCsv(
        header + "\n" + Array(501).fill(row).join("\n"),
        "STUDENTS",
      ),
    /500/,
  );
  assert.throws(() => parseRosterCsv("x".repeat(2097153), "STUDENTS"), /2 MiB/);
  assert.equal(
    parseRosterCsv(header + "\n" + Array(500).fill(row).join("\n"), "STUDENTS")
      .length,
    500,
  );
  assert.equal(
    parseRosterCsv(header + "\n,,,,,\n" + row + "\n,,,,,", "STUDENTS").length,
    1,
  );
});
test("Student validation preserves identifiers and requires all six values", () => {
  const values = parseRosterCsv(header + "\n" + row, "STUDENTS")[0].values;
  assert.equal(STUDENT_SCHEMA.parse(values).student_Id, "0024-00001");
  for (const key of HEADERS.STUDENTS)
    assert.equal(
      STUDENT_SCHEMA.safeParse({ ...values, [key]: "" }).success,
      false,
    );
  assert.equal(
    STUDENT_SCHEMA.safeParse({ ...values, student_Id: "ab-0001" }).success,
    true,
  );
  assert.equal(
    STUDENT_SCHEMA.safeParse({ ...values, student_Id: "a b" }).success,
    false,
  );
});
test("Course validation requires subject and section and accepts unassigned courses", () => {
  const course = {
    courseCode: "it101",
    subject: "Computing",
    title: "Introduction",
    section: "bsit-1a",
    room: "",
    description: "",
    instructorEmail: "",
    program: "",
  };
  assert.equal(COURSE_SCHEMA.parse(course).courseCode, "IT101");
  assert.equal(
    COURSE_SCHEMA.safeParse({ ...course, section: "" }).success,
    false,
  );
  assert.equal(
    COURSE_SCHEMA.safeParse({ ...course, subject: "" }).success,
    false,
  );
});
test("Reports escape quotes and neutralize spreadsheet formula injection", () => {
  const output = csvFile([
    ['=HYPERLINK("bad")', "  +cmd", "@SUM(1)", "\ttext", "Juan, José"],
  ]);
  assert.match(output, /'=HYPERLINK/);
  assert.match(output, /'  \+cmd/);
  assert.match(output, /'@SUM/);
  assert.match(output, /'\ttext/);
  assert.match(output, /"Juan, José"/);
});
test("Activation rejects stale versions, changed emails, expired, consumed and revoked grants", () => {
  const now = new Date(),
    user = {
      role: "STUDENT",
      isActive: true,
      activationStatus: "PENDING_ACTIVATION",
      email: "student@example.invalid",
      invitationVersion: 2,
    };
  const grant = {
    email: user.email,
    invitationVersion: 2,
    expiresAt: new Date(now.getTime() + LINK_LIFETIME_MS),
    consumedAt: null,
    revokedAt: null,
  };
  assert.equal(grantMatches(grant, user, now), true);
  for (const changed of [
    { invitationVersion: 1 },
    { email: "old@example.invalid" },
    { expiresAt: now },
    { consumedAt: now },
    { revokedAt: now },
  ])
    assert.equal(grantMatches({ ...grant, ...changed }, user, now), false);
  assert.equal(grantMatches(grant, { ...user, isActive: false }, now), false);
  assert.equal(
    grantMatches(grant, { ...user, activationStatus: "ACTIVE" }, now),
    false,
  );
});
test("Pending students cannot authenticate or bypass activation through public reset", () => {
  const user = {
    role: "STUDENT",
    isActive: true,
    activationStatus: "PENDING_ACTIVATION",
  };
  assert.equal(mayAdmitAccount(user), false);
  assert.equal(mayUsePublicReset(user), false);
  assert.equal(mayAdmitAccount({ ...user, activationStatus: "ACTIVE" }), true);
});
test("Login accepts email or ID, rejects ambiguous identities; passwords enforce bcrypt byte limit", () => {
  const base = { password: "StrongPassword12", instituteCode: "ics" };
  assert.equal(
    loginSchema.safeParse({ ...base, email: "student@example.invalid" })
      .success,
    true,
  );
  assert.equal(
    loginSchema.safeParse({ ...base, identifier: "0024-00001" }).success,
    true,
  );
  assert.equal(loginSchema.safeParse({ ...base }).success, false);
  assert.equal(
    loginSchema.safeParse({
      ...base,
      email: "student@example.invalid",
      identifier: "0024-00001",
    }).success,
    false,
  );
  assert.equal(passwordSchema.safeParse("Ab1" + "é".repeat(35)).success, false);
});
test("Reminder precedes expiry and delivery estimates respect rolling budget and queue pacing", () => {
  assert.equal(REMINDER_DELAY_MS, 48 * 3600000);
  assert.equal(LINK_LIFETIME_MS, 72 * 3600000);
  const now = 1000000000;
  assert.ok(estimateDelivery([], 500, 400, now) > now + 86400000);
  assert.ok(
    estimateDelivery(Array(400).fill(now - 3600000), 1, 400, now) >=
      now + 23 * 3600000,
  );
  assert.equal(estimateDelivery([], 6, 400, now), now + 60000);
  assert.equal(escapeHtml('<script>"&'), "&lt;script&gt;&quot;&amp;");
});
