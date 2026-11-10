// What the runtime version of the App Store build is made of (app.config.ts).
// Left out: the app's version and build number, which EAS raises at every
// store build, and eas.json, which gains store settings over time. Neither
// changes the native code, so a build with a new number must still receive
// the same updates.
//
// Settings for Android only, added after the 1.0 iPhone build (TASK-294):
// the whole app config counts in the fingerprint of either phone, so each of
// them would have moved the iPhone app's runtime too, and cut the 1.0 build
// off its updates without anything of it changing. They count in the
// Android fingerprint only: taken out of the config, and added to the list
// of Android's native modules, which only the Android fingerprint reads.

/** The settings, by where they are in the config: `android` keys, the
 * options of a plugin, and the Android permissions those options add to the
 * config. Only what an iPhone build never reads goes here. */
const ANDROID_ONLY = {
  android: ["package"],
  plugins: {
    "expo-location": [
      "isAndroidForegroundServiceEnabled",
      "androidForegroundServiceIcon",
    ],
  },
  permissions: [
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_LOCATION",
  ],
};

/** The source only the Android fingerprint has. */
const ANDROID_SOURCE = "expoAutolinkingConfig:android";

// The Apple Watch app (TASK-370, A-flip at the 1.1): its plugins build a
// watchOS target in the Xcode project and change nothing of Android, so
// they count in the iPhone fingerprint only, the mirror of the Android
// settings above: taken out of the config, and added to the iPhone's
// native modules, which only the iPhone fingerprint reads. The Android
// build keeps its runtime and its updates. The files those plugins load
// (the plugin package, its own dependencies, the watch's target config)
// count in neither: they build the watch only, whose code no update
// reaches, and the iPhone's side of it is the native module
// react-native-watch-connectivity, which iOS autolinking counts.
// The Live Activity (TASK-401 B, in the 1.1 too) is built by the same
// plugin: its widget target's files count in neither either, as no update
// reaches them; its native module in the iPhone app
// (modules/live-activity, Apple only) is counted by iOS autolinking.
// So a change to the Live Activity's data goes through
// modules/live-activity, never only targets/live-activity: else an update
// could send data the widget of an older build does not read.

/** The plugins for the iPhone only, by name, and the keys of
 * `ios.infoPlist` an Android build never reads: the Live Activity's
 * (TASK-401 B, in the 1.1 with the watch). */
const IOS_ONLY = {
  plugins: ["./plugins/withWatchCore.js", "@bacons/apple-targets"],
  infoPlist: ["NSSupportsLiveActivities"],
};

/** The source only the iPhone fingerprint has. */
const IOS_SOURCE = "expoAutolinkingConfig:ios";

/** What the watch's plugins load, counted in neither fingerprint. */
const WATCH_BUILD_PATHS = [
  "targets/watch/**",
  "targets/live-activity/**",
  "plugins/withWatchCore.js",
  "plugins/watchConfig.js",
  "../../node_modules/@bacons/**",
  "../../node_modules/balanced-match/**",
  "../../node_modules/minipass/**",
];

/** As @expo/fingerprint writes the config (`stringifyJsonSorted`): keys in
 * order, and lists in the order of their items written out, so the config
 * without the Android settings reads as if they had never been there. */
function sortJson(json) {
  if (Array.isArray(json)) {
    return json.sort((a, b) => {
      const left = stringifyJsonSorted(a);
      const right = stringifyJsonSorted(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });
  }
  if (json !== null && typeof json === "object") {
    return Object.keys(json)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = json[key];
        return sorted;
      }, {});
  }
  return json;
}

function stringifyJsonSorted(target) {
  return JSON.stringify(target, (_, value) => sortJson(value));
}

/** The options of `name` in `plugins`, when it has some. */
function pluginOptions(plugins, name) {
  const entry = (plugins ?? []).find(
    (plugin) => Array.isArray(plugin) && plugin[0] === name,
  );
  const options = entry?.[1];
  return options !== null && typeof options === "object" ? options : null;
}

/** `config` without the Android settings, and the settings taken out. */
function splitAndroidOnly(config) {
  const taken = { android: {}, plugins: {}, permissions: [] };
  for (const key of ANDROID_ONLY.android) {
    if (config.android !== undefined && key in config.android) {
      taken.android[key] = config.android[key];
      delete config.android[key];
    }
  }
  const permissions = config.android?.permissions;
  if (Array.isArray(permissions)) {
    taken.permissions = permissions.filter((name) =>
      ANDROID_ONLY.permissions.includes(name),
    );
    config.android.permissions = permissions.filter(
      (name) => !ANDROID_ONLY.permissions.includes(name),
    );
  }
  for (const [name, keys] of Object.entries(ANDROID_ONLY.plugins)) {
    const options = pluginOptions(config.plugins, name);
    for (const key of keys) {
      if (options !== null && key in options) {
        taken.plugins[name] = { ...taken.plugins[name], [key]: options[key] };
        delete options[key];
      }
    }
  }
  return { config, taken };
}

/** The app config as it is in the project, a copy each time. */
function appConfig() {
  const { getConfig } = require("expo/config");
  const { exp } = getConfig(__dirname, { skipSDKVersionRequirement: true });
  return JSON.parse(JSON.stringify(exp));
}

/** The Android settings of the app config as it is in the project. */
function androidOnlySettings() {
  return splitAndroidOnly(appConfig()).taken;
}

/** The name of a plugin of the config. */
function pluginName(plugin) {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

/** `config` without the iPhone's plugins, what they add to it for EAS
 * (the watch's credentials, `extra.eas.build.experimental.ios`) and the
 * iPhone-only keys of `ios.infoPlist`, and what was taken out: nothing when
 * there is none of it. */
function splitIosOnly(config) {
  const plugins = config.plugins ?? [];
  const taken = plugins.filter((plugin) =>
    IOS_ONLY.plugins.includes(pluginName(plugin)),
  );
  if (taken.length > 0) {
    config.plugins = plugins.filter(
      (plugin) => !IOS_ONLY.plugins.includes(pluginName(plugin)),
    );
  }
  const build = config.extra?.eas?.build;
  const ios = build?.experimental?.ios;
  if (ios !== undefined) {
    taken.push({ "extra.eas.build.experimental.ios": ios });
    delete build.experimental.ios;
    if (Object.keys(build.experimental).length === 0) {
      delete build.experimental;
    }
    if (Object.keys(build).length === 0) {
      delete config.extra.eas.build;
    }
  }
  const plist = config.ios?.infoPlist;
  for (const key of IOS_ONLY.infoPlist) {
    if (plist !== undefined && plist !== null && key in plist) {
      taken.push({ [`ios.infoPlist.${key}`]: plist[key] });
      delete plist[key];
    }
  }
  return { config, taken };
}

/** The iPhone's plugins of the app config as it is in the project. */
function iosOnlyPlugins() {
  return splitIosOnly(appConfig()).taken;
}

/** @type {import('expo/fingerprint').Config['fileHookTransform']} */
function fileHookTransform(source, chunk) {
  if (source.type !== "contents" || typeof chunk !== "string") {
    return chunk;
  }
  if (source.id === "expoConfig") {
    const config = splitAndroidOnly(JSON.parse(chunk)).config;
    return stringifyJsonSorted(splitIosOnly(config).config);
  }
  if (source.id === ANDROID_SOURCE) {
    return `${chunk}\n${stringifyJsonSorted(androidOnlySettings())}`;
  }
  if (source.id === IOS_SOURCE) {
    // Nothing added without them: the runtime of a build before A-flip.
    const plugins = iosOnlyPlugins();
    return plugins.length === 0 ? chunk : `${chunk}\n${stringifyJsonSorted(plugins)}`;
  }
  return chunk;
}

/** @type {import('expo/fingerprint').Config} */
const config = {
  sourceSkips: ["ExpoConfigVersions", "PackageJsonAndroidAndIosScriptsIfNotContainRun"],
  ignorePaths: ["eas.json", ...WATCH_BUILD_PATHS],
  fileHookTransform,
};

module.exports = config;
module.exports.ANDROID_ONLY = ANDROID_ONLY;
module.exports.splitAndroidOnly = splitAndroidOnly;
module.exports.IOS_ONLY = IOS_ONLY;
module.exports.splitIosOnly = splitIosOnly;
module.exports.WATCH_BUILD_PATHS = WATCH_BUILD_PATHS;
