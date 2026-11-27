import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  canIbeProgramAccessFeature,
  IBE_PROGRAM_FEATURES,
} from "../../apps/web/src/lib/ibe-programs/features";

test("IBE Sidebar separates general navigation from PROGRAM TOOLS for BSBA HRM and BS ENTREP", () => {
  const sidebarSource = fs.readFileSync(
    path.join(process.cwd(), "apps/web/src/components/layout/Sidebar.tsx"),
    "utf8"
  );

  // 1. Consultation & Scheduling remains in general links for all IBE students
  assert.ok(
    sidebarSource.includes('label: "Consultation & Scheduling"'),
    "Consultation & Scheduling must be in general navigation links"
  );

  // 2. Program tools keep their own divider below the regular links.
  assert.match(sidebarSource, /visibleProgramTools\.map\([^\n]+section: "Program tools"/);
  assert.match(sidebarSource, /aria-label="Program tools"/);
  assert.match(sidebarSource, /programToolLinks\.map\(renderLink\)/);

  // 3. IBE student program tools are routed into visibleProgramTools (not flat general links)
  assert.ok(
    sidebarSource.includes("ibeVisibleProgramTools"),
    "IBE program tools must be populated into visibleProgramTools"
  );
  assert.ok(
    sidebarSource.includes('canIbeProgramAccessFeature(ibeProgramCode, "mock-interview")')
  );
  assert.ok(
    sidebarSource.includes('canIbeProgramAccessFeature(ibeProgramCode, "wordwise")')
  );
  assert.ok(
    sidebarSource.includes('canIbeProgramAccessFeature(ibeProgramCode, "financial-statements")')
  );
  assert.ok(
    sidebarSource.includes('canIbeProgramAccessFeature(ibeProgramCode, "business-plan")')
  );
  assert.ok(
    sidebarSource.includes('canIbeProgramAccessFeature(ibeProgramCode, "hall-of-fame")')
  );
  assert.ok(
    sidebarSource.includes('canIbeProgramAccessFeature(ibeProgramCode, "learning-hub")')
  );

  // 4. Verify BSBA HRM program access logic
  assert.equal(canIbeProgramAccessFeature("BSBA HRM", "mock-interview"), true);
  assert.equal(canIbeProgramAccessFeature("BSBA HRM", "wordwise"), true);
  assert.equal(canIbeProgramAccessFeature("BSBA HRM", "hall-of-fame"), true);
  assert.equal(canIbeProgramAccessFeature("BSBA HRM", "learning-hub"), true);
  assert.equal(canIbeProgramAccessFeature("BSBA HRM", "financial-statements"), false);
  assert.equal(canIbeProgramAccessFeature("BSBA HRM", "business-plan"), false);

  // 5. Verify BS ENTREP program access logic
  assert.equal(canIbeProgramAccessFeature("BS ENTREP", "financial-statements"), true);
  assert.equal(canIbeProgramAccessFeature("BS ENTREP", "business-plan"), true);
  assert.equal(canIbeProgramAccessFeature("BS ENTREP", "hall-of-fame"), true);
  assert.equal(canIbeProgramAccessFeature("BS ENTREP", "learning-hub"), true);
  assert.equal(canIbeProgramAccessFeature("BS ENTREP", "mock-interview"), false);
  assert.equal(canIbeProgramAccessFeature("BS ENTREP", "wordwise"), false);

  // 6. Non-IBE / invalid programs receive no program tools
  assert.equal(canIbeProgramAccessFeature(null, "mock-interview"), false);
  assert.equal(canIbeProgramAccessFeature("BSIT", "mock-interview"), false);
});

