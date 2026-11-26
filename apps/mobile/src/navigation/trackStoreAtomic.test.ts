/**
 * The whole run file is written beside it and then moved over it (TASK-496
 * part C, an addition to ADR-0264): iOS closing MuW in the middle of a write
 * leaves the last whole file, never half of one.
 */
import type { LatLon } from "@shaperoute/shared-types";

import type { TrackFix } from "./trackRecorder";
import {
  clearRun,
  loadRun,
  NEW_RUN_FILE,
  RUN_FILE,
  type SavedRun,
  saveRun,
  startRun,
} from "./trackStore";

// The phone's documents folder, in memory, with files that move as iOS
// moves them (the old one taken away, then the new one renamed). `cut`
// stops the next write half way, or a move between its two steps, as iOS
// closing the app would: an error, and the disk as it was left.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const state = { cut: null as null | "write" | "move", moves: 0 };
  class Closed extends Error {}
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
      const before = options?.append === true ? (files.get(this.uri) ?? "") : "";
      if (state.cut === "write") {
        state.cut = null;
        files.set(this.uri, before + text.slice(0, Math.floor(text.length / 2)));
        throw new Closed("closed while writing");
      }
      files.set(this.uri, before + text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
    moveSync(to: File, options?: { overwrite?: boolean }): void {
      if (options?.overwrite === true) {
        files.delete(to.uri);
      }
      if (state.cut === "move") {
        state.cut = null;
        throw new Closed("closed while moving");
      }
      files.set(to.uri, files.get(this.uri) ?? "");
      files.delete(this.uri);
      state.moves += 1;
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } }, files, state };
});

const disk = jest.requireMock<{
  files: Map<string, string>;
  state: { cut: null | "write" | "move"; moves: number };
}>("expo-file-system");
const RUN_URI = `file:///documents/${RUN_FILE}`;
const NEW_URI = `file:///documents/${NEW_RUN_FILE}`;

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
const ROUTE: LatLon[] = [START, [START[0] + 500 * METRE, START[1]], START];

function fix(northM: number, seconds: number): TrackFix {
  return {
    point: [START[0] + northM * METRE, START[1]],
    timeMs: seconds * 1000,
    accuracyM: 5,
  };
}

/** A run of `n` fixes, 10 m apart, as `saveRun` is given it. */
function runOf(n: number): SavedRun {
  const run = startRun(ROUTE, 0);
  for (let i = 0; i < n; i += 1) {
    run.onFix(fix(10 * i, 4 * i), false);
  }
  const saved = loadRun();
  if (saved === null) {
    throw new Error("no run");
  }
  return saved;
}

beforeEach(() => {
  disk.files.clear();
  disk.state.cut = null;
  disk.state.moves = 0;
});

test("the whole run is written beside the file and moved over it", () => {
  const run = runOf(3);
  disk.state.moves = 0;
  expect(saveRun(run)).toBe(true);
  expect(disk.state.moves).toBe(1);
  expect(disk.files.has(NEW_URI)).toBe(false);
  expect(loadRun()).toEqual(run);
});

test("a write cut short leaves the last whole file, and its half goes", () => {
  const before = runOf(3);
  const after = runOf(5);
  expect(saveRun(before)).toBe(true);
  disk.state.cut = "write";
  expect(saveRun(after)).toBe(false);
  // The file is untouched; beside it, half a run.
  expect(JSON.parse(disk.files.get(RUN_URI) ?? "null")).toEqual(before);
  expect(disk.files.has(NEW_URI)).toBe(true);
  expect(loadRun()).toEqual(before);
  expect(disk.files.has(NEW_URI)).toBe(false);
});

test("a move cut short between its steps: the run beside the file is read", () => {
  const before = runOf(3);
  const after = runOf(5);
  expect(saveRun(before)).toBe(true);
  disk.state.cut = "move";
  expect(saveRun(after)).toBe(false);
  // The old file is gone, the new one whole beside it.
  expect(disk.files.has(RUN_URI)).toBe(false);
  expect(loadRun()).toEqual(after);
  expect(disk.files.has(NEW_URI)).toBe(false);
  expect(JSON.parse(disk.files.get(RUN_URI) ?? "null")).toEqual(after);
});

test("a whole run beside a file still there is the newer one, and is read", () => {
  const before = runOf(3);
  const after = runOf(5);
  expect(saveRun(before)).toBe(true);
  disk.files.set(NEW_URI, JSON.stringify(after));
  expect(loadRun()).toEqual(after);
  expect(disk.files.has(NEW_URI)).toBe(false);
});

test("half a run beside no file is no run", () => {
  disk.files.set(NEW_URI, JSON.stringify(runOf(3)).slice(0, 40));
  disk.files.delete(RUN_URI);
  expect(loadRun()).toBeNull();
  expect(disk.files.has(NEW_URI)).toBe(false);
});

test("clearing takes away the run beside the file too", () => {
  const run = runOf(3);
  expect(saveRun(run)).toBe(true);
  disk.files.set(NEW_URI, JSON.stringify(run));
  clearRun();
  expect(disk.files.has(RUN_URI)).toBe(false);
  expect(disk.files.has(NEW_URI)).toBe(false);
  expect(loadRun()).toBeNull();
});
