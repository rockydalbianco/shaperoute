// The Apple Watch target in the app's config, only for the local tests of
// TASK-370 part A2 (ADR-0314): app.config.ts calls it with MUW_WATCH=1.
// Without the variable the config is app.json as it is, so the iOS
// fingerprint of main does not move until the watch's own build (1.1, part
// A-flip). Pure: it only changes the list of plugins. JavaScript, because
// Expo reads app.config.ts alone and cannot import TypeScript from it.
//
// @bacons/apple-targets builds every `targets/<name>/` its `match` names;
// TASK-401 B brings it into app.json with `"match": "live-activity"`. Here
// the match is widened to the watch, or, before 401 B, the plugin is added
// for the watch alone (the package is then installed only locally).
// plugins/withWatchCore.js goes right before it: Expo runs the Xcode
// changes of the plugins in reverse, so ours runs after the target exists.

const APPLE_TARGETS = "@bacons/apple-targets";
const WATCH_CORE_PLUGIN = "./plugins/withWatchCore.js";
const WATCH_TARGET = "watch";

function pluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

/**
 * `match` with the watch in it: "live-activity" becomes
 * "{live-activity,watch}". No match is every target, the watch too.
 * @param {unknown} match
 * @returns {string | undefined}
 */
function withWatchMatch(match) {
  if (match === undefined || match === "*") {
    return match;
  }
  if (typeof match !== "string" || match === "") {
    return WATCH_TARGET;
  }
  const braced = match.startsWith("{") && match.endsWith("}");
  const names = braced ? match.slice(1, -1).split(",") : [match];
  if (names.includes(WATCH_TARGET)) {
    return match;
  }
  return `{${[...names, WATCH_TARGET].join(",")}}`;
}

/**
 * `config` with the watch's target built.
 * @template {{ plugins?: import("expo/config").ExpoConfig["plugins"] }} T
 * @param {T} config
 * @returns {T}
 */
function withWatchTarget(config) {
  const plugins = (config.plugins ?? []).filter(
    (plugin) => pluginName(plugin) !== WATCH_CORE_PLUGIN,
  );
  const at = plugins.findIndex((plugin) => pluginName(plugin) === APPLE_TARGETS);
  if (at === -1) {
    return {
      ...config,
      plugins: [
        ...plugins,
        WATCH_CORE_PLUGIN,
        [APPLE_TARGETS, { match: WATCH_TARGET }],
      ],
    };
  }
  const entry = plugins[at];
  const options =
    Array.isArray(entry) && typeof entry[1] === "object" && entry[1] !== null
      ? entry[1]
      : {};
  const { match: _match, ...rest } = options;
  const match = withWatchMatch(options.match);
  const widened = [APPLE_TARGETS, match === undefined ? rest : { ...rest, match }];
  return {
    ...config,
    plugins: [
      ...plugins.slice(0, at),
      WATCH_CORE_PLUGIN,
      widened,
      ...plugins.slice(at + 1),
    ],
  };
}

module.exports = {
  APPLE_TARGETS,
  WATCH_CORE_PLUGIN,
  WATCH_TARGET,
  withWatchMatch,
  withWatchTarget,
};
