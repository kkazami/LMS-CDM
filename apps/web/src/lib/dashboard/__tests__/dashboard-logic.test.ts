import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyDueDate, splitOverdue, manilaDateKey } from "../due-dates";
import { computeRank, rankFromCounts } from "../../gamification/rank";
import { parseNotificationLimit } from "../../notifications-limit";

// 2026-10-20 10:00 PHT == 2026-10-20T02:00:00Z
const NOW = "2026-10-20T02:00:00Z";

describe("classifyDueDate (Asia/Manila)", () => {
  it("marks past due instants as overdue", () => {
    assert.deepEqual(classifyDueDate("2026-10-20T01:59:00Z", NOW), { label: "Overdue", status: "overdue" });
    assert.equal(classifyDueDate("2026-09-01T00:00:00Z", NOW).status, "overdue");
  });

  it("later today in PHT is 'today'", () => {
    // 23:30 PHT today == 15:30Z
    assert.deepEqual(classifyDueDate("2026-10-20T15:30:00Z", NOW), { label: "Due Today", status: "today" });
  });

  it("an item due 01:00 PHT tomorrow is 'tomorrow', even though its UTC date is still today", () => {
    // 2026-10-21 01:00 PHT == 2026-10-20T17:00Z (same UTC date as now)
    assert.deepEqual(classifyDueDate("2026-10-20T17:00:00Z", NOW), { label: "Due Tomorrow", status: "tomorrow" });
  });

  it("around midnight PHT: 23:59 PHT is today, 00:00 PHT is tomorrow", () => {
    assert.equal(classifyDueDate("2026-10-20T15:59:00Z", NOW).status, "today"); // 23:59 PHT
    assert.equal(classifyDueDate("2026-10-20T16:00:00Z", NOW).status, "tomorrow"); // 00:00 PHT
  });

  it("uses the Manila date for 'now' too (00:30 PHT is still 'today' for that date)", () => {
    const earlyMorning = "2026-10-19T16:30:00Z"; // 00:30 PHT on Oct 20
    assert.equal(classifyDueDate("2026-10-20T10:00:00Z", earlyMorning).status, "today");
    assert.equal(classifyDueDate("2026-10-21T10:00:00Z", earlyMorning).status, "tomorrow");
  });

  it("within 7 days is 'upcoming' with a weekday label; beyond is 'upcoming' with a plain date", () => {
    const in3 = classifyDueDate("2026-10-23T04:00:00Z", NOW); // Fri Oct 23, 12:00 PHT
    assert.equal(in3.status, "upcoming");
    assert.equal(in3.label, "Due Fri, Oct 23");
    const in30 = classifyDueDate("2026-11-19T04:00:00Z", NOW);
    assert.equal(in30.label, "Due Nov 19");
  });

  it("labels the Manila weekday/date, not the UTC one", () => {
    // 2026-10-23T17:00Z is Sat Oct 24 01:00 PHT
    assert.equal(classifyDueDate("2026-10-23T17:00:00Z", NOW).label, "Due Sat, Oct 24");
  });

  it("manilaDateKey", () => {
    assert.equal(manilaDateKey(new Date("2026-10-19T16:00:00Z")), "2026-10-20");
    assert.equal(manilaDateKey(new Date("2026-10-19T15:59:59Z")), "2026-10-19");
  });
});

describe("splitOverdue", () => {
  it("separates overdue from upcoming and keeps order", () => {
    const items = [
      { id: "a", dueDate: "2026-10-01T00:00:00Z" },
      { id: "b", dueDate: "2026-10-20T05:00:00Z" },
      { id: "c", dueDate: "2026-10-19T00:00:00Z" },
      { id: "d", dueDate: "2026-10-22T00:00:00Z" },
    ];
    const { overdue, upcoming } = splitOverdue(items, NOW);
    assert.deepEqual(overdue.map((i) => i.id), ["a", "c"]);
    assert.deepEqual(upcoming.map((i) => i.id), ["b", "d"]);
  });

  it("handles empty input", () => {
    assert.deepEqual(splitOverdue([], NOW), { overdue: [], upcoming: [] });
  });
});

describe("rank", () => {
  it("is null for zero EXP", () => {
    assert.equal(rankFromCounts(0, 0, 0), null);
    assert.equal(computeRank({ id: "a", exp: 0 }, [{ id: "b", exp: 50 }]), null);
  });

  it("ranks by EXP descending", () => {
    const others = [
      { id: "b", exp: 300 },
      { id: "c", exp: 200 },
      { id: "d", exp: 50 },
    ];
    assert.equal(computeRank({ id: "a", exp: 250 }, others), 2);
    assert.equal(computeRank({ id: "a", exp: 400 }, others), 1);
    assert.equal(computeRank({ id: "a", exp: 10 }, others), 4);
  });

  it("breaks ties by lower id first, deterministically", () => {
    const all = [
      { id: "a", exp: 100 },
      { id: "b", exp: 100 },
      { id: "c", exp: 100 },
    ];
    assert.equal(computeRank(all[0], all), 1);
    assert.equal(computeRank(all[1], all), 2);
    assert.equal(computeRank(all[2], all), 3);
  });

  it("ignores itself in the others list", () => {
    assert.equal(computeRank({ id: "a", exp: 10 }, [{ id: "a", exp: 10 }]), 1);
  });

  it("rankFromCounts adds higher and tied-lower counts", () => {
    assert.equal(rankFromCounts(100, 3, 2), 6);
  });
});

describe("parseNotificationLimit", () => {
  it("defaults to 50 when missing or invalid", () => {
    assert.equal(parseNotificationLimit(null), 50);
    assert.equal(parseNotificationLimit(undefined), 50);
    assert.equal(parseNotificationLimit(""), 50);
    assert.equal(parseNotificationLimit("abc"), 50);
    assert.equal(parseNotificationLimit("NaN"), 50);
    assert.equal(parseNotificationLimit("1.5"), 50);
    assert.equal(parseNotificationLimit("10abc"), 50);
  });

  it("rejects negatives and zero", () => {
    assert.equal(parseNotificationLimit("-5"), 50);
    assert.equal(parseNotificationLimit("0"), 50);
  });

  it("accepts valid values and caps at 100", () => {
    assert.equal(parseNotificationLimit("1"), 1);
    assert.equal(parseNotificationLimit("20"), 20);
    assert.equal(parseNotificationLimit(" 30 "), 30);
    assert.equal(parseNotificationLimit("100"), 100);
    assert.equal(parseNotificationLimit("101"), 100);
    assert.equal(parseNotificationLimit("99999999999999999999"), 50);
  });
});
