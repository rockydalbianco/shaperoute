/**
 * The post of a workout at the gym (TASK-385 part D): the yellow tile among
 * up to 10 photos (the user's «10 foto»), the form at the end of the
 * workout (the user's «Sì, anche alla fine») and «Save», which sends the
 * workout and then, once the API has it, «Show exercises» and the post.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers } from "../account/testing";
import { NOT_CHOSEN } from "../api/drawings";
import type { PickedPhotos } from "../social/composer/pickPhotos";
import { PostComposer } from "../social/composer/PostComposer";
import { type PostItem } from "../social/composer/postOrder";
import { loadDrawingOutbox } from "../social/drawingOutbox";
import { orderOnPhone } from "../social/drawingOrder";
import { photosOnPhone } from "../social/drawingPhotos";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { gymToSend, loadGymOutbox } from "./gymOutbox";
import { type GymPost, postPhotos, tileLast } from "./GymPostForm";
import { GymWorkoutHost } from "./GymWorkoutHost";
import { forgetRestQuestion } from "./restAlert";
import { forgetHeldWorkout, startGymWorkout } from "./useWorkout";

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
jest.mock("react-native-view-shot");
// The phone's picker: one photo, «P», each time.
jest.mock("../social/composer/pickPhotos", () => ({
  pickPhotos: jest.fn(async (): Promise<PickedPhotos> => ({
    kind: "picked",
    photos: [{ base64: "P", width: 1, height: 1 }],
    tooLarge: false,
  })),
}));

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const signedIn = session as Session;
const OWNER = signedIn.user.id;
const T0 = Date.UTC(2026, 10, 5, 17);
const TILE: PostItem = { kind: "drawing" };
const photoItem = (n: number): PostItem => ({ kind: "photo", n });
const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function composerPhoto(n: number) {
  return {
    n,
    source: { uri: `data:image/jpeg;base64,P${n}` },
    layout: null,
    original: null,
  };
}

test("the composer of a workout shows its tile, named Gym, and ten photos", async () => {
  const pick = jest.fn(async (): Promise<PickedPhotos> => ({
    kind: "picked",
    photos: [],
    tooLarge: false,
  }));
  const nine = ten.slice(0, 9);
  await render(
    <PostComposer
      items={[...nine.map(photoItem), TILE]}
      photos={nine.map(composerPhoto)}
      onOrder={jest.fn()}
      onAdd={jest.fn()}
      onRemove={jest.fn()}
      track={null}
      pick={pick}
      gym
    />,
  );
  expect(screen.getByTestId("tile-gym")).toBeTruthy();
  expect(screen.getByLabelText("Gym")).toBeTruthy();
  expect(screen.queryByLabelText("Drawing")).toBeNull();
  // Nine photos and the tile: room for one more.
  await fireEvent.press(screen.getByRole("button", { name: "Add photo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Choose a picture" }));
  expect(pick).toHaveBeenCalledWith("library", 1);
});

test("ten photos and the tile: no more", async () => {
  await render(
    <PostComposer
      items={[...ten.map(photoItem), TILE]}
      photos={ten.map(composerPhoto)}
      onOrder={jest.fn()}
      onAdd={jest.fn()}
      onRemove={jest.fn()}
      track={null}
      gym
    />,
  );
  expect(screen.queryByRole("button", { name: "Add photo" })).toBeNull();
});

test("the photos take the places of the post's order; the tile last needs none", () => {
  const post: GymPost = {
    choice: { ...NOT_CHOSEN, activity: "gym" },
    photos: [
      { n: 1, base64: "A" },
      { n: 2, base64: "B" },
    ],
    items: [photoItem(2), TILE, photoItem(1)],
    show: true,
  };
  expect(postPhotos(post)).toEqual({
    photos: ["B", "A"],
    order: ["photo:1", "drawing", "photo:2"],
  });
  expect(postPhotos({ ...post, items: [photoItem(1), photoItem(2), TILE] })).toEqual({
    photos: ["A", "B"],
    order: null,
  });
  // Moved first, the tile's place must go: never ordered, it is last.
  expect(postPhotos({ ...post, items: [TILE, photoItem(1), photoItem(2)] })).toEqual({
    photos: ["A", "B"],
    order: ["drawing", "photo:1", "photo:2"],
  });
  expect(tileLast([TILE, photoItem(2), photoItem(1)])).toEqual([
    photoItem(2),
    photoItem(1),
    TILE,
  ]);
  expect(postPhotos({ ...post, photos: [], items: [TILE] })).toEqual({
    photos: [],
    order: null,
  });
});

// The end of a workout, through the host as the app shows it.

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
    owner: OWNER,
    refresh: jest.fn(),
    signIn: jest.fn(),
  } as unknown as ActivitiesDoor;
}

async function ended(fetchFn: jest.Mock) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={activities()}>
        <GymWorkoutHost fetchFn={fetchFn} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => startGymWorkout());
  await fireEvent.press(screen.getByTestId("exercise-plank"));
  await fireEvent.changeText(screen.getByTestId("set-duration_s"), "60");
  await fireEvent.press(screen.getByTestId("log-set"));
  await act(async () => {
    jest.advanceTimersByTime(2 * 60_000);
  });
  await fireEvent(screen.getByLabelText("Stop"), "longPress");
  expect(screen.getByTestId("gym-end")).toBeOnTheScreen();
}

const SAVED = {
  id: "x",
  started_at: "2026-11-05T17:00:00Z",
  duration_s: 120,
  rests: 0,
  rest_s: 0,
  show_exercises: true,
  sets: [],
};

beforeEach(() => {
  files.clear();
  forgetHeldWorkout();
  forgetRestQuestion();
  jest.useFakeTimers({ now: T0 });
});

afterEach(() => {
  jest.useRealTimers();
});

test("the end of a workout has the post's form, the tile and Show exercises on", async () => {
  await ended(answers());
  expect(screen.getByText("Your post")).toBeOnTheScreen();
  expect(screen.getByTestId("tile-gym")).toBeOnTheScreen();
  expect(screen.getByRole("switch", { name: "Show exercises" })).toBeChecked();
  // A workout enters no contest, and its sport is not to choose.
  expect(screen.queryByText(/^Enter /)).toBeNull();
});

test("Save sends the workout, then hides its exercises, then its post with the photo", async () => {
  const fetchFn = answers({ status: 201, body: SAVED }, { status: 204 });
  await ended(fetchFn);
  await fireEvent.press(screen.getByRole("button", { name: "Add photo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Choose a picture" }));
  await act(async () => {});
  // The photo before the tile, as the Feed will show them.
  const labels = screen
    .getAllByLabelText(/^(Gym|Photo \d)$/)
    .map((tile) => tile.props.accessibilityLabel as string);
  expect(labels).toEqual(["Photo 1", "Gym"]);
  await fireEvent.press(screen.getByRole("radio", { name: "Everyone" }));
  await fireEvent.press(screen.getByRole("switch", { name: "Show exercises" }));
  expect(screen.getByRole("switch", { name: "Show exercises" })).not.toBeChecked();

  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  expect(screen.queryByTestId("gym-end")).toBeNull();

  const key = (fetchFn.mock.calls[0][0] as string).split("/").pop() ?? "";
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe(`http://api/me/gym-sessions/${key}/show-exercises`);
  expect(JSON.parse(init?.body as string)).toEqual({ show: false });
  // Then the post, as a run's drawing: here the network is gone, so it
  // waits in the drawings' file, with its photo on the phone.
  expect(String(fetchFn.mock.calls[2][0])).toBe(
    `http://api/me/activities/${key}/drawing`,
  );
  expect(loadDrawingOutbox()).toEqual([
    expect.objectContaining({
      owner: OWNER,
      key,
      activity: "gym",
      visibility: "everyone",
    }),
  ]);
  expect(photosOnPhone(OWNER, key)).toHaveLength(1);
  // The tile was last, as never ordered: no order to send.
  expect(orderOnPhone(OWNER, key)).toBeNull();
  expect(gymToSend(OWNER)).toEqual([]);
});

test("without a network the post waits with the workout", async () => {
  const fetchFn = answers(new Error("Network request failed"));
  await ended(fetchFn);
  await fireEvent.press(screen.getByRole("switch", { name: "Show exercises" }));
  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  expect(loadGymOutbox()).toEqual([
    expect.objectContaining({
      owner: OWNER,
      show: false,
      drawing: expect.objectContaining({ activity: "gym" }),
    }),
  ]);
  expect(loadDrawingOutbox()).toEqual([]);
});
