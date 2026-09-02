#!/usr/bin/env bash
#
# Runs the executable abuse tests for migration 044 against real PostgreSQL.
#
# Creates a throwaway database, loads the harness and the REAL migration file,
# attempts every forgery and cross-tenant attack, then drops the database. No
# production or staging data is read or written, and no credentials are needed
# beyond local access to the container.
#
# Usage: scripts/test/run-044-abuse.sh
set -euo pipefail

CONTAINER="${LEADER_PG_CONTAINER:-jervis-staging-postgres-1}"
DB="leader_044_abuse_$$"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"

cleanup() {
  docker exec "$CONTAINER" psql -U jervis -d postgres -q \
    -c "drop database if exists \"$DB\" (force);" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== creating throwaway database $DB =="
docker exec "$CONTAINER" psql -U jervis -d postgres -q -c "create database \"$DB\";"

echo "== loading harness + migration 044 + attacks =="
docker exec -i "$CONTAINER" mkdir -p /tmp/044/tests/sql /tmp/044/migrations
docker cp "$REPO/packages/db/tests/sql/044-audit-writer-abuse.sql" \
  "$CONTAINER:/tmp/044/tests/sql/044-audit-writer-abuse.sql"
docker cp "$REPO/packages/db/migrations/044-crm-audit-writer.sql" \
  "$CONTAINER:/tmp/044/migrations/044-crm-audit-writer.sql"

# ON_ERROR_STOP plus the RAISE EXCEPTIONs inside the script mean any attack that
# succeeds exits non-zero. A passing run is proof of refusal, not of silence.
docker exec -i "$CONTAINER" psql -U jervis -d "$DB" -v ON_ERROR_STOP=1 -q \
  -f /tmp/044/tests/sql/044-audit-writer-abuse.sql

docker exec "$CONTAINER" rm -rf /tmp/044
echo "== PASS: every forgery and cross-tenant attack was refused =="
