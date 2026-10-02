import { render, screen } from "@testing-library/react-native";

import { SAMPLE_FEED } from "../feed/sampleFeed";
import { FeedScreen } from "./FeedScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

test("until runners publish, the page shows the example drawings", async () => {
  await render(<FeedScreen />);
  // The first drawings are there; the others come as the list scrolls.
  const [first] = SAMPLE_FEED;
  expect(screen.getByText(first.user)).toBeOnTheScreen();
  expect(screen.getByText(first.title)).toBeOnTheScreen();
  expect(screen.getAllByTestId("feed-post").length).toBeGreaterThanOrEqual(2);
  // The drawings are all there is: no line above them (the user's choice).
  expect(screen.queryByText(/^Examples/)).toBeNull();
  // They are to look at: nothing to touch that the app cannot keep.
  expect(screen.queryByRole("button")).toBeNull();
});
