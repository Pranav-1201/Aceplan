#!/usr/bin/env bash
# Replays every migration, in filename order, on an EMPTY Postgres and then runs the checks.
# Usage: PGHOST=... PGUSER=... PGPASSWORD=... PGDATABASE=... bash supabase/ci/replay.sh
# Used by the "db" job in .github/workflows/ci.yml.
set -euo pipefail

supabase_dir="$(cd "$(dirname "$0")/.." && pwd)"

echo "applying stubs"
psql -v ON_ERROR_STOP=1 -q -f "$supabase_dir/ci/00_stubs.sql"

for migration in "$supabase_dir"/migrations/*.sql; do
  echo "applying $(basename "$migration")"
  psql -v ON_ERROR_STOP=1 -q -f "$migration"
done

echo "running quota checks"
psql -v ON_ERROR_STOP=1 -f "$supabase_dir/ci/98_quota_test.sql"

echo "running checks"
psql -v ON_ERROR_STOP=1 -f "$supabase_dir/ci/99_assert.sql"
