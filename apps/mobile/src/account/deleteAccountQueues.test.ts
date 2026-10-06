import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { keepWaiting, loadOutbox, type Waiting } from "../activities/outbox";
import type { ActivityRequest } from "../api/activities";
import { keepForDrawing, loadDrawingOutbox } from "../social/drawingOutbox";
import { keepForStrava, loadStravaOutbox } from "../strava/stravaOutbox";
import { answers, type MemorySecureStore } from "./testing";
import { useAccount } from "./useAccount";

// «Delete account» takes with it what waited on the phone for that account
// (TASK-252): only with the API's yes, and nothing of anybody else's.

jest.mock("expo-secure-store", () =>
  jest.requireActual<typeof import("./testing")>("./testing").memorySecureStore(),
);

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
const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const URL = "http://api";
const MINE = session.user.id;
const OTHER = MINE + 1;

function run(id: string, owner: number): Waiting {
  return { id, owner, request: request as ActivityRequest };
}

function fill(): void {
  for (const owner of [MINE, OTHER]) {
    keepWaiting(run("a", owner));
    keepWaiting(run("b", owner));
    keepForStrava({ owner, key: "a", name: null });
    keepForDrawing({
      owner,
      key: "a",
      title: "Heart",
      description: null,
      activity: "running",
      tags: [],
      visibility: "everyone",
    });
  }
}

function owners(): { runs: number[]; strava: number[]; drawings: number[] } {
  return {
    runs: loadOutbox().map((item) => item.owner),
    strava: loadStravaOutbox().map((item) => item.owner),
    drawings: loadDrawingOutbox().map((item) => item.owner),
  };
}

function account(fetchFn: jest.Mock) {
  return renderHook(() => useAccount(URL, { fetchFn, key: null }));
}

beforeEach(() => {
  files.clear();
  store.kept.clear();
  store.kept.set("shaperoute.session", JSON.stringify(session));
});

test("an account deleted takes its waiting runs, Strava and «Public» with it, and nobody else's", async () => {
  fill();
  const fetchFn = answers({ status: 200, body: session.user }, { status: 204 });
  const { result } = await account(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

  await act(async () => result.current.deleteAccount());
  await waitFor(() =>
    expect(result.current.state).toEqual({ status: "signedOut", notice: "deleted" }),
  );
  expect(owners()).toEqual({
    runs: [OTHER, OTHER],
    strava: [OTHER],
    drawings: [OTHER],
  });
});

test("an account the API did not delete keeps everything that waits", async () => {
  fill();
  const fetchFn = answers(
    { status: 200, body: session.user },
    new Error("Network request failed"),
  );
  const { result } = await account(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

  await act(async () => result.current.deleteAccount());
  await waitFor(() => expect(result.current.problem).not.toBeNull());
  expect(result.current.state.status).toBe("signedIn");
  expect(owners()).toEqual({
    runs: [MINE, MINE, OTHER, OTHER],
    strava: [MINE, OTHER],
    drawings: [MINE, OTHER],
  });
});

test("logging out keeps what waits: the same account sends it when it is back", async () => {
  fill();
  const fetchFn = answers({ status: 200, body: session.user }, { status: 204 });
  const { result } = await account(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

  await act(async () => result.current.signOut());
  expect(result.current.state.status).toBe("signedOut");
  expect(owners().runs).toEqual([MINE, MINE, OTHER, OTHER]);
});
