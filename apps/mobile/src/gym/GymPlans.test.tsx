/**
 * The plans on the screen (TASK-411 C, ADR-0341, the user's «Schede +
 * giorni»): «Plans» in Draw lists them and writes a new one, which goes to
 * the API; «Today: {plan}» with «Start without the plan»; the workout that
 * follows a plan says how many of its sets are done and types its values;
 * the calendar writes the plan of a workout and marks the days skipped.
 */
import calendar from "@shaperoute/shared-types/fixtures/gym-calendar.json";
import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GymPlan, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { DrawingsContext, type DrawingsDoor } from "../social/drawingsDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymCalendarSheet } from "./GymCalendar";
import { GymDrawGuide } from "./GymDrawGuide";
import { GymPlansSheet } from "./GymPlans";
import { forgetPlans, mergePlans, planForToday, plansOf, workoutPlan } from "./plans";
import { isoDate } from "./program";
import { loadSport } from "../settings/sport";
import { useDrawDistance } from "../units/useDrawDistance";
import { Text } from "react-native";
import { forgetHeldWorkout } from "./useWorkout";
import { logSet, newWorkout, planStep } from "./workout";
import { WorkoutScreen } from "./WorkoutScreen";
import { loadWorkout } from "./workoutStore";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
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

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const OWNER = 7;
const [PUSH, , MUSCLE, LIFT_AND_RUN] = plans.plans as GymPlan[];
// Every day of the week: «Today» whatever day the test runs.
const EVERY_DAY: GymPlan = { ...PUSH, days: [1, 2, 3, 4, 5, 6, 7] };

/** The API: its plans, the calendar, and what was sent to it. */
function api(remote: GymPlan[]) {
  return jest.fn(async (url: string, init?: RequestInit) => {
    const path = String(url);
    if (path.includes("/me/gym-calendar")) {
      return Response.json(calendar);
    }
    if (init?.method === "PUT") {
      const key = path.split("/").at(-1);
      return Response.json({ ...JSON.parse(String(init.body)), key }, { status: 201 });
    }
    return Response.json({ plans: remote });
  });
}

async function shown(children: React.ReactNode) {
  const result = await render(
    <FollowsContext.Provider
      value={
        {
          apiUrl: "http://api",
          account: {
            state: { status: "signedIn", session: session as Session },
            sessionEnded: () => {},
          },
          openProfile: () => {},
        } as unknown as FollowsDoor
      }
    >
      <ActivitiesContext.Provider
        value={{ owner: OWNER, total: 3 } as unknown as ActivitiesDoor}
      >
        <DrawingsContext.Provider
          value={{ open: jest.fn() } as unknown as DrawingsDoor}
        >
          {children}
        </DrawingsContext.Provider>
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
  return result;
}

beforeEach(() => {
  files.clear();
  forgetPlans();
  forgetHeldWorkout();
});

test("in Draw: «Today» with today's plan; «Start without the plan» starts a free one", async () => {
  const fetchFn = api([EVERY_DAY]);
  await shown(<GymDrawGuide fetchFn={fetchFn as unknown as typeof fetch} />);
  const today = screen.getByTestId("gym-guide-today");
  expect(within(today).getByRole("header", { name: "Push" })).toBeOnTheScreen();
  expect(within(today).getByText("Bench press 4×8")).toBeOnTheScreen();
  expect(within(today).getByRole("button", { name: "Start “Push”" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("gym-guide-free"));
  const started = loadWorkout();
  expect(started).not.toBeNull();
  expect(started?.plan ?? null).toBeNull();
  expect(started?.current).toBeNull();
});

test("«New plan» is the guide: goal, days, the plan ready, the weeks, the name", async () => {
  const fetchFn = api([]);
  await shown(<GymDrawGuide fetchFn={fetchFn as unknown as typeof fetch} />);
  expect(screen.queryByTestId("gym-guide-today")).toBeNull();
  // Without plans no tile: «New plan» opens the guide straight away.
  expect(screen.queryByTestId("gym-guide-plans")).toBeNull();
  await fireEvent.press(screen.getByTestId("gym-guide-new-plan"));
  await act(async () => {});

  // 1. The goal, «More muscle» chosen already; more strength instead.
  expect(screen.getByText("STEP 1 OF 5")).toBeOnTheScreen();
  expect(screen.getByTestId("wizard-goal-muscle")).toBeSelected();
  expect(screen.getByText("5 × 5 · rest 3 min")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("wizard-goal-strength"));
  await fireEvent.press(screen.getByTestId("wizard-next"));

  // 2. Three days with a day of rest between; two instead.
  expect(screen.getByTestId("wizard-day-3")).toBeChecked();
  await fireEvent.press(screen.getByTestId("wizard-count-2"));
  expect(screen.getByTestId("wizard-day-4")).toBeChecked();
  expect(screen.getByText("Full body A")).toBeOnTheScreen();
  expect(screen.getByText("Full body B")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("wizard-next"));

  // 3. The plan ready: one set more of the squat, and its kg.
  expect(screen.getByTestId("session-item-0")).toHaveTextContent(/Squat.*5 × 5/);
  await fireEvent.press(screen.getByTestId("session-item-0"));
  await fireEvent.press(screen.getByTestId("session-sets-more-0"));
  await fireEvent.changeText(screen.getByTestId("set-load_kg"), "80");
  expect(screen.getByTestId("session-item-0")).toHaveTextContent(/6 × 5/);
  await fireEvent.press(screen.getByTestId("wizard-tab-1"));
  expect(screen.getByTestId("session-item-0")).toHaveTextContent(/Leg press/);
  await fireEvent.press(screen.getByTestId("wizard-next"));

  // 4. More load each week, four weeks; six instead.
  expect(screen.getByTestId("wizard-mode-load")).toBeSelected();
  expect(screen.getByTestId("wizard-week-4")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("wizard-weeks-6"));
  expect(screen.getByTestId("wizard-week-6")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("wizard-next"));

  // 5. The name written by the guide; saved.
  expect(screen.getByTestId("plan-name").props.value).toBe("More strength · 2 days");
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await act(async () => {});

  expect(screen.getByTestId("gym-plan-program")).toHaveTextContent(
    /More strength · 2 days/,
  );
  const [kept] = plansOf(OWNER);
  expect(kept).toMatchObject({
    name: "More strength · 2 days",
    days: [1, 4],
    items: [],
    program: { goal: "strength", weeks: 6, mode: "load", step_kg: 2.5, rest_s: 180 },
  });
  expect(kept.program?.sessions[0].items[0]).toEqual({
    exercise: "back_squat",
    kind: "load",
    sets: 6,
    reps: 5,
    load_kg: 80,
  });
  const sent = fetchFn.mock.calls.find(([, init]) => init?.method === "PUT");
  expect(String(sent?.[0])).toBe(`http://api/me/gym-plans/${kept.key}`);
  expect(JSON.parse(String(sent?.[1]?.body))).toMatchObject({
    name: "More strength · 2 days",
    program: { mode: "load", weeks: 6 },
  });
  expect(plansOf(OWNER)[0].state).toBe("sent");
});

test("a week written by hand, and a plan of before opened in the guide", async () => {
  mergePlans(OWNER, [MUSCLE, PUSH]);
  const fetchFn = api([MUSCLE, PUSH]);
  await shown(
    <GymPlansSheet
      visible
      onClose={jest.fn()}
      fetchFn={fetchFn as unknown as typeof fetch}
    />,
  );
  // «Weeks» opens on the weeks; the fourth is written by hand already.
  await fireEvent.press(screen.getByTestId("gym-plan-weeks"));
  expect(screen.getByText("STEP 4 OF 5")).toBeOnTheScreen();
  expect(screen.getByTestId("wizard-week-4")).toHaveTextContent(/By hand/);
  // The second week: one set less of the bench press.
  await fireEvent.press(screen.getByTestId("wizard-week-2"));
  expect(screen.getByText("Week 2")).toBeOnTheScreen();
  expect(screen.getByTestId("session-item-0")).toHaveTextContent(/Bench press.*4 × 10/);
  await fireEvent.press(screen.getByTestId("session-item-0"));
  await fireEvent.press(screen.getByTestId("session-sets-less-0"));
  await fireEvent.press(screen.getByTestId("wizard-next"));
  expect(screen.getByTestId("wizard-week-2")).toHaveTextContent(/By hand/);
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await act(async () => {});
  const kept = plansOf(OWNER).find((one) => one.key === MUSCLE.key)!;
  const second = kept.program?.custom.find((week) => week.week === 2);
  expect(second?.sessions[0].items[0]).toMatchObject({
    exercise: "bench_press",
    sets: 3,
    load_kg: 62.5,
  });

  // The first week is the plan itself, never a week written by hand.
  await fireEvent.press(screen.getByTestId("gym-plan-weeks"));
  await fireEvent.press(screen.getByTestId("wizard-week-1"));
  await fireEvent.press(screen.getByTestId("session-item-0"));
  await fireEvent.press(screen.getByTestId("session-sets-more-0"));
  await fireEvent.press(screen.getByTestId("wizard-next"));
  expect(screen.getByTestId("wizard-week-1")).not.toHaveTextContent(/By hand/);
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await act(async () => {});
  const again = plansOf(OWNER).find((one) => one.key === MUSCLE.key)!;
  expect(again.program?.custom.map((week) => week.week)).toEqual([2, 4]);
  expect(again.program?.sessions[0].items[0].sets).toBe(5);

  // A plan made before the guide: a row, opened on its workouts.
  await fireEvent.press(screen.getByTestId("gym-plan-row"));
  expect(screen.getByText("STEP 3 OF 5")).toBeOnTheScreen();
  expect(screen.getByTestId("wizard-tab-1")).toHaveTextContent("B · Thu");
  expect(screen.getByTestId("session-item-0")).toHaveTextContent(/Bench press/);
});

test("in Draw: today's workout of a plan with weeks, and the week it is in", async () => {
  const now = new Date();
  const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const program = MUSCLE.program!;
  const everyDay: GymPlan = {
    ...MUSCLE,
    days: [1, 2, 3, 4, 5, 6, 7],
    program: {
      ...program,
      starts_on: isoDate(lastWeek),
      custom: [],
      sessions: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ ...program.sessions[0], day })),
    },
  };
  await shown(<GymDrawGuide fetchFn={api([everyDay]) as unknown as typeof fetch} />);
  const today = screen.getByTestId("gym-guide-today");
  expect(
    within(today).getByRole("header", { name: "Chest, shoulders, triceps" }),
  ).toBeOnTheScreen();
  expect(within(today).getByText("Muscle · 3 days")).toBeOnTheScreen();
  expect(screen.getByTestId("gym-guide-week")).toHaveTextContent("Week 2 of 4");
  // The second week: a step heavier.
  expect(within(today).getByText("Bench press 4×10")).toBeOnTheScreen();
  expect(planForToday()?.items[0].load_kg).toBe(62.5);
  expect(planForToday()?.restS).toBe(90);
  expect(newWorkout("w", Date.now(), planForToday()).restChoices).toMatchObject({
    bench_press: 90,
  });
});

test("a workout of a plan says how many of its sets are done, with its values typed", async () => {
  mergePlans(OWNER, [PUSH]);
  const workout = newWorkout("w1", Date.now(), workoutPlan(PUSH));
  await shown(<WorkoutScreen workout={workout} nowMs={Date.now()} />);
  expect(screen.getByTestId("plan-progress")).toHaveTextContent(
    "Push · Plan: 0/9 sets",
  );
  expect(screen.getByText("Bench press")).toBeOnTheScreen();
  expect(screen.getByTestId("set-reps")).toHaveDisplayValue("8");
  expect(screen.getByTestId("set-load_kg")).toHaveDisplayValue("60");
});

test("the calendar writes a workout's plan and marks a day skipped", async () => {
  const fetchFn = api([]);
  await shown(
    <GymCalendarSheet
      visible
      onClose={jest.fn()}
      fetchFn={fetchFn as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  expect(screen.getByTestId("calendar-skipped-4")).toBeOnTheScreen();
  expect(screen.getByTestId("calendar-day-4")).toHaveProp(
    "accessibilityLabel",
    "4 Nov 2026, Planned",
  );
  await fireEvent.press(screen.getByTestId("calendar-day-4"));
  expect(screen.getByTestId("calendar-skipped")).toHaveTextContent("Planned · Legs");
  await fireEvent.press(screen.getByTestId("calendar-day-5"));
  expect(screen.getByTestId("calendar-workout")).toHaveTextContent(/ · Push›$/);
});

test("a plan's exercise says which of its sets is next, and the next exercise", () => {
  let workout = newWorkout("w1", 0, workoutPlan(PUSH));
  expect(planStep(workout)).toMatchObject({
    set: 1,
    sets: 4,
    then: { exercise: "dips" },
  });
  workout = logSet(workout, { reps: 8, load_kg: 60 }, 60_000)!;
  expect(planStep(workout)).toMatchObject({ set: 2, sets: 4 });
  // Not of the plan: no step.
  expect(
    planStep({ ...workout, current: { exercise: "crunch", kind: "bodyweight" } }),
  ).toBeNull();
});

test("during a plan's workout: the bar, «Set 1 of 4» with its dots, «Then: …»", async () => {
  const workout = newWorkout("w1", Date.now(), workoutPlan(PUSH));
  await shown(<WorkoutScreen workout={workout} nowMs={Date.now()} />);
  expect(screen.getByTestId("plan-step")).toHaveTextContent("Set 1 of 4");
  expect(screen.getByTestId("plan-then")).toHaveTextContent("Then: Dips 3×10");
  expect(screen.getByTestId("log-set")).toHaveTextContent("✓ Log set");
});

test("in Draw without a plan: «Start workout», «New plan» and the plans' tile", async () => {
  const fetchFn = api([]);
  await shown(
    <GymDrawGuide
      onStart={jest.fn()}
      startLabel="Start workout"
      hint="No route in the gym: MuW times your workout."
      fetchFn={fetchFn as unknown as typeof fetch}
    />,
  );
  expect(screen.getByRole("button", { name: "Start workout" })).toBeOnTheScreen();
  expect(screen.getByTestId("gym-guide-new-plan")).toHaveTextContent("📋 New plan");
  expect(screen.queryByTestId("gym-guide-plans")).toBeNull();
  await screen.unmount();

  mergePlans(OWNER, [
    PUSH,
    { ...PUSH, key: "pl00000000000009", name: "Pull", days: [] },
  ]);
  await shown(<GymDrawGuide fetchFn={api([PUSH]) as unknown as typeof fetch} />);
  expect(screen.getByTestId("gym-guide-plans")).toHaveTextContent(
    /📋 Plans(2 plans|1 plan)/,
  );
});

test("run days in the guide: «And running?», the week, the run's editor (TASK-433 C)", async () => {
  const fetchFn = api([]);
  await shown(<GymDrawGuide fetchFn={fetchFn as unknown as typeof fetch} />);
  await fireEvent.press(screen.getByTestId("gym-guide-new-plan"));
  await act(async () => {});
  await fireEvent.press(screen.getByTestId("wizard-next"));

  // No runs at first; two on Tuesday and Saturday.
  expect(screen.getByTestId("wizard-runs-0")).toBeSelected();
  await fireEvent.press(screen.getByTestId("wizard-runs-2"));
  expect(screen.getByTestId("wizard-day-2")).toHaveTextContent("RUN");
  expect(screen.getByTestId("wizard-day-6")).toHaveTextContent("RUN");
  expect(screen.getByText("Easy run · 5 km")).toBeOnTheScreen();
  expect(screen.getByText("Long run · 8 km")).toBeOnTheScreen();
  // Saturday touched: rest; Sunday touched: the gym.
  await fireEvent.press(screen.getByTestId("wizard-day-6"));
  expect(screen.getByTestId("wizard-day-6")).not.toHaveTextContent("RUN");
  await fireEvent.press(screen.getByTestId("wizard-day-7"));
  expect(screen.getByTestId("wizard-day-7")).toBeChecked();
  await fireEvent.press(screen.getByTestId("wizard-day-7"));
  await fireEvent.press(screen.getByTestId("wizard-day-7"));
  await fireEvent.press(screen.getByTestId("wizard-next"));

  // The run's tab: half a km more, then the plan saved.
  expect(screen.getByTestId("wizard-tab-1")).toHaveTextContent("Run · Tue");
  await fireEvent.press(screen.getByTestId("wizard-tab-1"));
  expect(screen.getByTestId("run-day-editor")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("run-more"));
  expect(screen.getByTestId("run-value")).toHaveTextContent("5.5");
  expect(screen.getByTestId("run-growth")).toHaveTextContent(
    "5.5 km · 6 km · 6.5 km; week 4: 4.5 km to recover",
  );
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await fireEvent.press(screen.getByTestId("wizard-next"));
  await act(async () => {});

  const [kept] = plansOf(OWNER);
  expect(kept.days).toEqual([1, 2, 3, 5]);
  expect(kept.program?.sessions[1]).toEqual({
    day: 2,
    name: "Easy run",
    items: [],
    run: { kind: "easy", distance_m: 5500 },
  });
  expect(screen.getByTestId("gym-plan-program")).toHaveTextContent(/RUN/);
});

test("in Draw on a run day: the run of the week, and «Go to the run» turns to Run", async () => {
  const now = new Date();
  const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const program = LIFT_AND_RUN.program!;
  const runs: GymPlan = {
    ...LIFT_AND_RUN,
    days: [1, 2, 3, 4, 5, 6, 7],
    program: {
      ...program,
      starts_on: isoDate(lastWeek),
      sessions: [1, 2, 3, 4, 5, 6, 7].map((day) => ({ ...program.sessions[1], day })),
    },
  };
  function Field() {
    const distance = useDrawDistance("running");
    return <Text testID="draw-metres">{String(distance.metres)}</Text>;
  }
  await shown(
    <>
      <GymDrawGuide fetchFn={api([runs]) as unknown as typeof fetch} />
      <Field />
    </>,
  );
  const today = screen.getByTestId("gym-guide-today");
  expect(
    within(today).getByRole("header", { name: "Easy run · 5.5 km" }),
  ).toBeOnTheScreen();
  expect(within(today).getByText("Easy, at a pace you can talk at.")).toBeOnTheScreen();
  // A run day is no workout of the gym.
  expect(planForToday()).toBeNull();
  await fireEvent.press(screen.getByTestId("gym-guide-go-run"));
  expect(loadSport()).toBe("run");
  expect(screen.getByTestId("draw-metres")).toHaveTextContent("5500");
});
