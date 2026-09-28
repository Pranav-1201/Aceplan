# Flow: how execution travels

What calls what. "Not audited" marks a step I did not read line by line, so do not treat it
as verified.

## App start
`index.html` loads `src/main.tsx`, which renders `src/App.tsx`. `App` wraps everything in the
React Query provider, `next-themes` theme provider and tooltip provider, then renders the
router. Every page talks to Supabase through the one client in
`src/integrations/supabase/client.ts`.

## Reads and writes (most pages)
Page or dialog component calls `supabase.from("<table>")...` directly. RLS decides what rows
come back. About 37 places check the current user with `getSession`, `getUser` or
`onAuthStateChange`; `AINotes`, `Quiz`, `Index` and `NotFound` do not check.

## Sign in and sign up (`src/pages/Auth.tsx`)
Current state: a custom email one-time-code flow calls the edge functions `send-otp` and
`verify-otp`. This is being replaced by Supabase built-in Auth (Google sign-in plus email and
password), see `docs/DECISIONS.md` D2. Do not extend the custom flow.

## AI notes (`src/components/ai-notes/GenerateNotes.tsx`)
1. User picks material (pasted text, uploaded file, or saved materials).
2. `fetch` POST to `<supabase url>/functions/v1/generate-ai-notes` with the anon key as the
   Bearer token.
3. The function calls Groq with `stream: true` and returns the event stream.
4. The component reads the stream, renders Markdown with `marked`, and loads it into the Tiptap
   editor (`NoteEditor.tsx`). Refinement goes the same way through `refine-ai-notes`.
5. Saving into `ai_notes`: not audited.

## Quiz (`src/components/quiz/QuizGenerator.tsx`)
`generate-ai-quiz` returns JSON questions; the answers are sent to `grade-ai-quiz` (multiple
choice checked in the function, written answers graded by Groq). Storing attempts in
`quiz_attempts`: not audited.

## Timetable image (`src/components/UploadTimetableDialog.tsx`)
Image to base64, then `supabase.functions.invoke("parse-timetable")`, which returns periods as
JSON. Saving into `timetable_periods`: not audited.

## Study timer (`src/components/StudyTimer.tsx`)
Keeps the running timer in `localStorage` under `activeTimer`, saves progress to
`study_sessions` on an interval and on stop, then `src/lib/badgeUtils.ts`
(`checkStudySessionBadges`) awards badges. A database trigger rejects more than 24 hours of
study per user per day.

## Files
Materials upload to the `study-materials` bucket and are viewed with 1-hour signed URLs
(`MaterialCard.tsx`). Avatars, resumes and certificates use public URLs
(`Profile.tsx`, `AddCertificateDialog.tsx`).
