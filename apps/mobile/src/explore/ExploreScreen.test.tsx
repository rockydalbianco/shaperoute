import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { awayText, ExploreScreen, filtered, kmLabel } from "./ExploreScreen";
import type { RecommendedRoute } from "./recommendedRoutes";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const fetchMock = jest.spyOn(globalThis, "fetch");
const routes = list.routes as RecommendedRoute[];

beforeEach(() => {
  fetchMock.mockReset();
});

afterAll(() => {
  fetchMock.mockRestore();
});

test("lists the routes near the start, the best first, and opens one", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  const onOpen = jest.fn();
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46.067, 11.1215]}
      onBack={jest.fn()}
      onOpen={onOpen}
    />,
  );
  expect(await screen.findByText("Star · 5.1 km")).toBeOnTheScreen();
  expect(screen.getByText("CIAO · 15.2 km")).toBeOnTheScreen();
  expect(screen.getByText("100%")).toBeOnTheScreen();
  expect(screen.getAllByText("Trento · 0 m away").length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByText("Star · 5.1 km"));
  expect(onOpen).toHaveBeenCalledWith(routes[0]);
});

test("the filters keep one shape or one distance", async () => {
  fetchMock.mockResolvedValue(Response.json(list));
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46.067, 11.1215]}
      onBack={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  await screen.findByText("Star · 5.1 km");
  await fireEvent.press(screen.getByText("Heart"));
  expect(screen.queryByText("Star · 5.1 km")).toBeNull();
  expect(screen.getByText("Heart · 10.2 km")).toBeOnTheScreen();
});

test("without a start, nothing is asked", async () => {
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onBack={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  expect(await screen.findByText(/Choose a start first/)).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("no routes near: says so", async () => {
  fetchMock.mockResolvedValue(Response.json({ routes: [] }));
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[40, 9]}
      onBack={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  expect(
    await screen.findByText(/No recommended routes near this start yet/),
  ).toBeOnTheScreen();
});

test("a failed list says so", async () => {
  fetchMock.mockRejectedValue(new TypeError("Network request failed"));
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={[46, 11]}
      onBack={jest.fn()}
      onOpen={jest.fn()}
    />,
  );
  expect(await screen.findByText(/could not load/)).toBeOnTheScreen();
});

test("labels and filters", () => {
  expect(kmLabel(21000)).toBe("21 km");
  expect(awayText(640)).toBe("640 m away");
  expect(awayText(1440)).toBe("1.4 km away");
  expect(filtered(routes, "heart", "all").map((r) => r.id)).toEqual([
    "trento-heart-10000-1",
    "trento-heart-21000-2",
  ]);
  expect(filtered(routes, "all", "5 km").map((r) => r.id)).toEqual([
    "trento-star-5000-0",
  ]);
});
