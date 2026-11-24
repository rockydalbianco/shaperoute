import { render, screen } from "@testing-library/react-native";

import { ExploreScreen } from "./ExploreScreen";

// The heart on yellow stood at the top of «Explore», under the button of
// «Profile» (TASK-222, ADR-0184). Since the header of the tab bar has the
// same heart on every page (TASK-367) there were two, one over the other:
// the one of «Explore» is gone (TASK-508, the user's choice of 2026-11-24).
// In a file of its own, as ExploreMoreShapes.test.tsx says why.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

async function renderExplore() {
  // No API and no start: the page has only its header and a note.
  await render(<ExploreScreen apiUrl={null} near={null} onOpen={jest.fn()} />);
}

test("no heart beside the title: the header has it already", async () => {
  await renderExplore();
  expect(screen.getByTestId("explore-title")).toBeOnTheScreen();
  expect(
    screen.queryByTestId("heart-badge", { includeHiddenElements: true }),
  ).toBeNull();
});

test("the title's row has nothing to press but the search above it", async () => {
  await renderExplore();
  // The only button is the search at the top (TASK-367 part B).
  expect(
    screen.queryAllByRole("button").map((button) => button.props.accessibilityLabel),
  ).toEqual(["Search"]);
});
