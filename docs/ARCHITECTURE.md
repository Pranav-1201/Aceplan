# Architecture

The shape of the system, not implementation detail. Last verified against the code on
2026-09-29 (commit 0bb5a65 plus the `phase-a/foundation` branch).

## Stack
- Frontend: Vite 5, React 18, TypeScript 5.8, react-router 6, Tailwind + shadcn/Radix
  components (`src/components/ui`, vendored), TanStack Query (client created, lightly used),
  Tiptap 3 editor, `marked` for Markdown, recharts, zod, react-hook-form.
- Backend: Supabase only. Postgres with row level security, Auth, Storage, Edge Functions
  (Deno). No custom server.
- AI: Groq chat completions, called only from edge functions (the key never reaches the browser).

## Layers
```
Browser (SPA)
  src/pages/*            one file per route
  src/components/*       dialogs, cards, feature components (ai-notes/, quiz/)
  src/lib/*              small pure helpers (utils.ts, badgeUtils.ts)
  src/integrations/supabase/client.ts   the single Supabase client (anon key)
        |
        | supabase-js (tables, storage, auth) and HTTPS to edge functions
        v
Supabase project
  Postgres tables (RLS: each user reads and writes only their own rows)
  Storage bucket: study-materials
  Edge functions: generate-ai-notes, refine-ai-notes, generate-ai-quiz,
                  grade-ai-quiz, parse-timetable
                  (all require a signed-in user; shared code in functions/_shared)
        |
        v
Groq API (AI functions only)
```

## Routes (`src/App.tsx`)
`/` landing, `/auth`, `/dashboard`, `/profile`, `/statistics`, `/timetable`, `/exams`,
`/my-subjects`, `/ai-notes`, `/quiz`, `/subject/:id`, `*` not found.

## Data model (tables in `src/integrations/supabase/types.ts`)
ai_notes, ai_usage, certificates, exam_subjects, exams, folders, profiles, quiz_attempts,
semester_gpas, study_materials, study_sessions, subjects, timetable_periods, user_badges.
Schema history is `supabase/migrations/*.sql` (16 files, applied in filename order; never
edit an existing one, add a new file).

## Environment
- Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
  (see README). The anon key is public by design; what it can reach is decided by RLS.
- Edge functions: `GROQ_API_KEY` (set with `supabase secrets set`), plus `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` provided by Supabase. `RESEND_API_KEY` only when a custom
  email sender exists.

## Quality gates (CI, `.github/workflows/ci.yml`)
lint, typecheck, unit tests, build, and a from-scratch replay of every migration against a
stubbed Supabase schema (`supabase/ci/`).

## Known gaps (tracked, not hidden)
See `docs/HANDOVER.md` and the private audit roadmap. Deployment target chosen: static
frontend host plus a Supabase project; not deployed yet.
