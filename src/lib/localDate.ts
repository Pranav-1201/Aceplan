// Local calendar-day helpers (roadmap B16, finding C11).
//
// The app stores a study session's day and an exam's day as a bare "YYYY-MM-DD" string. That
// string must be the day on the STUDENT'S wall clock. `new Date().toISOString()` gives the UTC
// day instead, which in India is yesterday until 05:30, and `new Date("YYYY-MM-DD")` parses as
// UTC midnight, which shows the previous day to anyone west of Greenwich. Every place that
// creates or reads such a string goes through this file so there is one definition of "today".
//
// Called by: StudyTimer, badgeUtils (streaks), Exams, Profile, Statistics, and the pages that
// show an exam date. Assumes nothing about the time zone: it uses the runtime's local zone.

const pad = (n: number): string => String(n).padStart(2, "0");

/** The given instant as a local "YYYY-MM-DD" string. */
export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's date on the student's wall clock, as "YYYY-MM-DD". */
export function todayLocal(): string {
  return toLocalDateString(new Date());
}

/**
 * Parse "YYYY-MM-DD" as LOCAL midnight of that day. A malformed or out-of-range string (for
 * example month 13 or day 31 of a 30-day month) returns an Invalid Date, matching what
 * `new Date(bad)` did before, so callers keep their existing behaviour for bad data.
 */
export function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return new Date(NaN);
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(year, month - 1, day);
  // `new Date(2026, 1, 31)` silently rolls over to March 3; reject that instead.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return new Date(NaN);
  }
  return d;
}

/** Calendar arithmetic on a "YYYY-MM-DD" string. Safe across daylight-saving changes. */
export function addDays(value: string, days: number): string {
  const d = parseLocalDate(value);
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
}

/**
 * Whole calendar days from today until the given "YYYY-MM-DD" date (negative if past).
 * Counts calendar days, not 24-hour blocks, so it is right on daylight-saving days.
 */
export function daysUntil(value: string, today: string = todayLocal()): number {
  const target = parseLocalDate(value);
  const from = parseLocalDate(today);
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utc(target) - utc(from)) / 86_400_000);
}

/**
 * Length of the current study streak. `dates` are the distinct session days, newest first. A
 * streak that ended yesterday still counts (the student has not studied yet today); one that
 * ended earlier is 0.
 */
export function computeStreak(dates: string[], today: string): number {
  let streak = 0;
  let expected = today;
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] === expected) {
      streak++;
      expected = addDays(expected, -1);
    } else if (i === 0 && dates[i] === addDays(today, -1)) {
      streak++;
      expected = addDays(dates[i], -1);
    } else {
      break;
    }
  }
  return streak;
}
