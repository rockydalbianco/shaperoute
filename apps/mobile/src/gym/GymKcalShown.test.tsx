/**
 * The energy of a workout at the gym on the screens (TASK-385 part C,
 * ADR-0327, the user's «Stima MET sempre»): while it goes, at its end, on
 * its tile and its facts in the Feed, and written to the phone's health
 * data with «Save». Whoever hides the exercises shows no energy (the
 * user's «Niente kcal», 2026-11-06). With no body, 60 minutes of weights
 * are 184 kcal and 10 minutes 31 (gymKcal.test.ts).
 */
import type { FeedPost as ApiFeedPost, Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers as answering, apiError } from "../account/testing";
import { FeedPost } from "../feed/FeedPost";
import { shownPost } from "../feed/feedPosts";
import type { HealthPhone } from "../health/healthPhone";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymEnd } from "./GymEnd";
import { GymWorkoutHost } from "./GymWorkoutHost";
import { forgetGymExercises } from "./useGymExercises";
import { forgetHeldWorkout, startGymWorkout } from "./useWorkout";
import { chooseExercise, finishWorkout, logSet, newWorkout } from "./workout";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
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
jest.mock("../health/healthChoice", () => ({
  ...jest.requireActual("../health/healthChoice"),
  loadHealthOn: () => true,
}));

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const signedIn = session as Session;
const T0 = Date.UTC(2026, 10, 6, 17);
const MIN = 60_000;
const fetchSpy = jest.spyOn(globalThis, "fetch");

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: signedIn },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

function activities(): ActivitiesDoor {
  return {
    signedIn: true,
    owner: signedIn.user.id,
    refresh: jest.fn(),
    signIn: jest.fn(),
  } as unknown as ActivitiesDoor;
}

async function within(children: React.ReactNode) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={activities()}>
        {children}
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  files.clear();
  forgetHeldWorkout();
  forgetGymExercises();
  fetchSpy.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("the energy goes up while the workout goes, and stays at its end", async () => {
  jest.useFakeTimers({ now: T0 });
  await within(<GymWorkoutHost />);
  await act(async () => startGymWorkout());
  await fireEvent.press(screen.getByTestId("exercise-bench_press"));
  await act(async () => {
    jest.advanceTimersByTime(10 * MIN);
  });
  expect(screen.getByTestId("gym-kcal")).toHaveTextContent("31 kcal");
  await fireEvent(screen.getByLabelText("Stop"), "longPress");
  expect(screen.getByTestId("gym-end-kcal")).toHaveTextContent("31 kcal");
});

test("«Save» writes the workout to the phone's health data", async () => {
  let workout = newWorkout("gymkey12345", T0);
  workout = chooseExercise(workout, { exercise: "bench_press", kind: "load" }, T0);
  workout = logSet(workout, { reps: 8, load_kg: 60 }, T0 + MIN)!;
  workout = finishWorkout(workout, T0 + 60 * MIN);
  const write = jest.fn(async () => true);
  const phone: HealthPhone = {
    store: "apple",
    available: async () => true,
    permission: async () => "allowed",
    ask: async () => {},
    write,
  };
  await within(<GymEnd workout={workout} onSave={() => "kept"} health={phone} />);
  expect(screen.getByTestId("gym-end-kcal")).toHaveTextContent("184 kcal");
  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  expect(write).toHaveBeenCalledWith(
    expect.objectContaining({ activity: "gym", kcal: 184, distanceM: 0 }),
  );
});

function post(id: string): ApiFeedPost {
  return {
    id,
    title: "Push day",
    started_at: "2026-11-05T17:00:00Z",
    published_at: "2026-11-05T18:10:00Z",
    place: null,
    shape: null,
    word: null,
    style: null,
    route_title: null,
    distance_m: 0,
    duration_s: 3_600,
    score: null,
    fidelity: null,
    activity: "gym",
    track_preview: [],
    author: { public_id: "ada", username: "ada_lifts" },
  } as ApiFeedPost;
}

const answers = (...list: Parameters<typeof answering>) =>
  answering(...list) as unknown as typeof fetch;

async function showPost(id: string) {
  await within(<FeedPost post={shownPost(post(id))} width={320} onOpen={jest.fn()} />);
}

test("a post with its exercises shows its energy on the tile and in its facts", async () => {
  fetchSpy.mockImplementation(
    answers({
      status: 200,
      body: {
        rests: 0,
        rest_s: 0,
        sets: [
          {
            exercise: "bench_press",
            kind: "load",
            reps: 5,
            load_kg: 60,
            at_s: 0,
            live: true,
          },
        ],
      },
    }),
  );
  await showPost("g1");
  expect(
    screen.getByTestId("gym-tile-kcal", { includeHiddenElements: true }),
  ).toHaveTextContent("184 kcal");
  expect(
    screen.getAllByText(/· 184 kcal/, { includeHiddenElements: true }).length,
  ).toBeGreaterThan(0);
});

test("a post whose exercises are hidden shows no energy", async () => {
  fetchSpy.mockImplementation(answers({ status: 404, body: apiError("not_found") }));
  await showPost("g2");
  expect(
    screen.queryByTestId("gym-tile-kcal", { includeHiddenElements: true }),
  ).toBeNull();
  expect(screen.queryAllByText(/kcal/, { includeHiddenElements: true })).toHaveLength(
    0,
  );
});
