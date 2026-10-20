import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterSearchItems,
  getSearchFocusRingColor,
  getSearchFooterText,
  getWelcomeBannerPortalLabel,
  getBannerCursorColor,
  type SearchItemLike,
} from "../search-filter";

const dummyIcon = () => null;

const sampleItems: SearchItemLike[] = [
  {
    id: "nav-dashboard",
    title: "Student Dashboard",
    category: "Navigation",
    href: "/ics/students",
    icon: dummyIcon,
  },
  {
    id: "nav-materials",
    title: "Learning Materials",
    category: "Courses",
    href: "/ics/learning-materials",
    icon: dummyIcon,
  },
  {
    id: "nav-codelab",
    title: "CodeLab Interactive IDE",
    category: "Activities",
    href: "/ics/activities/codelab",
    icon: dummyIcon,
  },
  {
    id: "nav-settings",
    title: "Account Settings",
    category: "Tools",
    href: "/ics/settings",
    icon: dummyIcon,
  },
];

describe("Search Filter Pure Logic", () => {
  describe("filterSearchItems - Scope Isolation", () => {
    it("returns identical items for non-ITE institutes (ICS)", () => {
      const filtered = filterSearchItems({
        items: sampleItems,
        instituteCode: "ics",
        userRole: "STUDENT",
        isEligibleForActivities: true,
        isEligibleForMeetings: false,
        isEligibleForPracticum: false,
      });

      assert.deepEqual(filtered, sampleItems);
      assert.ok(filtered.some((i) => i.id === "nav-codelab"));
      assert.ok(!filtered.some((i) => i.id === "nav-meetings"));
    });

    it("returns identical items for non-ITE institutes (IBE)", () => {
      const filtered = filterSearchItems({
        items: sampleItems,
        instituteCode: "ibe",
        userRole: "STUDENT",
        isEligibleForActivities: false,
      });

      assert.deepEqual(filtered, sampleItems);
    });

    it("filters out CodeLab items for ITE students", () => {
      const iteItems: SearchItemLike[] = sampleItems.map((item) => ({
        ...item,
        href: item.href.replace("/ics/", "/ite/"),
      }));

      const filtered = filterSearchItems({
        items: iteItems,
        instituteCode: "ite",
        userRole: "STUDENT",
        isEligibleForActivities: false,
        isEligibleForMeetings: true,
        isEligibleForPracticum: true,
        meetingsIcon: dummyIcon,
        practicumIcon: dummyIcon,
      });

      assert.ok(!filtered.some((i) => i.id === "nav-codelab"));
      assert.ok(!filtered.some((i) => i.href.includes("/activities/codelab")));
    });

    it("adds Meetings and Practicum for eligible ITE students", () => {
      const iteItems: SearchItemLike[] = sampleItems.map((item) => ({
        ...item,
        href: item.href.replace("/ics/", "/ite/"),
      }));

      const filtered = filterSearchItems({
        items: iteItems,
        instituteCode: "ite",
        userRole: "STUDENT",
        isEligibleForActivities: false,
        isEligibleForMeetings: true,
        isEligibleForPracticum: true,
        meetingsIcon: dummyIcon,
        practicumIcon: dummyIcon,
      });

      const meetings = filtered.find((i) => i.id === "nav-meetings");
      assert.ok(meetings, "Meetings must be included");
      assert.equal(meetings.href, "/ite/meetings");
      assert.equal(meetings.title, "Meetings");

      const practicum = filtered.find((i) => i.id === "nav-practicum");
      assert.ok(practicum, "Practicum must be included");
      assert.equal(practicum.href, "/ite/practicum");
      assert.equal(practicum.title, "Practicum");
    });

    it("adds Meetings and Practicum for eligible ITE instructors", () => {
      const iteProfItems: SearchItemLike[] = [
        {
          id: "prof-dashboard",
          title: "Teacher Dashboard",
          category: "Navigation",
          href: "/ite/teachers",
          icon: dummyIcon,
        },
        {
          id: "prof-materials",
          title: "Learning Materials",
          category: "Navigation",
          href: "/ite/learning-materials",
          icon: dummyIcon,
        },
        {
          id: "prof-codelab",
          title: "CodeLab Analytics",
          category: "Activities",
          href: "/ite/activities/codelab/instructor",
          icon: dummyIcon,
        },
      ];

      const filtered = filterSearchItems({
        items: iteProfItems,
        instituteCode: "ite",
        userRole: "PROFESSOR",
        isEligibleForActivities: false,
        isEligibleForMeetings: true,
        isEligibleForPracticum: true,
        meetingsIcon: dummyIcon,
        practicumIcon: dummyIcon,
      });

      assert.ok(!filtered.some((i) => i.id === "prof-codelab"));
      assert.ok(filtered.some((i) => i.id === "nav-meetings"));
      assert.ok(filtered.some((i) => i.id === "nav-practicum"));
    });
  });

  describe("getSearchFocusRingColor", () => {
    it("returns theme primary for ITE", () => {
      assert.equal(getSearchFocusRingColor("ite", "#2563EB"), "#2563EB");
      assert.equal(getSearchFocusRingColor("ITE", "#2563EB"), "#2563EB");
    });

    it("returns orange (#F97316) for ICS and IBE", () => {
      assert.equal(getSearchFocusRingColor("ics", "#E06A26"), "#F97316");
      assert.equal(getSearchFocusRingColor("ibe", "#EAB308"), "#F97316");
      assert.equal(getSearchFocusRingColor("", "#E06A26"), "#F97316");
    });
  });

  describe("getSearchFooterText", () => {
    it("returns arrow navigation hint for ITE", () => {
      assert.equal(
        getSearchFooterText("ite"),
        "Use arrow keys to navigate, Enter to open"
      );
      assert.equal(
        getSearchFooterText("ITE"),
        "Use arrow keys to navigate, Enter to open"
      );
    });

    it("returns default 1-tap hint for non-ITE", () => {
      assert.equal(getSearchFooterText("ics"), "Navigate with 1-tap");
      assert.equal(getSearchFooterText("ibe"), "Navigate with 1-tap");
    });
  });

  describe("getWelcomeBannerPortalLabel", () => {
    it("returns corrected display name for ITE students", () => {
      assert.equal(
        getWelcomeBannerPortalLabel(
          "ite",
          "Institute of Technology and Engineering",
          false
        ),
        "Institute of Teacher Education · Portal"
      );
    });

    it("returns corrected display name for ITE teachers", () => {
      assert.equal(
        getWelcomeBannerPortalLabel(
          "ite",
          "Institute of Technology and Engineering",
          true
        ),
        "Institute of Teacher Education • Faculty Portal"
      );
    });

    it("preserves exact existing name for ICS", () => {
      assert.equal(
        getWelcomeBannerPortalLabel(
          "ics",
          "Institute of Computer Studies",
          false
        ),
        "Institute of Computer Studies · Portal"
      );
      assert.equal(
        getWelcomeBannerPortalLabel(
          "ics",
          "Institute of Computer Studies",
          true
        ),
        "Institute of Computer Studies • Faculty Portal"
      );
    });

    it("preserves exact existing name for IBE", () => {
      assert.equal(
        getWelcomeBannerPortalLabel(
          "ibe",
          "Institute of Business and Education",
          false
        ),
        "Institute of Business and Education · Portal"
      );
    });
  });

  describe("getBannerCursorColor", () => {
    it("returns ITE accent color for ITE", () => {
      assert.equal(getBannerCursorColor("ite", "#2563EB"), "#2563EB");
      assert.equal(getBannerCursorColor("ITE", "#2563EB"), "#2563EB");
    });

    it("returns default orange (#FF7517) for ICS and IBE", () => {
      assert.equal(getBannerCursorColor("ics", "#E06A26"), "#FF7517");
      assert.equal(getBannerCursorColor("ibe", "#EAB308"), "#FF7517");
    });
  });

  describe("isEligibleActivityInstitute", () => {
    it("returns true only for ICS", () => {
      const { isEligibleActivityInstitute } = require("../search-filter");
      assert.equal(isEligibleActivityInstitute("ics"), true);
      assert.equal(isEligibleActivityInstitute("ICS"), true);
      assert.equal(isEligibleActivityInstitute("ite"), false);
      assert.equal(isEligibleActivityInstitute("ibe"), false);
    });
  });
});
