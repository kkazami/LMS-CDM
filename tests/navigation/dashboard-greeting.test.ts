import { test } from "node:test";
import assert from "node:assert/strict";
import { getDashboardGreeting, isFirstLoginSession } from "../../apps/web/src/lib/dashboard-greeting";

test("first sign-in wins over time of day; a later session on the same day is returning", () => {
  const firstSession = new Date("2026-10-20T01:00:00Z");
  const firstBadge = new Date("2026-10-20T01:00:01Z");
  assert.equal(isFirstLoginSession(firstSession, firstBadge), true);
  assert.equal(isFirstLoginSession(new Date("2026-10-20T02:00:00Z"), firstBadge), false);
  assert.equal(isFirstLoginSession(firstSession, null), false);
  for (const hour of [0, 8, 14, 19, 23]) {
    const text = getDashboardGreeting("Neil Kirby Amigo", new Date(`2026-10-20T${String(hour).padStart(2, "0")}:00:00+08:00`), "first-session", true);
    assert.match(text, /Welcome aboard|first chapter|fresh start/);
    assert.match(text, /Neil/);
    assert.doesNotMatch(text, /back|night|morning|afternoon|evening/i);
  }
});

test("greetings use Philippine time across UTC boundaries, with stable but varied copy", () => {
  const choices = (date: string) => Array.from({ length: 30 }, (_, i) => getDashboardGreeting("Maria Santos", new Date(date), `user-${i}`));
  assert(choices("2026-10-19T23:00:00Z").some(text => text === "Good morning, Maria."));
  assert(choices("2026-10-20T04:00:00Z").some(text => text === "Good afternoon, Maria."));
  assert(choices("2026-10-20T09:00:00Z").some(text => text === "Good evening, Maria."));
  assert(choices("2026-10-20T13:00:00Z").some(text => text === "Late-night ideas, Maria?"));
  assert(choices("2026-10-19T16:00:00Z").some(text => text === "Late-night ideas, Maria?"));
  const now = new Date("2026-10-20T02:00:00Z");
  assert.equal(getDashboardGreeting("Maria Santos", now, "same-session"), getDashboardGreeting("Maria Santos", now, "same-session"));
  assert(new Set(choices(now.toISOString())).size > 1);
  assert.match(getDashboardGreeting("  ", now, "fallback"), /there/);
});
