# Constraints: what an AI session must never do

Short on purpose. "Allow" means allow within these lines.

## Repository and secrets
- Never commit `.env`, keys, tokens or the service role key. The anon key is public, but it
  still lives only in `.env`.
- The GitHub repo is PUBLIC. Do not push, open a pull request, or publish anything without the
  owner's explicit go-ahead.
- Do not describe an unfixed security weakness in a commit message, issue, pull request or file
  in this repo. Write it in the private audit notes and fix first.
- Commit with explicit file paths. Never `git add -A` or `git add .`.
- No AI or assistant attribution in commits, pull requests or releases (no Co-Authored-By
  trailers). The owner is the sole developer of record.

## Code
- No new runtime dependency without asking. A dev-only tool needs a line in `docs/DECISIONS.md`.
- Never edit an existing file in `supabase/migrations/`; add a new migration.
- Do not change `verify_jwt` in `supabase/config.toml`, CORS, or row level security policies
  as a side effect of another task. Those are security changes, one task each.
- Never loosen a test or a lint gate to make a change pass. A failing gate is the finding.
  (A proposed lint relaxation is recorded as `docs/DECISIONS.md` D3 and is not applied.)
- Do not hand-edit `src/integrations/supabase/types.ts`; regenerate it from the database.
- Do not read secrets out of `.env` into logs, docs or chat.

## Comments
- Non-obvious logic gets a comment saying what the block is for, what calls it and what it
  assumes. Do not add comments that restate the code.

## Process
- One logical change per commit; keep the suite green at every commit.
- New code is added and verified before old code is removed.
- Do not claim "done" or "works" without command output from the same session.
- Do not invent numbers, filenames or package names; check first.
