// What the runtime version of the App Store build is made of (app.config.ts).
// Left out: the app's version and build number, which EAS raises at every
// store build, and eas.json, which gains store settings over time. Neither
// changes the native code, so a build with a new number must still receive
// the same updates.
/** @type {import('expo/fingerprint').Config} */
const config = {
  sourceSkips: ["ExpoConfigVersions", "PackageJsonAndroidAndIosScriptsIfNotContainRun"],
  ignorePaths: ["eas.json"],
};

module.exports = config;
