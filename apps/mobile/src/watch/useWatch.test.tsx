import type { LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import {
  controlRun,
  pauseRun,
  resumeRun,
  runControl,
  skipCountdown,
} from "../navigation/runControl";
import { clearRun, startRun } from "../navigation/trackStore";
import { NO_BODY, saveBody } from "../body/bodyProfile";
import { NO_HEART, saveHeart } from "../body/heartZones";
import { saveUnitsChoice } from "../units/units";
import { CLOCK_SLACK_MS, followWatch, useWatch, watchSavesWorkout } from "./useWatch";
import type { WatchLink } from "./watchLink";
import type { WatchMessage, WatchPhase } from "./watchMessages";
import type { WatchWaker } from "./watchWake";

// The run on the phone with the workout on the watch (TASK-370 part A3): a
// fake link stands for WatchConnectivity, the run's controls are the real
// ones, the documents folder is in memory.

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const NOW = Date.UTC(2026, 10, 8, 7, 0, 0);
const ROUTE: LatLon[] = [];

type FakeLink = WatchLink & {
  sent: WatchMessage[];
  transferred: WatchMessage[];
  /** A message from the watch. */
  hear(message: WatchMessage): void;
  listening: () => number;
};

function fakeLink(): FakeLink {
  const listeners = new Set<(message: WatchMessage) => void>();
  const link: FakeLink = {
    sent: [],
    transferred: [],
    send: (message) => link.sent.push(message),
    transfer: (message) => link.transferred.push(message),
    listen(onMessage) {
      listeners.add(onMessage);
      return () => listeners.delete(onMessage);
    },
    hear: (message) => listeners.forEach((listener) => listener(message)),
    listening: () => listeners.size,
    ready: () => Promise.resolve(true),
  };
  return link;
}

function watchState(phase: WatchPhase, atMs = Date.now()): WatchMessage {
  return {
    type: "state",
    phase,
    activity: "running",
    from: "watch",
    at: atMs,
    movingMs: 0,
    distanceM: 0,
  };
}

/** The commands the phone sent, by name. */
function commands(link: FakeLink): string[] {
  return link.sent.flatMap((message) =>
    message.type === "command" ? [message.command] : [],
  );
}

function follow(link: FakeLink, activity = "running", wake: WatchWaker | null = null) {
  const onEnd = jest.fn();
  const onHeart = jest.fn();
  const stop = followWatch(link, { activity, onEnd, onHeart, wake });
  return { onEnd, onHeart, stop };
}

function beginRun() {
  return controlRun(startRun(ROUTE, Date.now()), {
    onChange: jest.fn(),
    say: jest.fn(),
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  clearRun();
  saveUnitsChoice("km");
});

afterEach(() => {
  jest.useRealTimers();
});

test("the countdown starts the watch's workout with the sport, the end of the run ends it", () => {
  const link = fakeLink();
  const { stop } = follow(link, "cycling");
  const session = beginRun();
  expect(link.sent).toEqual([
    { type: "command", command: "start", activity: "cycling", from: "phone", at: NOW },
  ]);
  skipCountdown();
  expect(commands(link)).toEqual(["start"]);
  session.end();
  expect(commands(link)).toEqual(["start", "end"]);
  // The screen goes after: the end is not said twice.
  stop();
  expect(commands(link)).toEqual(["start", "end"]);
  expect(link.listening()).toBe(0);
});

test("a run already under the controls when the screen comes starts the watch", () => {
  const session = beginRun();
  const link = fakeLink();
  const { stop } = follow(link);
  expect(commands(link)).toEqual(["start"]);
  session.end();
  stop();
});

test("the countdown wakes the watch app, and the start goes again once it is up (part B4)", async () => {
  const link = fakeLink();
  const wake = jest.fn(async (_activity: string) => true);
  const { stop } = follow(link, "cycling", wake);
  const session = beginRun();
  expect(wake).toHaveBeenCalledWith("cycling");
  await act(async () => {});
  // The first start was lost on a closed app; the second has the sport.
  expect(link.sent).toEqual([
    { type: "command", command: "start", activity: "cycling", from: "phone", at: NOW },
    { type: "command", command: "start", activity: "cycling", from: "phone", at: NOW },
  ]);
  session.end();
  stop();
});

test("a watch already in its workout, or not woken, gets one start only (part B4)", async () => {
  const link = fakeLink();
  let answer: (woken: boolean) => void = () => {};
  const wake = jest.fn(
    () =>
      new Promise<boolean>((resolve) => {
        answer = resolve;
      }),
  );
  const { stop } = follow(link, "running", wake);
  const session = beginRun();
  // The app was open: it answers before Apple does.
  link.hear(watchState("countdown"));
  await act(async () => answer(true));
  expect(commands(link)).toEqual(["start"]);
  session.end();
  stop();

  const other = fakeLink();
  const { stop: stopOther } = follow(other, "running", async () => false);
  const again = beginRun();
  await act(async () => {});
  expect(commands(other)).toEqual(["start"]);
  again.end();
  stopOther();
});

test("without Apple Health's permission the watch is not woken, and the run goes on (part B4)", async () => {
  const link = fakeLink();
  // HealthKit refuses: the app may not save workouts.
  const wake = jest.fn(async () => {
    throw new Error("Not authorized");
  });
  const { stop } = follow(link, "running", wake);
  const session = beginRun();
  await act(async () => {});
  expect(wake).toHaveBeenCalledTimes(1);
  expect(commands(link)).toEqual(["start"]);
  skipCountdown();
  expect(runControl().phase).toBe("running");
  session.end();
  stop();
});

test("Pause and Resume on the phone go to the watch, by hand or by standing still", () => {
  const link = fakeLink();
  const { stop } = follow(link);
  const session = beginRun();
  skipCountdown();
  pauseRun();
  resumeRun();
  expect(commands(link)).toEqual(["start", "pause", "resume"]);
  session.end();
  stop();
});

test("the units chosen on the phone go as user info, now and when they change", () => {
  const link = fakeLink();
  const { stop } = follow(link);
  saveUnitsChoice("mi");
  expect(link.transferred).toEqual([
    { type: "settings", units: "km", at: NOW },
    { type: "settings", units: "mi", at: NOW },
  ]);
  expect(link.sent).toEqual([]);
  stop();
  saveUnitsChoice("km");
  expect(link.transferred).toHaveLength(2);
});

test("the heart rate zones go with the units, and again when they change (part B5)", () => {
  const link = fakeLink();
  const { stop } = follow(link);
  saveHeart({ maxBpm: 190, restBpm: null, limits: [null, null, null, null, null] });
  expect(link.transferred).toEqual([
    { type: "settings", units: "km", at: NOW },
    {
      type: "settings",
      units: "km",
      heartZones: [95, 114, 133, 152, 171, 190],
      at: NOW,
    },
  ]);
  saveBody({ ...NO_BODY, birthYear: 1990 });
  // A max typed by hand counts over the age: the same zones again.
  expect(link.transferred).toHaveLength(3);
  expect(link.transferred[2]).toEqual(link.transferred[1]);
  stop();
  saveHeart(NO_HEART);
  saveBody(NO_BODY);
  expect(link.transferred).toHaveLength(3);
});

test("a pause and a resume from the wrist do the same on the phone", () => {
  const link = fakeLink();
  const { stop } = follow(link);
  const session = beginRun();
  skipCountdown();
  link.hear(watchState("running"));
  link.hear(watchState("paused"));
  expect(runControl().phase).toBe("paused");
  link.hear(watchState("running"));
  expect(runControl().phase).toBe("running");
  // The watch's own pause is not sent back to it.
  expect(commands(link)).toEqual(["start", "pause", "resume"]);
  session.end();
  stop();
});

test("a state sent before the phone's command changes nothing when it arrives after", () => {
  const link = fakeLink();
  const { stop } = follow(link);
  const session = beginRun();
  skipCountdown();
  link.hear(watchState("running"));
  pauseRun();
  // Sent every 5 s, it left the watch before the pause reached it.
  link.hear(watchState("running"));
  expect(runControl().phase).toBe("paused");
  // The first state seen says no change either.
  const late = fakeLink();
  const other = follow(late);
  late.hear(watchState("running"));
  expect(runControl().phase).toBe("paused");
  other.stop();
  session.end();
  stop();
});

test("the end from the wrist ends the run, as Stop does, once", () => {
  const link = fakeLink();
  const { onEnd, stop } = follow(link);
  const session = beginRun();
  skipCountdown();
  link.hear(watchState("running"));
  link.hear(watchState("finished"));
  link.hear(watchState("finished"));
  expect(onEnd).toHaveBeenCalledTimes(1);
  // The screen ends the run: the watch has already, nothing is sent.
  session.end();
  stop();
  expect(commands(link)).toEqual(["start"]);
});

test("the heart rate goes to the screen, and away when the watch's workout is over", () => {
  const link = fakeLink();
  const { onHeart, stop } = follow(link);
  link.hear({ type: "heartRate", bpm: 142, at: NOW });
  link.hear({ type: "heartRate", bpm: 120, at: NOW - CLOCK_SLACK_MS - 1 });
  link.hear(watchState("finished"));
  expect(onHeart.mock.calls).toEqual([[142], [null]]);
  stop();
});

test("an old state, of a workout before this screen, is left out", () => {
  const link = fakeLink();
  const { stop } = follow(link);
  const session = beginRun();
  skipCountdown();
  link.hear(watchState("running", NOW - CLOCK_SLACK_MS - 1));
  link.hear(watchState("paused", NOW - CLOCK_SLACK_MS - 1));
  expect(runControl().phase).toBe("running");
  expect(watchSavesWorkout()).toBe(false);
  session.end();
  stop();
});

test("the phone does not write the workout the watch recorded, until the next run", () => {
  const link = fakeLink();
  const first = follow(link);
  const session = beginRun();
  skipCountdown();
  expect(watchSavesWorkout()).toBe(false);
  link.hear(watchState("running"));
  expect(watchSavesWorkout()).toBe(true);
  session.end();
  first.stop();
  expect(watchSavesWorkout()).toBe(true);

  // The next run, without the watch.
  jest.setSystemTime(NOW + 3_600_000);
  clearRun();
  const second = follow(fakeLink());
  const next = beginRun();
  expect(watchSavesWorkout()).toBe(false);
  next.end();
  second.stop();
});

test("leaving the screen during the run ends the watch's workout", () => {
  const link = fakeLink();
  const { stop } = follow(link);
  const session = beginRun();
  skipCountdown();
  stop();
  expect(commands(link)).toEqual(["start", "end"]);
  session.end();
});

test("without a run nothing but the units goes to the watch", () => {
  const link = fakeLink();
  const { stop } = follow(link);
  stop();
  expect(link.sent).toEqual([]);
  expect(link.transferred).toHaveLength(1);
});

describe("useWatch", () => {
  test("in an app without the native module it does nothing", async () => {
    const onEnd = jest.fn();
    const { result } = await renderHook(() => useWatch("running", onEnd, null));
    expect(result.current).toBeNull();
  });

  test("the heart rate for the screen, and the end from the wrist to its Stop", async () => {
    const link = fakeLink();
    const onEnd = jest.fn();
    const { result, unmount } = await renderHook(() =>
      useWatch("running", onEnd, link),
    );
    const session = beginRun();
    skipCountdown();
    await act(async () => link.hear({ type: "heartRate", bpm: 131, at: NOW }));
    expect(result.current).toBe(131);
    await act(async () => {
      link.hear(watchState("running"));
      link.hear(watchState("finished"));
    });
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(result.current).toBeNull();
    session.end();
    await unmount();
    expect(link.listening()).toBe(0);
  });
});
