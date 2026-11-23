#!/bin/sh
# Writes the guide traces of the Apple Watch again from the phone's
# navigator (TASK-370 part B1): src/watch/guideTrace.ts into
# targets/watch/Core/Fixtures/guide/. Run it after a change in
# src/navigation/ (navigator.ts, progress.ts, rejoin.ts); the jest test of
# guideTrace.ts fails until then, and the watch's Navigator.swift must then
# do the same, or `swift test` fails.
set -e
cd "$(dirname "$0")/.."
env WRITE_WATCH_GUIDE=1 CI=true npx jest src/watch/guideTrace.test.ts </dev/null
# As CI's format check wants them: the test reads what they say, not how.
npx prettier --write --log-level warn targets/watch/Core/Fixtures/guide
