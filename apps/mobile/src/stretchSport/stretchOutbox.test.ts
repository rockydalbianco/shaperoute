import type { StretchDone } from "../stretch/StretchScreen";
import {
  keepStretchWaiting,
  loadStretchOutbox,
  MAX_STRETCH_WAITING,
  refuseStretchWaiting,
  stretchRequest,
  stretchToSend,
  stopStretchWaiting,
} from "./stretchOutbox";

// TASK-475 part B: the sessions finished and not on the API yet.

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
const T0 = Date.UTC(2026, 10, 21, 7);
const DONE: StretchDone = {
  routine: "morning",
  minutes: 10,
  startedAt: T0,
  endedAt: T0 + 11 * 60_000,
  pauses: [{ from_s: 300, to_s: 360 }],
  exercises: 10,
};

beforeEach(() => files.clear());

test("a session done is the request of the contract's example", () => {
  expect(stretchRequest(DONE)).toEqual({
    started_at: "2026-11-21T07:00:00.000Z",
    ended_at: "2026-11-21T07:11:00.000Z",
    pauses: [{ from_s: 300, to_s: 360 }],
    routine: "morning",
    minutes: 10,
    exercises: 10,
  });
});

test("nothing to keep: no exercise held, no length, or too long", () => {
  expect(stretchRequest({ ...DONE, exercises: 0 })).toBeNull();
  expect(stretchRequest({ ...DONE, minutes: null })).toBeNull();
  expect(stretchRequest({ ...DONE, endedAt: T0 })).toBeNull();
  expect(stretchRequest({ ...DONE, endedAt: T0 + 4 * 3600_000 + 1 })).toBeNull();
});

test("a pause past the end is cut to it", () => {
  const request = stretchRequest({
    ...DONE,
    endedAt: T0 + 60_000,
    pauses: [{ from_s: 50, to_s: 70.5 }],
  });
  expect(request?.pauses).toEqual([{ from_s: 50, to_s: 60 }]);
});

test("a session is kept once, sent, refused or taken out", () => {
  const request = stretchRequest(DONE);
  if (request === null) {
    throw new Error("no request");
  }
  expect(keepStretchWaiting({ owner: 1, key: "abcdefgh1", request })).toBe("kept");
  expect(keepStretchWaiting({ owner: 1, key: "abcdefgh1", request })).toBe("kept");
  expect(keepStretchWaiting({ owner: 2, key: "abcdefgh2", request })).toBe("kept");
  expect(loadStretchOutbox()).toHaveLength(2);
  expect(stretchToSend(1).map((item) => item.key)).toEqual(["abcdefgh1"]);
  refuseStretchWaiting(1, "abcdefgh1", { code: "invalid_request", message: "no" });
  expect(stretchToSend(1)).toEqual([]);
  stopStretchWaiting(1, "abcdefgh1");
  expect(loadStretchOutbox().map((item) => item.key)).toEqual(["abcdefgh2"]);
});

test("an account holds at most MAX_STRETCH_WAITING sessions", () => {
  const request = stretchRequest(DONE);
  if (request === null) {
    throw new Error("no request");
  }
  for (let i = 0; i < MAX_STRETCH_WAITING; i += 1) {
    expect(keepStretchWaiting({ owner: 1, key: `session${i}`, request })).toBe("kept");
  }
  expect(keepStretchWaiting({ owner: 1, key: "onemore1", request })).toBe("full");
});
