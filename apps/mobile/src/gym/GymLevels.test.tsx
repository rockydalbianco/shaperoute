import gymLevels from "@shaperoute/shared-types/fixtures/gym-levels.json";
import session from "@shaperoute/shared-types/fixtures/gym-session.json";
import type { GymExercises, GymLevel } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { figureLabel, figureOf, GYM_FIGURES } from "./figures";
import { GymLevels, LEVELS_SHOWN } from "./GymLevels";
import { levelValue } from "./levelValue";
import { NewLevels } from "./NewLevels";

// TASK-385 E (ADR-0327): the levels at the gym on a profile, and those a
// workout reached first on its post.

const EXAMPLE = gymLevels.gym_levels as GymLevel[];

function level(exercise: string, n: number, value = 10): GymLevel {
  return { exercise, level: n, value, measure: "load_kg" };
}

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("seven figures, from the mouse to the gorilla", () => {
  expect(GYM_FIGURES.map((figure) => figure.key)).toEqual([
    "mouse",
    "rabbit",
    "fox",
    "wolf",
    "bear",
    "rhino",
    "gorilla",
  ]);
  expect(figureLabel(1)).toBe("🐭 Mouse");
  expect(figureLabel(7)).toBe("🦍 Gorilla");
  // Never outside the seven.
  expect(figureOf(0).key).toBe("mouse");
  expect(figureOf(9).key).toBe("gorilla");
});

test("the best set reads as a set does on the post, in kg or lb", () => {
  expect(levelValue({ value: 100, measure: "load_kg" }, "km")).toBe("100 kg");
  expect(levelValue({ value: 100, measure: "load_kg" }, "mi")).toBe("220.5 lb");
  expect(levelValue({ value: 30, measure: "reps" }, "km")).toBe("×30");
  expect(levelValue({ value: 120, measure: "duration_s" }, "km")).toBe("2:00");
  expect(levelValue({ value: 10000, measure: "distance_m" }, "km")).toBe("10.0 km");
});

test("the profile shows each level with its figure and its best set", async () => {
  await render(<GymLevels levels={EXAMPLE} />);
  const box = screen.getByTestId("gym-levels");
  expect(within(box).getByRole("header", { name: "🏋️ Gym" })).toBeOnTheScreen();
  const rows = within(box).getAllByTestId("gym-level");
  expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
    "Bench press, Bear, 100 kg",
    "Plank, Fox, 2:00",
    "Pull-up, Rabbit, ×4",
  ]);
  expect(screen.getByText("🐻")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-levels-more")).toBeNull();
});

test("five show, the others under «Show more»", async () => {
  const many = [
    "bench_press",
    "back_squat",
    "deadlift",
    "lat_pulldown",
    "leg_press",
    "dumbbell_curl",
    "plank",
  ].map((exercise, n) => level(exercise, 7 - n));
  await render(<GymLevels levels={many} />);
  expect(screen.getAllByTestId("gym-level")).toHaveLength(LEVELS_SHOWN);
  await fireEvent.press(screen.getByTestId("gym-levels-more"));
  expect(screen.getAllByTestId("gym-level")).toHaveLength(many.length);
  expect(screen.queryByTestId("gym-levels-more")).toBeNull();
});

test("nothing without a level, nor from an API older than part E", async () => {
  await render(<GymLevels levels={[]} />);
  expect(screen.queryByTestId("gym-levels")).toBeNull();
  await render(<GymLevels levels={undefined} />);
  expect(screen.queryByTestId("gym-levels")).toBeNull();
  // A level the app cannot read is left out, not the others.
  await render(<GymLevels levels={[{ exercise: "plank", level: 12 }, EXAMPLE[0]]} />);
  expect(screen.getAllByTestId("gym-level")).toHaveLength(1);
});

test("in the app's language", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<GymLevels levels={EXAMPLE} />);
  expect(screen.getByRole("header", { name: "🏋️ Palestra" })).toBeOnTheScreen();
  expect(screen.getByText("Panca piana")).toBeOnTheScreen();
  expect(screen.getByText("Orso")).toBeOnTheScreen();
});

const WORKOUT = {
  rests: session.rests,
  rest_s: session.rest_s,
  sets: session.sets,
} as GymExercises;

test("the post names the levels its workout reached first", async () => {
  await render(
    <NewLevels
      exercises={{ ...WORKOUT, new_levels: [level("bench_press", 7, 140), EXAMPLE[1]] }}
    />,
  );
  const lines = within(screen.getByTestId("gym-new-levels")).getAllByText(/^New level/);
  expect(lines.map((line) => line.props.children)).toEqual([
    "New level: 🦍 Gorilla · Bench press 140 kg",
    "New level: 🦊 Fox · Plank 2:00",
  ]);
  await act(async () => saveLanguageChoice("it"));
  expect(
    screen.getByText("Nuovo livello: 🦍 Gorilla · Panca piana 140 kg"),
  ).toBeOnTheScreen();
});

test("no line without a new level, while hidden or from an older API", async () => {
  await render(<NewLevels exercises={{ ...WORKOUT, new_levels: [] }} />);
  expect(screen.queryByTestId("gym-new-levels")).toBeNull();
  await render(<NewLevels exercises={WORKOUT} />);
  expect(screen.queryByTestId("gym-new-levels")).toBeNull();
  await render(<NewLevels exercises={null} />);
  expect(screen.queryByTestId("gym-new-levels")).toBeNull();
});
