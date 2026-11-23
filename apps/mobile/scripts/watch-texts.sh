#!/bin/sh
# Writes the texts of the Apple Watch app again from the app's tables
# (TASK-370 part A2): src/watch/watchTexts.ts into
# targets/watch/<language>.lproj/Localizable.strings. Run it after changing
# the watch's texts or their translations; the jest test of watchTexts.ts
# fails until then.
set -e
cd "$(dirname "$0")/.."
env WRITE_WATCH_TEXTS=1 CI=true npx jest src/watch/watchTexts.test.ts </dev/null
