/**
 * The run's file keeps how far the route's shape is turned (TASK-232,
 * ADR-0195), so the run saved and its post show the drawing turned back.
 * The file of any other route is as it was.
 */
import type { LatLon } from "@shaperoute/shared-types";

import type { TrackFix } from "./trackRecorder";
import { loadRun, RUN_FILE, startRun } from "./trackStore";

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
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

const disk = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

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

beforeEach(() => {
  disk.files.clear();
});

test("a turned route is kept with its turn", () => {
  const run = startRun(ROUTE, 0, 0.9, [], undefined, -30);
  run.onFix(fix(0, 0), false);
  run.stop();
  expect(loadRun()).toEqual({
    version: 1,
    route: ROUTE,
    similarity: 0.9,
    rotation_deg: -30,
    track: run.track(),
    status: "stopped",
  });
});

test("a route north up, or one that does not say, writes the file of before", () => {
  for (const turn of [undefined, 0, Number.NaN]) {
    disk.files.clear();
    const run = startRun(ROUTE, 0, 0.9, [], undefined, turn);
    run.onFix(fix(0, 0), false);
    run.stop();
    expect(loadRun()).toEqual({
      version: 1,
      route: ROUTE,
      similarity: 0.9,
      track: run.track(),
      status: "stopped",
    });
  }
});

test("a file whose turn is not a number is not a run's file", () => {
  const run = startRun(ROUTE, 0, 0.9, [], undefined, -30);
  run.onFix(fix(0, 0), false);
  run.stop();
  const uri = `file:///documents/${RUN_FILE}`;
  const written = disk.files.get(uri);
  expect(written).toContain('"rotation_deg":-30');
  disk.files.set(
    uri,
    String(written).replace('"rotation_deg":-30', '"rotation_deg":"-30"'),
  );
  expect(loadRun()).toBeNull();
});
