// The Apple Watch app (TASK-370 part A2, ADR-0314): SwiftUI, watchOS 10+.
// Built only when @bacons/apple-targets is given a `match` that names
// "watch": with MUW_WATCH=1 in app.config.ts for the local tests, in
// app.json from the watch's own build (1.1, part A-flip). Core/ is the
// WatchCore package, linked as a local package by plugins/withWatchCore.js
// and kept out of this folder's files, its tests with it.

/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "watch",
  displayName: "MuW",
  bundleIdentifier: ".watchkitapp",
  deploymentTarget: "10.0",
  icon: "../../assets/icon.png",
  // The logo at the top of the sports: the heart of the icon and the name.
  images: {
    MuWHeart: "../../assets/icon.png",
    MuWName: "../../assets/splash-logo-dark.png",
  },
  frameworks: ["SwiftUI", "HealthKit", "WatchConnectivity"],
  entitlements: {
    "com.apple.developer.healthkit": true,
    "com.apple.developer.healthkit.access": [],
  },
};
