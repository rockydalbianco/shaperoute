#!/usr/bin/env bash
# The nightly copy of the database (TASK-122, ADR-0123, docs/DEPLOY.md F.13).
#
# Runs in the backup service of compose.yaml, with the PostgreSQL client of
# the postgis image and PGHOST, PGUSER, PGDATABASE, PGPASSWORD set there.
# Every day at BACKUP_AT (UTC, HH:MM) it writes /backups/shaperoute-<when>.dump
# with pg_dump --format=custom, then deletes the copies older than
# BACKUP_KEEP_DAYS days: with 13, an account deleted today is out of every
# copy within 14 days (ADR-0114). A copy is written under a hidden name and
# renamed when whole, so the Mac never takes half a file.
#
#   bash backup.sh               wait for BACKUP_AT, every day
#   bash backup.sh now           one copy now, then exit (before an update)
#   bash backup.sh check [FILE]  restore FILE (default: the newest copy) into
#                                a scratch database, count the accounts,
#                                drop it: the real one is never touched

set -euo pipefail
# The copies hold emails and password hashes: readable by their owner only.
umask 077

at="${BACKUP_AT:-02:00}"
keep_days="${BACKUP_KEEP_DAYS:-13}"
dir="${BACKUP_DIR:-/backups}"

copy() {
    local name part
    name="shaperoute-$(date -u +%Y-%m-%dT%H%MZ).dump"
    part="$dir/.$name.part"
    # Explicit returns: under "copy || …" bash ignores set -e, and a failed
    # dump must never go on to delete the old copies.
    pg_dump --format=custom --no-owner --file="$part" || return 1
    mv "$part" "$dir/$name" || return 1
    find "$dir" -maxdepth 1 -name 'shaperoute-*.dump' \
        -mmin +$((keep_days * 24 * 60)) -delete
    find "$dir" -maxdepth 1 -name '.shaperoute-*.part' -mmin +60 -delete
    echo "backup: $name ($(du -h "$dir/$name" | cut -f1)); kept $(
        find "$dir" -maxdepth 1 -name 'shaperoute-*.dump' | wc -l)"
}

check() {
    local file="${1:-}" scratch="restore_check"
    if [[ -z "$file" ]]; then
        file="$(find "$dir" -maxdepth 1 -name 'shaperoute-*.dump' | sort | tail -n 1)"
    fi
    [[ -f "$file" ]] || { echo "check: no copy to restore" >&2; return 1; }
    dropdb --if-exists "$scratch"
    createdb "$scratch"
    pg_restore --no-owner --exit-on-error --dbname="$scratch" "$file"
    echo "check: $(basename "$file") restores; $(psql -At -d "$scratch" \
        -c 'SELECT count(*) FROM users') accounts, migrations $(psql -At \
        -d "$scratch" -c "SELECT string_agg(version, ',' ORDER BY version) FROM schema_migrations")"
    dropdb "$scratch"
}

case "${1:-}" in
now)
    copy
    exit 0
    ;;
check)
    check "${2:-}"
    exit 0
    ;;
esac

echo "backup: every day at $at UTC into $dir, $keep_days days kept"
while true; do
    now=$(date -u +%s)
    next=$(date -u -d "today $at" +%s)
    if ((next <= now)); then
        next=$(date -u -d "tomorrow $at" +%s)
    fi
    sleep $((next - now))
    # A failed night is said in the log and tried again the next one.
    copy || echo "backup: FAILED at $(date -u +%FT%TZ)" >&2
done
