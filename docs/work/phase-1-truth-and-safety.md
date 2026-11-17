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

## Open items
B16 (local dates), B15 (timer), B13 (password reset), B17, B22, B23, B7 (storage split) remain.
A pull request is needed for CI to run on this branch.
