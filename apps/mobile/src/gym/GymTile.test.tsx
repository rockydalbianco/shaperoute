import { render, screen } from "@testing-library/react-native";

import { GymTile } from "./GymTile";

// TASK-385 B0: the tile in place of the line of a workout at the gym.

test("the card's tile says what it is and how long", async () => {
  await render(<GymTile width={320} height={256} durationS={3_600} />);
  const tile = screen.getByTestId("gym-tile", { includeHiddenElements: true });
  expect(tile).toHaveStyle({ width: 320, height: 256 });
  expect(screen.getByText("🏋️", { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText("Gym", { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByText("1 h 00 min", { includeHiddenElements: true })).toBeTruthy();
});

test("a thumbnail's tile has the figure only", async () => {
  await render(<GymTile width={56} height={56} />);
  expect(screen.getByText("🏋️", { includeHiddenElements: true })).toBeTruthy();
  expect(screen.queryByText("Gym", { includeHiddenElements: true })).toBeNull();
});

// TASK-385 part D: the main exercises on the tile.

test("the main exercises are written under the time, one a line", async () => {
  await render(
    <GymTile
      width={320}
      height={256}
      durationS={600}
      exercises={["Bench press", "Squat"]}
    />,
  );
  expect(
    screen.getByTestId("gym-tile-exercises", { includeHiddenElements: true }),
  ).toHaveTextContent("Bench press\nSquat");
});

test("without exercises the tile writes none", async () => {
  await render(<GymTile width={320} height={256} durationS={600} exercises={[]} />);
  expect(
    screen.queryByTestId("gym-tile-exercises", { includeHiddenElements: true }),
  ).toBeNull();
});

// TASK-385 part C: the energy under the time.

test("the energy is written under the time, none without it", async () => {
  await render(<GymTile width={320} height={256} durationS={3600} kcal="184 kcal" />);
  expect(
    screen.getByTestId("gym-tile-kcal", { includeHiddenElements: true }),
  ).toHaveTextContent("184 kcal");
  await render(<GymTile width={320} height={256} durationS={3600} kcal={null} />);
  expect(
    screen.queryByTestId("gym-tile-kcal", { includeHiddenElements: true }),
  ).toBeNull();
});
