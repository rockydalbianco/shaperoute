import activities from "@shaperoute/shared-types/fixtures/activities.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { renderHook, waitFor } from "@testing-library/react-native";

import type { Account } from "../account/useAccount";
import type { ActivityRequest } from "../api/activities";
import { NO_BODY } from "../body/bodyProfile";
import { activeKcal } from "../body/energy";
import { useActivitiesOf } from "./activitiesDoor";
import { keepWaiting, type Waiting } from "./outbox";

// The figures of a post (TASK-410 part C): once the API has taken a run,
// the door sends its profile and its calories, counted on this phone.

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

type Call = { method: string; path: string; body: unknown };

/** A fetch that takes the runs as `status` says, the figures with a yes,
 * and lists the fixture; the calls, in order. */
function api(status = 200) {
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
    if (method === "PUT") {
      return status === 200
        ? Response.json(activities.activities[0], { status })
        : Response.json(
            { error: { code: "invalid_request", message: "No." } },
            { status },
          );
    }
    return Response.json(activities, { status: 200 });
  });
  return { fetchFn, calls };
}

async function door(fetchFn: jest.Mock) {
  const account_ = account();
  return renderHook(() =>
    useActivitiesOf(URL, account_, doors, { fetchFn, key: null }),
  );
}

const SAVED = activities.activities[0];

beforeEach(() => files.clear());

test("after the run, its figures go to its key", async () => {
  keepWaiting({
    id: "a",
    owner: OWNER,
    request: request as ActivityRequest,
  } as Waiting);
  const { fetchFn, calls } = api();
  await door(fetchFn);
  await waitFor(() =>
    expect(calls.map((c) => `${c.method} ${c.path}`)).toContain(
      "PUT /me/activities/a/stats",
    ),
  );
  const paths = calls.filter((c) => c.method === "PUT").map((c) => c.path);
  expect(paths).toEqual(["/me/activities/a", "/me/activities/a/stats"]);
  // The example has no heights: the calories alone, from the metres and
  // seconds the API counted, with the body of this phone (none set here).
  const sent = calls.find((c) => c.path.endsWith("/stats"))?.body;
  expect(sent).toEqual({
    elevation: null,
    cadence_spm: null,
    kcal: activeKcal(
      {
        activity: "running",
        metres: SAVED.distance_m,
        seconds: SAVED.duration_s,
        climbM: null,
      },
      NO_BODY,
      new Date().getFullYear(),
    ),
  });
});

test("a run the API did not take sends no figures", async () => {
  keepWaiting({
    id: "a",
    owner: OWNER,
    request: request as ActivityRequest,
  } as Waiting);
  const { fetchFn, calls } = api(422);
  await door(fetchFn);
  await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
  expect(calls.some((c) => c.path.endsWith("/stats"))).toBe(false);
});
