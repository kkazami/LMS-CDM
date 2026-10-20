import { test } from "node:test";
import assert from "node:assert/strict";
import { getNavigationPath } from "../../apps/web/src/lib/navigation-path";

test("student and class setup selects Accounts across institutes, including nested setup routes", () => {
  for (const institute of ["ics", "ibe", "ite"]) {
    assert.equal(getNavigationPath(`/${institute}/admin/onboarding`, institute), `/${institute}/accounts`);
    assert.equal(getNavigationPath(`/${institute}/admin/onboarding/review`, institute), `/${institute}/accounts/review`);
  }
});

test("Dashboard, other admin pages, other institutes, and similarly named routes keep their own selection", () => {
  for (const pathname of ["/ics/admin", "/ics/admin/courses", "/ics/admin/faculty", "/ics/accounts", "/ics/admin/onboarding-old", "/ibe/admin/onboarding"]) {
    assert.equal(getNavigationPath(pathname, "ics"), pathname);
  }
});
