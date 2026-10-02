import request from "@shaperoute/shared-types/fixtures/activity-request.json";

import type { ActivityRequest } from "../api/activities";
import {
  keepWaiting,
  loadOutbox,
  MAX_WAITING,
  OUTBOX_FILE,
  saveOutbox,
  stopWaiting,
  type Waiting,
  withRun,
} from "./outbox";

// The phone's documents folder, in memory.
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
const URI = `file:///documents/${OUTBOX_FILE}`;

function run(id: string, owner = 1): Waiting {
  return { id, owner, request: request as ActivityRequest };
}

beforeEach(() => {
  files.clear();
});

test("nothing waits on a phone that never kept a run", () => {
  expect(loadOutbox()).toEqual([]);
});

test("a run kept is there at the next opening, the oldest first", () => {
  expect(keepWaiting(run("first000"))).toBe(true);
  expect(keepWaiting(run("second00"))).toBe(true);
  expect(loadOutbox()).toEqual([run("first000"), run("second00")]);
  expect(JSON.parse(files.get(URI) ?? "")).toHaveLength(2);
});

test("the same run waits once for its account, and once for another's", () => {
  keepWaiting(run("first000"));
  keepWaiting(run("first000"));
  keepWaiting(run("first000", 2));
  expect(loadOutbox().map((item) => item.owner)).toEqual([1, 2]);
});

test("a run sent stops waiting; the last one takes the file with it", () => {
  keepWaiting(run("first000"));
  keepWaiting(run("first000", 2));
  stopWaiting(1, "first000");
  expect(loadOutbox()).toEqual([run("first000", 2)]);
  stopWaiting(1, "first000");
  expect(loadOutbox()).toHaveLength(1);
  stopWaiting(2, "first000");
  expect(files.has(URI)).toBe(false);
});

test("past the limit the oldest run is let go", () => {
  let list: Waiting[] = [];
  for (let n = 0; n < MAX_WAITING + 2; n += 1) {
    list = withRun(list, run(`run${String(n).padStart(5, "0")}`));
  }
  expect(list).toHaveLength(MAX_WAITING);
  expect(list[0].id).toBe("run00002");
  expect(list.at(-1)?.id).toBe(`run${String(MAX_WAITING + 1).padStart(5, "0")}`);
});

test("a file that is not the outbox is read as empty, entry by entry", () => {
  files.set(URI, "not json");
  expect(loadOutbox()).toEqual([]);
  files.set(URI, JSON.stringify({ id: "first000" }));
  expect(loadOutbox()).toEqual([]);
  files.set(
    URI,
    JSON.stringify([run("first000"), { id: "second00" }, { ...run("x"), owner: "me" }]),
  );
  expect(loadOutbox()).toEqual([run("first000")]);
});

test("a phone that refuses the file keeps nothing, and says so", () => {
  const { File } = jest.requireMock<{ File: { prototype: { write: () => void } } }>(
    "expo-file-system",
  );
  const write = jest.spyOn(File.prototype, "write").mockImplementation(() => {
    throw new Error("disk full");
  });
  expect(saveOutbox([run("first000")])).toBe(false);
  write.mockRestore();
});
