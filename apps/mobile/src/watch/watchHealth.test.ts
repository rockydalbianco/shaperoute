import type { LatLon } from "@shaperoute/shared-types";

import { keepHealthOn } from "../health/healthChoice";
import type { HealthPhone } from "../health/healthPhone";
import { saveToHealth } from "../health/useHealth";
import { controlRun, skipCountdown } from "../navigation/runControl";
import type { Track } from "../navigation/trackRecorder";
import { clearRun, startRun } from "../navigation/trackStore";
import { followWatch } from "./useWatch";
import type { WatchLink } from "./watchLink";
import type { WatchMessage } from "./watchMessages";

// One activity, one workout (TASK-321) with the Apple Watch (TASK-370 part
// A3): when the watch recorded the run it saves the workout in Apple Health
// itself, and «Save» on the phone does not write it again.

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
const TRACK: Track = {
  fixes: [
    { point: [46.0679, 11.1211], timeMs: NOW, accuracyM: 5 },
    { point: [46.0714, 11.1262], timeMs: NOW + 600_000, accuracyM: 4 },
  ],
  distanceM: 2480,
  pauses: [],
};

function fakePhone(): HealthPhone & { write: jest.Mock } {
  return {
    store: "apple",
    available: () => Promise.resolve(true),
    permission: () => Promise.resolve("allowed"),
    ask: () => Promise.resolve(),
    write: jest.fn(() => Promise.resolve(true)),
  } as unknown as HealthPhone & { write: jest.Mock };
}

/** A run on the phone, the watch telling it is in `watchPhase` or silent. */
function runWithWatch(watchPhase: "running" | null) {
  let hear: (message: WatchMessage) => void = () => {};
  const link: WatchLink = {
    send: () => {},
    transfer: () => {},
    listen(onMessage) {
      hear = onMessage;
      return () => {};
    },
    ready: () => Promise.resolve(true),
  };
  const stop = followWatch(link, {
    activity: "running",
    onEnd: () => {},
    onHeart: () => {},
  });
  const session = controlRun(startRun(ROUTE, Date.now()), {
    onChange: () => {},
    say: () => {},
  });
  skipCountdown();
  if (watchPhase !== null) {
    hear({
      type: "state",
      phase: watchPhase,
      activity: "running",
      from: "watch",
      at: Date.now(),
      movingMs: 1000,
      distanceM: 3,
    });
  }
  session.end();
  stop();
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  clearRun();
  keepHealthOn();
});

afterEach(() => {
  jest.useRealTimers();
});

test("a run the watch did not record is written by the phone, as before", async () => {
  runWithWatch(null);
  const phone = fakePhone();
  await expect(saveToHealth(phone, TRACK, "running")).resolves.toBe(true);
  expect(phone.write).toHaveBeenCalledTimes(1);
});

test("a run the watch recorded is not written again by the phone", async () => {
  runWithWatch("running");
  const phone = fakePhone();
  await expect(saveToHealth(phone, TRACK, "running")).resolves.toBe(false);
  expect(phone.write).not.toHaveBeenCalled();
});
