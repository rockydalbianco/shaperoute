import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import activity from "@shaperoute/shared-types/fixtures/strava-activity.json";

import { answers, apiError } from "../account/testing";
import type { ActivityRequest } from "../api/activities";
import { toStravaOf, type Waiting } from "../activities/outbox";
import {
  dropForStrava,
  keepForStrava,
  loadStravaOutbox,
  MAX_STRAVA_WAITING,
  sendWaitingToStrava,
  STRAVA_OUTBOX_FILE,
} from "./stravaOutbox";

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
const URI = `file:///documents/${STRAVA_OUTBOX_FILE}`;
const URL = "http://api";
const TOKEN = "the-token";

beforeEach(() => {
  files.clear();
});

test("a run waits once for its account, and leaves when told", () => {
  expect(keepForStrava({ owner: 1, key: "a", name: "Heart" })).toBe(true);
  expect(keepForStrava({ owner: 1, key: "a", name: "Heart" })).toBe(true);
  expect(keepForStrava({ owner: 2, key: "a", name: null })).toBe(true);
  expect(loadStravaOutbox()).toEqual([
    { owner: 1, key: "a", name: "Heart" },
    { owner: 2, key: "a", name: null },
  ]);
  dropForStrava(1, "a");
  expect(loadStravaOutbox()).toEqual([{ owner: 2, key: "a", name: null }]);
  dropForStrava(2, "a");
  // Nothing left: no file left.
  expect(files.has(URI)).toBe(false);
});

test("a phone long without a network keeps the latest runs", () => {
  for (let at = 0; at < MAX_STRAVA_WAITING + 3; at += 1) {
    keepForStrava({ owner: 1, key: `run-${at}`, name: null });
  }
  const kept = loadStravaOutbox();
  expect(kept).toHaveLength(MAX_STRAVA_WAITING);
  expect(kept[0].key).toBe("run-3");
});

test("a file that does not read is no run waiting", () => {
  files.set(URI, "{not json");
  expect(loadStravaOutbox()).toEqual([]);
  files.set(
    URI,
    JSON.stringify([
      { owner: "1", key: "a" },
      { owner: 1, key: "b", name: null },
    ]),
  );
  expect(loadStravaOutbox()).toEqual([{ owner: 1, key: "b", name: null }]);
});

test("a run waiting for the API says where it goes after", () => {
  const run: Waiting = { id: "a", owner: 1, request: request as ActivityRequest };
  expect(toStravaOf(run)).toBeNull();
  expect(toStravaOf({ ...run, strava: { name: "Heart" } })).toEqual({ name: "Heart" });
  expect(toStravaOf({ ...run, strava: { name: null } })).toEqual({ name: null });
  expect(toStravaOf({ ...run, strava: { name: "" } })).toEqual({ name: null });
  // A file written by hand, or broken: nowhere.
  expect(toStravaOf({ ...run, strava: "yes" } as unknown as Waiting)).toBeNull();
});

test("what Strava has, or will never take, leaves; the rest waits", async () => {
  for (const key of ["sent", "refused", "gone", "reading", "silent", "after"]) {
    keepForStrava({ owner: 1, key, name: key === "sent" ? "Heart" : null });
  }
  keepForStrava({ owner: 2, key: "other", name: null });
  const fetchFn: jest.Mock = answers(
    { status: 200, body: activity },
    { status: 422, body: apiError("invalid_request") },
    { status: 404, body: apiError("http_error") },
    { status: 202, body: { status: "processing", url: null } },
    { status: 502, body: apiError("http_error") },
  );

  expect(await sendWaitingToStrava(URL, TOKEN, 1, { fetchFn, key: null })).toBe("done");

  // Strava silent: the run after it was not even tried.
  expect(fetchFn).toHaveBeenCalledTimes(5);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({ name: "Heart" });
  expect(loadStravaOutbox().map((run) => run.key)).toEqual([
    "reading",
    "silent",
    "after",
    "other",
  ]);
});

test("an athlete not connected any more drops the run", async () => {
  keepForStrava({ owner: 1, key: "a", name: null });
  const fetchFn: jest.Mock = answers({ status: 409, body: apiError("http_error") });
  await sendWaitingToStrava(URL, TOKEN, 1, { fetchFn, key: null });
  expect(loadStravaOutbox()).toEqual([]);
});

test("without a network everything waits; a session that ended is said", async () => {
  keepForStrava({ owner: 1, key: "a", name: null });
  keepForStrava({ owner: 1, key: "b", name: null });
  const offline: jest.Mock = answers(new Error("offline"));
  expect(
    await sendWaitingToStrava(URL, TOKEN, 1, { fetchFn: offline, key: null }),
  ).toBe("done");
  expect(offline).toHaveBeenCalledTimes(1);
  const ended: jest.Mock = answers({ status: 401, body: apiError("session_expired") });
  expect(await sendWaitingToStrava(URL, TOKEN, 1, { fetchFn: ended, key: null })).toBe(
    "session_ended",
  );
  expect(loadStravaOutbox()).toHaveLength(2);
});
