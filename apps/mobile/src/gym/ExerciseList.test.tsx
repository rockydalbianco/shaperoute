import session from "@shaperoute/shared-types/fixtures/gym-session.json";
import type { GymExercises, GymSet } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import type { Language } from "../i18n/languages";
import {
  countsLabel,
  ExerciseList,
  restsLabel,
  rowsOf,
  setLabel,
} from "./ExerciseList";

// TASK-385 B0 (ADR-0327): the exercises on the post of a workout at the gym.

const EXERCISES = {
  rests: session.rests,
  rest_s: session.rest_s,
  sets: session.sets,
} as GymExercises;

afterEach(() => saveLanguageChoice("phone"));

test("each exercise once, in the order first done, with its sets", () => {
  const rows = rowsOf(EXERCISES.sets, "it");
  expect(rows.map((row) => row.name)).toEqual([
    "Tapis roulant",
    "Panca piana",
    "Lat machine",
    "Trazioni",
    "Dip alle parallele",
    "Plank",
    "Sled push",
    "Curl con manubri",
  ]);
  expect(rows[1].sets).toHaveLength(3);
});

test("a set reads as its kind says, in kg or lb", () => {
  const [treadmill, bench, , , , pullUp, dips, plank] = EXERCISES.sets;
  expect(setLabel(bench, "km")).toBe("60 kg × 10");
  expect(setLabel(bench, "mi")).toBe("132.3 lb × 10");
  expect(setLabel(pullUp, "km")).toBe("×6");
  expect(setLabel(dips, "km")).toBe("+10 kg × 8");
  expect(setLabel(plank, "km")).toBe("1:30");
  expect(setLabel(treadmill, "km")).toBe("10:00 · 1.6 km");
  const bare: GymSet = {
    exercise: "stepper",
    kind: "cardio",
    duration_s: 60,
    at_s: 0,
    live: true,
  };
  expect(setLabel(bare, "km")).toBe("1:00");
});

test("the rests are told only when there were some", () => {
  expect(restsLabel(EXERCISES)).toBe("6 rests · avg 1:30 · 9:00 resting");
  expect(restsLabel({ ...EXERCISES, rests: 0, rest_s: 0 })).toBeNull();
});

// TASK-453: «1 exercises · 1 sets» and «1 rests» were read at the end of a
// workout of one set. One and more than one, in the app's five languages.
test.each<[Language, string, string, string, string]>([
  [
    "en",
    "1 exercise · 1 set",
    "1 exercise · 3 sets",
    "8 exercises · 10 sets",
    "1 rest · avg 1:30 · 1:30 resting",
  ],
  [
    "it",
    "1 esercizio · 1 serie",
    "1 esercizio · 3 serie",
    "8 esercizi · 10 serie",
    "1 recupero · media 1:30 · 1:30 di recupero",
  ],
  [
    "de",
    "1 Übung · 1 Satz",
    "1 Übung · 3 Sätze",
    "8 Übungen · 10 Sätze",
    "1 Satzpause · Ø 1:30 · 1:30 Pause",
  ],
  [
    "es",
    "1 ejercicio · 1 serie",
    "1 ejercicio · 3 series",
    "8 ejercicios · 10 series",
    "1 descanso · media 1:30 · 1:30 descansando",
  ],
  [
    "fr",
    "1 exercice · 1 série",
    "1 exercice · 3 séries",
    "8 exercices · 10 séries",
    "1 récup · moy. 1:30 · 1:30 de récup",
  ],
])("one and more than one in «%s»", (language, one, mixed, many, rest) => {
  saveLanguageChoice(language);
  expect(countsLabel(1, 1)).toBe(one);
  expect(countsLabel(1, 3)).toBe(mixed);
  expect(countsLabel(8, 10)).toBe(many);
  expect(restsLabel({ rests: 1, rest_s: 90, sets: [] })).toBe(rest);
});

test("more than one rest in the five languages, as approved on 2026-11-04", () => {
  const texts = (["en", "it", "de", "es", "fr"] as const).map((language) => {
    saveLanguageChoice(language);
    return restsLabel(EXERCISES);
  });
  expect(texts).toEqual([
    "6 rests · avg 1:30 · 9:00 resting",
    "6 recuperi · media 1:30 · 9:00 di recupero",
    "6 Satzpausen · Ø 1:30 · 9:00 Pause",
    "6 descansos · media 1:30 · 9:00 descansando",
    "6 récups · moy. 1:30 · 9:00 de récup",
  ]);
});

test("the list says how many exercises and sets", async () => {
  await render(<ExerciseList exercises={EXERCISES} />);
  expect(screen.getByText("8 exercises · 10 sets")).toBeOnTheScreen();
  expect(screen.getByText("Bench press")).toBeOnTheScreen();
  expect(screen.getByText("60 kg × 10 · 70 kg × 8 · 80 kg × 5")).toBeOnTheScreen();
  expect(screen.getByText("6 rests · avg 1:30 · 9:00 resting")).toBeOnTheScreen();
});

test("a workout without sets shows no list", async () => {
  await render(<ExerciseList exercises={{ rests: 0, rest_s: 0, sets: [] }} />);
  expect(screen.queryByTestId("gym-exercises")).toBeNull();
});
