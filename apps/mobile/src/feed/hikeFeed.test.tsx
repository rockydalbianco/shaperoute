/**
 * A hike in the Feed and opened (TASK-377 part A): the app has its profile
 * before «Settings» offers it, and says `hiking` in X-MuW-Reads, so a hike
 * another app saved shows as a post like a walk: its sport named, its
 * energy counted on foot, and what is done with a route, which it has.
 */
import drawing from "@shaperoute/shared-types/fixtures/drawing.json";
import type { DrawingDetail, FeedPost as ApiFeedPost } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { isOnSnow, routeActivity } from "../activities/snow";
import { readsHeaders } from "../api/reads";
import { SEARCH_ACTIVITIES } from "../search/searchFilters";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { DrawingCard } from "../social/DrawingCard";
import { activityName } from "../social/PublicParts";
import { runnable } from "../social/drawingRoute";
import { ActionBar } from "./ActionBar";
import { DrawAgainContext } from "./drawAgainDoor";
import { postFacts } from "./FeedPost";
import { shownPost } from "./feedPosts";
import { postEnergy } from "./postEnergy";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const HIKE = {
  id: "d1",
  title: "Lagorai",
  started_at: "2026-11-08T08:00:00Z",
  published_at: "2026-11-08T15:00:00Z",
  place: "Cavalese",
  shape: "star",
  word: null,
  style: null,
  route_title: null,
  distance_m: 12_000,
  duration_s: 14_400,
  score: 80,
  fidelity: null,
  activity: "hiking",
  track_preview: [
    [46.29, 11.46],
    [46.3, 11.47],
  ],
  author: { public_id: "ada", username: "ada_hikes" },
} as ApiFeedPost;

const DOOR = {
  apiUrl: "http://api.test",
  account: {
    state: {
      status: "signedIn",
      session: { token: "t", user: { id: "u", public_id: "other" } },
    },
    sessionEnded: () => {},
  },
} as unknown as FollowsDoor;

test("a hike is read, named, and not offered yet", () => {
  expect(readsHeaders()["X-MuW-Reads"].split(",")).toContain("hiking");
  expect(activityName("hiking")).toBe("Hike");
  expect(SEARCH_ACTIVITIES).not.toContain("hiking");
  expect(isOnSnow("hiking")).toBe(false);
  expect(routeActivity("hiking")).toBe("hiking");
});

test("a post of a hike says its sport and its energy on foot", () => {
  const shown = shownPost(HIKE);
  expect(postFacts(shown).startsWith("Hike · ")).toBe(true);
  expect(postEnergy(shown)).not.toBeNull();
});

test("the Feed's card of a hike has the actions of a route", async () => {
  await render(
    <FollowsContext.Provider value={DOOR}>
      <DrawAgainContext.Provider value={() => jest.fn()}>
        <ActionBar post={shownPost(HIKE)} onOpen={jest.fn()} />
      </DrawAgainContext.Provider>
    </FollowsContext.Provider>,
  );
  expect(screen.getByRole("button", { name: "Comments" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Reactions" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Draw it near me" })).toBeOnTheScreen();
});

test("a hike opened shows as a route to follow", async () => {
  const hike = { ...(drawing as DrawingDetail), activity: "hiking" as const };
  expect(runnable(hike)).toBe(true);
  await render(
    <DrawingCard
      drawing={hike}
      onBack={jest.fn()}
      onStart={jest.fn()}
      onDrawAgain={jest.fn()}
      onEditDrawing={jest.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Start" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Export GPX" })).toBeOnTheScreen();
});
