import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { isLearningHubEligible } from "../../apps/web/src/lib/learning-hub/eligibility";
import {
  EXTERNAL_COURSE_CATALOG,
  IBE_SUBJECT_CATEGORIES,
  LEARNING_PROVIDERS,
  filterAndSortCatalog,
  getCourseById,
  getProviderById,
} from "../../apps/web/src/lib/learning-hub/catalog";
import {
  LEARNING_RECORD_ID,
  toStudentLearningRecord,
  validateLearningRecordInput,
  validateSafeExternalUrl,
} from "../../apps/web/src/lib/learning-hub/validation";

test("isLearningHubEligible strictly permits only active IBE students", () => {
  assert.equal(
    isLearningHubEligible({
      role: "STUDENT",
      instituteCode: "ibe",
      isActive: true,
      activationStatus: "ACTIVE",
      isSuperUser: false,
    }),
    true
  );

  assert.equal(
    isLearningHubEligible({
      role: "STUDENT",
      instituteCode: "IBE",
      isActive: true,
      activationStatus: "ACTIVE",
    }),
    true
  );

  // Rejects non-students
  for (const role of ["PROFESSOR", "TEACHER", "ADMIN", "STAFF"]) {
    assert.equal(
      isLearningHubEligible({
        role,
        instituteCode: "ibe",
        isActive: true,
        activationStatus: "ACTIVE",
      }),
      false
    );
  }

  // Rejects other institutes
  for (const code of ["ics", "ite", "admin"]) {
    assert.equal(
      isLearningHubEligible({
        role: "STUDENT",
        instituteCode: code,
        isActive: true,
        activationStatus: "ACTIVE",
      }),
      false
    );
  }

  // Rejects superusers and inactive/suspended accounts
  assert.equal(
    isLearningHubEligible({
      role: "STUDENT",
      instituteCode: "ibe",
      isActive: true,
      isSuperUser: true,
    }),
    false
  );
  assert.equal(
    isLearningHubEligible({
      role: "STUDENT",
      instituteCode: "ibe",
      isActive: false,
    }),
    false
  );
  assert.equal(
    isLearningHubEligible({
      role: "STUDENT",
      instituteCode: "ibe",
      activationStatus: "SUSPENDED",
    }),
    false
  );
});

test("catalog includes all official providers from external academy", () => {
  assert.equal(LEARNING_PROVIDERS.length, 6);

  const expectedProviders = [
    ["HP_LIFE", "HP LIFE", "https://www.life-global.org/"],
    ["SAYLOR_UNIVERSITY", "Saylor University", "https://learn.saylor.org/"],
    ["HUBSPOT_ACADEMY", "HubSpot Academy", "https://academy.hubspot.com/"],
    ["OPENLEARN", "OpenLearn", "https://www.open.edu/openlearn/"],
    ["SANTANDER_OPEN_ACADEMY", "Santander Open Academy", "https://www.santanderopenacademy.com/"],
    ["ALISON", "Alison", "https://alison.com/"],
  ] as const;

  for (const [id, name, homepageUrl] of expectedProviders) {
    const provider = getProviderById(id);
    assert.ok(provider, `Missing provider ${id}`);
    assert.equal(provider.name, name);
    assert.equal(provider.homepageUrl, homepageUrl);
    const urlCheck = validateSafeExternalUrl(provider.homepageUrl, { requireHttps: true });
    assert.equal(urlCheck.ok, true);
    const catalogCheck = validateSafeExternalUrl(provider.catalogUrl, { requireHttps: true });
    assert.equal(catalogCheck.ok, true);
  }
});

test("catalog includes all initial researched course entries and covers all 12 IBE subject categories without duplicates", () => {
  assert.equal(IBE_SUBJECT_CATEGORIES.length, 12);

  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const course of EXTERNAL_COURSE_CATALOG) {
    assert.equal(ids.has(course.id), false, `Duplicate course id: ${course.id}`);
    ids.add(course.id);

    const primaryUrlCheck = validateSafeExternalUrl(course.officialUrl, { requireHttps: true });
    assert.equal(primaryUrlCheck.ok, true, `Unsafe officialUrl on ${course.id}`);
    if (primaryUrlCheck.ok) {
      assert.ok(primaryUrlCheck.url.length > 0);
    }

    const fallbackUrlCheck = validateSafeExternalUrl(course.fallbackUrl, { requireHttps: true });
    assert.equal(fallbackUrlCheck.ok, true, `Unsafe fallbackUrl on ${course.id}`);

    urls.add(course.officialUrl);
  }

  // Verify all initial specification URLs are present
  const requiredInitialUrls = [
    "https://www.life-global.org/course/17-starting-a-small-business",
    "https://www.life-global.org/course/16-design-thinking",
    "https://www.life-global.org/course/21-basics-of-finance",
    "https://www.life-global.org/en/course/24-cash-flow",
    "https://www.life-global.org/en/course/37-inventory-management",
    "https://learn.saylor.org/course/bus103",
    "https://learn.saylor.org/course/bus105",
    "https://learn.saylor.org/course/bus301",
    "https://academy.hubspot.com/courses/digital-marketing",
    "https://academy.hubspot.com/courses/content-marketing",
    "https://www.santanderopenacademy.com/en/courses/seo-and-content-marketing.html/index.htm",
  ];

  for (const url of requiredInitialUrls) {
    assert.equal(urls.has(url), true, `Missing required initial course URL: ${url}`);
  }

  // Verify every one of the 12 IBE subjects has at least one course entry
  for (const subject of IBE_SUBJECT_CATEGORIES) {
    const count = EXTERNAL_COURSE_CATALOG.filter((c) => c.subject === subject).length;
    assert.ok(count >= 1, `Subject category "${subject}" has no courses`);
  }

  // Verify all 6 providers are represented in the catalog
  for (const provider of LEARNING_PROVIDERS) {
    const providerCourses = EXTERNAL_COURSE_CATALOG.filter((c) => c.providerId === provider.id);
    assert.ok(providerCourses.length >= 1, `Provider "${provider.name}" has no courses`);
  }
});

test("filterAndSortCatalog supports search, subject, provider, certificate, linkType, and sorting", () => {
  const cashFlowMatches = filterAndSortCatalog({
    search: "Cash Flow",
    subject: "ALL",
    providerId: "ALL",
    certificateAvailability: "ALL",
    linkType: "ALL",
    sortBy: "RECOMMENDED",
  });
  assert.ok(cashFlowMatches.some((course) => course.id === "hplife-cash-flow"));

  const saylorMatches = filterAndSortCatalog({
    search: "",
    subject: "Managerial Accounting",
    providerId: "SAYLOR_UNIVERSITY",
    certificateAvailability: "FREE_VERIFIED",
    linkType: "VERIFIED_COURSE",
    sortBy: "TITLE_ASC",
  });
  assert.equal(saylorMatches.length, 1);
  assert.equal(saylorMatches[0]?.id, "saylor-bus105-managerial-accounting");

  const sortedByTitleAsc = filterAndSortCatalog({
    sortBy: "TITLE_ASC",
  });
  assert.ok(sortedByTitleAsc.length > 2);
  assert.ok(sortedByTitleAsc[0]!.title.localeCompare(sortedByTitleAsc[1]!.title) <= 0);

  const sortedByDurationAsc = filterAndSortCatalog({
    sortBy: "DURATION_ASC",
  });
  // Courses with verified durationMinutes appear before null-duration courses
  const firstNullIndex = sortedByDurationAsc.findIndex((c) => c.durationMinutes === null);
  const firstVerifiedIndex = sortedByDurationAsc.findIndex((c) => c.durationMinutes !== null);
  assert.ok(firstVerifiedIndex < firstNullIndex);
});

test("validateSafeExternalUrl rejects unsafe schemes, credentials, and private hosts", () => {
  assert.equal(
    validateSafeExternalUrl("https://learn.saylor.org/course/bus103", { requireHttps: true }).ok,
    true
  );

  for (const unsafeUrl of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://files.example.com/cert.pdf",
    "https://user:pass@example.com/cert",
    "http://localhost:3000/cert",
    "http://127.0.0.1/cert",
    "http://192.168.1.1/cert",
    "http://10.0.0.1/cert",
  ]) {
    const check = validateSafeExternalUrl(unsafeUrl);
    assert.equal(check.ok, false, `Expected unsafe URL to be rejected: ${unsafeUrl}`);
  }
});

test("learning record input validation enforces status, self-reported completion, and safe certificate URLs", () => {
  const catalogEntry = getCourseById("hplife-starting-a-small-business");
  assert.ok(catalogEntry);

  const plannedCheck = validateLearningRecordInput({
    courseId: catalogEntry.id,
    status: "PLANNED",
  });
  assert.equal(plannedCheck.ok, true);
  if (plannedCheck.ok) {
    assert.equal(plannedCheck.data.status, "PLANNED");
    assert.equal(plannedCheck.data.completedAt, null);
  }

  // Opening a course with markOpened=true never auto-completes a PLANNED or IN_PROGRESS record
  const openCheck = validateLearningRecordInput({
    courseId: catalogEntry.id,
    status: "IN_PROGRESS",
    markOpened: true,
  });
  assert.equal(openCheck.ok, true);
  if (openCheck.ok) {
    assert.equal(openCheck.data.status, "IN_PROGRESS");
    assert.equal(openCheck.data.markOpened, true);
    assert.equal(openCheck.data.completedAt, null);
  }

  // Completed record auto-populates completedAt if omitted and validates certificate URL
  const completedCheck = validateLearningRecordInput({
    courseId: catalogEntry.id,
    status: "COMPLETED",
    certificateUrl: "https://www.life-global.org/certificates/verify-demo",
    notes: "Finished all modules and saved my completion badge.",
  });
  assert.equal(completedCheck.ok, true);
  if (completedCheck.ok) {
    assert.equal(completedCheck.data.status, "COMPLETED");
    assert.ok(completedCheck.data.completedAt instanceof Date);
    assert.equal(
      completedCheck.data.certificateUrl,
      "https://www.life-global.org/certificates/verify-demo"
    );

    const now = new Date();
    const serialized = toStudentLearningRecord({
      id: "cm9abc123def456789012345",
      studentId: "student-1",
      instituteId: "inst-ibe",
      courseId: catalogEntry.id,
      status: completedCheck.data.status,
      completedAt: completedCheck.data.completedAt,
      certificateUrl: completedCheck.data.certificateUrl,
      notes: completedCheck.data.notes,
      verificationType: "SELF_REPORTED",
      lastOpenedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    assert.equal(serialized.verificationType, "SELF_REPORTED");
  }

  // Rejects unsafe certificate URL
  const badCertCheck = validateLearningRecordInput({
    courseId: catalogEntry.id,
    status: "COMPLETED",
    certificateUrl: "javascript:alert(document.cookie)",
  });
  assert.equal(badCertCheck.ok, false);

  // Validates record ID format
  assert.equal(LEARNING_RECORD_ID.test("cm9abc123def456789012345"), true);
  assert.equal(LEARNING_RECORD_ID.test("../etc/passwd"), false);
});

test("IBE Learning Hub navigation link is scoped exclusively to IBE students", () => {
  const sidebarSource = fs.readFileSync(
    path.join(process.cwd(), "apps/web/src/components/layout/Sidebar.tsx"),
    "utf8"
  );
  assert.ok(sidebarSource.includes('label: "IBE Learning Hub"'));
  assert.ok(sidebarSource.includes("`/${instituteCode}/learning-hub`"));
  assert.ok(sidebarSource.includes('isStudent && instituteCode.toLowerCase() === "ibe"'));

  const studentDashboardSource = fs.readFileSync(
    path.join(process.cwd(), "apps/web/src/app/(dashboard)/[institute]/students/client.tsx"),
    "utf8"
  );
  assert.ok(studentDashboardSource.includes('label: "IBE Learning Hub"'));
  assert.ok(studentDashboardSource.includes("`/${instituteCode}/learning-hub`"));
});
