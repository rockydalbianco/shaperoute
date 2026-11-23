/**
 * «Share live» on a swim in a pool (TASK-424 part B2): the button of the
 * runs, the sheet that says what this page shows (no map), the link made
 * with the pool, updates with the lengths and no points, and `finished`
 * when the swim's screen goes.
 */
import type { LiveUpdate, Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";

import { answers } from "../account/testing";
import { resetLiveShare } from "../liveShare/liveShareStore";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { newPoolSwim, type PoolSwim } from "./poolSwim";
import { PoolSwimScreen } from "./PoolSwimScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: ({ visible, children }: { visible?: boolean; children?: unknown }) =>
    visible === true ? children : null,
}));
jest.mock("expo-file-system", () => {
  class File {
    get exists(): boolean {
      return false;
    }
    create(): void {}
    write(): void {}
    textSync(): string {
      return "";
    }
    delete(): void {}
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const API = "http://api";
const CREATED = {
  status: 201,
  body: {
    id: "s1",
    url: "https://getmuw.app/live/#AbCdEfGhIjKlMnOpQrStUv",
    expires_at: "2026-11-11T07:00:00Z",
  },
};
const LIVE = {
  status: 200,
  body: { id: "s1", status: "live", expires_at: "2026-11-11T07:00:00Z" },
};

function follows(): FollowsDoor {
  return {
    apiUrl: API,
    account: {
      state: { status: "signedIn", session: session as Session },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

function updates(fetchFn: ReturnType<typeof answers>): LiveUpdate[] {
  return fetchFn.mock.calls
    .filter(([url]) => url.endsWith("/updates"))
    .map(([, init]) => JSON.parse(String(init?.body)) as LiveUpdate);
}

async function show(swim: PoolSwim, fetchFn: ReturnType<typeof answers>) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <PoolSwimScreen
        swim={swim}
        nowMs={Date.now()}
        fetchFn={fetchFn as unknown as typeof fetch}
        apiKey={null}
      />
    </FollowsContext.Provider>,
  );
}

beforeEach(() => {
  resetLiveShare();
  jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
});

afterEach(() => {
  resetLiveShare();
  jest.restoreAllMocks();
});

test("the sheet says what the page of a swim shows: no map, no route", async () => {
  const fetchFn = answers();
  await show(newPoolSwim("k", 25, Date.now()), fetchFn);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  expect(screen.getByText(/time, lengths or exercise, calories/)).toBeTruthy();
  expect(screen.getByText(/your heart rate when a watch sends it/)).toBeTruthy();
  expect(screen.queryByText(/position on the map/)).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("the link names the pool; the updates carry the lengths and no points; the end `finished`", async () => {
  const fetchFn = answers(CREATED, LIVE, LIVE);
  // Ten minutes in a 25 m pool at 2:00 /100 m: 20 lengths.
  await show(newPoolSwim("k", 25, Date.now() - 600_000), fetchFn);
  await fireEvent.press(screen.getByRole("button", { name: "Share live" }));
  await fireEvent.press(screen.getByRole("button", { name: "Share link" }));
  await act(async () => {});
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/me/live-shares`);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
    activity: "swimming",
    pool_length_m: 25,
  });
  const [first] = updates(fetchFn);
  expect(first.points).toEqual([]);
  expect(first.state).toBe("live");
  expect(first.stats).toMatchObject({ lengths: 20, heart_bpm: null });
  expect(first.stats.duration_s).toBeGreaterThanOrEqual(600);
  expect(first.stats.kcal).toBeGreaterThan(0);
  expect(first.stats).not.toHaveProperty("distance_m");
  expect(screen.getByRole("button", { name: "Sharing live" })).toBeTruthy();
  await screen.unmount();
  await act(async () => {});
  expect(updates(fetchFn)[1].state).toBe("finished");
});
