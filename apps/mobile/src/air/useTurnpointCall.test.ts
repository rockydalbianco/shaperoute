/**
 * The turnpoints said aloud while recording (TASK-479 part D2): once each,
 * as it is taken, never one taken before the hook came, never on the
 * ground.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import type { Track, TrackFix } from "../navigation/trackRecorder";
import type { FlightTask, Turnpoint } from "./flightTask";
import { resetTaskProgress } from "./taskProgress";
import { destination } from "./taskRoute";
import { callTurnpoint } from "./turnpointCall";
import { newlyTaken, useTurnpointCall } from "./useTurnpointCall";
import { resetWaypointStore, setTask } from "./waypointStore";

jest.mock("./turnpointCall", () => ({ callTurnpoint: jest.fn() }));

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

const called = jest.mocked(callTurnpoint);

// An invented place and task.
const ORIGIN: LatLon = [46, 11];
const at = (northKm: number): LatLon => destination(ORIGIN, 0, northKm * 1000);

function tp(name: string, point: LatLon, kind: Turnpoint["kind"]): Turnpoint {
  return {
    waypoint: {
      name,
      code: null,
      point,
      altM: null,
      landing: false,
      description: null,
    },
    radiusM: 1000,
    kind,
  };
}

const TASK: FlightTask = {
  earth: "wgs84",
  turnpoints: [
    tp("TO", ORIGIN, "takeoff"),
    tp("B1", at(5), "turnpoint"),
    tp("GO", at(10), "goal"),
  ],
  start: null,
  goal: { type: "cylinder", deadline: null },
};

const T0 = Date.UTC(2026, 6, 1, 12);

function trackTo(northKm: number): Track {
  const fixes: TrackFix[] = [];
  for (let i = 0; i <= northKm * 10; i += 1) {
    fixes.push({ point: at(i / 10), timeMs: T0 + i * 10_000, accuracyM: 5 });
  }
  return { fixes, distanceM: 0 };
}

beforeEach(() => {
  called.mockClear();
  resetTaskProgress();
  resetWaypointStore();
});

it("tells the newest of the turnpoints taken since", () => {
  expect(newlyTaken(1, [{ index: 1 }])).toBeNull();
  expect(newlyTaken(0, [{ index: 1 }, { index: 2 }])).toBe(2);
});

it("calls each turnpoint once, as it is taken", async () => {
  await act(async () =>
    setTask({ fileName: "test.xctsk", loadedAtMs: T0, task: TASK }),
  );
  const { rerender } = await renderHook(useTurnpointCall, {
    initialProps: { track: trackTo(1), takeoffMs: T0, sounding: true },
  });
  expect(called).not.toHaveBeenCalled();
  await rerender({ track: trackTo(4.5), takeoffMs: T0, sounding: true });
  expect(called.mock.calls).toEqual([[TASK, 1]]);
  await rerender({ track: trackTo(6), takeoffMs: T0, sounding: true });
  expect(called).toHaveBeenCalledTimes(1);
  await rerender({ track: trackTo(9.5), takeoffMs: T0, sounding: true });
  expect(called.mock.calls).toEqual([
    [TASK, 1],
    [TASK, 2],
  ]);
});

it("says nothing of what was taken before it came, nor while not sounding", async () => {
  await act(async () =>
    setTask({ fileName: "test.xctsk", loadedAtMs: T0, task: TASK }),
  );
  const { rerender } = await renderHook(useTurnpointCall, {
    initialProps: { track: trackTo(6), takeoffMs: T0, sounding: true },
  });
  expect(called).not.toHaveBeenCalled();
  await rerender({ track: trackTo(9.5), takeoffMs: T0, sounding: false });
  expect(called).not.toHaveBeenCalled();
});
