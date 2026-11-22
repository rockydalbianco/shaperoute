import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { fakeApi, OWNER, SignedIn } from "../health/sleepEnd.testing";
import { GymEnd } from "./GymEnd";
import { forgetPlans, mergePlans, plansOf, workoutPlan } from "./plans";
import { useGymOutbox } from "./useGymOutbox";
import { forgetHeldWorkout } from "./useWorkout";
import { chooseExercise, finishWorkout, logSet, newWorkout } from "./workout";

// «How did it go?» at the end of a workout of a plan (TASK-488, the
// mockup H1–H2): what changes next time, «Change», kept with «Save».

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const [, , MUSCLE] = plans.plans as GymPlan[];
// Monday 9 November, week 2 of «Muscle»: the bench press at 62.5 kg.
const T0 = new Date(2026, 10, 9, 17).getTime();
const MIN = 60_000;
const SESSIONS = /^\/me\/gym-sessions\/[^/]+$/;
const gymSession = {
  id: "x",
  started_at: new Date(T0).toISOString(),
  duration_s: 3600,
  rests: 0,
  rest_s: 90,
  show_exercises: true,
  sets: [],
};

function ended(followed: boolean) {
  const program = MUSCLE.program!;
  const items = program.sessions[0].items.map((item) =>
    item.load_kg === undefined ? item : { ...item, load_kg: item.load_kg + 2.5 },
  );
  const plan = followed
    ? workoutPlan({ key: MUSCLE.key, name: "Chest, shoulders, triceps", items })
    : null;
  let workout = newWorkout("gymkey12345", T0, plan);
  workout = chooseExercise(workout, { exercise: "bench_press", kind: "load" }, T0);
  workout = logSet(workout, { reps: 10, load_kg: 62.5 }, T0 + MIN)!;
  return finishWorkout(workout, T0 + 60 * MIN);
}

function End({ fetchFn, followed }: { fetchFn: typeof fetch; followed: boolean }) {
  const { save } = useGymOutbox(fetchFn);
  return <GymEnd workout={ended(followed)} onSave={save} health={null} sleep={null} />;
}

async function shown(followed: boolean) {
  const api = fakeApi(gymSession, SESSIONS);
  await render(
    <SignedIn>
      <End fetchFn={api.fetchFn} followed={followed} />
    </SignedIn>,
  );
  await act(async () => {});
}

beforeEach(() => {
  files.clear();
  forgetHeldWorkout();
  forgetPlans();
  mergePlans(OWNER, [MUSCLE]);
});

test("easy: next Monday a step more, «Change» to answer again, kept with «Save»", async () => {
  await shown(true);
  expect(screen.getByTestId("adapt-question")).toHaveTextContent(/How did it go\?/);
  await fireEvent.press(screen.getByTestId("adapt-easy"));
  expect(screen.getByTestId("adapt-title")).toHaveTextContent("Easy: up we go");
  // Week 3 would be 65 kg; a step more: 67.5.
  const [bench] = screen.getAllByTestId("adapt-line");
  expect(bench).toHaveTextContent(/Bench press.*62\.5 kg → 67\.5 kg/);
  expect(screen.getByText("Next Monday, Chest, shoulders, triceps:")).toBeOnTheScreen();

  // «Change» goes back to the three answers; nothing kept yet.
  await fireEvent.press(screen.getByTestId("adapt-change"));
  await fireEvent.press(screen.getByTestId("adapt-hard"));
  expect(screen.getByTestId("adapt-title")).toHaveTextContent(
    "Hard: the same next time",
  );
  expect(plansOf(OWNER)[0].program?.adapt).toEqual(MUSCLE.program!.adapt);

  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  const kept = plansOf(OWNER)[0];
  expect(kept.state).toBe("waiting");
  expect(kept.program?.adapt).toEqual({
    off: false,
    days: [{ day: 1, steps: -1, hard: 1, last: "hard" }],
  });
});

test("no answer, or a workout without a plan: the plan as it was", async () => {
  await shown(true);
  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
  expect(plansOf(OWNER)[0].program?.adapt).toBeUndefined();
  await screen.unmount();

  await shown(false);
  expect(screen.queryByTestId("adapt-question")).toBeNull();
});
