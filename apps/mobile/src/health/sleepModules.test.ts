/// <reference types="node" />

import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

import appJson from "../../app.json";

// TASK-467 part C: the sleep is on everywhere, in the build whose
// permission text speaks of it; on the testers' preview it was on before
// (part C0). Reading Apple Health stays in two files, and asking for the
// permission in two places, each at the user's tap.

/** The channel `expo-updates` reports to this copy of the app. */
let mockChannel: string | null = "mock";
jest.mock("expo-updates", () => ({
  get channel() {
    return mockChannel;
  },
}));

type Modules = typeof import("./sleepModules");
type Native = typeof import("react-native");

/** The health library, as far as the reader looks at it. */
const mockKit = {
  isHealthDataAvailable: () => true,
  requestAuthorization: async () => true,
  queryCategorySamples: async () => [],
};

type Phone = {
  channel: string | null;
  /** Whether the build has the native code of Apple Health. */
  native?: boolean;
  os?: "ios" | "android";
};

/** What a copy of the app on `channel` does with the sleep, read in a
 * fresh copy of the modules: the reader is made once and kept. */
function copyOf({ channel, native = false, os = "ios" }: Phone) {
  mockChannel = channel;
  const loaded = jest.fn(() => mockKit);
  let seen!: {
    constant: boolean;
    on: boolean;
    store: string | null;
    asked: unknown[];
    loads: number;
  };
  jest.isolateModules(() => {
    jest.doMock("@kingstinct/react-native-healthkit", loaded);
    const { Platform, TurboModuleRegistry } =
      jest.requireActual<Native>("react-native");
    Platform.OS = os;
    const registry = jest
      .spyOn(TurboModuleRegistry, "get")
      .mockImplementation(() => (native ? ({} as never) : null));
    const modules = jest.requireActual<Modules>("./sleepModules");
    const reader = modules.sleepReader();
    // Asked again: the same one, not made twice.
    expect(modules.sleepReader()).toBe(reader);
    seen = {
      constant: modules.SLEEP_POSTS_ON,
      on: modules.sleepPostsOn(),
      store: reader?.store ?? null,
      asked: registry.mock.calls.map(([name]) => name),
      loads: loaded.mock.calls.length,
    };
    registry.mockRestore();
    Platform.OS = "ios";
  });
  jest.dontMock("@kingstinct/react-native-healthkit");
  return seen;
}

afterEach(() => {
  mockChannel = "mock";
});

test.each(["production", "preview", null, "mock"])(
  "the sleep is on, on the channel %p",
  (channel) => {
    const { constant, on } = copyOf({ channel });
    expect(constant).toBe(true);
    expect(on).toBe(true);
  },
);

test("the build that turns it on says in its permission text that it reads the sleep", () => {
  const { constant } = copyOf({ channel: "production" });
  const text = appJson.expo.ios.infoPlist.NSHealthShareUsageDescription;
  expect(constant && !/sleep/.test(text)).toBe(false);
  expect(text).toMatch(/sleep/);
});

test.each(["production", "preview"])(
  "on %p the reader is Apple Health's, where the build has its native code",
  (channel) => {
    const { store, asked, loads } = copyOf({ channel, native: true });
    expect(store).toBe("apple");
    expect(asked).toEqual(["NitroModules"]);
    expect(loads).toBe(1);
  },
);

test("without that native code there is no reader, and nothing is loaded", () => {
  // Expo Go, a simulator build without Nitro.
  const { store, asked, loads } = copyOf({ channel: "production" });
  expect(store).toBeNull();
  expect(asked).toEqual(["NitroModules"]);
  expect(loads).toBe(0);
});

test("on Android there is no reader yet", () => {
  const { on, store, asked } = copyOf({
    channel: "production",
    native: true,
    os: "android",
  });
  expect(on).toBe(true);
  expect(store).toBeNull();
  expect(asked).toEqual([]);
});

const SRC = join(__dirname, "..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** The code of a file, without what its comments say. */
function codeOf(path: string): string {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

const named = (paths: string[]) => paths.map((path) => relative(SRC, path)).sort();

test("only the reader and the switch load the health library or query it", () => {
  const files = sourceFiles(SRC).filter((path) => /sleep|lastNight/i.test(path));
  // The files of parts A, B2, B3, C and E, at the least.
  expect(files.length).toBeGreaterThanOrEqual(15);
  const loading = files.filter((path) =>
    /react-native-healthkit|NitroModules|require\(/.test(codeOf(path)),
  );
  expect(named(loading)).toEqual(["health/sleepModules.ts"]);
  const querying = files.filter((path) =>
    /requestAuthorization|queryCategorySamples/.test(codeOf(path)),
  );
  expect(named(querying)).toEqual(["health/appleSleep.ts"]);
});

test("only the reader names the sleep type of Apple Health", () => {
  const naming = sourceFiles(SRC).filter((path) =>
    /HKCategoryTypeIdentifierSleepAnalysis/.test(readFileSync(path, "utf8")),
  );
  expect(named(naming)).toEqual(["health/appleSleep.ts"]);
});

test("the permission is asked in two places: «Sleep» of the «+» and the card of the profile", () => {
  // `reader.ask()` opens the phone's sheet: only at the user's tap.
  const asking = sourceFiles(SRC).filter(
    (path) =>
      /sleep/i.test(readFileSync(path, "utf8")) &&
      /readOwnNight\(.*\btrue\)/.test(codeOf(path)),
  );
  expect(named(asking)).toEqual(["feed/SleepPostPage.tsx", "profile/OwnSleep.tsx"]);
});
