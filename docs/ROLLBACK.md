# Rollback

How to undo work if it breaks something. Read before any large or risky change.

## Code
- Work happens on a branch, one commit per task. Nothing is pushed without the owner's OK.
- Undo one task: `git revert <commit>` (creates a new commit, safe if already shared).
- Abandon a whole branch that was never pushed: `git switch main`; the branch can be deleted
  later with `git branch -D <branch>` once you are sure.
- See what a commit touched before reverting: `git show --stat <commit>`.
- After any rollback re-run the checks in `docs/TEST_CHECKLIST.md`.

## Database
- Migrations only move forward. To undo a schema change, add a NEW migration that reverses it;
  never edit or delete an applied one.
- Before applying a migration to a real project, replay all migrations on an empty database
  first (`bash supabase/ci/replay.sh` with the database environment variables set).

## Edge functions and secrets
- A bad function deploy is undone by deploying the previous commit's function code again.
- Rotate a key at the provider (Groq, Supabase) if it may have leaked, then update the Supabase
  secret. Never paste keys into commits.

## Hosting (after first deploy)
- Static hosts keep previous builds; roll back by redeploying the previous build in the host's
  dashboard. Record the drill (date, who, result) here once it has been done once.
