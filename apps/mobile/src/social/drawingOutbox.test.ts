import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import myDrawing from "@shaperoute/shared-types/fixtures/my-drawing.json";

import { answers, apiError } from "../account/testing";
import type { ActivityRequest } from "../api/activities";
import { toDrawingOf, type Waiting } from "../activities/outbox";
import {
  DRAWING_OUTBOX_FILE,
  dropForDrawing,
  keepForDrawing,
  loadDrawingOutbox,
  MAX_DRAWINGS_WAITING,
  sendWaitingDrawings,
  waitingDrawing,
} from "./drawingOutbox";

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
const URI = `file:///documents/${DRAWING_OUTBOX_FILE}`;
const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

const HEART = { owner: 1, key: "a", title: "Heart", public: true };

beforeEach(() => {
  files.clear();
});

test("only the latest choice for a run waits, for its account", () => {
  expect(keepForDrawing(HEART)).toBe(true);
  expect(keepForDrawing({ owner: 2, key: "a", title: null, public: true })).toBe(true);
  expect(keepForDrawing({ ...HEART, public: false })).toBe(true);
  expect(loadDrawingOutbox()).toEqual([
    { owner: 2, key: "a", title: null, public: true },
    { ...HEART, public: false },
  ]);
  expect(waitingDrawing(1, "a")).toEqual({ ...HEART, public: false });
  expect(waitingDrawing(1, "b")).toBeNull();
});

test("a choice leaves the file only if no newer one took its place", () => {
  keepForDrawing(HEART);
  dropForDrawing({ ...HEART, public: false });
  expect(loadDrawingOutbox()).toEqual([HEART]);
  dropForDrawing(HEART);
  expect(files.has(URI)).toBe(false);
});

test("a phone a long time without a network keeps the latest choices", () => {
  for (let i = 0; i <= MAX_DRAWINGS_WAITING; i += 1) {
    keepForDrawing({ ...HEART, key: `run-${i}` });
  }
  const list = loadDrawingOutbox();
  expect(list).toHaveLength(MAX_DRAWINGS_WAITING);
  expect(list[0].key).toBe("run-1");
});

test("a file that cannot be read is no choice", () => {
  files.set(URI, "not json");
  expect(loadDrawingOutbox()).toEqual([]);
  files.set(URI, JSON.stringify([{ owner: 1, key: "a" }, HEART]));
  expect(loadDrawingOutbox()).toEqual([HEART]);
});

test("the choices of the account go, and leave the file", async () => {
  keepForDrawing(HEART);
  keepForDrawing({ owner: 2, key: "b", title: null, public: true });
  const fetchFn = answers({ status: 200, body: myDrawing });
  expect(await sendWaitingDrawings(URL, TOKEN, 1, options(fetchFn))).toBe("done");
  expect(fetchFn).toHaveBeenCalledTimes(1);
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/activities/a/drawing");
  expect(JSON.parse(String(init?.body))).toEqual({ title: "Heart", public: true });
  // Another account's choice is not sent with this token.
  expect(loadDrawingOutbox()).toEqual([
    { owner: 2, key: "b", title: null, public: true },
  ]);
});

test("without a network the choices wait on", async () => {
  keepForDrawing(HEART);
  keepForDrawing({ ...HEART, key: "b" });
  const fetchFn = answers(new TypeError("Network request failed"));
  expect(await sendWaitingDrawings(URL, TOKEN, 1, options(fetchFn))).toBe("done");
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(loadDrawingOutbox()).toHaveLength(2);
});

test("a run too short to publish keeps its title, private", async () => {
  keepForDrawing(HEART);
  const fetchFn = answers(
    {
      status: 422,
      body: apiError("invalid_request", "This run is too short to publish."),
    },
    { status: 200, body: { ...myDrawing, public: false } },
  );
  await sendWaitingDrawings(URL, TOKEN, 1, options(fetchFn));
  expect(JSON.parse(String(fetchFn.mock.calls[1][1]?.body))).toEqual({
    title: "Heart",
    public: false,
  });
  expect(loadDrawingOutbox()).toEqual([]);
});

test("a run the API no longer has is let go", async () => {
  keepForDrawing(HEART);
  const fetchFn = answers({ status: 404, body: apiError("http_error") });
  await sendWaitingDrawings(URL, TOKEN, 1, options(fetchFn));
  expect(loadDrawingOutbox()).toEqual([]);
});

test("an ended session stops and says so", async () => {
  keepForDrawing(HEART);
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  expect(await sendWaitingDrawings(URL, TOKEN, 1, options(fetchFn))).toBe(
    "session_ended",
  );
  expect(loadDrawingOutbox()).toEqual([HEART]);
});

test("a run waiting for the API keeps its title and «Public» for after", () => {
  const run: Waiting = { id: "a", owner: 1, request: request as ActivityRequest };
  expect(toDrawingOf(run)).toBeNull();
  expect(toDrawingOf({ ...run, drawing: { title: "Heart", public: true } })).toEqual({
    title: "Heart",
    public: true,
  });
  expect(toDrawingOf({ ...run, drawing: { title: "", public: false } })).toEqual({
    title: null,
    public: false,
  });
  expect(
    toDrawingOf({ ...run, drawing: { title: "Heart" } } as unknown as Waiting),
  ).toBeNull();
});
