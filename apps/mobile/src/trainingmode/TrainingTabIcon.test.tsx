import { render, screen } from "@testing-library/react-native";

import { TRAINING_TAB_ICONS, TrainingTabIcon } from "./TrainingTabIcon";

// The «Food» tab's icon (TASK-490 part D): Lucide's utensils, bolder on the
// tab on screen, as the other icons of the training mode.

test("«Food» has its icon, bolder on the tab on screen", async () => {
  await render(
    <>
      <TrainingTabIcon name="food" selected />
      <TrainingTabIcon name="food" selected={false} />
    </>,
  );
  expect(screen.getByTestId("training-tab-food-on")).toBeOnTheScreen();
  expect(screen.getByTestId("training-tab-food-off")).toBeOnTheScreen();
  expect(TRAINING_TAB_ICONS.food.on).not.toBe(TRAINING_TAB_ICONS.food.off);
});

test("«Workouts» is a list, not the calendar of the ski mode's «Days» (part E)", () => {
  const ski = jest.requireActual<typeof import("../skimode/SkiTabIcon")>(
    "../skimode/SkiTabIcon",
  );
  expect(TRAINING_TAB_ICONS.workouts.off).not.toBe(ski.SKI_TAB_ICONS.days.off);
  expect(TRAINING_TAB_ICONS.workouts.on).not.toBe(ski.SKI_TAB_ICONS.days.on);
});
