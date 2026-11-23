import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import gymRequest from "@shaperoute/shared-types/fixtures/gym-session.json";
import list from "@shaperoute/shared-types/fixtures/gear-list.json";

import { answers, apiError } from "../account/testing";
import { keepWaiting, type Waiting } from "../activities/outbox";
import type { ActivityRequest } from "../api/activities";
import { type GymWaiting, keepGymWaiting, stopGymWaiting } from "../gym/gymOutbox";
import {
  forgetGearFor,
  GEAR_OUTBOX_FILE,
  GEAR_WAIT_DAYS,
  keepGearFor,
  loadGearOutbox,
  sendWaitingGear,
} from "./gearOut";

// The gear chosen at «Save» (TASK-486 part C): kept on the phone, sent
// once the API has the activity.

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
const NOW = 1_800_000_000_000;
const DAY_MS = 86_400_000;
const replies = (...given: Parameters<typeof answers>): jest.Mock => answers(...given);

beforeEach(() => files.clear());

function keys(): string[] {
  return loadGearOutbox().map((item) => `${item.owner}:${item.key}`);
}

test("a list waits for its activity, the latest one for each", () => {
  expect(keepGearFor(OWNER, "a", ["s1", "h1"], NOW)).toBe(true);
  expect(keepGearFor(OWNER, "b", ["s1"], NOW)).toBe(true);
  expect(keepGearFor(OWNER, "a", ["s2", "s2"], NOW)).toBe(true);
  expect(keys()).toEqual(["7:b", "7:a"]);
  expect(loadGearOutbox()[1].gearIds).toEqual(["s2"]);
  expect(files.has(`file:///documents/${GEAR_OUTBOX_FILE}`)).toBe(true);
});

test("no items, or more than an activity takes, are not kept", () => {
  expect(keepGearFor(OWNER, "a", [], NOW)).toBe(false);
  const eleven = Array.from({ length: 11 }, (_, n) => `g${n}`);
  expect(keepGearFor(OWNER, "a", eleven, NOW)).toBe(false);
  expect(files.size).toBe(0);
});

test("once the API has the activity, its list goes and leaves the phone", async () => {
  keepGearFor(OWNER, "a", ["s1"], NOW);
  const fetchFn = replies({ status: 200, body: list });
  expect(await sendWaitingGear(API, "token", OWNER, { fetchFn }, NOW)).toBe("done");
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("http://api/me/activities/a/gear");
  expect(init.method).toBe("PUT");
  expect(JSON.parse(String(init.body))).toEqual({ gear_ids: ["s1"] });
  expect(loadGearOutbox()).toEqual([]);
});

test("the list of an activity still on the phone waits with it", async () => {
  keepWaiting({
    id: "a",
    owner: OWNER,
    request: request as ActivityRequest,
  } as Waiting);
  keepGymWaiting({ owner: OWNER, key: "g", request: gymRequest } as GymWaiting);
  keepGearFor(OWNER, "a", ["s1"], NOW);
  keepGearFor(OWNER, "g", ["s1"], NOW);
  const fetchFn = replies({ status: 200, body: list });
  await sendWaitingGear(API, "token", OWNER, { fetchFn }, NOW);
  expect(fetchFn).not.toHaveBeenCalled();
  stopGymWaiting(OWNER, "g");
  await sendWaitingGear(API, "token", OWNER, { fetchFn }, NOW);
  expect(String(fetchFn.mock.calls[0][0])).toBe("http://api/me/activities/g/gear");
  expect(keys()).toEqual(["7:a"]);
});

test("without a network the lists wait; the API's no drops one", async () => {
  keepGearFor(OWNER, "a", ["s1"], NOW);
  keepGearFor(OWNER, "b", ["s1"], NOW);
  const away = replies(new Error("offline"));
  await sendWaitingGear(API, "token", OWNER, { fetchFn: away }, NOW);
  expect(away).toHaveBeenCalledTimes(1);
  expect(keys()).toEqual(["7:a", "7:b"]);
  // An item deleted meanwhile, then an activity the API does not know.
  const refused = replies(
    { status: 422, body: apiError("invalid_request") },
    { status: 404, body: apiError("not_found") },
  );
  await sendWaitingGear(API, "token", OWNER, { fetchFn: refused }, NOW);
  expect(refused).toHaveBeenCalledTimes(2);
  expect(loadGearOutbox()).toEqual([]);
});

test("a session that ended is told, and the list waits", async () => {
  keepGearFor(OWNER, "a", ["s1"], NOW);
  const fetchFn = replies({ status: 401, body: apiError("session_expired") });
  expect(await sendWaitingGear(API, "token", OWNER, { fetchFn }, NOW)).toBe(
    "session_ended",
  );
  expect(keys()).toEqual(["7:a"]);
});

test("only the account signed in sends, and an old list is dropped", async () => {
  keepGearFor(OWNER, "a", ["s1"], NOW);
  keepGearFor(8, "b", ["s1"], NOW);
  const fetchFn = replies();
  const later = NOW + (GEAR_WAIT_DAYS + 1) * DAY_MS;
  await sendWaitingGear(API, "token", OWNER, { fetchFn }, later);
  expect(fetchFn).not.toHaveBeenCalled();
  expect(keys()).toEqual(["8:b"]);
});

test("a list is forgotten on its own", () => {
  keepGearFor(OWNER, "a", ["s1"], NOW);
  keepGearFor(OWNER, "b", ["s1"], NOW);
  forgetGearFor(OWNER, "a");
  expect(keys()).toEqual(["7:b"]);
});
