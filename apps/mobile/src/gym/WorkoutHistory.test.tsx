/**
 * «Last time» on the exercise under way (TASK-483 part B, ADR-0392): last
 * time's sets and the suggestion under the name, the boxes filled with
 * last time's first set, «History» in place of the workout and back.
 */
import type { Session } from "@shaperoute/shared-types";
import example from "@shaperoute/shared-types/fixtures/gym-history.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { chooseExercise, logSet, newWorkout, type Workout } from "./workout";
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

const signedIn = session as Session;
const T0 = Date.UTC(2026, 10, 20, 17);

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: signedIn },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

function activities(): ActivitiesDoor {
  return { signedIn: true, owner: signedIn.user.id } as unknown as ActivitiesDoor;
}

function benchPress(): Workout {
  return chooseExercise(
    newWorkout("gymkey12345", T0),
    { exercise: "bench_press", kind: "load" },
    T0,
  );
}

async function show(workout: Workout, historyFetchFn: jest.Mock) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={activities()}>
        <WorkoutScreen
          workout={workout}
          nowMs={T0 + 60_000}
          historyFetchFn={historyFetchFn as unknown as typeof fetch}
        />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
}

test("last time under the name, its first set in the boxes, «History» and back", async () => {
  const fetchFn = answers({ status: 200, body: example });
  await show(benchPress(), fetchFn);
  expect(String(fetchFn.mock.calls[0][0])).toBe(
    "http://api/me/gym-history?exercise=bench_press",
  );
  expect(screen.getByTestId("last-time-sets")).toHaveTextContent(
    "60 kg × 15 · 60 kg × 14",
  );
  expect(screen.getByTestId("last-time-try")).toHaveTextContent("Try 60 kg × 15 again");
  expect(screen.getByTestId("set-reps").props.value).toBe("15");
  expect(screen.getByTestId("set-load_kg").props.value).toBe("60");
  // What is typed stays.
  await fireEvent.changeText(screen.getByTestId("set-load_kg"), "62.5");
  expect(screen.getByTestId("set-load_kg").props.value).toBe("62.5");
  await fireEvent.press(screen.getByTestId("open-history"));
  expect(screen.getByTestId("exercise-history")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-workout")).toBeNull();
  await fireEvent.press(screen.getByTestId("history-back"));
  expect(screen.getByTestId("gym-workout")).toBeOnTheScreen();
});

test("a set of this workout fills the boxes before last time", async () => {
  const workout = logSet(benchPress(), { reps: 8, load_kg: 70 }, T0 + 30_000);
  expect(workout).not.toBeNull();
  await show(workout as Workout, answers({ status: 200, body: example }));
  expect(screen.getByTestId("last-time")).toBeOnTheScreen();
  expect(screen.getByTestId("set-reps").props.value).toBe("8");
  expect(screen.getByTestId("set-load_kg").props.value).toBe("70");
});

test("an API without the history: no box, the boxes as before", async () => {
  await show(
    benchPress(),
    answers({ status: 404, body: apiError("http_error", "Not Found") }),
  );
  expect(screen.queryByTestId("last-time")).toBeNull();
  expect(screen.getByTestId("set-reps").props.value).toBe("");
});
