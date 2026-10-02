import { render, screen } from "@testing-library/react-native";

import { FeedScreen } from "./FeedScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

test("until runners publish, the page says what will be there and no more", async () => {
  await render(<FeedScreen />);
  expect(screen.getByText("No drawings yet")).toBeOnTheScreen();
  expect(
    screen.getByText("The drawings that runners publish will show up here."),
  ).toBeOnTheScreen();
  // Nothing to touch yet: no promise the app cannot keep.
  expect(screen.queryByRole("button")).toBeNull();
});
