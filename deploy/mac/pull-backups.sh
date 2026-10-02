#!/usr/bin/env bash
# Takes the server's database copies to this Mac (TASK-122, ADR-0123,
# docs/DEPLOY.md F.13). launchd runs it every 6 hours while the Mac is on
# (install-pull-backups.sh); by hand it is just
#
#   SHAPEROUTE_BACKUP_SERVER=root@<server> deploy/mac/pull-backups.sh
#
# The copies are mirrored from data/backups (a copy the server deleted goes
# from here too), and the ones older than SHAPEROUTE_BACKUP_KEEP_DAYS are
# deleted even when the server does not answer: an account deleted today is
# out of every copy, this Mac's included, within 14 days (ADR-0114). The
# search events (data/insights) are added to, never deleted.

set -euo pipefail

server="${SHAPEROUTE_BACKUP_SERVER:?set SHAPEROUTE_BACKUP_SERVER, e.g. root@<server address>}"
dest="${SHAPEROUTE_BACKUP_DIR:-$HOME/ShapeRouteBackups}"
keep_days="${SHAPEROUTE_BACKUP_KEEP_DAYS:-13}"
remote="${SHAPEROUTE_BACKUP_REMOTE_DIR:-/root/shaperoute/data}"
# Tests swap in a stand-in for ssh (tools/test_pull_backups.py).
ssh_options="${SHAPEROUTE_BACKUP_SSH:-ssh -o BatchMode=yes -o ConnectTimeout=20}"

# Copies of personal data: readable by this user only.
umask 077
mkdir -p "$dest/db" "$dest/insights"
chmod 700 "$dest"

prune() {
    find "$dest/db" -maxdepth 1 -name 'shaperoute-*.dump' \
        -mmin +$((keep_days * 24 * 60)) -delete
}

prune
rsync -a --delete --include='shaperoute-*.dump' --exclude='*' \
    -e "$ssh_options" "$server:$remote/backups/" "$dest/db/"
rsync -a -e "$ssh_options" "$server:$remote/insights/" "$dest/insights/"
prune
echo "$(date -u +%FT%TZ) pulled: $(find "$dest/db" -name 'shaperoute-*.dump' | wc -l | tr -d ' ') database copies"
