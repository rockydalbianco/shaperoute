import type { ActivitySleepRequest } from "@shaperoute/shared-types";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import sleepRequest from "@shaperoute/shared-types/fixtures/sleep-activity-request.json";
import sleepKept from "@shaperoute/shared-types/fixtures/sleep-activity.json";

import { answers, apiError } from "../account/testing";
import type { ActivityRequest } from "../api/activities";
import { keepWaiting, type Waiting } from "./outbox";
import {
  forgetSleepFor,
  keepSleepFor,
  loadSleepOutbox,
  sendWaitingSleep,
  SLEEP_OUTBOX_FILE,
  SLEEP_WAIT_DAYS,
} from "./sleepOut";

// «Sleep last night» of the runs still to reach the API (TASK-467 part
// B2): kept only when shown, sent once the API has the run.

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
const API = "http://api";
const OWNER = 7;
const NIGHT: ActivitySleepRequest = { ...sleepRequest, shown: true };
const NOW = 1_800_000_000_000;
const DAY_MS = 86_400_000;
const replies = (...list: Parameters<typeof answers>): jest.Mock => answers(...list);

beforeEach(() => files.clear());

function keys(): string[] {
  return loadSleepOutbox().map((item) => `${item.owner}:${item.key}`);
}

test("a night shown waits for its run, the latest one for each run", () => {
  expect(keepSleepFor(OWNER, "a", NIGHT, NOW)).toBe(true);
  expect(keepSleepFor(OWNER, "b", NIGHT, NOW)).toBe(true);
  expect(keepSleepFor(OWNER, "a", { ...NIGHT, score: 60 }, NOW)).toBe(true);
  expect(keys()).toEqual(["7:b", "7:a"]);
  expect(loadSleepOutbox()[1].sleep.score).toBe(60);
  expect(files.has(`file:///documents/${SLEEP_OUTBOX_FILE}`)).toBe(true);
});

test("a night not shown is never kept: nothing of it is to leave the phone", () => {
  expect(keepSleepFor(OWNER, "a", { ...NIGHT, shown: false }, NOW)).toBe(false);
  // Left out, the API would take it for shown: the phone says it outright.
  const { shown: _shown, ...silent } = NIGHT;
  expect(keepSleepFor(OWNER, "a", silent, NOW)).toBe(false);
  expect(loadSleepOutbox()).toEqual([]);
  expect(files.size).toBe(0);
  // Nor is one read back from a file that says so.
  files.set(
    `file:///documents/${SLEEP_OUTBOX_FILE}`,
    JSON.stringify([
      { owner: OWNER, key: "a", keptMs: NOW, sleep: { ...NIGHT, shown: false } },
    ]),
  );
  expect(loadSleepOutbox()).toEqual([]);
});

test("a night that is not one is not kept", () => {
  expect(keepSleepFor(OWNER, "a", { ...NIGHT, score: 140 }, NOW)).toBe(false);
  expect(loadSleepOutbox()).toEqual([]);
});

test("once the API has the run, its night goes and leaves the phone", async () => {
  keepSleepFor(OWNER, "a", NIGHT, NOW);
  const fetchFn = replies({ status: 200, body: sleepKept });
  expect(await sendWaitingSleep(API, "token", OWNER, { fetchFn }, NOW)).toBe("done");
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("http://api/me/activities/a/sleep");
  expect(init.method).toBe("PUT");
  expect(JSON.parse(String(init.body))).toEqual(NIGHT);
  expect(loadSleepOutbox()).toEqual([]);
});

test("the night of a run still on the phone waits with it", async () => {
  keepWaiting({
    id: "a",
    owner: OWNER,
    request: request as ActivityRequest,
  } as Waiting);
  keepSleepFor(OWNER, "a", NIGHT, NOW);
  const fetchFn = replies();
  expect(await sendWaitingSleep(API, "token", OWNER, { fetchFn }, NOW)).toBe("done");
  expect(fetchFn).not.toHaveBeenCalled();
  expect(keys()).toEqual(["7:a"]);
});

test("without a network the nights wait; the API's no drops one", async () => {
  keepSleepFor(OWNER, "a", NIGHT, NOW);
  keepSleepFor(OWNER, "b", NIGHT, NOW);
  const away = replies(new Error("offline"));
  await sendWaitingSleep(API, "token", OWNER, { fetchFn: away }, NOW);
  expect(away).toHaveBeenCalledTimes(1);
  expect(keys()).toEqual(["7:a", "7:b"]);
  // Not the night before the activity, then a run the API does not know.
  const refused = replies(
    { status: 422, body: apiError("invalid_request") },
    { status: 404, body: apiError("not_found") },
  );
  await sendWaitingSleep(API, "token", OWNER, { fetchFn: refused }, NOW);
  expect(refused).toHaveBeenCalledTimes(2);
  expect(loadSleepOutbox()).toEqual([]);
});

test("a session that ended is told, and the night waits", async () => {
  keepSleepFor(OWNER, "a", NIGHT, NOW);
  const fetchFn = replies({ status: 401, body: apiError("session_expired") });
  expect(await sendWaitingSleep(API, "token", OWNER, { fetchFn }, NOW)).toBe(
    "session_ended",
  );
  expect(keys()).toEqual(["7:a"]);
});

test("only the nights of the account signed in go", async () => {
  keepSleepFor(OWNER, "a", NIGHT, NOW);
  keepSleepFor(8, "b", NIGHT, NOW);
  const fetchFn = replies({ status: 200, body: sleepKept });
  await sendWaitingSleep(API, "token", OWNER, { fetchFn }, NOW);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(keys()).toEqual(["8:b"]);
});

test("a night that waited too long is dropped unsent", async () => {
  keepSleepFor(OWNER, "a", NIGHT, NOW);
  const fetchFn = replies();
  const later = NOW + (SLEEP_WAIT_DAYS + 1) * DAY_MS;
  await sendWaitingSleep(API, "token", OWNER, { fetchFn }, later);
  expect(fetchFn).not.toHaveBeenCalled();
  expect(loadSleepOutbox()).toEqual([]);
});

test("a run discarded takes its night with it", () => {
  keepSleepFor(OWNER, "a", NIGHT, NOW);
  keepSleepFor(OWNER, "b", NIGHT, NOW);
  forgetSleepFor(OWNER, "a");
  expect(keys()).toEqual(["7:b"]);
});
