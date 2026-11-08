#!/bin/sh
# Writes the routes the Apple Watch's XCTest reads again from the phone's
# watchRoute.ts (TASK-370 part B3a): src/watch/watchRoute.ts into
# targets/watch/Core/Fixtures/routes.json. Run it after a change in what a
# route for the watch carries; the jest test of watchRoute.ts fails until
# then, and the watch's WatchRoute.swift must read the new fields.
set -e
cd "$(dirname "$0")/.."
env WRITE_WATCH_ROUTES=1 CI=true npx jest src/watch/watchRoute.test.ts </dev/null
npx prettier --write --log-level warn targets/watch/Core/Fixtures/routes.json
