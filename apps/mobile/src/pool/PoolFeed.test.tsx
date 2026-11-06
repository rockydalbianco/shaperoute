/**
 * The post of a swim in a pool (TASK-400 part C, the user's «Sì, come la
 * Palestra»): in the Feed its 🏊 tile with the lengths and the pool asked
 * once of the API, the metres, the time and the pace; in the card the same
 * figures and no «Draw it near me» nor «Edit the drawing»; in the grids
 * and the search its tile.
 */
import type {
  DrawingDetail,
  FeedPost as ApiFeedPost,
  Session,
} from "@shaperoute/shared-types";
import drawingDetail from "@shaperoute/shared-types/fixtures/drawing-details.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, render, screen } from "@testing-library/react-native";

import { answers as answering, apiError } from "../account/testing";
import { FeedPost } from "../feed/FeedPost";
import { shownPost } from "../feed/feedPosts";
import { DrawingResultCard } from "../search/DrawingResultCard";
import { DrawingCard } from "../social/DrawingCard";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { isPoolLine } from "./PoolTile";
import { forgetPoolFigures } from "./usePoolFigures";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");

const fetchSpy = jest.spyOn(globalThis, "fetch");
/** The fake answers, as the global fetch takes them. */
const answers = (...list: Parameters<typeof answering>) =>
  answering(...list) as unknown as typeof fetch;

function post(id = "p1"): ApiFeedPost {
  return {
    id,
    title: "Morning lengths",
    started_at: "2026-11-06T07:00:00Z",
    published_at: "2026-11-06T08:10:00Z",
    place: null,
    shape: null,
    word: null,
    style: null,
    route_title: null,
    distance_m: 1_500,
    duration_s: 2_400,
    score: null,
    fidelity: null,
    activity: "swimming",
    track_preview: [],
    author: { public_id: "ada", username: "ada_swims" },
  } as ApiFeedPost;
}

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

async function inDoor(children: React.ReactNode) {
  await render(
    <FollowsContext.Provider value={follows()}>{children}</FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  forgetPoolFigures();
  fetchSpy.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

test("a swim without a line is a swim in a pool; one in open water is not", () => {
  expect(isPoolLine("swimming", [])).toBe(true);
  expect(isPoolLine("swimming", [[44, 12]])).toBe(false);
  expect(isPoolLine("gym", [])).toBe(false);
  expect(isPoolLine("running", [])).toBe(false);
});

test("in the Feed the tile has the lengths, the pool, the metres, the time and the pace", async () => {
  fetchSpy.mockImplementation(
    answers({ status: 200, body: { pool_length_m: 25, lengths: 60 } }),
  );
  await inDoor(<FeedPost post={shownPost(post())} width={320} onOpen={jest.fn()} />);
  const hidden = { includeHiddenElements: true };
  expect(screen.getByTestId("pool-tile", hidden)).toBeTruthy();
  expect(screen.getByTestId("pool-tile-lengths", hidden)).toHaveTextContent(
    "Lengths 60 · 25 m",
  );
  expect(screen.getByTestId("pool-tile-facts", hidden)).toHaveTextContent(
    "1500 m · 40:00",
  );
  expect(screen.getByTestId("pool-tile-pace", hidden)).toHaveTextContent(
    "Pace /100 m 2:40",
  );
  expect(String(fetchSpy.mock.calls[0][0])).toBe("http://api/drawings/p1/pool-swim");
  // No figure in the corner: there is no line.
  expect(screen.queryByTestId("feed-photo-thumb", hidden)).toBeNull();
});

test("without the figures the tile has the metres and the time alone", async () => {
  fetchSpy.mockImplementation(answers({ status: 404, body: apiError("not_found") }));
  await inDoor(
    <FeedPost post={shownPost(post("p2"))} width={320} onOpen={jest.fn()} />,
  );
  const hidden = { includeHiddenElements: true };
  expect(screen.getByTestId("pool-tile-facts", hidden)).toHaveTextContent(
    "1500 m · 40:00",
  );
  expect(screen.queryByTestId("pool-tile-lengths", hidden)).toBeNull();
});

test("a swim in open water asks for no figures and keeps its map", async () => {
  await inDoor(
    <FeedPost
      post={shownPost({
        ...post("o1"),
        track_preview: [
          [44, 12],
          [44.001, 12.001],
        ],
      })}
      width={320}
      onOpen={jest.fn()}
    />,
  );
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(screen.queryByTestId("pool-tile", { includeHiddenElements: true })).toBeNull();
});

test("the card has the lengths and the pace, no «Draw it near me» nor «Edit»", async () => {
  fetchSpy.mockImplementation(
    answers({ status: 200, body: { pool_length_m: 50, lengths: 30 } }),
  );
  const drawing = {
    ...(drawingDetail as unknown as DrawingDetail),
    id: "p3",
    activity: "swimming",
    track: [],
    distance_m: 1_500,
    duration_s: 1_800,
  } as DrawingDetail;
  await inDoor(
    <DrawingCard
      drawing={drawing}
      onBack={jest.fn()}
      onDrawAgain={jest.fn()}
      onEditDrawing={jest.fn()}
    />,
  );
  expect(screen.getByText("Lengths: 30 × 50 m")).toBeTruthy();
  expect(screen.getByText("Pace /100 m: 2:00")).toBeTruthy();
  expect(screen.queryByText("Draw it near me")).toBeNull();
  expect(screen.queryByText("Edit the drawing")).toBeNull();
});

test("found in the search, its tile in place of the line", async () => {
  await inDoor(
    <DrawingResultCard
      title="Morning lengths"
      author="ada_swims"
      distanceM={1_500}
      line={[]}
      activity="swimming"
      width={160}
      onPress={jest.fn()}
    />,
  );
  expect(screen.getByTestId("pool-tile", { includeHiddenElements: true })).toBeTruthy();
});
