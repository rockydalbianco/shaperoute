// The run's directions on the lock screen and in the Dynamic Island
// (TASK-401 part B, ADR-0335). Built only because app.json gives
// @bacons/apple-targets `"match": "live-activity"`: the watch's target
// (TASK-370) joins at its own build.

/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",
  displayName: "MuW",
  bundleIdentifier: ".live-activity",
  // The app's own minimum (Expo SDK 57).
  deploymentTarget: "16.4",
  frameworks: ["SwiftUI", "WidgetKit", "ActivityKit"],
};
