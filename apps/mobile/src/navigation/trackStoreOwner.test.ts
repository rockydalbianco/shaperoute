/**
 * A run belongs to the account that began it (TASK-507 part B, the user's
 * choice «Nascosta finché rientra»): another account signed in on the same
 * phone never sees it, never saves it, and never writes over it. It waits,
 * file and journal as they are, until that account signs in again, and
 * then it is whole.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { AppState, type AppStateStatus } from "react-native";

import { setCurrentOwner } from "../account/currentOwner";
import { JOURNAL_FILE } from "./runJournal";
import type { TrackFix } from "./trackRecorder";
import {
  clearRun,
  forgetRunsOf,
  interruptedRun,
  loadRun,
  pendingRun,
  RUN_FILE,
  type SavedRun,
  startRun,
} from "./trackStore";

// The phone's documents folder, in memory: what is written stays there for
// the next read, as after iOS closed the app.
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
    write(text: string, options?: { append?: boolean }): void {
      const append = options?.append === true;
      files.set(this.uri, append ? (files.get(this.uri) ?? "") + text : text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

const disk = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const doc = (name: string) => `file:///documents/${name}`;

const A = 11;
const B = 22;
const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
const NOW = Date.UTC(2026, 10, 24, 9, 0, 0);
const north = (m: number): LatLon => [START[0] + m * METRE, START[1]];
const ROUTE: LatLon[] = Array.from({ length: 21 }, (_, i) => north(100 * i));
const SIMILARITY = 0.9;

function fix(northM: number, seconds: number): TrackFix {
  return { point: north(northM), timeMs: NOW + seconds * 1000, accuracyM: 5 };
}

let listeners: ((next: AppStateStatus) => void)[] = [];
let state: AppStateStatus = "active";
function goTo(next: AppStateStatus): void {
  state = next;
  listeners.forEach((listener) => listener(next));
}

beforeEach(() => {
  disk.files.clear();
  setCurrentOwner(null);
  listeners = [];
  state = "active";
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    listeners.push(listener as (next: AppStateStatus) => void);
    return {
      remove: () => {
        listeners = listeners.filter((other) => other !== listener);
      },
    } as ReturnType<typeof AppState.addEventListener>;
  });
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    get: () => state,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** A's run, closed by iOS behind another app: four fixes in the file, two
 * more in the journal. What the phone holds of it, whole. */
function aLeavesARun(): SavedRun["track"] {
  setCurrentOwner(A);
  const run = startRun(ROUTE, NOW, SIMILARITY);
  for (let i = 0; i < 4; i += 1) {
    run.onFix(fix(10 * i, 3 * i), false);
  }
  goTo("background");
  run.onFix(fix(40, 12), false);
  run.onFix(fix(50, 15), false);
  expect(disk.files.has(doc(JOURNAL_FILE))).toBe(true);
  const left = loadRun();
  expect(left?.owner).toBe(A);
  expect(left?.track.fixes).toHaveLength(6);
  // iOS ends the app here: only the files are left.
  listeners = [];
  state = "active";
  return left?.track as SavedRun["track"];
}

test("A leaves a run, B runs, A comes back and finds it whole, journal and all", () => {
  const left = aLeavesARun();

  setCurrentOwner(B);
  // B sees nothing of it: not to open again, not to score, not to save.
  expect(loadRun()).toBeNull();
  expect(interruptedRun(loadRun(), NOW + 60_000)).toBeNull();
  expect(pendingRun()).toBeNull();
  // It is set aside, file and journal, under A's number.
  expect(disk.files.has(doc("current-run.11.json"))).toBe(true);
  expect(disk.files.has(doc("current-run.11.journal"))).toBe(true);

  // B's own run, from start to «Save»: never over A's.
  const bRun = startRun(ROUTE, NOW + 3_600_000, SIMILARITY);
  bRun.onFix(fix(0, 3600), false);
  bRun.onFix(fix(10, 3603), false);
  bRun.onFix(fix(20, 3606), false);
  bRun.stop();
  expect(loadRun()?.owner).toBe(B);
  expect(loadRun()?.track.fixes).toHaveLength(3);
  clearRun();

  setCurrentOwner(A);
  const back = loadRun();
  expect(back?.owner).toBe(A);
  expect(back?.status).toBe("running");
  expect(back?.track).toEqual(left);
  expect(disk.files.has(doc("current-run.11.json"))).toBe(false);
  expect(disk.files.has(doc("current-run.11.journal"))).toBe(false);
});

test("B's run under way when A comes back: they change places, nothing lost", () => {
  const left = aLeavesARun();
  setCurrentOwner(B);
  const bRun = startRun(ROUTE, NOW + 3_600_000, SIMILARITY);
  bRun.onFix(fix(0, 3600), false);
  bRun.onFix(fix(10, 3603), false);
  // What the phone holds of B's run as A signs in: that is B's run.
  const bTrack = loadRun()?.track;
  expect(bTrack?.fixes.length).toBeGreaterThan(0);
  listeners = [];

  setCurrentOwner(A);
  expect(loadRun()?.track).toEqual(left);
  setCurrentOwner(B);
  expect(loadRun()?.track).toEqual(bTrack);
  setCurrentOwner(A);
  expect(loadRun()?.track).toEqual(left);
});

test("with nobody signed in A's run is hidden too, and comes back with A", () => {
  const left = aLeavesARun();
  setCurrentOwner(null);
  expect(loadRun()).toBeNull();
  setCurrentOwner(A);
  expect(loadRun()?.track).toEqual(left);
});

test("a second run of A set aside never goes over the first", () => {
  aLeavesARun();
  setCurrentOwner(B);
  expect(loadRun()).toBeNull();
  const firstAside = disk.files.get(doc("current-run.11.json"));
  // Another run of A in the file, as if left again on another day.
  disk.files.set(
    doc(RUN_FILE),
    JSON.stringify({
      version: 1,
      route: [],
      owner: A,
      track: { distanceM: 0, fixes: [], pauses: [] },
      status: "stopped",
    }),
  );
  expect(loadRun()).toBeNull();
  expect(disk.files.get(doc("current-run.11.json"))).toBe(firstAside);
  expect(disk.files.has(doc("current-run.11-2.json"))).toBe(true);
  // A gets them back one at a time.
  setCurrentOwner(A);
  expect(loadRun()?.track.fixes).toHaveLength(6);
  clearRun();
  expect(loadRun()?.status).toBe("stopped");
});

test("a run of nobody's, from before TASK-507, is anyone's, and the next run is its account's", () => {
  disk.files.set(
    doc(RUN_FILE),
    JSON.stringify({
      version: 1,
      route: ROUTE,
      similarity: SIMILARITY,
      track: {
        distanceM: 10,
        fixes: [fix(0, 0), fix(10, 3)],
        pauses: [],
      },
      status: "stopped",
    }),
  );
  setCurrentOwner(B);
  expect(loadRun()?.owner).toBeUndefined();
  expect(pendingRun()).not.toBeNull();
  const run = startRun(ROUTE, NOW, SIMILARITY);
  run.onFix(fix(20, 6), false);
  run.stop();
  expect(loadRun()?.owner).toBe(B);
});

test("a start of nobody's taken back at once does not keep A's run from coming back", () => {
  const left = aLeavesARun();
  setCurrentOwner(null);
  expect(loadRun()).toBeNull();
  // Signed out, «Run» tapped and stopped at once: one fix, stopped.
  disk.files.set(
    doc(RUN_FILE),
    JSON.stringify({
      version: 1,
      route: [],
      track: { distanceM: 0, fixes: [fix(0, 0)], pauses: [] },
      status: "stopped",
    }),
  );
  setCurrentOwner(A);
  expect(loadRun()?.track).toEqual(left);
});

test("a run of nobody's with a line keeps the file: A's waits, whole", () => {
  aLeavesARun();
  setCurrentOwner(null);
  loadRun();
  const nobodys = {
    version: 1,
    route: [],
    track: { distanceM: 10, fixes: [fix(0, 0), fix(10, 3)], pauses: [] },
    status: "stopped",
  };
  disk.files.set(doc(RUN_FILE), JSON.stringify(nobodys));
  setCurrentOwner(A);
  expect(loadRun()?.owner).toBeUndefined();
  expect(disk.files.has(doc("current-run.11.json"))).toBe(true);
});

test("an account deleted takes its runs, set aside or not, and leaves the others'", () => {
  aLeavesARun();
  setCurrentOwner(B);
  const bRun = startRun(ROUTE, NOW + 3_600_000, SIMILARITY);
  bRun.onFix(fix(0, 3600), false);
  bRun.stop();
  forgetRunsOf(A);
  expect(disk.files.has(doc("current-run.11.json"))).toBe(false);
  expect(disk.files.has(doc("current-run.11.journal"))).toBe(false);
  expect(loadRun()?.owner).toBe(B);
  forgetRunsOf(B);
  expect(loadRun()).toBeNull();
});
