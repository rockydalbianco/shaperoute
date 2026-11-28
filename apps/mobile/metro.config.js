// Metro, as Expo sets it up, with one change (TASK-500, ADR-0404): inline
// requires. A module then runs the first time one of its names is used, not
// when the app opens, so the first page shows sooner (0.17 s instead of
// 0.59 s in the simulator). The iOS fingerprint does not read this file: it
// ships with an update.
//
// A module that must run when the app opens, for what it does on loading
// (a background task, a listener of the whole app), is imported for its
// effect in src/startupModules.ts.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
