import { render, screen } from "@testing-library/react-native";

import { RequestsBadge } from "./RequestsBadge";

// The red number on the way to «Profile» (TASK-239).

test("nobody waits: nothing", async () => {
  await render(<RequestsBadge count={0} />);
  expect(screen.queryByTestId("requests-badge")).toBeNull();
});

test("how many wait, up to nine", async () => {
  await render(<RequestsBadge count={3} />);
  expect(screen.getByTestId("requests-badge")).toHaveTextContent("3");
});

test("more than nine: «9+»", async () => {
  await render(<RequestsBadge count={12} />);
  expect(screen.getByTestId("requests-badge")).toHaveTextContent("9+");
});
