#!/bin/sh
# Writes the sport table of the Apple Watch again from the app's registry
# (TASK-370 part A1): src/watch/watchSports.ts into
# targets/watch/Core/Sources/WatchCore/Resources/sports.json. Run it after
# a change in src/sports/; the jest test of watchSports.ts fails until then.
set -e
cd "$(dirname "$0")/.."
env WRITE_WATCH_SPORTS=1 CI=true npx jest src/watch/watchSports.test.ts </dev/null
