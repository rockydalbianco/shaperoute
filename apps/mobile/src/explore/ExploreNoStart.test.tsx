/**
 * «Explore» with no start (TASK-509): not a bare line under the cities but
 * an empty page — the figure, the line, and «My position», which asks the
 * phone where it is as «Draw» does. No «within 5 km of your start» above a
 * page that has no start. The cities and «Ask for a route» stay.
 */
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import type { Place } from "../places/photon";
import { forgetExamples } from "./exampleRoutes";
import { ExploreScreen } from "./ExploreScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const fetchMock = jest.spyOn(globalThis, "fetch");

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => Promise.resolve(Response.json({ routes: [] })));
  forgetExamples();
});

const vercelli: Place = {
  label: "Vercelli, Piedmont, Italy",
  point: [45.3252, 8.4228],
};

test("no start: the figure, the line and «My position», and nothing asked", async () => {
  const onMyPosition = jest.fn();
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      onOpen={jest.fn()}
      onCity={jest.fn()}
      onAsk={jest.fn()}
      onMyPosition={onMyPosition}
    />,
  );
  const empty = await screen.findByTestId("explore-no-start");
  expect(within(empty).getByText(/Choose a start first/)).toBeOnTheScreen();
  expect(
    within(empty).getByTestId("empty-state-pen", { includeHiddenElements: true }),
  ).toBeTruthy();
  // Nothing to be near: no line about it under the title.
  expect(screen.queryByTestId("explore-subtitle")).toBeNull();
  expect(screen.queryByText(/Starting within/)).toBeNull();
  // The other ways stay: the cities, and asking for a route.
  expect(screen.getByText("Near me")).toBeOnTheScreen();
  expect(screen.getByText("Ask for a route")).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
  await fireEvent.press(within(empty).getByRole("button", { name: "My position" }));
  expect(onMyPosition).toHaveBeenCalledTimes(1);
});

test("a page not given the way to the position has the figure and the line alone", async () => {
  await render(<ExploreScreen apiUrl="http://api" near={null} onOpen={jest.fn()} />);
  const empty = await screen.findByTestId("explore-no-start");
  expect(within(empty).queryByRole("button")).toBeNull();
});

test("with a start, or a city, the page is as it was", async () => {
  await render(
    <ExploreScreen
      apiUrl="http://api"
      near={null}
      city={vercelli}
      onOpen={jest.fn()}
      onCity={jest.fn()}
    />,
  );
  expect(await screen.findByTestId("explore-subtitle")).toBeOnTheScreen();
  expect(screen.queryByTestId("explore-no-start")).toBeNull();
});
