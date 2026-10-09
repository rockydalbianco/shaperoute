/**
 * The App Store build has no ads for now (TASK-267, ADR-0237): there,
 * AdMob's native code is not linked at all, so neither its SDK nor Google's
 * privacy manifest is in the app Apple receives. The store build is the
 * one with APP_VARIANT=production (eas.json, profile `production`, as for
 * its runtime version in app.config.ts). Preview builds and Expo Go keep
 * AdMob as before. Without the native module the app has no ads and does
 * not break: `src/ads/admob.ts` never loads the package (as in Expo Go).
 */
const storeBuild = process.env.APP_VARIANT === "production";

module.exports = {
  dependencies: storeBuild
    ? {
        "react-native-google-mobile-ads": {
          platforms: { ios: null, android: null },
        },
      }
    : {},
};
