#!/usr/bin/env bash
# The nightly copy of the database (TASK-122, ADR-0123, docs/DEPLOY.md F.13).
#
# Runs in the backup service of compose.yaml, with the PostgreSQL client of
# the postgis image and PGHOST, PGUSER, PGDATABASE, PGPASSWORD set there.
# Every day at BACKUP_AT (UTC, HH:MM) it
# writes /backups/shaperoute-<when>.dump with pg_dump --format=custom, then
# deletes the copies older than BACKUP_KEEP_DAYS days: with 13, an account
# deleted today is out of every copy within 14 days (ADR-0114). A copy is
# written under a hidden name and renamed when whole, so the Storage Box
# never gets half a file.
#
# In the offsite service (deploy/offsite/Dockerfile: rsync, ssh), with
# STORAGEBOX_HOST and STORAGEBOX_USER set, the copies go to the Storage Box
# every day at PUSH_AT (sgrava-db/, the same set as here: one deleted here
# goes from there too), and so do the search events (sgrava-insights/, only
# added to), with rsync over ssh on port 23 and the key in /storagebox
# (ADR-0123, update of 2026-10-02; DEPLOY.md F.13). Without them the copies
# stay here.
#
#   bash backup.sh               copy at BACKUP_AT, every day      (backup)
#   bash backup.sh now           one copy now (before an update)   (backup)
#   bash backup.sh check [FILE]  restore FILE (default: the newest copy) into
#                                a scratch database, count the accounts,
#                                drop it: the real one is never touched
#   bash backup.sh push-nightly  push at PUSH_AT, every day        (offsite)
#   bash backup.sh push          one push now                      (offsite)

set -euo pipefail
# The copies hold emails and password hashes: readable by their owner only.
umask 077

at="${BACKUP_AT:-02:00}"
push_at="${PUSH_AT:-02:30}"
keep_days="${BACKUP_KEEP_DAYS:-13}"
dir="${BACKUP_DIR:-/backups}"
insights="${INSIGHTS_DIR:-/insights}"
box_host="${STORAGEBOX_HOST:-}"
box_user="${STORAGEBOX_USER:-}"
key_dir="${STORAGEBOX_SSH_DIR:-/storagebox}"
# The host key is checked against known_hosts, written once at setup
# (DEPLOY.md F.13). Tests swap in a stand-in for ssh (tools/test_backup_push.py).
ssh_command="${BACKUP_SSH:-ssh -p 23 -i $key_dir/id_ed25519 -o UserKnownHostsFile=$key_dir/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=20}"

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

push() {
    if [[ -z "$box_host" || -z "$box_user" ]]; then
        echo "push: no Storage Box (STORAGEBOX_HOST, STORAGEBOX_USER): the copies stay on this server"
        return 0
    fi
    local box="$box_user@$box_host"
    rsync -a --delete --include='shaperoute-*.dump' --exclude='*' \
        -e "$ssh_command" "$dir/" "$box:sgrava-db/" || return 1
    if [[ -d "$insights" ]]; then
        rsync -a -e "$ssh_command" "$insights/" "$box:sgrava-insights/" || return 1
    fi
    echo "push: $(find "$dir" -maxdepth 1 -name 'shaperoute-*.dump' | wc -l | tr -d ' ') copies and the search events to $box_host"
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

# Runs JOB every day at AT (UTC, HH:MM). A failed night is said in the log
# and tried again the next one; a failed push leaves the copies here.
nightly() {
    local at="$1" job="$2" now next
    while true; do
        now=$(date -u +%s)
        next=$(date -u -d "today $at" +%s)
        if ((next <= now)); then
            next=$(date -u -d "tomorrow $at" +%s)
        fi
        sleep $((next - now))
        "$job" || echo "$job: FAILED at $(date -u +%FT%TZ)" >&2
    done
}

case "${1:-}" in
now)
    copy
    ;;
check)
    check "${2:-}"
    ;;
push)
    push
    ;;
push-nightly)
    echo "push: every day at $push_at UTC to ${box_host:-no Storage Box yet}"
    nightly "$push_at" push
    ;;
"")
    echo "backup: every day at $at UTC into $dir, $keep_days days kept"
    nightly "$at" copy
    ;;
*)
    echo "usage: backup.sh [now | check [FILE] | push | push-nightly]" >&2
    exit 2
    ;;
esac
