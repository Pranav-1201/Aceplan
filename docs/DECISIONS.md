# Decisions

Newest at the bottom. Format: decision, why, who and which model, date. Do not reopen one
without new evidence; add a new entry that supersedes it instead.

## D1: Product direction is a semester planner, AI is an opt-in extra
Why: the planning workflow (timetable, exams, study timer, materials, badges) is what the
schema and UI are built around, and it is the part general AI tools do not offer in one place.
AI notes and quizzes are easily matched by off-the-shelf tools.
Decided by: project owner, 2026-09-29. Recommended by: claude-sonnet-5-5.

## D2: Authentication uses Supabase built-in Auth: Google sign-in plus email and password
Why: the custom email one-time-code flow (`send-otp`, `verify-otp`) has correctness and
security problems, and the built-in service replaces it with less code. Email one-time codes
can be added later through the built-in service once a custom email sender (a domain) exists.
Cost note: Supabase's default email sender only reaches project team members and is capped at
2 messages an hour, so keep email confirmation off until a custom sender exists. Google
sign-in needs no email.
Consequence: the auth rewrite is Phase B, not Phase A.
Decided by: project owner, 2026-09-29. Recommended by: claude-sonnet-5-5.

## D3: PROPOSED, NOT APPLIED: `no-explicit-any` as a warning with a ceiling
Why proposed: 101 of the 104 original lint errors were this one rule (3 were fixed in code),
so the lint job cannot go green without either fixing 101 `any` usages or relaxing the rule.
The proposal was `warn` plus a `--max-warnings` ceiling so the count cannot grow.
Status: the project's config-protection hook refused the edit to `eslint.config.js` ("fix the
source code instead of weakening the config"). It was not worked around. Until the owner
chooses, the CI `lint` job is a separate job and stays red. Options: (a) owner temporarily
disables that hook so the change can land, or (b) the `any` usages are fixed in source (the
frontend quality phase).
Decided by: open, waiting for the owner. Raised by: claude-sonnet-5-5, 2026-09-29.

## D4: CI has two jobs, and the database replay is checked locally with a throwaway PGlite
Why: the machine has no Docker or Postgres. The `db` job replays every migration against a
stub of Supabase's `auth` and `storage` schemas on a Postgres service container in CI. Locally
the same SQL is run in PGlite installed in a scratch folder, never in the project's
dependencies.
Decided by: claude-sonnet-5-5, 2026-09-29.

## D5: Audit findings and plans stay outside the public repo
Why: the repo is public and the audit describes unfixed weaknesses. Only non-sensitive
architecture, flow, decisions and constraints are committed.
Decided by: claude-sonnet-5-5, confirmed by the owner's public-repo answer, 2026-09-29.

## D6: `.env.example` is not created by an AI session
Why: the owner's permission settings deny access to `.env*` files, and that is respected
rather than worked around. The variables are documented in `README.md` instead. If the owner
wants an `.env.example`, they can add it.
Decided by: claude-sonnet-5-5, 2026-09-29.

## D7: AI functions check the user themselves; gateway `verify_jwt` stays off
Why: the public anon key is itself a valid signed token, so the gateway check alone would still
let anonymous callers through, and it can block browser preflight requests. Each AI function
calls `requireUser` (`supabase/functions/_shared/auth.ts`), which asks the auth server to validate
the token and rejects anything that is not a signed-in user. To confirm with a live request once
a project exists (see TEST_CHECKLIST).
Decided by: claude-sonnet-5-5, 2026-09-29.

## D8: One new runtime dependency, `dompurify`
Why: AI-generated Markdown was rendered as raw HTML. `src/lib/safeHtml.ts` sanitizes it. This was
the audit's item F3, covered by the owner's instruction to continue the roadmap; it is the only
new runtime dependency added in Phase B.
Decided by: claude-sonnet-5-5, 2026-09-29.

## D9: Function limits and models are settings; the defaults are guesses to check
Why: input caps (60,000 characters of material, 1,000 of instructions, 6,000,000 characters of
image) and the daily limit (50 calls) were chosen for safety, not measured. Models come from
`GROQ_TEXT_MODEL` and `GROQ_VISION_MODEL`; the vision default was not verified against Groq's
current list. Tune all of these from real use.
Decided by: claude-sonnet-5-5, 2026-09-29.
