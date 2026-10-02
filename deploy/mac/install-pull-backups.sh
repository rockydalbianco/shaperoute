#!/usr/bin/env bash
# Installs the copy of the database copies on this Mac (TASK-122, ADR-0123,
# docs/DEPLOY.md F.13): the script goes into the backup folder, launchd
# runs it every 6 hours while the Mac is on, and once now.
#
#   deploy/mac/install-pull-backups.sh root@<server>      install or update
#   deploy/mac/install-pull-backups.sh --remove           stop and remove
#
# The copies stay in ~/ShapeRouteBackups (SHAPEROUTE_BACKUP_DIR to change it).

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
dest="${SHAPEROUTE_BACKUP_DIR:-$HOME/ShapeRouteBackups}"
label="com.shaperoute.pull-backups"
agent="$HOME/Library/LaunchAgents/$label.plist"
domain="gui/$(id -u)"

launchctl bootout "$domain/$label" 2>/dev/null || true
if [[ "${1:-}" == "--remove" ]]; then
    rm -f "$agent"
    echo "Removed: the copies already in $dest stay there."
    exit 0
fi

server="${1:?usage: install-pull-backups.sh root@<server> | --remove}"
umask 077
mkdir -p "$dest" "$(dirname "$agent")"
chmod 700 "$dest"
cp "$here/pull-backups.sh" "$dest/pull-backups.sh"
sed -e "s|__DEST__|$dest|g" -e "s|__SERVER__|$server|g" \
    "$here/$label.plist" > "$agent"
plutil -lint "$agent" >/dev/null
launchctl bootstrap "$domain" "$agent"
echo "Installed: every 6 hours from $server into $dest (log: $dest/pulls.log)."
