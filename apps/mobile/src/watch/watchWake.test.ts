import {
  INDOOR,
  OUTDOOR,
  type WatchWaker,
  wakeConfiguration,
  wakerOf,
} from "./watchWake";

// The phone wakes the watch app at the countdown (TASK-370 part B4). The
// HealthKit library is loaded only where the build has its native code; a
// fake stands for it.

const mockLoaded = jest.fn();
const mockStart = jest.fn(async (_configuration: unknown) => true);

jest.mock("@kingstinct/react-native-healthkit", () => {
  mockLoaded();
  return { startWatchApp: mockStart };
});

/** `watchWaker()` of a fresh copy of the module, on `os`, with these native
 * modules in the build. */
function wakerOn(os: "ios" | "android", native: readonly string[]): WatchWaker | null {
  let waker: WatchWaker | null = null;
  jest.isolateModules(() => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const rn = require("react-native") as typeof import("react-native");
    jest
      .spyOn(rn.TurboModuleRegistry, "get")
      .mockImplementation((name: string) => (native.includes(name) ? {} : null));
    Object.defineProperty(rn.Platform, "OS", { value: os, configurable: true });
    const { watchWaker } = require("./watchWake") as typeof import("./watchWake");
    /* eslint-enable @typescript-eslint/no-require-imports */
    waker = watchWaker();
  });
  return waker;
}

afterEach(() => {
  jest.restoreAllMocks();
  mockLoaded.mockClear();
  mockStart.mockClear();
});

test("a run wakes the watch outdoors, the gym indoors", () => {
  expect(wakeConfiguration("running")).toEqual({
    activityType: 37,
    locationType: OUTDOOR,
  });
  expect(wakeConfiguration("gym")).toEqual({ activityType: 50, locationType: INDOOR });
});

test("a sport the watch does not offer wakes nothing", () => {
  expect(wakeConfiguration("swimming")).toBeNull();
  expect(wakeConfiguration("curling")).toBeNull();
});

test("the waker asks Apple with the configuration, and says what it answered", async () => {
  const waker = wakerOf({ startWatchApp: mockStart });
  await expect(waker("cycling")).resolves.toBe(true);
  expect(mockStart).toHaveBeenCalledWith({ activityType: 13, locationType: OUTDOOR });
  mockStart.mockResolvedValueOnce(false);
  await expect(waker("running")).resolves.toBe(false);
});

test("no watch, no app on it or no permission is a false, never an error", async () => {
  const waker = wakerOf({
    startWatchApp: async () => {
      throw new Error("No paired watch");
    },
  });
  await expect(waker("running")).resolves.toBe(false);
  // Nothing is asked for a sport the watch does not offer.
  await expect(wakerOf({ startWatchApp: mockStart })("swimming")).resolves.toBe(false);
  expect(mockStart).not.toHaveBeenCalled();
});

test("on an iPhone with the HealthKit library's native code the watch can be woken", async () => {
  const waker = wakerOn("ios", ["NitroModules"]);
  expect(waker).not.toBeNull();
  await expect(waker!("running")).resolves.toBe(true);
  expect(mockStart).toHaveBeenCalledTimes(1);
});

test("Expo Go and Android never load the library", () => {
  expect(wakerOn("ios", [])).toBeNull();
  expect(wakerOn("android", ["NitroModules"])).toBeNull();
  expect(mockLoaded).not.toHaveBeenCalled();
});
