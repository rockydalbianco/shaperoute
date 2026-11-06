/**
 * «Share» on a swim in a pool (TASK-400 part C): the picture is its yellow
 * tile with the metres, the time, the pace and, for its owner, the lengths
 * and the pool; no results, emoji, video nor Strava, as a workout's.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Sharing from "expo-sharing";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { answers as answering } from "../account/testing";
import { ActivitiesContext, useActivitiesDoor } from "../activities/activitiesDoor";
import type { PostRun } from "../share/postRun";
import { SharePost } from "../share/SharePost";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";

jest.mock("expo-file-system");
jest.mock("react-native-view-shot");
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => {}),
}));

const share = jest.mocked(Sharing.shareAsync);
const fetchSpy = jest.spyOn(globalThis, "fetch");
const answers = (...list: Parameters<typeof answering>) =>
  answering(...list) as unknown as typeof fetch;

const SWIM: PostRun = {
  key: "poolkey12345",
  title: null,
  track: [],
  distanceM: 1_500,
  durationMs: 2_400_000,
  activity: "swimming",
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const keepPost = jest.fn();

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: session as Session },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

function WithDoor({ children }: { children: ReactNode }) {
  const nothing = useActivitiesDoor();
  return (
    <ActivitiesContext.Provider value={{ ...nothing, keepPost }}>
      {children}
    </ActivitiesContext.Provider>
  );
}

async function show(run: PostRun = SWIM) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <FollowsContext.Provider value={follows()}>
        <WithDoor>
          <SharePost run={run} onClose={jest.fn()} />
        </WithDoor>
      </FollowsContext.Provider>
    </SafeAreaProvider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  share.mockClear();
  keepPost.mockClear();
  fetchSpy.mockReset();
  fetchSpy.mockImplementation(
    answers({
      status: 200,
      body: {
        id: "poolkey12345",
        started_at: "2026-11-06T07:00:00Z",
        duration_s: 2400,
        distance_m: 1500,
        pool_length_m: 25,
        lengths: 60,
      },
    }),
  );
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("the picture is the tile, with the lengths for its owner", async () => {
  await show();
  const hidden = { includeHiddenElements: true };
  expect(screen.getByTestId("pool-share-picture")).toBeTruthy();
  expect(screen.queryByTestId("post-image")).toBeNull();
  expect(screen.getByTestId("pool-tile-lengths", hidden)).toHaveTextContent(
    "Lengths 60 · 25 m",
  );
  expect(screen.getByTestId("pool-tile-pace", hidden)).toHaveTextContent(
    "Pace /100 m 2:40",
  );
  expect(String(fetchSpy.mock.calls[0][0])).toBe(
    "http://api/me/pool-swims/poolkey12345",
  );
});

test("from the Feed, without a key, the tile has no lengths and nothing is asked", async () => {
  await show({ ...SWIM, key: null });
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(
    screen.getByTestId("pool-tile-facts", { includeHiddenElements: true }),
  ).toHaveTextContent("1500 m · 40:00");
});

test("none of a run's: results, emoji, video, Strava; nothing of a run's kept", async () => {
  await show();
  for (const words of ["Results", "Add emoji", "Export video", "Style", "Music"]) {
    expect(screen.queryByText(words)).toBeNull();
  }
  expect(screen.queryByText(/Strava/)).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Instagram" }));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(keepPost).not.toHaveBeenCalled();
});
