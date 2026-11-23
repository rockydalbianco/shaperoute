/**
 * «Share» on a workout at the gym (TASK-385 part D, the user's «Prima
 * foto, se no riquadro» and «Azioni tolte»): the picture is its yellow
 * tile with the main exercises; no results, emoji, video nor Strava.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Sharing from "expo-sharing";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

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
const capture = jest.mocked(captureRef);
const fetchSpy = jest.spyOn(globalThis, "fetch");
/** The fake answers, as the global fetch takes them. */
const answers = (...list: Parameters<typeof answering>) =>
  answering(...list) as unknown as typeof fetch;

const WORKOUT: PostRun = {
  key: "key12345",
  title: null,
  track: [],
  distanceM: 0,
  durationMs: 3_600_000,
  activity: "gym",
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

async function show() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <FollowsContext.Provider value={follows()}>
        <WithDoor>
          <SharePost run={WORKOUT} onClose={jest.fn()} />
        </WithDoor>
      </FollowsContext.Provider>
    </SafeAreaProvider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  share.mockClear();
  capture.mockClear();
  keepPost.mockClear();
  fetchSpy.mockReset();
  fetchSpy.mockImplementation(
    answers({
      status: 200,
      body: {
        id: "key12345",
        started_at: "2026-11-05T17:00:00Z",
        duration_s: 3600,
        rests: 0,
        rest_s: 0,
        show_exercises: true,
        sets: [
          {
            exercise: "bench_press",
            kind: "load",
            reps: 5,
            load_kg: 80,
            at_s: 0,
            live: true,
          },
        ],
      },
    }),
  );
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("the picture is the tile, with the main exercises", async () => {
  await show();
  expect(screen.getByTestId("gym-share-picture")).toBeTruthy();
  expect(screen.queryByTestId("post-image")).toBeNull();
  expect(
    screen.getByTestId("gym-tile-exercises", { includeHiddenElements: true }),
  ).toHaveTextContent("Bench press");
  expect(String(fetchSpy.mock.calls[0][0])).toBe("http://api/me/gym-sessions/key12345");
});

test("none of a run's: results, emoji, video, Strava", async () => {
  await show();
  for (const words of ["Results", "Add emoji", "Export video", "Style", "Music"]) {
    expect(screen.queryByText(words)).toBeNull();
  }
  expect(screen.queryByText(/Strava/)).toBeNull();
  expect(screen.getByText("Share")).toBeTruthy();
});

test("Instagram shares the tile; nothing of a run's post is kept", async () => {
  await show();
  await fireEvent.press(screen.getByRole("button", { name: "Instagram" }));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(capture).toHaveBeenCalledTimes(1);
  expect(keepPost).not.toHaveBeenCalled();
});
