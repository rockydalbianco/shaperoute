// The fingerprint's own way of writing the app config, to compare with.
import { stringifyJsonSorted } from "@expo/fingerprint/build/sourcer/Utils";
import { getConfig } from "expo/config";
import path from "path";

/**
 * The Apple Watch app (TASK-370, A-flip at the 1.1) counts in the iPhone
 * fingerprint and not in the Android one: its plugins and the credentials
 * they add for EAS build a watchOS target and change nothing of Android, so
 * the Android build keeps its runtime (227457f3…) and its updates.
 * `fingerprint.config.js` takes them out of the config and adds them to a
 * source only the iPhone fingerprint has; the files they load count in
 * neither. The mirror of androidFingerprint.test.ts.
 */

type FingerprintConfig = {
  fileHookTransform(
    source: { type: "contents"; id: string },
    chunk: string | null,
    isEndOfFile: boolean,
    encoding: string,
  ): string | null;
  ignorePaths: string[];
  IOS_ONLY: { plugins: string[]; infoPlist: string[] };
  WATCH_BUILD_PATHS: string[];
  splitIosOnly(config: Record<string, any>): {
    config: Record<string, any>;
    taken: unknown[];
  };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fingerprint = require("../fingerprint.config.js") as FingerprintConfig;

const APP = path.resolve(__dirname, "..");

/** The app config as the fingerprint reads it. */
function expoConfig(): Record<string, any> {
  const { exp } = getConfig(APP, { skipSDKVersionRequirement: true });
  return JSON.parse(JSON.stringify(exp));
}

function transform(id: string, chunk: string): string | null {
  return fingerprint.fileHookTransform({ type: "contents", id }, chunk, true, "utf8");
}

function names(plugins: unknown[]): unknown[] {
  return plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
}

it("the config both fingerprints read has none of the watch", () => {
  const config = expoConfig();
  // The app builds the watch: its plugins, and what they add for EAS.
  expect(names(config.plugins)).toEqual(
    expect.arrayContaining(fingerprint.IOS_ONLY.plugins),
  );
  // From the 1.1 the same plugin builds the Live Activity too (TASK-401 B).
  expect(config.extra.eas.build.experimental.ios.appExtensions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        bundleIdentifier: "com.lppl1316.sgrava.watchkitapp",
        targetName: "watch",
      }),
      expect.objectContaining({
        bundleIdentifier: "com.lppl1316.sgrava.live-activity",
        targetName: "liveactivity",
      }),
    ]),
  );
  const read = JSON.parse(transform("expoConfig", stringifyJsonSorted(config))!);
  for (const name of fingerprint.IOS_ONLY.plugins) {
    expect(names(read.plugins)).not.toContain(name);
  }
  expect(read.extra.eas.build).toBeUndefined();
  expect(config.ios.infoPlist.NSSupportsLiveActivities).toBe(true);
  expect(read.ios.infoPlist).not.toHaveProperty("NSSupportsLiveActivities");
  expect(read.ios.infoPlist.UIBackgroundModes).toEqual(
    config.ios.infoPlist.UIBackgroundModes,
  );
  // The rest of the config is as it was.
  expect(read.extra.eas.projectId).toBe(config.extra.eas.projectId);
  expect(read.plugins).toHaveLength(config.plugins.length - 2);
});

it("the iPhone fingerprint keeps the watch", () => {
  const read = transform("expoAutolinkingConfig:ios", "modules")!;
  expect(read.startsWith("modules\n")).toBe(true);
  const taken = JSON.parse(read.slice("modules\n".length)) as unknown[];
  expect(names(taken.slice(0, 2))).toEqual(fingerprint.IOS_ONLY.plugins);
  expect(taken[1]).toEqual([
    "@bacons/apple-targets",
    { appleTeamId: "D6WUSJZKVZ", match: "{live-activity,watch}" },
  ]);
  expect(Object.keys(taken[2] as object)).toEqual(["extra.eas.build.experimental.ios"]);
  expect(taken[3]).toEqual({ "ios.infoPlist.NSSupportsLiveActivities": true });
});

it("the Android fingerprint knows nothing of the watch", () => {
  const read = transform("expoAutolinkingConfig:android", "modules")!;
  for (const name of fingerprint.IOS_ONLY.plugins) {
    expect(read).not.toContain(name);
  }
  expect(read).not.toContain("watchkitapp");
  expect(read).not.toContain("live-activity");
});

it("a config without the watch and the Live Activity is read as it is: a build before the 1.1", () => {
  const config = expoConfig();
  config.plugins = config.plugins.filter(
    (plugin: unknown) =>
      !fingerprint.IOS_ONLY.plugins.includes(
        (Array.isArray(plugin) ? plugin[0] : plugin) as string,
      ),
  );
  delete config.extra.eas.build;
  delete config.ios.infoPlist.NSSupportsLiveActivities;
  const split = fingerprint.splitIosOnly(JSON.parse(JSON.stringify(config)));
  expect(split.taken).toEqual([]);
  expect(split.config).toEqual(config);
});

it("the files the watch's plugins load count in neither fingerprint", () => {
  expect(fingerprint.ignorePaths).toEqual(
    expect.arrayContaining(["eas.json", ...fingerprint.WATCH_BUILD_PATHS]),
  );
  expect(fingerprint.WATCH_BUILD_PATHS).toEqual(
    expect.arrayContaining([
      "targets/watch/**",
      "targets/live-activity/**",
      "plugins/withWatchCore.js",
    ]),
  );
});
