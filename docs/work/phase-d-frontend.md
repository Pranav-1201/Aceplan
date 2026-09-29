# Phase D: frontend and UX (the verifiable part)

- Type: feature
- Status: partly done (see "Not done")
- Owner and model: project owner / claude-sonnet-5-5
- Started: 2026-09-29

## Found or scoped
The build shipped the whole app as one 1,821.88 kB (524.30 kB gzip) file, about 37 places checked
the session on their own, and two pages (`AINotes`, `Quiz`) did not check at all. This phase does
the parts that can be proven with numbers and tests on a machine with no backend.

## Plan
1. Load every page on demand. 2. One protected-route wrapper for the signed-in pages. 3. Remove
the dead share-image tags. 4. Record what was left and why.

## Tried
- Route-level code splitting with `React.lazy` in `src/App.tsx`. Build: main entry chunk 487.74 kB
  (146.88 kB gzip); the notes editor chunk 485.33 kB and charts chunk 362.44 kB load only on their
  pages; about 59 chunks; the chunk-size warning is gone. The roadmap target was under 400 kB gzip
  for the initial load: met by the entry chunk. Real network transfer was not measured.
- `ProtectedRoute` wraps nine routes. Its first test run failed 3 of 5 tests because Testing
  Library's automatic cleanup is off when Vitest globals are off; adding `afterEach(cleanup)` to
  `src/test/setup.ts` fixed the cause (test pages leaking into each other), not the tests.
- Hosting fallback file: deliberately not added (D11).

## Verification
- `npm run typecheck`: exit 0.
- `npm test`: 8 files, 54 tests passed.
- Planted 6 bugs in `ProtectedRoute` (no redirect, page shown before the session is known, never
  stops listening, later sign-out ignored, inverted check, wrong redirect target): all 6 caught;
  file restored.
- `npm run build`: exit 0, 3574 modules, figures above.
- `npx eslint` on the touched files: exit 0.

## Files touched
`src/App.tsx`, `src/components/ProtectedRoute.tsx` and its test, `src/test/setup.ts`,
`index.html`, `docs/*`.

## Not done, and why
- Splitting the 1,390-line `Exams.tsx` and removing the 101 `any` types (also the open lint
  decision D3): large edits with no way to run the app against a backend here, so the risk of a
  silent regression is high and the benefit is maintainability, not behaviour.
- Switching data loading to TanStack Query, and the accessibility pass: both need the running app
  and a screen reader or audit tool to verify; start them once a Supabase project exists.
- Removing the pages' own session checks: safe to do later, now that `ProtectedRoute` covers them.
- Not verified anywhere yet: how the app actually looks and behaves in a browser (no backend).

## Open items
Check the `@aceplan` Twitter handle in `index.html` belongs to the project. Add a share banner
image when one exists.
