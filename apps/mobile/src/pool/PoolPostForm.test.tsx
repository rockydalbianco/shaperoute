/**
 * The post of a swim in a pool at its end (TASK-400 part C, the user's «Sì,
 * come la Palestra»): the composer with the 🏊 tile and ten photos, a swim
 * alone and no contest; «Save» sends the swim, then its post with its
 * photo, as a run's drawing; without a network the post waits with the
 * swim.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers } from "../account/testing";
import type { PickedPhotos } from "../social/composer/pickPhotos";
import { PostComposer } from "../social/composer/PostComposer";
import type { PostItem } from "../social/composer/postOrder";
import { loadDrawingOutbox } from "../social/drawingOutbox";
import { orderOnPhone } from "../social/drawingOrder";
import { photosOnPhone } from "../social/drawingPhotos";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { loadPoolOutbox, poolToSend } from "./poolOutbox";
import { newPoolPost, poolPostPhotos } from "./PoolPostForm";
import { PoolSwimHost } from "./PoolSwimHost";
import { forgetHeldPoolSwim, startPoolSwim } from "./usePoolSwim";

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
const T0 = Date.UTC(2026, 10, 6, 7);
const TILE: PostItem = { kind: "drawing" };
const photoItem = (n: number): PostItem => ({ kind: "photo", n });
const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const SAVED = {
  id: "x",
  started_at: new Date(T0).toISOString(),
  duration_s: 1800,
  distance_m: 1000,
  pool_length_m: 25,
  lengths: 40,
};

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
        <PoolSwimHost fetchFn={fetchFn} health={null} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => startPoolSwim(25));
  await act(async () => {
    jest.advanceTimersByTime(30 * 60_000);
  });
  await fireEvent(screen.getByLabelText("Stop"), "longPress");
  expect(screen.getByTestId("pool-end")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId("pool-lengths"), "40");
}

beforeEach(() => {
  files.clear();
  forgetHeldPoolSwim();
  jest.useFakeTimers({ now: T0 });
});

afterEach(() => {
  jest.useRealTimers();
});

test("the composer of a swim in a pool shows its tile, named Pool swim, and ten photos", async () => {
  await render(
    <PostComposer
      items={[...ten.map(photoItem), TILE]}
      photos={ten.map((n) => ({
        n,
        source: { uri: `data:image/jpeg;base64,P${n}` },
        layout: null,
        original: null,
      }))}
      onOrder={jest.fn()}
      onAdd={jest.fn()}
      onRemove={jest.fn()}
      track={null}
      pool
    />,
  );
  expect(screen.getByTestId("tile-pool")).toBeTruthy();
  expect(screen.getByLabelText("Pool swim")).toBeTruthy();
  expect(screen.queryByLabelText("Drawing")).toBeNull();
  // Ten photos and the tile: no more.
  expect(screen.queryByRole("button", { name: "Add photo" })).toBeNull();
});

test("the photos take the places of the post's order; the tile last needs none", () => {
  const post = {
    ...newPoolPost(OWNER),
    photos: [
      { n: 1, base64: "A" },
      { n: 2, base64: "B" },
    ],
  };
  expect(post.choice.activity).toBe("swimming");
  expect(
    poolPostPhotos({ ...post, items: [photoItem(1), photoItem(2), TILE] }),
  ).toEqual({
    photos: ["A", "B"],
    order: null,
  });
  expect(
    poolPostPhotos({ ...post, items: [TILE, photoItem(2), photoItem(1)] }),
  ).toEqual({
    photos: ["B", "A"],
    order: ["drawing", "photo:1", "photo:2"],
  });
});

test("the end of a swim has the post's form: the tile, a swim alone, no contest", async () => {
  await ended(answers());
  expect(screen.getByText("Your post")).toBeOnTheScreen();
  expect(screen.getByTestId("tile-pool")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Swim" })).toBeTruthy();
  expect(screen.queryByRole("radio", { name: "Run" })).toBeNull();
  expect(screen.queryByText(/^Enter /)).toBeNull();
});

test("Save sends the swim, then its post with the photo", async () => {
  const fetchFn = answers({ status: 201, body: SAVED });
  await ended(fetchFn);
  await fireEvent.press(screen.getByRole("button", { name: "Add photo" }));
  await fireEvent.press(screen.getByRole("button", { name: "Choose a picture" }));
  await act(async () => {});
  // The photo before the tile, as the Feed will show them.
  const labels = screen
    .getAllByLabelText(/^(Pool swim|Photo \d)$/)
    .map((tile) => tile.props.accessibilityLabel as string);
  expect(labels).toEqual(["Photo 1", "Pool swim"]);
  await fireEvent.press(screen.getByRole("radio", { name: "Everyone" }));

  await fireEvent.press(screen.getByTestId("pool-save"));
  await act(async () => {});
  expect(screen.queryByTestId("pool-end")).toBeNull();

  const key = (fetchFn.mock.calls[0][0] as string).split("/").pop() ?? "";
  expect(String(fetchFn.mock.calls[0][0])).toBe(`http://api/me/pool-swims/${key}`);
  // Then the post, as a run's drawing: here the network is gone, so it
  // waits in the drawings' file, with its photo on the phone.
  expect(String(fetchFn.mock.calls[1][0])).toBe(
    `http://api/me/activities/${key}/drawing`,
  );
  expect(loadDrawingOutbox()).toEqual([
    expect.objectContaining({
      owner: OWNER,
      key,
      activity: "swimming",
      visibility: "everyone",
    }),
  ]);
  expect(photosOnPhone(OWNER, key)).toHaveLength(1);
  expect(orderOnPhone(OWNER, key)).toBeNull();
  expect(poolToSend(OWNER)).toEqual([]);
});

test("without a network the post waits with the swim", async () => {
  const fetchFn = answers(new Error("Network request failed"));
  await ended(fetchFn);
  await fireEvent.press(screen.getByTestId("pool-save"));
  await act(async () => {});
  expect(loadPoolOutbox()).toEqual([
    expect.objectContaining({
      owner: OWNER,
      drawing: expect.objectContaining({ activity: "swimming" }),
    }),
  ]);
  expect(loadDrawingOutbox()).toEqual([]);
});
