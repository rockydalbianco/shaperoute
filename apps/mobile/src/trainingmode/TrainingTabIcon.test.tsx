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
