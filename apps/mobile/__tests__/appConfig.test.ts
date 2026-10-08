import type { ConfigContext } from "expo/config";

import appConfig from "../app.config";
import appJson from "../app.json";
import easJson from "../eas.json";

/**
 * Expo Go opens only updates made for "exposdk:<sdk>" (ADR-0078); the App
 * Store build takes its runtime from a fingerprint of its native code
 * (ADR-0233). The two must never swap.
 */
function resolve(appVariant: string | undefined) {
  const before = process.env.APP_VARIANT;
  if (appVariant === undefined) {
    delete process.env.APP_VARIANT;
  } else {
    process.env.APP_VARIANT = appVariant;
  }
  try {
    const context: ConfigContext = {
      projectRoot: "",
      staticConfigPath: null,
      packageJsonPath: null,
      // JSON gives `orientation` and the like as plain strings.
      config: appJson.expo as ConfigContext["config"],
    };
    return appConfig(context);
  } finally {
    if (before === undefined) {
      delete process.env.APP_VARIANT;
    } else {
      process.env.APP_VARIANT = before;
    }
  }
}

it("keeps the Expo Go runtime of app.json without a variant", () => {
  expect(appJson.expo.runtimeVersion).toMatch(/^exposdk:\d+\.0\.0$/);
  expect(resolve(undefined)).toEqual(appJson.expo);
  expect(resolve("preview")).toEqual(appJson.expo);
});

it("gives the App Store build a fingerprint runtime and nothing else new", () => {
  expect(resolve("production")).toEqual({
    ...appJson.expo,
    runtimeVersion: { policy: "fingerprint" },
  });
});

it("sets the variant only in the production build profile", () => {
  const { preview, production } = easJson.build;
  expect(production).toMatchObject({
    channel: "production",
    env: { APP_VARIANT: "production" },
  });
  expect(preview).toMatchObject({ channel: "preview" });
  expect(preview).not.toHaveProperty("env");
});
