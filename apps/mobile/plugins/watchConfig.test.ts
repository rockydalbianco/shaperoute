import appJson from "../app.json";
import {
  APPLE_TARGETS,
  WATCH_CORE_PLUGIN,
  withWatchMatch,
  withWatchTarget,
} from "./watchConfig";

type Plugins = NonNullable<import("expo/config").ExpoConfig["plugins"]>;

describe("the watch's target in the config", () => {
  it("widens the Live Activity's match to the watch", () => {
    expect(withWatchMatch("live-activity")).toBe("{live-activity,watch}");
    expect(withWatchMatch("{live-activity,widget}")).toBe(
      "{live-activity,widget,watch}",
    );
  });

  it("leaves a match that already names the watch, or every target", () => {
    expect(withWatchMatch("watch")).toBe("watch");
    expect(withWatchMatch("{live-activity,watch}")).toBe("{live-activity,watch}");
    expect(withWatchMatch("*")).toBe("*");
    expect(withWatchMatch(undefined)).toBeUndefined();
  });

  it("adds the plugin for the watch alone before TASK-401 B", () => {
    const config = withWatchTarget({ plugins: ["expo-sharing"] as Plugins });
    expect(config.plugins).toEqual([
      "expo-sharing",
      WATCH_CORE_PLUGIN,
      [APPLE_TARGETS, { match: "watch" }],
    ]);
  });

  it("puts WatchCore's plugin right before the targets, once", () => {
    const config = withWatchTarget({
      plugins: [
        "expo-sharing",
        [APPLE_TARGETS, { match: "live-activity" }],
        "expo-contacts",
      ] as Plugins,
    });
    expect(config.plugins).toEqual([
      "expo-sharing",
      WATCH_CORE_PLUGIN,
      [APPLE_TARGETS, { match: "{live-activity,watch}" }],
      "expo-contacts",
    ]);
    expect(withWatchTarget(config).plugins).toEqual(config.plugins);
  });

  it("keeps the targets' other options", () => {
    const config = withWatchTarget({
      plugins: [
        [APPLE_TARGETS, { appleTeamId: "TEAM", match: "live-activity" }],
      ] as Plugins,
    });
    expect(config.plugins?.[1]).toEqual([
      APPLE_TARGETS,
      { appleTeamId: "TEAM", match: "{live-activity,watch}" },
    ]);
    expect(
      withWatchTarget({ plugins: [APPLE_TARGETS] as Plugins }).plugins?.[1],
    ).toEqual([APPLE_TARGETS, {}]);
  });

  it("changes nothing of app.json but its plugins", () => {
    const { plugins, ...rest } = appJson.expo;
    const watched = withWatchTarget(appJson.expo as unknown as { plugins: Plugins });
    const { plugins: added, ...same } = watched as typeof watched &
      Record<string, unknown>;
    expect(same).toEqual(rest);
    // With TASK-401 B app.json has the targets already (the Live Activity):
    // their match is widened in place, and only WatchCore's plugin is new.
    const isTargets = (plugin: unknown) =>
      (Array.isArray(plugin) ? plugin[0] : plugin) === APPLE_TARGETS;
    const hadTargets = (plugins as unknown[]).some(isTargets);
    const others = (plugins as unknown[]).filter((plugin) => !isTargets(plugin));
    expect(added).toEqual(expect.arrayContaining(others));
    expect(added).toHaveLength(plugins.length + (hadTargets ? 1 : 2));
    // The targets build the watch too, with WatchCore's plugin right before
    // them: Expo runs the Xcode changes in reverse.
    const at = (added as unknown[]).findIndex(isTargets);
    expect((added as unknown[])[at]).toEqual([
      APPLE_TARGETS,
      { match: hadTargets ? "{live-activity,watch}" : "watch" },
    ]);
    expect((added as unknown[])[at - 1]).toBe(WATCH_CORE_PLUGIN);
  });
});
