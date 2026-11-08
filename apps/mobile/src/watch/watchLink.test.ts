import { Platform } from "react-native";

import {
  linkOn,
  WATCH_EVENTS,
  WATCH_NATIVE_MODULE,
  type WatchEmitter,
  type WatchNative,
} from "./watchLink";
import type { WatchMessage } from "./watchMessages";

// The phone's side of WatchConnectivity (TASK-370 part A3): a fake native
// module with the names of react-native-watch-connectivity 2.0.0.

type Listener = (body: unknown) => void;

function fakeNative(context: object | null = null) {
  const listeners = new Map<string, Set<Listener>>();
  const native = {
    sendMessage: jest.fn((_message: object) => Promise.resolve({})),
    replyToMessageWithId: jest.fn(),
    transferUserInfo: jest.fn(),
    getApplicationContext: jest.fn(() => Promise.resolve(context)),
    getIsPaired: jest.fn(() => Promise.resolve(true)),
    getIsWatchAppInstalled: jest.fn(() => Promise.resolve(true)),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  } satisfies WatchNative;
  const emitter: WatchEmitter = {
    addListener(event, listener) {
      const set = listeners.get(event) ?? new Set<Listener>();
      set.add(listener);
      listeners.set(event, set);
      return { remove: () => set.delete(listener) };
    },
  };
  const emit = (event: string, body: unknown) =>
    listeners.get(event)?.forEach((listener) => listener(body));
  const count = () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
  return { native, emitter, emit, count };
}

const PAUSE: WatchMessage = { type: "command", command: "pause", from: "phone", at: 5 };
const STATE = {
  v: 1,
  type: "state",
  phase: "running",
  activity: "running",
  from: "watch",
  at: 9,
  movingMs: 1000,
  distanceM: 4.5,
};

/** Lets the promises already resolved run their callbacks. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("a message is sent with its version, and a watch that is not there is no error", async () => {
  const { native, emitter } = fakeNative();
  native.sendMessage.mockImplementationOnce(() =>
    Promise.reject(new Error("not reachable")),
  );
  const link = linkOn(native, emitter);
  link.send(PAUSE);
  await settle();
  expect(native.sendMessage).toHaveBeenCalledWith({ v: 1, ...PAUSE });
});

test("what the watch keeps goes as user info", () => {
  const { native, emitter } = fakeNative();
  const link = linkOn(native, emitter);
  link.transfer({ type: "settings", units: "mi", at: 3 });
  expect(native.transferUserInfo).toHaveBeenCalledWith({
    v: 1,
    type: "settings",
    units: "mi",
    at: 3,
  });
  native.transferUserInfo.mockImplementationOnce(() => {
    throw new Error("no session");
  });
  expect(() => link.transfer({ type: "settings", units: "km", at: 4 })).not.toThrow();
});

test("messages, the application context and user info are read; a wrong one is left out", async () => {
  const { native, emitter, emit } = fakeNative();
  const heard: WatchMessage[] = [];
  linkOn(native, emitter).listen((message) => heard.push(message));
  emit(WATCH_EVENTS.message, { v: 1, type: "heartRate", bpm: 150, at: 7 });
  emit(WATCH_EVENTS.message, { v: 2, type: "heartRate", bpm: 150, at: 7 });
  emit(WATCH_EVENTS.message, "pause");
  emit(WATCH_EVENTS.context, STATE);
  emit(WATCH_EVENTS.userInfo, {
    userInfo: { v: 1, type: "heartRate", bpm: 99, at: 8 },
    timestamp: 8,
    id: "8",
  });
  emit(WATCH_EVENTS.userInfo, null);
  await settle();
  expect(heard).toEqual([
    { type: "heartRate", bpm: 150, at: 7 },
    {
      type: "state",
      phase: "running",
      activity: "running",
      from: "watch",
      at: 9,
      movingMs: 1000,
      distanceM: 4.5,
    },
    { type: "heartRate", bpm: 99, at: 8 },
  ]);
  expect(native.replyToMessageWithId).not.toHaveBeenCalled();
});

test("a message that waits for a reply gets an empty one", () => {
  const { native, emitter, emit } = fakeNative();
  const heard: WatchMessage[] = [];
  linkOn(native, emitter).listen((message) => heard.push(message));
  emit(WATCH_EVENTS.message, { v: 1, type: "heartRate", bpm: 150, at: 7, id: "abc" });
  expect(native.replyToMessageWithId).toHaveBeenCalledWith("abc", {});
  expect(heard).toEqual([{ type: "heartRate", bpm: 150, at: 7 }]);
});

test("the application context already there is read as the link starts listening", async () => {
  const { native, emitter } = fakeNative(STATE);
  const heard: WatchMessage[] = [];
  linkOn(native, emitter).listen((message) => heard.push(message));
  await settle();
  expect(heard.map((message) => message.type)).toEqual(["state"]);
});

test("once stopped, nothing more is heard", async () => {
  const { native, emitter, emit, count } = fakeNative(STATE);
  const heard: WatchMessage[] = [];
  const stop = linkOn(native, emitter).listen((message) => heard.push(message));
  expect(count()).toBe(3);
  stop();
  emit(WATCH_EVENTS.context, STATE);
  await settle();
  expect(heard).toEqual([]);
  expect(count()).toBe(0);
});

describe("watchLink in an app with and without the native module", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function loadLink(module: object | null, os: typeof Platform.OS = "ios") {
    let made: ReturnType<typeof import("./watchLink").watchLink> | undefined;
    jest.isolateModules(() => {
      const reactNative =
        jest.requireActual<typeof import("react-native")>("react-native");
      const get = jest
        .spyOn(reactNative.TurboModuleRegistry, "get")
        .mockImplementation((name: string) =>
          name === WATCH_NATIVE_MODULE ? (module as never) : null,
        );
      jest.replaceProperty(reactNative.Platform, "OS", os);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { watchLink } = require("./watchLink") as typeof import("./watchLink");
      made = watchLink();
      // Made once: the module is not looked for again.
      expect(watchLink()).toBe(made);
      expect(get.mock.calls.length).toBeLessThanOrEqual(1);
    });
    return made;
  }

  test("without it (Expo Go, every build before the watch's) there is no link", () => {
    expect(loadLink(null)).toBeNull();
  });

  test("on Android there is no link", () => {
    expect(loadLink(fakeNative().native, "android")).toBeNull();
  });

  test("with it the link sends through the module", () => {
    const { native } = fakeNative();
    const link = loadLink(native);
    expect(link).not.toBeNull();
    link?.transfer({ type: "settings", units: "km", at: 1 });
    expect(native.transferUserInfo).toHaveBeenCalledTimes(1);
  });
});

test("the watch is ready only when it is paired and has the app", async () => {
  const { native, emitter } = fakeNative();
  const link = linkOn(native, emitter);
  await expect(link.ready()).resolves.toBe(true);
  native.getIsWatchAppInstalled.mockImplementationOnce(() => Promise.resolve(false));
  await expect(link.ready()).resolves.toBe(false);
  native.getIsPaired.mockImplementationOnce(() => Promise.resolve(false));
  await expect(link.ready()).resolves.toBe(false);
  native.getIsPaired.mockImplementationOnce(() =>
    Promise.reject(new Error("no session")),
  );
  await expect(link.ready()).resolves.toBe(false);
});
