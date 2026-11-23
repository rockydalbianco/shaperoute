import activities from "@shaperoute/shared-types/fixtures/activities.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import myDrawing from "@shaperoute/shared-types/fixtures/my-drawing.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import gearList from "@shaperoute/shared-types/fixtures/gear-list.json";
import type { LatLon, Session } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { Account } from "../account/useAccount";
import type { ActivityRequest } from "../api/activities";
import { NOT_CHOSEN } from "../api/drawings";
import type { SavedRun } from "../navigation/trackStore";
import { useActivitiesOf } from "./activitiesDoor";
import { keepGearFor, loadGearOutbox } from "../gear/gearOut";
import { activityKey } from "./activityKey";
import { keepWaiting, markRefused, type Waiting } from "./outbox";

// The gear goes with the run (TASK-486 part C, ADR-0393): told just before
// «Save», kept on the phone with the run, sent to the API once it has the
// run. No items chosen, nothing is kept.

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
const SHOES = gearList.gear[0].id;

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
    if (path.endsWith("/gear")) {
      return Response.json(gearList);
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

test("«Save» keeps the gear with the run; it goes after the run and its drawing", async () => {
  const { fetchFn, calls, sent } = api();
  const { result } = await door(fetchFn);
  await act(async () => {
    result.current.toDrawing(CHOICE);
    result.current.toGear?.([SHOES]);
    expect(result.current.record(RUN, STAR)).toBe(true);
  });
  await waitFor(() => expect(sent()).toContain(`PUT /me/activities/${KEY}/gear`));
  expect(sent()).toEqual([
    `PUT /me/activities/${KEY}`,
    `PUT /me/activities/${KEY}/drawing`,
    `PUT /me/activities/${KEY}/gear`,
  ]);
  expect(calls.find((call) => call.path.endsWith("/gear"))?.body).toEqual({
    gear_ids: [SHOES],
  });
  expect(loadGearOutbox()).toEqual([]);
});

test("no gear chosen: nothing is kept or sent", async () => {
  const { fetchFn, sent } = api();
  const { result } = await door(fetchFn);
  await act(async () => {
    result.current.toDrawing(CHOICE);
    result.current.toGear?.([]);
    expect(result.current.record(RUN, STAR)).toBe(true);
  });
  await waitFor(() => expect(sent()).toContain(`PUT /me/activities/${KEY}/drawing`));
  expect(loadGearOutbox()).toEqual([]);
  expect(sent().some((call) => call.endsWith("/gear"))).toBe(false);
});

test("a run the API refused keeps its gear on the phone; discarded, both go", async () => {
  keepWaiting({
    id: "a",
    owner: OWNER,
    request: request as ActivityRequest,
  } as Waiting);
  markRefused(OWNER, "a", { code: "invalid_request", message: "No." });
  keepGearFor(OWNER, "a", [SHOES]);
  const { fetchFn, sent } = api();
  const { result } = await door(fetchFn);
  await act(async () => {});
  expect(sent()).toEqual([]);
  expect(loadGearOutbox()).toHaveLength(1);
  await act(async () => {
    result.current.discard("a");
  });
  expect(loadGearOutbox()).toEqual([]);
  expect(sent()).toEqual([]);
});
