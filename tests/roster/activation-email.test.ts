import assert from "node:assert/strict";
import { test } from "node:test";
import { activationEmail } from "../../apps/web/src/lib/roster/activation-email";

const account = {
  name: 'Joshua <script>alert("test")</script> & Cruz',
  studentNumber: "24-00761",
  program: 'BSCPE <img src=x onerror="alert(1)">',
  instituteCode: "ics",
  link: "https://lms.example.invalid/activate#token=synthetic-token",
  reminder: false,
};

test("activation email escapes account data, preserves the link and includes a plain-text alternative", () => {
  const email = activationEmail(account);
  assert.doesNotMatch(email.html, /<script|<img/);
  assert.ok(email.html.includes("&lt;script&gt;"));
  assert.ok(email.html.includes(`href="${account.link}"`));
  assert.match(email.html, /Activate My Account/);
  assert.match(email.html, /72 hours/);
  assert.match(email.html, /Office of the Registrar/);
  assert.match(email.html, /#FF7517/);
  assert.ok(email.text.includes(account.link));
  assert.ok(email.text.includes(account.studentNumber));
  assert.ok(email.text.includes(account.name));
  assert.equal(email.subject, "Activate your CdM LMS account");
});

test("all institute colors and reminder copy use the same activation template", () => {
  for (const [instituteCode, color, name] of [
    ["ics", "#FF7517", "Institute of Computing Studies"],
    ["ibe", "#D4A017", "Institute of Business and Entrepreneurship"],
    ["ite", "#2563EB", "Institute of Teacher Education"],
  ]) {
    const email = activationEmail({ ...account, instituteCode, reminder: true });
    assert.ok(email.html.includes(color));
    assert.ok(email.html.includes(name));
    assert.match(email.html, /Your learning space is waiting/);
    assert.match(email.text, /Your learning space is waiting/);
    assert.equal(email.subject, "Reminder: Activate your CdM LMS account");
  }
});
