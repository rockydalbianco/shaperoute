/**
 * A workout at the gym while it lasts, after the try-out of 2026-11-23
 * (TASK-511 part A, the user's choices of 2026-11-26): the clock waits at
 * 0:00 for the first exercise, the boxes of a set have − and + and start at
 * 10 reps, and «Stop» tapped moves nothing around it.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { steppedText, stepOf } from "./SetFields";
import { chooseExercise, newWorkout, type Workout } from "./workout";
import { WorkoutScreen } from "./WorkoutScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system", () => {
  class File {
    get exists(): boolean {
      return false;
    }
    create(): void {}
    write(): void {}
    textSync(): string {
      return "";
    }
    delete(): void {}
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const BENCH = { exercise: "bench_press", kind: "load" } as const;
const PLANK = { exercise: "plank", kind: "timed" } as const;
const ROWER = { name: "Rower", kind: "cardio" } as const;

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: session as Session },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

async function show(workout: Workout, nowMs: number) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <WorkoutScreen workout={workout} nowMs={nowMs} apiKey={null} />
    </FollowsContext.Provider>,
  );
}

test("a free workout shows 0:00 until its first exercise, and says so", async () => {
  const start = Date.now() - 45_000;
  await show(newWorkout("gymkey12345", start), Date.now());
  // The exercises open first; closed, the workout waits.
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(screen.getByTestId("gym-clock")).toHaveTextContent("0:00");
  expect(screen.getByText("Starts with the first exercise")).toBeTruthy();
  expect(screen.queryByTestId("gym-kcal")).toBeNull();
});

test("with its first exercise the clock runs from that moment", async () => {
  const chose = Date.now() - 20_000;
  await show(
    chooseExercise(newWorkout("gymkey12345", chose - 60_000), BENCH, chose),
    chose + 20_000,
  );
  expect(screen.getByTestId("gym-clock")).toHaveTextContent("0:20");
  expect(screen.queryByText("Starts with the first exercise")).toBeNull();
});

test("an exercise done for the first time starts at 10 reps; − and + move the boxes", async () => {
  const now = Date.now();
  await show(chooseExercise(newWorkout("gymkey12345", now), BENCH, now), now);
  expect(screen.getByTestId("set-reps").props.value).toBe("10");
  expect(screen.getByTestId("set-load_kg").props.value).toBe("");
  await fireEvent.press(screen.getByRole("button", { name: "More Weight" }));
  await fireEvent.press(screen.getByRole("button", { name: "More Weight" }));
  expect(screen.getByTestId("set-load_kg").props.value).toBe("5");
  await fireEvent.press(screen.getByRole("button", { name: "Less Reps" }));
  expect(screen.getByTestId("set-reps").props.value).toBe("9");
  // Typed by hand, then moved.
  await fireEvent.changeText(screen.getByTestId("set-load_kg"), "61");
  await fireEvent.press(screen.getByTestId("set-load_kg-more"));
  expect(screen.getByTestId("set-load_kg").props.value).toBe("63.5");
});

test("the steps: a rep, 2.5 kg or 5 lb, 5 s or a minute, none for a distance", () => {
  expect(steppedText("reps", BENCH, "0", -1, "km")).toBe("0");
  expect(steppedText("reps", BENCH, "", -1, "km")).toBe("");
  expect(steppedText("reps", BENCH, "", 1, "km")).toBe("1");
  expect(steppedText("load_kg", BENCH, "2,5", -1, "km")).toBe("0");
  expect(steppedText("load_kg", BENCH, "135", 1, "mi")).toBe("140");
  expect(steppedText("duration_s", PLANK, "0:30", 1, "km")).toBe("0:35");
  expect(steppedText("duration_s", ROWER, "20", 1, "km")).toBe("21:00");
  expect(steppedText("reps", BENCH, "ten", 1, "km")).toBe("ten");
  expect(stepOf("distance_m", ROWER, "km")).toBeNull();
  expect(stepOf("speed_kmh", ROWER, "km")).toBeNull();
});

test("«Stop» tapped says to hold it, in the same room: nothing moves", async () => {
  const now = Date.now();
  await show(chooseExercise(newWorkout("gymkey12345", now), BENCH, now), now);
  const before = StyleSheet.flatten(screen.getByText("Stop").props.style);
  await fireEvent.press(screen.getByRole("button", { name: "Stop" }));
  const after = StyleSheet.flatten(screen.getByText("Hold to stop").props.style);
  expect([after.width, after.height]).toEqual([before.width, before.height]);
  expect(typeof before.width).toBe("number");
  expect(typeof before.height).toBe("number");
});
