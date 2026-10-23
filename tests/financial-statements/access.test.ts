import assert from "node:assert/strict";
import { test } from "node:test";
import { isFinancialEligible } from "../../apps/web/src/lib/financial-statements/eligibility";

test("Financial Statement Generator eligibility is strictly restricted to IBE students", () => {
  // Valid IBE Student
  assert.equal(
    isFinancialEligible({ role: "STUDENT", institute: { code: "ibe" } }),
    true,
    "IBE student must be eligible"
  );
  assert.equal(
    isFinancialEligible({ role: "student", institute: { code: "IBE" } }),
    true,
    "Case-insensitive role and institute code must match"
  );

  // Instructors and Professors in IBE must NOT be eligible
  assert.equal(
    isFinancialEligible({ role: "PROFESSOR", institute: { code: "ibe" } }),
    false,
    "IBE professor must NOT be eligible"
  );
  assert.equal(
    isFinancialEligible({ role: "TEACHER", institute: { code: "ibe" } }),
    false,
    "IBE teacher must NOT be eligible"
  );
  assert.equal(
    isFinancialEligible({ role: "INSTRUCTOR", institute: { code: "ibe" } }),
    false,
    "IBE instructor must NOT be eligible"
  );

  // Administrators must NOT have this student tool on their dashboard
  assert.equal(
    isFinancialEligible({ role: "ADMIN", institute: { code: "ibe" } }),
    false,
    "Admin must NOT be eligible"
  );

  // Students from other institutes (ICS, ITE) must NOT be eligible
  assert.equal(
    isFinancialEligible({ role: "STUDENT", institute: { code: "ics" } }),
    false,
    "ICS student must NOT be eligible"
  );
  assert.equal(
    isFinancialEligible({ role: "STUDENT", institute: { code: "ite" } }),
    false,
    "ITE student must NOT be eligible"
  );

  // Missing or unknown roles/institutes
  assert.equal(
    isFinancialEligible({ role: null, institute: { code: "ibe" } }),
    false
  );
  assert.equal(
    isFinancialEligible({ role: "STUDENT", institute: null }),
    false
  );
  assert.equal(
    isFinancialEligible({ role: "SUPER_USER", institute: { code: "ibe" } }),
    false
  );
});
