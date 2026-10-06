import activities from "@shaperoute/shared-types/fixtures/activities.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import myDrawing from "@shaperoute/shared-types/fixtures/my-drawing.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { LatLon, Session } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { Account } from "../account/useAccount";
import type { ActivityRequest } from "../api/activities";
import { NOT_CHOSEN } from "../api/drawings";
import type { SavedRun } from "../navigation/trackStore";
import { loadDrawingOutbox } from "../social/drawingOutbox";
import { keepPhotos, loadDrawingPhotos, photosOnPhone } from "../social/drawingPhotos";
import { useActivitiesOf } from "./activitiesDoor";
import { activityKey } from "./activityKey";
import { keepWaiting, loadOutbox, type Waiting } from "./outbox";

// What was chosen for a drawing goes with the run (TASK-208): to the API
// before Strava, which takes the description and the activity from it;
// the photos stay with the run on the phone, and go after the drawing.

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

/** A fetch that answers everything with a yes, and keeps what was asked. */
function api() {
  const calls: string[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace(URL, "");
    const method = init?.method ?? "GET";
    calls.push(`${method} ${path}`);
    if (method === "GET") {
      return Response.json(activities);
    }
    if (method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    if (path.endsWith("/strava")) {
      return Response.json({}, { status: 200 });
    }
    if (path.includes("/drawing")) {
      return Response.json(myDrawing);
    }
    return Response.json(activities.activities[0]);
  });
  return { fetchFn, calls };
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
  track: {
    fixes: FIXES,
    distanceM: 4007,
    pauses: [{ fromMs: 1790000300000, toMs: 1790000360000, auto: true }],
  },
  status: "arrived",
};
const STAR = { shape: "star", word: null, style: null, title: null };
const KEY = activityKey(FIXES[0]);

beforeEach(() => {
  files.clear();
});

test("the drawing goes to the API before Strava, then the run's photos", async () => {
  keepWaiting({
    id: "a",
    owner: OWNER,
    request: request as ActivityRequest,
    strava: { name: "Heart" },
    drawing: CHOICE,
  } as Waiting);
  keepPhotos(OWNER, "a", ["AAAA"]);
  const { fetchFn, calls } = api();
  await door(fetchFn);
  await waitFor(() => expect(calls).toContain("POST /me/activities/a/strava"));
  const sent = calls.filter(
    (call) => call.startsWith("PUT") || call.startsWith("POST"),
  );
  expect(sent).toEqual([
    "PUT /me/activities/a",
    "PUT /me/activities/a/drawing",
    "PUT /me/activities/a/drawing/photos/1",
    "POST /me/activities/a/strava",
  ]);
  expect(loadOutbox()).toEqual([]);
  expect(loadDrawingOutbox()).toEqual([]);
  expect(loadDrawingPhotos()).toEqual([{ owner: OWNER, key: "a", n: 1, sent: true }]);
});

test("«Save» keeps the choice and the photos with the run, under its key", async () => {
  const { fetchFn, calls } = api();
  const { result } = await door(fetchFn);
  await act(async () => {
    result.current.toDrawing({ ...CHOICE, visibility: "only_me" });
    result.current.toPhotos(["AAAA", "BBBB"]);
    expect(result.current.record(RUN, STAR)).toBe(true);
  });
  await waitFor(() => expect(calls).toContain(`PUT /me/activities/${KEY}/drawing`));
  // With «Only me» no photo goes: they stay here, for the run.
  expect(calls.some((call) => call.includes("/photos/"))).toBe(false);
  expect(photosOnPhone(OWNER, KEY)).toEqual([
    { n: 1, base64: "AAAA" },
    { n: 2, base64: "BBBB" },
  ]);
  // Forgotten by `record`: the next run starts with nothing.
  await act(async () => {
    expect(result.current.record({ ...RUN, track: { ...RUN.track } }, STAR)).toBe(true);
  });
  expect(photosOnPhone(OWNER, KEY)).toHaveLength(2);
});

test("a run deleted takes its photos off the phone", async () => {
  keepPhotos(OWNER, "a", ["AAAA"]);
  keepPhotos(OWNER, "b", ["BBBB"]);
  const { fetchFn } = api();
  const { result } = await door(fetchFn);
  await act(async () => {
    result.current.remove("a");
  });
  expect(photosOnPhone(OWNER, "a")).toEqual([]);
  expect(photosOnPhone(OWNER, "b")).toEqual([{ n: 1, base64: "BBBB" }]);
});

test("the runs waiting to be seen by others are counted, whatever the visibility", async () => {
  keepWaiting({
    id: "a",
    owner: OWNER,
    request: request as ActivityRequest,
    drawing: { ...CHOICE, visibility: "followers" },
  } as Waiting);
  keepWaiting({
    id: "b",
    owner: OWNER,
    request: request as ActivityRequest,
    drawing: { ...CHOICE, visibility: "only_me" },
  } as Waiting);
  const fetchFn = jest.fn(async () => {
    throw new TypeError("Network request failed");
  });
  const { result } = await door(fetchFn);
  expect(result.current.waiting).toBe(2);
  expect(result.current.waitingPublic).toBe(1);
});
