import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { loadSession } from "../account/sessionStore";
import { forgetFeedMaps } from "../feed/FeedMaps";
import { forgetExamples } from "./exampleRoutes";
import { ExploreScreen } from "./ExploreScreen";
import type { RecommendedRoute } from "./recommendedRoutes";

/**
 * «Recommended» in «Explore» (TASK-092): a row above the routes near the
 * start, only with an account; a tap opens the route as any other card.
 */

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../account/sessionStore", () => ({
  loadSession: jest.fn(),
}));

const fetchMock = jest.spyOn(globalThis, "fetch");
const session = jest.mocked(loadSession);
const routes = list.routes as RecommendedRoute[];
// The API recommends the last of the list first.
const recommended = [routes[routes.length - 1]];

beforeEach(() => {
  fetchMock.mockReset();
  session.mockReset();
  forgetExamples();
  forgetFeedMaps();
  fetchMock.mockImplementation((input) =>
    Promise.resolve(
      Response.json(
        String(input).includes("/recommended?") ? { routes: recommended } : list,
      ),
    ),
  );
});

function signedIn() {
  session.mockReturnValue({
    token: "tok",
    user: { username: "ann" },
  } as ReturnType<typeof loadSession>);
}

function asked(path: string): string[] {
  return fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((u) => u.includes(path));
}

test("signed in: the row of the recommended routes, which open as the others", async () => {
  signedIn();
  const onOpen = jest.fn();
  await render(
    <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={onOpen} />,
  );
  const label = await screen.findByText("RECOMMENDED");
  expect(label).toBeOnTheScreen();
  expect(asked("/recommended?")).toHaveLength(1);
  // Above the routes near the start.
  const order = screen.getAllByText(/./).map((node) => String(node.props.children));
  expect(order.indexOf("RECOMMENDED")).toBeLessThan(order.indexOf("Star · 5.1 km"));
  // The same card as below: its title, twice on the page.
  const cards = screen.getAllByText("CIAO · 15.2 km");
  expect(cards.length).toBe(2);
  await fireEvent.press(cards[0]);
  expect(onOpen).toHaveBeenCalledWith(recommended[0]);
});

test("signed out: no row, and the row is not asked", async () => {
  session.mockReturnValue(null);
  await render(
    <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={jest.fn()} />,
  );
  expect(await screen.findByText("Star · 5.1 km")).toBeOnTheScreen();
  expect(screen.queryByText("RECOMMENDED")).toBeNull();
  expect(asked("/recommended?")).toHaveLength(0);
});

test("no catalogue near: no row, and the row is not asked", async () => {
  signedIn();
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({ routes: [] })));
  await render(
    <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={jest.fn()} />,
  );
  expect(await screen.findByText(/No recommended routes near this start/)).toBeTruthy();
  expect(screen.queryByText("RECOMMENDED")).toBeNull();
  expect(asked("/recommended?")).toHaveLength(0);
});

test("the row fails: the routes near the start are there as before", async () => {
  signedIn();
  fetchMock.mockImplementation((input) =>
    String(input).includes("/recommended?")
      ? Promise.reject(new TypeError("Network request failed"))
      : Promise.resolve(Response.json(list)),
  );
  await render(
    <ExploreScreen apiUrl="http://api" near={[46.067, 11.1215]} onOpen={jest.fn()} />,
  );
  expect(await screen.findByText("Star · 5.1 km")).toBeOnTheScreen();
  expect(screen.queryByText("RECOMMENDED")).toBeNull();
});
