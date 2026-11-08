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
import { forgetPlans, mergePlans, plansOf, workoutPlan } from "./plans";
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
const [PUSH] = plans.plans as GymPlan[];
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

test("«Plans» lists them; «New plan» writes one, kept here and sent", async () => {
  const fetchFn = api([]);
  await shown(<GymDrawGuide fetchFn={fetchFn as unknown as typeof fetch} />);
  expect(screen.queryByTestId("gym-guide-today")).toBeNull();
  await fireEvent.press(screen.getByTestId("gym-guide-plans"));
  await act(async () => {});
  expect(screen.getByText("Plans")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("gym-plan-new"));
  expect(screen.getByTestId("plan-save")).toBeDisabled();

  await fireEvent.changeText(screen.getByTestId("plan-name"), "Pull");
  await fireEvent.press(screen.getByTestId("plan-day-2"));
  await fireEvent.press(screen.getByTestId("plan-day-5"));
  await fireEvent.press(screen.getByTestId("plan-add-exercise"));
  await fireEvent.press(screen.getByTestId("group-back"));
  await fireEvent.press(screen.getByTestId("exercise-lat_pulldown"));
  // Three sets at first; one more.
  expect(screen.getByTestId("plan-sets-0")).toHaveTextContent("3");
  await fireEvent.press(screen.getByTestId("plan-sets-more-0"));
  await fireEvent.changeText(screen.getByTestId("set-reps"), "10");
  await fireEvent.changeText(screen.getByTestId("set-load_kg"), "45");
  await fireEvent.press(screen.getByTestId("plan-save"));
  await act(async () => {});

  const row = screen.getByTestId("gym-plan-row");
  expect(within(row).getByText("Pull")).toBeOnTheScreen();
  expect(within(row).getByText("Tue · Fri · 1 exercises")).toBeOnTheScreen();
  const [kept] = plansOf(OWNER);
  expect(kept).toMatchObject({
    name: "Pull",
    days: [2, 5],
    items: [{ exercise: "lat_pulldown", kind: "load", sets: 4, reps: 10, load_kg: 45 }],
  });
  const sent = fetchFn.mock.calls.find(([, init]) => init?.method === "PUT");
  expect(String(sent?.[0])).toBe(`http://api/me/gym-plans/${kept.key}`);
  expect(JSON.parse(String(sent?.[1]?.body))).toMatchObject({
    name: "Pull",
    days: [2, 5],
  });
  expect(plansOf(OWNER)[0].state).toBe("sent");
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
  expect(screen.getByTestId("gym-guide-plans")).toHaveTextContent("📋 PlansNew plan");
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
