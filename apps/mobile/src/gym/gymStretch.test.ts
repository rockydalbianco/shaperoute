/**
 * What the stretching at the end of a workout at the gym is to the API
 * (TASK-466 part C2): its seconds without the pauses, as the API counts a
 * stretching session's, within the limits of gym_sessions.GymStretchBody;
 * and the one workout it belongs to, in its own file.
 */
import { isGymStretch } from "../api/gym";
import type { StretchDone } from "../stretch/StretchScreen";
import {
  askStretch,
  endStretch,
  forgetStretch,
  GYM_STRETCH_FILE,
  gymStretch,
  resetGymStretchForTests,
  startStretch,
  stretchOf,
  stretchStep,
} from "./gymStretch";

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
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const T0 = Date.UTC(2026, 10, 27, 18);

function done(changes: Partial<StretchDone> = {}): StretchDone {
  return {
    routine: "afterGym",
    minutes: 5,
    startedAt: T0,
    endedAt: T0 + 312_000,
    pauses: [],
    exercises: 6,
    ...changes,
  };
}

beforeEach(() => {
  files.clear();
  resetGymStretchForTests();
});

test("its seconds, without the pauses counted once", () => {
  expect(gymStretch(done())).toEqual({
    routine: "afterGym",
    minutes: 5,
    duration_s: 312,
    exercises: 6,
  });
  const paused = done({
    endedAt: T0 + 400_000,
    pauses: [
      { from_s: 10, to_s: 50 },
      { from_s: 40, to_s: 60 },
      { from_s: 390, to_s: 500 },
    ],
  });
  // 50 s overlapping, and the last pause cut at the end: 400 − 50 − 10.
  expect(gymStretch(paused)?.duration_s).toBe(340);
});

test("nothing to keep: no length chosen, no exercise held, outside the API's limits", () => {
  expect(gymStretch(done({ minutes: null }))).toBeNull();
  expect(gymStretch(done({ exercises: 0 }))).toBeNull();
  expect(gymStretch(done({ endedAt: T0 }))).toBeNull();
  expect(gymStretch(done({ endedAt: T0 + 4 * 3600_000 + 1000 }))).toBeNull();
  expect(
    gymStretch(done({ routine: "after gym" as StretchDone["routine"] })),
  ).toBeNull();
});

test("the API's limits, as gym_sessions.GymStretchBody", () => {
  const ok = { routine: "afterGym", minutes: 5, duration_s: 312, exercises: 6 };
  expect(isGymStretch(ok)).toBe(true);
  expect(isGymStretch({ ...ok, minutes: 0 })).toBe(false);
  expect(isGymStretch({ ...ok, minutes: 61 })).toBe(false);
  expect(isGymStretch({ ...ok, duration_s: 0 })).toBe(false);
  expect(isGymStretch({ ...ok, duration_s: 14_401 })).toBe(false);
  expect(isGymStretch({ ...ok, exercises: 101 })).toBe(false);
  expect(isGymStretch({ ...ok, exercises: 1.5 })).toBe(false);
  expect(isGymStretch({ ...ok, routine: "running.after" })).toBe(false);
  expect(isGymStretch(null)).toBe(false);
});

test("asked, under way, done: kept for its workout only, read again from its file", () => {
  expect(stretchStep("w1")).toBe("done");
  askStretch("w1");
  expect(stretchStep("w1")).toBe("ask");
  expect(stretchStep("w2")).toBe("done");
  startStretch("w2");
  expect(stretchStep("w1")).toBe("ask");
  startStretch("w1");
  expect(stretchStep("w1")).toBe("stretching");

  endStretch("w1", done());
  // Left right after: what was told stays.
  endStretch("w1");
  expect(stretchStep("w1")).toBe("done");
  expect(stretchOf("w1")).toMatchObject({ minutes: 5, duration_s: 312 });
  expect(stretchOf("w2")).toBeNull();

  resetGymStretchForTests();
  expect(stretchOf("w1")).toMatchObject({ minutes: 5 });
  expect(files.has(`file:///documents/${GYM_STRETCH_FILE}`)).toBe(true);

  forgetStretch();
  expect(stretchOf("w1")).toBeNull();
  resetGymStretchForTests();
  expect(stretchStep("w1")).toBe("done");
});

test("Skip keeps nothing", () => {
  askStretch("w1");
  endStretch("w1");
  expect(stretchStep("w1")).toBe("done");
  expect(stretchOf("w1")).toBeNull();
});
