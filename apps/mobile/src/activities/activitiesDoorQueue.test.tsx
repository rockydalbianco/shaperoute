import activities from "@shaperoute/shared-types/fixtures/activities.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { apiError } from "../account/testing";
import type { Account } from "../account/useAccount";
import type { ActivityRequest } from "../api/activities";
import { useActivitiesOf } from "./activitiesDoor";
import {
  keepWaiting,
  loadOutbox,
  MAX_WAITING,
  refusedOf,
  saveOutbox,
  type Waiting,
} from "./outbox";

// The runs that wait on the phone, sent one after the other (TASK-252): a
// run the API will not take does not hold the others, and the round starts
// again when the app comes back to the front. A run it will never take
// stays on the phone with the reason (TASK-257).

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

let appState: (next: AppStateStatus) => void = () => {};

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

function run(id: string): Waiting {
  return { id, owner: OWNER, request: request as ActivityRequest };
}

type Answer = { status: number; body?: unknown } | Error;

/** A fetch that answers each run's PUT with what `puts` says for its id,
 * and the list with the fixture. The ids sent, in order, are in `sent`. */
function api(puts: Record<string, Answer | Answer[]>) {
  const sent: string[] = [];
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    if (init?.method !== "PUT") {
      return Response.json(activities, { status: 200 });
    }
    const id = url.slice(url.lastIndexOf("/") + 1);
    sent.push(id);
    const listed = puts[id];
    const next = Array.isArray(listed) ? listed.shift() : listed;
    if (next === undefined || next instanceof Error) {
      throw next ?? new Error(`No answer for ${id}`);
    }
    return next.body === undefined
      ? new Response(null, { status: next.status })
      : Response.json(next.body, { status: next.status });
  });
  return { fetchFn, sent };
}

// A run saved, as the API answers it: a line of the list.
const OK: Answer = { status: 200, body: activities.activities[0] };

async function door(fetchFn: jest.Mock) {
  const account_ = account();
  return renderHook(() =>
    useActivitiesOf(URL, account_, doors, { fetchFn, key: null }),
  );
}

beforeEach(() => {
  files.clear();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    appState = listener;
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("a run the API cannot take waits, and the run after it still goes", async () => {
  keepWaiting(run("a"));
  keepWaiting(run("b"));
  // Too large for the API: not an answer of its own, and not a failure of
  // the network.
  const { fetchFn, sent } = api({ a: { status: 413 }, b: OK });
  const { result } = await door(fetchFn);

  await waitFor(() => expect(result.current.waiting).toBe(1));
  expect(sent).toEqual(["a", "b"]);
  expect(loadOutbox().map((item) => item.id)).toEqual(["a"]);
});

test("a run the API fails on once does not hold the others", async () => {
  keepWaiting(run("a"));
  keepWaiting(run("b"));
  keepWaiting(run("c"));
  const { fetchFn, sent } = api({ a: { status: 500 }, b: OK, c: OK });
  const { result } = await door(fetchFn);

  await waitFor(() => expect(result.current.waiting).toBe(1));
  expect(sent).toEqual(["a", "b", "c"]);
  expect(loadOutbox().map((item) => item.id)).toEqual(["a"]);
});

test("an API that fails on two runs in a row is not sent the rest", async () => {
  keepWaiting(run("a"));
  keepWaiting(run("b"));
  keepWaiting(run("c"));
  const { fetchFn, sent } = api({ a: { status: 502 }, b: { status: 502 }, c: OK });
  await door(fetchFn);

  await waitFor(() => expect(sent).toEqual(["a", "b"]));
  expect(loadOutbox()).toHaveLength(3);
});

test("without a network the round stops at the first run", async () => {
  keepWaiting(run("a"));
  keepWaiting(run("b"));
  const { fetchFn, sent } = api({ a: new Error("offline"), b: OK });
  await door(fetchFn);

  await waitFor(() => expect(sent).toEqual(["a"]));
  expect(loadOutbox()).toHaveLength(2);
});

test("an API asking to slow down is not sent the rest", async () => {
  keepWaiting(run("a"));
  keepWaiting(run("b"));
  const { fetchFn, sent } = api({
    a: { status: 429, body: apiError("too_many_requests") },
    b: OK,
  });
  await door(fetchFn);

  await waitFor(() => expect(sent).toEqual(["a"]));
  expect(loadOutbox()).toHaveLength(2);
});

test("what waits goes when the app comes back to the front", async () => {
  keepWaiting(run("a"));
  const { fetchFn, sent } = api({ a: [new Error("offline"), OK] });
  const { result } = await door(fetchFn);
  await waitFor(() => expect(sent).toEqual(["a"]));
  expect(result.current.waiting).toBe(1);

  await act(async () => appState("background"));
  expect(sent).toEqual(["a"]);

  await act(async () => appState("active"));
  await waitFor(() => expect(result.current.waiting).toBe(0));
  expect(sent).toEqual(["a", "a"]);
  expect(loadOutbox()).toEqual([]);
});

// What the API says of a run it will never take (activities.py).
const NEVER: Answer = {
  status: 422,
  body: apiError(
    "invalid_request",
    "This run cannot be saved: the track has 1 usable positions, 2 are needed.",
  ),
};

test("a run the API will never take stays, with its reason, and is not sent again", async () => {
  keepWaiting(run("a"));
  keepWaiting(run("b"));
  const { fetchFn, sent } = api({ a: NEVER, b: OK });
  const { result } = await door(fetchFn);

  await waitFor(() => expect(result.current.refused).toHaveLength(1));
  expect(sent).toEqual(["a", "b"]);
  const [refused] = result.current.refused;
  expect(refused.id).toBe("a");
  expect(refused.message).toBe(
    "This run cannot be saved: the track has 1 usable positions, 2 are needed.",
  );
  expect(refused.startedAt).toBe(new Date(request.track[0].time_ms).toISOString());
  expect(refused.distanceM).toBeGreaterThan(0);
  // Still on the phone, and still counted.
  expect(result.current.waiting).toBe(1);
  expect(refusedOf(loadOutbox()[0])?.code).toBe("invalid_request");

  // The next round leaves it be.
  await act(async () => appState("active"));
  await act(async () => result.current.refresh());
  expect(sent).toEqual(["a", "b"]);
});

test("«Discard» takes a refused run off the phone", async () => {
  keepWaiting(run("a"));
  const { fetchFn } = api({ a: NEVER });
  const { result } = await door(fetchFn);
  await waitFor(() => expect(result.current.refused).toHaveLength(1));

  await act(async () => result.current.discard("a"));
  expect(result.current.refused).toEqual([]);
  expect(result.current.waiting).toBe(0);
  expect(loadOutbox()).toEqual([]);
});

test("«Try again» sends a refused run once more", async () => {
  keepWaiting(run("a"));
  // The account had a full list; a run deleted since makes room.
  const { fetchFn, sent } = api({ a: [NEVER, OK] });
  const { result } = await door(fetchFn);
  await waitFor(() => expect(result.current.refused).toHaveLength(1));

  await act(async () => result.current.retry("a"));
  await waitFor(() => expect(result.current.waiting).toBe(0));
  expect(sent).toEqual(["a", "a"]);
  expect(result.current.refused).toEqual([]);
});

test("a full phone is said, not emptied", async () => {
  saveOutbox(
    Array.from({ length: MAX_WAITING }, (_, n) => ({
      ...run(`run${n}`),
      refused: { code: "invalid_request", message: "…" },
    })),
  );
  const { fetchFn } = api({});
  const { result } = await door(fetchFn);
  expect(result.current.full).toBe(true);
  expect(result.current.refused).toHaveLength(MAX_WAITING);

  await act(async () => result.current.discard("run0"));
  expect(result.current.full).toBe(false);
});
