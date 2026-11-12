import activities from "@shaperoute/shared-types/fixtures/activities.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import myDrawing from "@shaperoute/shared-types/fixtures/my-drawing.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import sleepRequest from "@shaperoute/shared-types/fixtures/sleep-activity-request.json";
import sleepKept from "@shaperoute/shared-types/fixtures/sleep-activity.json";
import type { ActivitySleepRequest, LatLon, Session } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { Account } from "../account/useAccount";
import type { ActivityRequest } from "../api/activities";
import { NOT_CHOSEN } from "../api/drawings";
import type { SavedRun } from "../navigation/trackStore";
import { useActivitiesOf } from "./activitiesDoor";
import { activityKey } from "./activityKey";
import { keepWaiting, markRefused, type Waiting } from "./outbox";
import { keepSleepFor, loadSleepOutbox } from "./sleepOut";

// «Sleep last night» goes with the run (TASK-467 part B2): told just
// before «Save», kept on the phone with the run, sent to the API once it
// has the run. Nothing told, nothing of the night leaves the phone.

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
const URL = "http://api";
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const doors = { onList: jest.fn(), onAccount: jest.fn(), onOpened: jest.fn() };

function account(): Account {
  return {
    state: { status: "signedIn", session: signedIn },
    busy: null,
    problem: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    editProfile: jest.fn(),
    changeEmail: jest.fn(),
    changePhone: jest.fn(),
    changeNotifications: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
  };
}

const CHOICE = { ...NOT_CHOSEN, title: "Heart", visibility: "everyone" as const };
const NIGHT: ActivitySleepRequest = { ...sleepRequest, shown: true };

type Call = { method: string; path: string; body: unknown };

/** A fetch that answers everything with a yes, and keeps what was asked. */
function api() {
  const calls: Call[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace(URL, "");
    const method = init?.method ?? "GET";
    calls.push({
      method,
      path,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (path.endsWith("/stats")) {
      return Response.json({}, { status: 200 });
    }
    if (path.endsWith("/sleep")) {
      return Response.json(sleepKept);
    }
    if (method === "GET") {
      return Response.json(activities);
    }
    if (path.includes("/drawing")) {
      return Response.json(myDrawing);
    }
    return Response.json(activities.activities[0]);
  });
  const sent = () =>
    calls
      .filter((call) => call.method !== "GET" && !call.path.endsWith("/stats"))
      .map((call) => `${call.method} ${call.path}`);
  return { fetchFn, calls, sent };
}

async function door(fetchFn: jest.Mock) {
  const account_ = account();
  return renderHook(() =>
    useActivitiesOf(URL, account_, doors, { fetchFn, key: null }),
  );
}

const FIXES = request.track.map((fix) => ({
  point: fix.point as LatLon,
  timeMs: fix.time_ms,
  accuracyM: fix.accuracy_m,
}));
const RUN: SavedRun = {
  version: 1,
  route: request.points as LatLon[],
  similarity: request.similarity,
  track: { fixes: FIXES, distanceM: 4007 },
  status: "arrived",
};
const STAR = { shape: "star", word: null, style: null, title: null };
const KEY = activityKey(FIXES[0]);

beforeEach(() => {
  files.clear();
});

test("«Save» keeps the night with the run; it goes after the run and its drawing", async () => {
  const { fetchFn, calls, sent } = api();
  const { result } = await door(fetchFn);
  await act(async () => {
    result.current.toDrawing(CHOICE);
    result.current.toSleep?.(NIGHT);
    expect(result.current.record(RUN, STAR)).toBe(true);
  });
  await waitFor(() => expect(sent()).toContain(`PUT /me/activities/${KEY}/sleep`));
  expect(sent()).toEqual([
    `PUT /me/activities/${KEY}`,
    `PUT /me/activities/${KEY}/drawing`,
    `PUT /me/activities/${KEY}/sleep`,
  ]);
  expect(calls.find((call) => call.path.endsWith("/sleep"))?.body).toEqual(NIGHT);
  // Gone from the phone once the API has it.
  expect(loadSleepOutbox()).toEqual([]);
});

test("nothing told, or told there is none: no night is kept or sent", async () => {
  const { fetchFn, sent } = api();
  const { result } = await door(fetchFn);
  await act(async () => {
    result.current.toDrawing(CHOICE);
    result.current.toSleep?.(null);
    expect(result.current.record(RUN, STAR)).toBe(true);
  });
  await waitFor(() => expect(sent()).toContain(`PUT /me/activities/${KEY}/drawing`));
  expect(loadSleepOutbox()).toEqual([]);
  expect(sent().some((call) => call.endsWith("/sleep"))).toBe(false);
});

test("the night told for one run is not the next run's", async () => {
  const { fetchFn, sent } = api();
  const { result } = await door(fetchFn);
  await act(async () => {
    result.current.toSleep?.(NIGHT);
    expect(result.current.record(RUN, STAR)).toBe(true);
  });
  await waitFor(() => expect(sent()).toContain(`PUT /me/activities/${KEY}/sleep`));
  const later = FIXES.map((fix) => ({ ...fix, timeMs: fix.timeMs + 86_400_000 }));
  const next = activityKey(later[0]);
  await act(async () => {
    expect(
      result.current.record({ ...RUN, track: { ...RUN.track, fixes: later } }, STAR),
    ).toBe(true);
  });
  await waitFor(() => expect(sent()).toContain(`PUT /me/activities/${next}`));
  expect(sent().filter((call) => call.endsWith("/sleep"))).toEqual([
    `PUT /me/activities/${KEY}/sleep`,
  ]);
});

test("a night that waited on the phone goes when the app opens", async () => {
  keepSleepFor(OWNER, "a", NIGHT);
  const { fetchFn, sent } = api();
  await door(fetchFn);
  await waitFor(() => expect(sent()).toEqual(["PUT /me/activities/a/sleep"]));
  await waitFor(() => expect(loadSleepOutbox()).toEqual([]));
});

test("a run the API refused keeps its night on the phone; discarded, both go", async () => {
  keepWaiting({
    id: "a",
    owner: OWNER,
    request: request as ActivityRequest,
  } as Waiting);
  markRefused(OWNER, "a", { code: "invalid_request", message: "No." });
  keepSleepFor(OWNER, "a", NIGHT);
  const { fetchFn, sent } = api();
  const { result } = await door(fetchFn);
  await act(async () => {});
  expect(sent()).toEqual([]);
  expect(loadSleepOutbox()).toHaveLength(1);
  await act(async () => {
    result.current.discard("a");
  });
  expect(loadSleepOutbox()).toEqual([]);
  expect(sent()).toEqual([]);
});
