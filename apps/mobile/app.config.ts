import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json stays the whole config; this file only changes the runtime version
 * of the App Store build (TASK-152).
 *
 * Expo Go opens an update only when its runtime version is "exposdk:<sdk>"
 * (ADR-0078), so the `preview` channel keeps the one in app.json. The store
 * build (eas.json profile `production`, which sets APP_VARIANT) uses a
 * fingerprint of its native code instead: an update made with other native
 * libraries gets another runtime version and never reaches it.
 *
 * Publishing to the `production` channel needs the same variable:
 * `APP_VARIANT=production npx eas-cli update --channel production ...`
 * (docs/DEPLOY.md A.7). Without it the update is made for Expo Go, and store
 * builds simply do not receive it.
 */
export default ({ config }: ConfigContext): Partial<ExpoConfig> =>
  process.env.APP_VARIANT === "production"
    ? { ...config, runtimeVersion: { policy: "fingerprint" } }
    : config;
