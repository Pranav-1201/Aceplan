# Phase 1: truth and safety

One trace file for the whole phase; each item is a section. Plan source: the private audit
roadmap (revision 3), section 9, Phase 1.

- Type: feature (bundle of fixes)
- Status: in progress
- Owner and model: project owner / claude-sonnet-5-5
- Started: 2026-11-17
- Branch: `phase-1/truth-and-safety`, branched from `phase-b/security` (pull request 1 is still
  open, so this branch carries those commits too)

## H1: invented numbers and features on the landing page (done)
Found: the roadmap finding H1. `src/pages/Index.tsx` claimed 10,000+ students, a 95% success
rate, reminders and search; none exist.
Done: removed the fake avatar row and the two floating stat cards; reworded the hero, exam,
materials and call-to-action copy; footer year is computed. Commit `ab0ffce`.
Verified: grep of `src` for "10,000", "10k+", "95%", "thousands of", "searchable", "intelligent",
"and reminders" finds only a code comment and CSS `hsl(... 95% ...)` values. Typecheck clean,
54 tests pass in 8 files, eslint clean on the file.
Left for Phase 3: gradient text, sparkle logo and the other generated-look patterns (U8).

## B14: dompurify and production advisories (done, see D14)
Found: `npm audit --omit=dev` reported 21 advisories, 1 critical (dompurify).
Tried: unqualified `npm audit fix` bumped rollup to 4.68.5, which Windows Application Control
blocks on this machine (`ERR_DLOPEN_FAILED`, "An Application Control policy has blocked this
file"); typecheck still passed but vitest and build died. Reverted the lockfile, ran `npm ci`,
and updated only the named production packages. `--omit=dev` on `audit fix` is dangerous: the
dry run planned to remove 271 dev packages.
Verified: typecheck clean; 54 tests pass in 8 files; build succeeds (11.80 s);
`npm audit --omit=dev` shows 3 advisories (zod high, react-router and react-router-dom moderate),
each deferred with a written reason in D14. New CI job `audit` exits 1 on the old lockfile and 0
on the new one.
Not verified: the Tiptap editor in a browser (core and pm are at 3.34, the extensions at 3.19).

## B16: dates on the student's local calendar (done in the browser code; storage part deferred)
Found: finding C11. Eight places built "today" with `toISOString().split('T')[0]` (the UTC day;
in India that is yesterday until 05:30) and about fifteen read a bare `YYYY-MM-DD` column with
`new Date(...)`, which is UTC midnight and shows the previous day west of Greenwich.
Done: `src/lib/localDate.ts` (`todayLocal`, `toLocalDateString`, `parseLocalDate`, `addDays`,
`daysUntil`, `computeStreak`) used by StudyTimer, badgeUtils, Statistics, Exams, Profile,
EditExamDialog, SubjectCard, UpcomingExams, MySubjects and SubjectDetail. The streak walk in
badgeUtils is now the pure `computeStreak`, so it can be tested.
Verified: 52 new tests, run in three zones (Asia/Kolkata, America/Los_Angeles, Pacific/Auckland)
against an `Intl.DateTimeFormat` oracle that does not use the code under test. Nine planted bugs
(UTC day, `toISOString`, UTC-midnight parse, rollover accepted, 24-hour-block addition, truncated
day count, yesterday ignored, wrong step after yesterday, gaps counted) were each killed, one per
run; the file was restored and the 52 pass again. Full suite 106 passed in 9 files; typecheck
clean; the grep for `toISOString().split` and `new Date(exam_date|date)` finds nothing left.
Not done: the roadmap also says to store session timestamps with a time zone. That needs a
migration and belongs with B15 (timer rows). `CertificateCard` and `BadgeCard` still format a
date with the runtime default; the certificate date column was not checked. The week still starts
on Sunday (C13). Not tried in a browser: no live project.

## Open items
B15 (timer), B13 (password reset), B17, B22, B23, B7 (storage split) remain.
A pull request is needed for CI to run on this branch.
