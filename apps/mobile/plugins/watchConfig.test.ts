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

  // From A-flip (the watch's own build, 1.1) app.json builds the watch
  // itself: MUW_WATCH=1 changes nothing of it.
  it("changes nothing of app.json, which builds the watch already", () => {
    const watched = withWatchTarget(appJson.expo as unknown as { plugins: Plugins });
    expect(watched).toEqual(appJson.expo);
    expect(appJson.expo.plugins.slice(-2)).toEqual([
      WATCH_CORE_PLUGIN,
      [APPLE_TARGETS, { match: "{live-activity,watch}", appleTeamId: "D6WUSJZKVZ" }],
    ]);
  });
});
