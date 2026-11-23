/**
 * The figure beside each exercise and its guide (TASK-411 part E,
 * ADR-0341, the user's «Omino nell'app»): the figure moves, or stays still
 * with «Reduce Motion»; «ⓘ» on a tile or a row of the search opens the
 * guide, three steps and a warning, with «Add to workout»; during a
 * workout «ⓘ» beside the exercise opens it too, and «‹» goes back.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo, Animated } from "react-native";

import { exercisesOf } from "./ExerciseGrid";
import { ExerciseFigure } from "./ExerciseFigure";
import { ExercisePicker } from "./ExercisePicker";
import { GUIDES_EN } from "./guides/en";
import { MOVES } from "./moves";
import { chooseExercise, newWorkout } from "./workout";
import { WorkoutScreen } from "./WorkoutScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const T0 = Date.UTC(2026, 10, 7, 9);

afterEach(() => jest.restoreAllMocks());

function reduceMotion(on: boolean) {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(on);
}

test("the figure moves on a loop, and stops when it goes", async () => {
  reduceMotion(false);
  const stop = jest.fn();
  const loop = jest
    .spyOn(Animated, "loop")
    .mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() });
  const { unmount } = await render(
    <ExerciseFigure move={MOVES.squat} size={80} testID="figure" />,
  );
  await act(async () => {});
  expect(loop).toHaveBeenCalledTimes(1);
  // A picture only: the name beside it is what the screen reader says.
  expect(screen.getByTestId("figure", { includeHiddenElements: true })).toHaveProp(
    "accessibilityElementsHidden",
    true,
  );
  await unmount();
  expect(stop).toHaveBeenCalled();
});

test("with «Reduce Motion» the figure stays still", async () => {
  reduceMotion(true);
  const loop = jest.spyOn(Animated, "loop");
  await render(<ExerciseFigure move={MOVES.squat} size={80} />);
  await act(async () => {});
  // It may have started before the phone answered; it is not running now.
  const started = loop.mock.results.length;
  await act(async () => {});
  expect(loop.mock.results.length).toBe(started);
  await render(<ExerciseFigure move={MOVES.curl} size={80} still />);
  expect(loop.mock.results.length).toBe(started);
});

test("every tile of a group has its figure and «ⓘ»", async () => {
  reduceMotion(true);
  await render(<ExercisePicker onPick={jest.fn()} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByTestId("group-arms"));
  const grid = screen.getByTestId("machine-grid-arms");
  for (const exercise of exercisesOf("arms")) {
    expect(within(grid).getByTestId(`guide-open-${exercise.key}`)).toHaveProp(
      "accessibilityLabel",
      `How to do it: ${exercise.names.en}`,
    );
  }
});

test("«ⓘ» on a tile opens the guide; «Add to workout» picks it", async () => {
  reduceMotion(true);
  const onPick = jest.fn();
  await render(<ExercisePicker onPick={onPick} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByTestId("group-chest"));
  await fireEvent.press(screen.getByTestId("guide-open-bench_press"));
  const guide = screen.getByTestId("guide-bench_press");
  const [first, second, third, warning] = GUIDES_EN.bench_press;
  for (const step of [first, second, third]) {
    expect(within(guide).getByText(step)).toBeOnTheScreen();
  }
  expect(screen.getByTestId("guide-watch-out")).toHaveTextContent(
    `⚠︎ Watch out${warning}`,
  );
  expect(
    screen.getByTestId("guide-figure", { includeHiddenElements: true }),
  ).toBeTruthy();
  // Back to the group's tiles, then the guide again and «Add to workout».
  await fireEvent.press(screen.getByTestId("guide-back"));
  expect(screen.getByTestId("machine-grid-chest")).toBeOnTheScreen();
  expect(onPick).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("guide-open-bench_press"));
  await fireEvent.press(screen.getByTestId("guide-add"));
  expect(onPick).toHaveBeenCalledWith({ exercise: "bench_press", kind: "load" });
});

test("a row of the search has «ⓘ» too", async () => {
  reduceMotion(true);
  await render(<ExercisePicker onPick={jest.fn()} onClose={jest.fn()} />);
  await fireEvent.changeText(screen.getByTestId("exercise-search"), "plank");
  await fireEvent.press(screen.getByTestId("guide-open-side_plank"));
  expect(screen.getByText(GUIDES_EN.side_plank[0])).toBeOnTheScreen();
});

test("during a workout «ⓘ» beside the exercise opens its guide, «‹» goes back", async () => {
  reduceMotion(true);
  const workout = chooseExercise(
    newWorkout("w1", T0),
    { exercise: "deadlift", kind: "load" },
    T0,
  );
  await render(<WorkoutScreen workout={workout} nowMs={T0} />);
  await fireEvent.press(screen.getByTestId("guide-open-deadlift"));
  expect(screen.getByText(GUIDES_EN.deadlift[0])).toBeOnTheScreen();
  // Only the way to go back: nothing to add, the exercise is under way.
  expect(screen.queryByTestId("guide-add")).toBeNull();
  await fireEvent.press(screen.getByTestId("guide-back"));
  expect(screen.getByTestId("gym-set")).toBeOnTheScreen();
});

test("an exercise of one's own has no guide during the workout", async () => {
  reduceMotion(true);
  const workout = chooseExercise(
    newWorkout("w1", T0),
    { name: "Tyre flip", kind: "bodyweight" },
    T0,
  );
  await render(<WorkoutScreen workout={workout} nowMs={T0} />);
  expect(screen.getByText("Tyre flip")).toBeOnTheScreen();
  expect(screen.queryByTestId(/^guide-open-/)).toBeNull();
});
