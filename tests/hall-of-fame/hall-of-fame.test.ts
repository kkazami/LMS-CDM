import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { isHallOfFameEligible } from "../../apps/web/src/lib/hall-of-fame/eligibility";
import {
  ENTREPRENEUR_PROFILES,
  HALL_OF_FAME_PROFILES,
  HR_LEADER_PROFILES,
  countWords,
  filterHallOfFameProfiles,
  getNextProfileInCategory,
  getProfileById,
} from "../../apps/web/src/lib/hall-of-fame/catalog";
import { validateSafeExternalUrl } from "../../apps/web/src/lib/learning-hub/validation";

test("isHallOfFameEligible strictly permits only active IBE students", () => {
  assert.equal(
    isHallOfFameEligible({
      role: "STUDENT",
      institute: { code: "ibe" },
      isActive: true,
      activationStatus: "ACTIVE",
      isSuperUser: false,
    }),
    true
  );

  assert.equal(
    isHallOfFameEligible({
      role: "STUDENT",
      instituteCode: "IBE",
      isActive: true,
      activationStatus: "ACTIVE",
    }),
    true
  );

  for (const role of ["PROFESSOR", "TEACHER", "ADMIN", "STAFF"]) {
    assert.equal(
      isHallOfFameEligible({
        role,
        institute: { code: "ibe" },
        isActive: true,
        activationStatus: "ACTIVE",
      }),
      false
    );
  }

  for (const code of ["ics", "ite", "admin"]) {
    assert.equal(
      isHallOfFameEligible({
        role: "STUDENT",
        institute: { code },
        isActive: true,
        activationStatus: "ACTIVE",
      }),
      false
    );
  }

  assert.equal(
    isHallOfFameEligible({
      role: "STUDENT",
      institute: { code: "ibe" },
      isActive: false,
    }),
    false
  );
  assert.equal(
    isHallOfFameEligible({
      role: "STUDENT",
      institute: { code: "ibe" },
      isSuperUser: true,
    }),
    false
  );
});

test("Hall of Fame collection has exactly 20 unique profiles (10 Entrepreneurs and 10 HR Leaders, 5 Filipino and 5 International each)", () => {
  assert.equal(HALL_OF_FAME_PROFILES.length, 20);
  assert.equal(ENTREPRENEUR_PROFILES.length, 10);
  assert.equal(HR_LEADER_PROFILES.length, 10);

  const filipinoEntrepreneurs = ENTREPRENEUR_PROFILES.filter(
    (p) => p.origin === "FILIPINO"
  );
  const intlEntrepreneurs = ENTREPRENEUR_PROFILES.filter(
    (p) => p.origin === "INTERNATIONAL"
  );
  assert.equal(filipinoEntrepreneurs.length, 5);
  assert.equal(intlEntrepreneurs.length, 5);

  const filipinoHrLeaders = HR_LEADER_PROFILES.filter(
    (p) => p.origin === "FILIPINO"
  );
  const intlHrLeaders = HR_LEADER_PROFILES.filter(
    (p) => p.origin === "INTERNATIONAL"
  );
  assert.equal(filipinoHrLeaders.length, 5);
  assert.equal(intlHrLeaders.length, 5);

  const ids = new Set<string>();
  const names = new Set<string>();
  for (const profile of HALL_OF_FAME_PROFILES) {
    assert.equal(ids.has(profile.id), false, `Duplicate id: ${profile.id}`);
    assert.equal(
      names.has(profile.fullName),
      false,
      `Duplicate name: ${profile.fullName}`
    );
    ids.add(profile.id);
    names.add(profile.fullName);
  }
});

test("every profile has a 100–180 word Why They Are Famous section, 3–5 verified Major Achievements, Milestones, Challenges, Lessons, Related Subjects, Reflection Question, and safe source URLs", () => {
  const entrepreneurAllowedSubjects = new Set([
    "Entrepreneurship",
    "Managerial Accounting",
    "Personal Finance",
    "Income Taxation",
  ]);
  const hrAllowedSubjects = new Set([
    "Human Resources Management",
    "Recruitment and Selection",
    "Organizational Development",
  ]);

  const whyFamousSet = new Set<string>();

  for (const profile of HALL_OF_FAME_PROFILES) {
    // Why They Are Famous word count check (100–180 words)
    const words = countWords(profile.whyFamous);
    assert.ok(
      words >= 100 && words <= 180,
      `${profile.id} whyFamous has ${words} words (expected 100–180)`
    );
    assert.equal(
      whyFamousSet.has(profile.whyFamous),
      false,
      `Duplicate whyFamous on ${profile.id}`
    );
    whyFamousSet.add(profile.whyFamous);

    // Separate Major Achievements section (3–5 verified entries)
    assert.ok(
      profile.majorAchievements.length >= 3 &&
        profile.majorAchievements.length <= 5,
      `${profile.id} must have 3–5 major achievements`
    );
    for (const ach of profile.majorAchievements) {
      assert.ok(ach.title.length > 5);
      assert.ok(ach.explanation.length > 20);
      assert.ok(ach.period.length >= 4);
      const urlCheck = validateSafeExternalUrl(ach.sourceUrl, {
        requireHttps: true,
      });
      assert.equal(
        urlCheck.ok,
        true,
        `Unsafe achievement sourceUrl on ${profile.id}: ${ach.sourceUrl}`
      );
    }

    // Career Milestones
    assert.ok(
      profile.careerMilestones.length >= 3,
      `${profile.id} must have at least 3 career milestones`
    );

    // Challenges and Important Decisions
    assert.ok(
      profile.challengesAndDecisions.length >= 1,
      `${profile.id} must have documented challenges and decisions`
    );

    // Lessons for IBE Students (Documented Fact vs Educational Interpretation)
    assert.ok(
      profile.lessonsForStudents.length >= 2,
      `${profile.id} must have at least 2 lessons for IBE students`
    );
    for (const lesson of profile.lessonsForStudents) {
      assert.ok(lesson.documentedFact.length > 15);
      assert.ok(lesson.educationalInterpretation.length > 15);
    }

    // Related IBE Subjects
    assert.ok(
      profile.relatedSubjects.length >= 1,
      `${profile.id} must connect to at least 1 IBE subject`
    );
    for (const rel of profile.relatedSubjects) {
      if (profile.category === "ENTREPRENEUR") {
        assert.equal(
          entrepreneurAllowedSubjects.has(rel.subject),
          true,
          `Invalid Entrepreneur subject ${rel.subject} on ${profile.id}`
        );
      } else {
        assert.equal(
          hrAllowedSubjects.has(rel.subject),
          true,
          `Invalid HR Leader subject ${rel.subject} on ${profile.id}`
        );
      }
      assert.ok(rel.connectionExplanation.length > 15);
    }

    // Reflection Question & Quiz
    assert.ok(profile.reflectionQuestion.endsWith("?"));
    assert.equal(profile.quiz.options.length, 4);

    // Sources and Further Reading
    assert.ok(
      profile.sources.length >= 2,
      `${profile.id} must have at least 2 sources`
    );
    for (const src of profile.sources) {
      const srcCheck = validateSafeExternalUrl(src.url, {
        requireHttps: true,
      });
      assert.equal(
        srcCheck.ok,
        true,
        `Unsafe source URL on ${profile.id}: ${src.url}`
      );
    }
  }
});

test("filterHallOfFameProfiles searches by name, company, profession, and achievement and combines with origin and subject filters", () => {
  // Search by company
  const jollibeeMatch = filterHallOfFameProfiles({
    category: "ENTREPRENEUR",
    search: "Jollibee",
  });
  assert.equal(jollibeeMatch.length, 1);
  assert.equal(jollibeeMatch[0]?.id, "tony-tan-caktiong");

  // Search by achievement keyword + International filter in HR Leaders
  const oxygenMatch = filterHallOfFameProfiles({
    category: "HR_LEADER",
    origin: "INTERNATIONAL",
    search: "Project Oxygen",
  });
  assert.equal(oxygenMatch.length, 1);
  assert.equal(oxygenMatch[0]?.id, "laszlo-bock");

  // Filter Filipino HR Leaders
  const filipinoHr = filterHallOfFameProfiles({
    category: "HR_LEADER",
    origin: "FILIPINO",
  });
  assert.equal(filipinoHr.length, 5);

  // Next profile navigation cycles within the same category
  const firstEnt = getProfileById("tony-tan-caktiong")!;
  const nextEnt = getNextProfileInCategory(firstEnt);
  assert.equal(nextEnt.category, "ENTREPRENEUR");
  assert.notEqual(nextEnt.id, firstEnt.id);
});

test("Hall of Fame navigation and reduced-motion accessibility are properly wired", () => {
  const sidebarSource = fs.readFileSync(
    path.join(process.cwd(), "apps/web/src/components/layout/Sidebar.tsx"),
    "utf8"
  );
  assert.ok(sidebarSource.includes('label: "Hall of Fame"'));
  assert.ok(sidebarSource.includes("`/${instituteCode}/hall-of-fame`"));

  const clientSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "apps/web/src/components/hall-of-fame/HallOfFameClient.tsx"
    ),
    "utf8"
  );
  assert.ok(clientSource.includes("motion-reduce:transform-none"));
  assert.ok(clientSource.includes("Why They Are Famous"));
  assert.ok(clientSource.includes("Major Achievements"));
  assert.ok(clientSource.includes("Career Milestones"));
  // Sections 6 to 10 removed per user request for a streamlined profile experience
  assert.equal(clientSource.includes("Challenges and Important Decisions"), false);
  assert.equal(clientSource.includes("Lessons for IBE Students"), false);
  assert.equal(clientSource.includes("Related IBE Subjects"), false);
  assert.equal(clientSource.includes("Reflection Question"), false);
  assert.equal(clientSource.includes("Sources and Further Reading"), false);
});

