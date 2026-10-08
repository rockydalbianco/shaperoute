import walkedRequest from "@shaperoute/shared-types/fixtures/activity-request-walks.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";

import type { ActivityRequest } from "../api/activities";
import {
  keepWaiting,
  loadOutbox,
  markRefused,
  MAX_WAITING,
  refusedOf,
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
  expect(keepWaiting(run("first000"))).toBe("kept");
  expect(keepWaiting(run("second00"))).toBe("kept");
  expect(loadOutbox()).toEqual([run("first000"), run("second00")]);
  expect(JSON.parse(files.get(URI) ?? "")).toHaveLength(2);
});

test("a run along a word with the pen up waits with its walks and its pen", () => {
  // TASK-199: what goes to the API later is what was recorded, whole.
  const walked: Waiting = {
    id: "walked00",
    owner: 1,
    request: walkedRequest as ActivityRequest,
  };
  expect(keepWaiting(walked)).toBe("kept");
  expect(keepWaiting(run("first000"))).toBe("kept");
  const [first, second] = loadOutbox();
  expect(JSON.stringify(first.request)).toBe(JSON.stringify(walkedRequest));
  // Any other run waits as before, without a field more.
  expect(JSON.stringify(second.request)).toBe(JSON.stringify(request));
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

function ids(count: number, owner = 1): Waiting[] {
  return Array.from({ length: count }, (_, n) =>
    run(`run${String(n).padStart(5, "0")}`, owner),
  );
}

test("past the limit no run is let go: the phone is full, and says so", () => {
  // TASK-257: the oldest run was dropped without a word.
  const list = ids(MAX_WAITING);
  expect(withRun(list, run("one-more"))).toBeNull();
  saveOutbox(list);
  expect(keepWaiting(run("one-more"))).toBe("full");
  expect(loadOutbox()).toEqual(list);
  // A run already there is still kept: it was before.
  expect(keepWaiting(run("run00000"))).toBe("kept");
});

test("the limit is of each account: another account's runs leave room", () => {
  saveOutbox(ids(MAX_WAITING, 2));
  expect(keepWaiting(run("one-more"))).toBe("kept");
  expect(loadOutbox()).toHaveLength(MAX_WAITING + 1);
});

test("a run the API refused stays, with the reason, until it is sent again", () => {
  keepWaiting(run("first000"));
  keepWaiting(run("first000", 2));
  const reason = { code: "invalid_request", message: "This run cannot be saved: …" };
  markRefused(1, "first000", reason);
  const [mine, theirs] = loadOutbox();
  expect(refusedOf(mine)).toEqual(reason);
  expect(refusedOf(theirs)).toBeNull();
  // Read back as it was written, at the next opening.
  expect(JSON.parse(files.get(URI) ?? "")[0].refused).toEqual(reason);
  markRefused(1, "first000", null);
  expect(loadOutbox()).toEqual([run("first000"), run("first000", 2)]);
});

test("a reason that is not one reads as an empty one", () => {
  expect(refusedOf({ ...run("first000"), refused: { code: 4 } as never })).toEqual({
    code: "",
    message: "",
  });
});

test("a refused run counts for the limit: it is still on the phone", () => {
  saveOutbox(ids(MAX_WAITING));
  markRefused(1, "run00000", { code: "invalid_request", message: "…" });
  expect(keepWaiting(run("one-more"))).toBe("full");
  stopWaiting(1, "run00000");
  expect(keepWaiting(run("one-more"))).toBe("kept");
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
