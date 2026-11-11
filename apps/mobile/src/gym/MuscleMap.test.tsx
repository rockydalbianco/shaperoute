/**
 * The body beside the figure of an exercise, with the muscles it works
 * (TASK-465, ADR-0376, the user's «B, sagoma accanto», «Tutti e tre» and
 * «Anche i secondari»): small in the tiles, in the search and during the
 * workout, one side and the main muscles; in the guide the front and the
 * back, the muscles that help outlined, and the names in words.
 */
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet } from "react-native";

import { color } from "../theme/tokens";
import { gymExercise } from "./catalog";
import { exercisesOf } from "./ExerciseGrid";
import { ExerciseGuide } from "./ExerciseGuide";
import { ExercisePicker } from "./ExercisePicker";
import { BODY_BOX, MUSCLE_ZONES, MuscleMap } from "./MuscleMap";
import { MUSCLES, MUSCLES_OF, musclesLabel } from "./muscles";
import { chooseExercise, newWorkout } from "./workout";
import { WorkoutScreen } from "./WorkoutScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const T0 = Date.UTC(2026, 10, 11, 9);

beforeEach(() => {
  // The figures beside the bodies stay still.
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
});

afterEach(() => jest.restoreAllMocks());

function styleOf(testID: string) {
  return StyleSheet.flatten(
    screen.getByTestId(testID, { includeHiddenElements: true }).props.style,
  );
}

test("every muscle has its place on the body, inside its box", () => {
  for (const muscle of MUSCLES) {
    const zones = MUSCLE_ZONES[muscle];
    expect(zones.length).toBeGreaterThan(0);
    for (const [x, y, w, h] of zones) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(BODY_BOX.width);
      expect(y + h).toBeLessThanOrEqual(BODY_BOX.height);
    }
  }
});

test("small: one side, the main muscle filled, and its name said", async () => {
  await render(
    <MuscleMap
      worked={MUSCLES_OF.bench_press}
      height={48}
      language="en"
      testID="map"
    />,
  );
  expect(screen.getByTestId("muscle-body-front")).toBeOnTheScreen();
  expect(screen.queryByTestId("muscle-body-back")).toBeNull();
  // Filled, where the body is only an outline: not the colour alone.
  expect(styleOf("muscle-main-chest")).toMatchObject({ backgroundColor: color.muscle });
  expect(screen.queryByTestId(/^muscle-also-/)).toBeNull();
  expect(screen.getByTestId("map")).toHaveProp("accessibilityRole", "image");
  expect(screen.getByTestId("map")).toHaveProp(
    "accessibilityLabel",
    "Main muscles: chest.",
  );
});

test("small: the back for a pull, and only the main muscles of that side", async () => {
  const { rerender } = await render(
    <MuscleMap worked={MUSCLES_OF.pull_up} height={40} language="it" testID="map" />,
  );
  expect(screen.getByTestId("muscle-body-back")).toBeOnTheScreen();
  expect(screen.getByTestId("muscle-main-lats")).toBeOnTheScreen();
  // A squat: the quads in front; the glutes are behind, but still said.
  await rerender(
    <MuscleMap worked={MUSCLES_OF.back_squat} height={40} language="it" testID="map" />,
  );
  expect(screen.getByTestId("muscle-body-front")).toBeOnTheScreen();
  expect(screen.getByTestId("muscle-main-quads")).toBeOnTheScreen();
  expect(screen.queryByTestId("muscle-main-glutes")).toBeNull();
  expect(screen.getByTestId("map")).toHaveProp(
    "accessibilityLabel",
    "Muscoli principali: quadricipiti, glutei.",
  );
});

test("in detail: both sides, the muscles that help with an outline", async () => {
  await render(
    <MuscleMap
      worked={MUSCLES_OF.bench_press}
      height={132}
      language="en"
      detail
      testID="map"
    />,
  );
  expect(screen.getByTestId("muscle-body-front")).toBeOnTheScreen();
  expect(screen.getByTestId("muscle-body-back")).toBeOnTheScreen();
  expect(screen.getByText("Front")).toBeOnTheScreen();
  expect(screen.getByText("Back")).toBeOnTheScreen();
  expect(styleOf("muscle-main-chest")).toMatchObject({ backgroundColor: color.muscle });
  for (const also of ["muscle-also-shoulders", "muscle-also-triceps"]) {
    const style = styleOf(also);
    expect(style.borderColor).toBe(color.muscle);
    expect(style.borderWidth).toBeGreaterThanOrEqual(1.5);
    expect(style.backgroundColor).toBeUndefined();
  }
  expect(screen.getByTestId("map")).toHaveProp(
    "accessibilityLabel",
    "Main muscles: chest. Also: shoulders, triceps.",
  );
});

test("the guide shows the bodies beside the figure and the names under", async () => {
  await render(
    <ExerciseGuide
      exercise={gymExercise("bench_press")!}
      language="it"
      onBack={jest.fn()}
    />,
  );
  // The words say it: the picture is skipped by the screen reader.
  expect(
    screen.getByTestId("guide-muscles", { includeHiddenElements: true }),
  ).toHaveProp("accessibilityElementsHidden", true);
  const names = screen.getByTestId("guide-muscle-names");
  expect(within(names).getByText("Petto")).toBeOnTheScreen();
  expect(within(names).getByText("Anche: spalle, tricipiti")).toBeOnTheScreen();
  expect(names).toHaveProp(
    "accessibilityLabel",
    "Muscoli principali: petto. Anche: spalle, tricipiti.",
  );
});

test("an exercise with no muscle that helps has one line of names", async () => {
  await render(
    <ExerciseGuide
      exercise={gymExercise("leg_extension")!}
      language="en"
      onBack={jest.fn()}
    />,
  );
  const names = screen.getByTestId("guide-muscle-names");
  expect(within(names).getByText("Quads")).toBeOnTheScreen();
  expect(within(names).queryByText(/^Also/)).toBeNull();
});

test("every tile of a group and every row of the search has its body", async () => {
  await render(<ExercisePicker onPick={jest.fn()} onClose={jest.fn()} />);
  await fireEvent.press(screen.getByTestId("group-legs"));
  for (const exercise of exercisesOf("legs")) {
    const tile = screen.getByTestId(`exercise-${exercise.key}`);
    expect(
      within(tile).getByLabelText(
        musclesLabel(MUSCLES_OF[exercise.key], "en", { secondary: false }),
      ),
    ).toBeOnTheScreen();
  }
  await fireEvent.changeText(screen.getByTestId("exercise-search"), "plank");
  const row = screen.getByTestId("exercise-side_plank");
  expect(within(row).getByLabelText("Main muscles: obliques.")).toBeOnTheScreen();
});

test("during a workout the body is beside the exercise under way", async () => {
  const workout = chooseExercise(
    newWorkout("w1", T0),
    { exercise: "deadlift", kind: "load" },
    T0,
  );
  await render(<WorkoutScreen workout={workout} nowMs={T0} />);
  expect(screen.getByTestId("set-muscles")).toHaveProp(
    "accessibilityLabel",
    "Main muscles: lower back, glutes, hamstrings.",
  );
  expect(
    within(screen.getByTestId("set-muscles")).getByTestId("muscle-body-back"),
  ).toBeOnTheScreen();
});

test("an exercise of one's own has no body", async () => {
  const workout = chooseExercise(
    newWorkout("w1", T0),
    { name: "Tyre flip", kind: "bodyweight" },
    T0,
  );
  await render(<WorkoutScreen workout={workout} nowMs={T0} />);
  expect(screen.getByText("Tyre flip")).toBeOnTheScreen();
  expect(screen.queryByTestId("set-muscles")).toBeNull();
});
