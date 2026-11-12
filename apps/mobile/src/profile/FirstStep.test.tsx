import { fireEvent, render, screen } from "@testing-library/react-native";

import { FirstStep, profileStage } from "./FirstStep";

const ZERO = { distance_m: 0, climb_m: 0, reactions: 0 };

test("no activity and totals at zero: a new profile", () => {
  expect(profileStage(0, ZERO)).toBe("new");
});

test("one activity is enough to be active, with or without totals", () => {
  expect(profileStage(1, ZERO)).toBe("active");
  expect(profileStage(3, null)).toBe("active");
});

test("a total above zero is active even before the activities have come", () => {
  expect(profileStage(null, { ...ZERO, distance_m: 5200 })).toBe("active");
  expect(profileStage(0, { ...ZERO, reactions: 1 })).toBe("active");
  expect(profileStage(null, { ...ZERO, climb_m: 12 })).toBe("active");
});

test("while a number is still on its way nothing is said", () => {
  expect(profileStage(null, ZERO)).toBe("unknown");
  expect(profileStage(null, null)).toBe("unknown");
  expect(profileStage(0, null)).toBe("unknown");
});

test("the card says the first step and its button opens «Explore»", async () => {
  const onExplore = jest.fn();
  await render(<FirstStep onExplore={onExplore} />);
  expect(screen.getByRole("header", { name: "Your first drawing" })).toBeOnTheScreen();
  expect(
    screen.getByText("Start from a route that already draws a shape near you."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Find a route near you" }));
  expect(onExplore).toHaveBeenCalledTimes(1);
});

test("without a way to «Explore» the card has no button", async () => {
  await render(<FirstStep />);
  expect(screen.getByTestId("first-step")).toBeOnTheScreen();
  expect(screen.queryByRole("button")).toBeNull();
});
