/**
 * «+ Exercise» as a grid (TASK-411 part A, ADR-0341, the user's «Gruppi,
 * poi macchinari»): eight tiles of the groups with how many exercises each
 * has, then the group's exercises as tiles; «‹» goes back; typing searches
 * every group as a list, and a name of one's own is still added.
 */
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { GYM_EXERCISES } from "./catalog";
import { exercisesOf } from "./ExerciseGrid";
import { ExercisePicker } from "./ExercisePicker";
import { GYM_GROUPS } from "./groups";

async function picker() {
  const onPick = jest.fn();
  await render(<ExercisePicker onPick={onPick} onClose={jest.fn()} />);
  return onPick;
}

test("every exercise of the catalog is in one group's grid", () => {
  expect(GYM_GROUPS.flatMap((group) => exercisesOf(group)).length).toBe(
    GYM_EXERCISES.length,
  );
});

test("the picker opens on the eight groups, with how many exercises each", async () => {
  await picker();
  const grid = screen.getByTestId("group-grid");
  expect(within(grid).getAllByRole("button")).toHaveLength(8);
  const chest = screen.getByTestId("group-chest");
  expect(chest).toHaveTextContent(`Chest${exercisesOf("chest").length}`);
  expect(screen.queryByTestId("exercise-bench_press")).toBeNull();
});

test("a group shows its exercises as tiles; one picks it; «‹» goes back", async () => {
  const onPick = await picker();
  await fireEvent.press(screen.getByTestId("group-legs"));
  expect(screen.queryByTestId("group-grid")).toBeNull();
  const machines = within(screen.getByTestId("machine-grid-legs")).getAllByTestId(
    /^exercise-/,
  );
  expect(machines).toHaveLength(exercisesOf("legs").length);
  expect(screen.queryByTestId("exercise-bench_press")).toBeNull();
  await fireEvent.press(screen.getByTestId("groups-back"));
  expect(screen.getByTestId("group-grid")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("group-chest"));
  await fireEvent.press(screen.getByTestId("exercise-bench_press"));
  expect(onPick).toHaveBeenCalledWith({ exercise: "bench_press", kind: "load" });
});

test("typing searches every group as a list, and a name of one's own is added", async () => {
  await picker();
  await fireEvent.press(screen.getByTestId("group-legs"));
  await fireEvent.changeText(screen.getByTestId("exercise-search"), "press");
  // The bench press is of the chest: the search is not the group's.
  expect(screen.getByTestId("exercise-bench_press")).toBeOnTheScreen();
  expect(screen.queryByTestId("machine-grid-legs")).toBeNull();
  await fireEvent.changeText(screen.getByTestId("exercise-search"), "Tyre flip");
  expect(screen.getByTestId("add-own-exercise")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId("exercise-search"), "");
  expect(screen.getByTestId("machine-grid-legs")).toBeOnTheScreen();
});

test("a group's only sign is its line figure: no emoji on the tiles nor in the title (TASK-444)", async () => {
  await picker();
  const grid = screen.getByTestId("group-grid");
  expect(within(grid).queryByText(/\p{Extended_Pictographic}/u)).toBeNull();
  await fireEvent.press(screen.getByTestId("group-back"));
  expect(screen.getByRole("header", { name: "Back" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("groups-back"));
  for (const group of GYM_GROUPS) {
    await fireEvent.press(screen.getByTestId(`group-${group}`));
    expect(
      screen.queryByRole("header", { name: /\p{Extended_Pictographic}/u }),
    ).toBeNull();
    await fireEvent.press(screen.getByTestId("groups-back"));
  }
});
