import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, computeStreak, daysUntil, parseLocalDate, todayLocal, toLocalDateString } from "./localDate";

// The runtime's local zone decides what these helpers return, so each test sets TZ explicitly.
// Node re-reads process.env.TZ when it changes. The oracle is Intl with an explicit timeZone,
// which does not depend on the code under test: the "en-CA" locale prints YYYY-MM-DD.
const ZONES = ["Asia/Kolkata", "America/Los_Angeles", "Pacific/Auckland"] as const;
const originalTz = process.env.TZ;

const oracle = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);

// Instants chosen to straddle midnight in at least one of the zones above.
const INSTANTS = [
  "2026-11-17T20:00:00Z", // 01:30 on the 18th in India, noon on the 17th in Los Angeles
  "2026-11-18T03:00:00Z", // 19:00 on the 17th in Los Angeles, UTC day is already the 18th
  "2026-03-08T10:30:00Z", // US daylight-saving change day
  "2026-12-31T23:59:00Z", // year boundary
  "2026-12-31T10:00:00Z", // Auckland is already on 1 January
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe.each(ZONES)("local day in %s", (zone) => {
  beforeEach(() => {
    process.env.TZ = zone;
  });

  it.each(INSTANTS)("todayLocal at %s is the wall-clock date", (iso) => {
    vi.setSystemTime(new Date(iso));
    expect(todayLocal()).toBe(oracle(new Date(iso), zone));
  });

  it.each(INSTANTS)("toLocalDateString at %s is the wall-clock date", (iso) => {
    expect(toLocalDateString(new Date(iso))).toBe(oracle(new Date(iso), zone));
  });

  it("parseLocalDate gives local midnight of that day, not UTC midnight", () => {
    const d = parseLocalDate("2026-03-10");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 2, 10, 0, 0]);
  });

  it("addDays moves by calendar days across a daylight-saving change", () => {
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDays("2026-03-09", -1)).toBe("2026-03-08");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("daysUntil counts calendar days, including over a daylight-saving change", () => {
    expect(daysUntil("2026-03-10", "2026-03-07")).toBe(3);
    expect(daysUntil("2026-11-03", "2026-10-31")).toBe(3);
    expect(daysUntil("2026-11-18", "2026-11-18")).toBe(0);
    expect(daysUntil("2026-11-16", "2026-11-18")).toBe(-2);
  });
});

describe("a session saved at 01:00 in India is filed under the local date", () => {
  it("todayLocal is the 18th although the UTC date is still the 17th", () => {
    process.env.TZ = "Asia/Kolkata";
    vi.setSystemTime(new Date("2026-11-17T19:30:00Z")); // 01:00 on 18 Nov in India
    expect(new Date().toISOString().split("T")[0]).toBe("2026-11-17"); // the old, wrong answer
    expect(todayLocal()).toBe("2026-11-18");
  });
});

describe("parseLocalDate on bad input", () => {
  it.each(["", "garbage", "2026-13-01", "2026-02-31", "2026-00-10", "26-01-01"])(
    "%j is an Invalid Date",
    (bad) => {
      expect(Number.isNaN(parseLocalDate(bad).getTime())).toBe(true);
    },
  );

  it("ignores a time suffix, as a Postgres timestamp string may carry one", () => {
    process.env.TZ = "America/Los_Angeles";
    expect(toLocalDateString(parseLocalDate("2026-03-10T00:00:00+00:00"))).toBe("2026-03-10");
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-11-18", "2026-11-17", "2026-11-16"], "2026-11-18")).toBe(3);
  });

  it("keeps a streak that ended yesterday alive", () => {
    expect(computeStreak(["2026-11-17", "2026-11-16"], "2026-11-18")).toBe(2);
  });

  it("stops at the first gap", () => {
    expect(computeStreak(["2026-11-18", "2026-11-16", "2026-11-15"], "2026-11-18")).toBe(1);
  });

  it("is 0 when the newest session is older than yesterday, or there are none", () => {
    expect(computeStreak(["2026-11-10"], "2026-11-18")).toBe(0);
    expect(computeStreak([], "2026-11-18")).toBe(0);
  });

  it("does not skip a day across a month and a year boundary", () => {
    expect(computeStreak(["2027-01-01", "2026-12-31", "2026-12-30"], "2027-01-01")).toBe(3);
    expect(computeStreak(["2026-03-01", "2026-02-28", "2026-02-27"], "2026-03-01")).toBe(3);
  });
});
