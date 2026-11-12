import { render, screen, within } from "@testing-library/react-native";

import { forgetFeedMaps } from "../feed/FeedMaps";
import { forgetExamples } from "./exampleRoutes";
import { ExploreScreen } from "./ExploreScreen";
import type { RecommendedRoute } from "./recommendedRoutes";

/**
 * A word of the catalogue written letter by letter (TASK-441, ADR-0366): the
 * API says where the pen is up (`gaps`, as
 * packages/shared-types/fixtures/recommended-routes-pen-up.json), and the
 * card of «Explore» draws no line there.
 */

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const fetchMock = jest.spyOn(globalThis, "fetch");

/** "GO" at Trento: five points of G, five of O. */
const word: RecommendedRoute = {
  id: "trento-go-6000-0",
  city: "trento",
  shape: null,
  word: "GO",
  style: "round",
  distance_m: 6000,
  route_m: 6900,
  similarity: 0.95,
  start: [46.067, 11.1215],
  away_m: 0,
  preview: [
    [46.067, 11.1215],
    [46.068, 11.1215],
    [46.068, 11.1225],
    [46.067, 11.1225],
    [46.0675, 11.122],
    [46.067, 11.124],
    [46.068, 11.124],
    [46.068, 11.125],
    [46.067, 11.125],
    [46.0675, 11.1245],
  ],
  rotation_deg: 0,
  gaps: [5],
};

beforeEach(() => {
  fetchMock.mockReset();
  forgetExamples();
  forgetFeedMaps();
});

async function stretchesOf(route: RecommendedRoute): Promise<number> {
  fetchMock.mockImplementation(() =>
    Promise.resolve(Response.json({ routes: [route] })),
  );
  await render(
    <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={jest.fn()} />,
  );
  const title = await screen.findByText("GO · 6.9 km");
  expect(title).toBeOnTheScreen();
  const [first] = screen.getAllByTestId("route-card");
  // The stretches of the line, and the badge of the likeness over them.
  return within(first).getByTestId("route-card-drawing").children.length - 1;
}

test("the card of a word in pieces draws no line between its letters", async () => {
  // Ten points, nine stretches: the one that comes to O is not drawn.
  expect(await stretchesOf(word)).toBe(8);
});

test("a word in one line is drawn whole, as before", async () => {
  const { gaps: _, ...oneLine } = word;
  expect(await stretchesOf(oneLine)).toBe(9);
});
