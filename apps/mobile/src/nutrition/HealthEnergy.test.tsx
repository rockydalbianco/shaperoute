import fixture from "@shaperoute/shared-types/fixtures/activities.json";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import type { Activity } from "../api/activities";
import type { HealthEnergyReader, HealthWorkout } from "../health/energyReader";
import { DiaryView } from "./DiaryView";
import { keepHealthEnergyOn, loadHealthEnergyOn } from "./healthEnergyChoice";
import { forgetHealthEnergy } from "./useHealthEnergy";
import { forgetNutrition, writeActivityKcal } from "./useNutrition";

// «Nutrition» with Apple Health (TASK-489 part C2): the yes, a day counted
// from Health's active energy, and a day counted from the activities.

const mockHealth: { reader: HealthEnergyReader | null } = { reader: null };

jest.mock("../health/energyModules", () => ({
  energyReader: () => mockHealth.reader,
}));

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The phone's documents folder, in memory, as in nutritionStore.test.ts.
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
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

const disk = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const TODAY = "2026-11-23";
/** 18:00 of TODAY on the phone: three quarters of the day gone. */
const EVENING = new Date(2026, 10, 23, 18, 0);
const REST_SO_FAR = 1323;
/** The run of the fixture, 4007 m in 19 minutes, for 70 kg. */
const RUN = 280;
const STAR = fixture.activities[0] as unknown as Activity;
const MORNING_RUN: Activity = {
  ...STAR,
  id: "run",
  started_at: new Date(2026, 10, 23, 7, 10).toISOString(),
};

function workout(id: string, hour: number, fields: Partial<HealthWorkout> = {}) {
  const startMs = new Date(2026, 10, 23, hour, 30).getTime();
  return {
    id,
    activityType: 13,
    startMs,
    endMs: startMs + 50 * 60_000,
    kcal: 530,
    metres: 21400,
    sourceName: "Garmin Connect",
    sourceBundleId: "com.garmin",
    syncId: null,
    ...fields,
  } satisfies HealthWorkout;
}

/** Apple Health with this active energy and these workouts on every day. */
function health(activeKcal: number | null, workouts: HealthWorkout[] = []) {
  return {
    store: "apple" as const,
    available: jest.fn(async () => true),
    ask: jest.fn(async () => {}),
    workouts: jest.fn(async () => workouts),
    activeEnergy: jest.fn(async () => activeKcal),
  };
}

function door(): ActivitiesDoor {
  return {
    status: "ready",
    list: [MORNING_RUN],
    more: false,
    loadingMore: false,
    problem: null,
    loadMore: () => {},
  } as unknown as ActivitiesDoor;
}

async function showSheet() {
  await render(
    <ActivitiesContext.Provider value={door()}>
      <DiaryView today={TODAY} now={EVENING} />
    </ActivitiesContext.Provider>,
  );
  await fireEvent.press(screen.getByTestId("diary-used"));
}

/** The user said yes before: the diary opens reading Health. */
async function withYes() {
  await act(async () => {
    keepHealthEnergyOn(true);
    forgetHealthEnergy();
  });
}

afterEach(async () => {
  mockHealth.reader = null;
  await act(async () => {
    forgetHealthEnergy();
    forgetNutrition();
  });
  disk.files.clear();
});

test("in a build that cannot read Apple Health nothing is offered", async () => {
  await showSheet();
  expect(screen.queryByTestId("energy-health-use")).toBeNull();
  expect(screen.queryByTestId("energy-health-stop")).toBeNull();
  expect(screen.getByTestId("energy-used")).toHaveTextContent(
    `${REST_SO_FAR + RUN} kcal`,
  );
});

test("before the yes nothing is read, and the sheet says what would be", async () => {
  const reader = health(684);
  mockHealth.reader = reader;
  await showSheet();
  expect(screen.getByRole("button", { name: "Use Apple Health" })).toBeOnTheScreen();
  expect(
    screen.getByText(
      "MuW reads your active energy and the workouts other apps recorded, to count the energy you use. They are read on your phone and stay there.",
    ),
  ).toBeOnTheScreen();
  expect(reader.ask).not.toHaveBeenCalled();
  expect(reader.activeEnergy).not.toHaveBeenCalled();
  expect(reader.workouts).not.toHaveBeenCalled();
  expect(screen.getByTestId("energy-used")).toHaveTextContent(
    `${REST_SO_FAR + RUN} kcal`,
  );
});

test("«Use Apple Health» opens the phone's sheet once and keeps the yes", async () => {
  const reader = health(684);
  mockHealth.reader = reader;
  await showSheet();
  await fireEvent.press(screen.getByTestId("energy-health-use"));
  await waitFor(() =>
    expect(screen.getByTestId("energy-health-active")).toBeOnTheScreen(),
  );
  expect(reader.ask).toHaveBeenCalledTimes(1);
  expect(loadHealthEnergyOn()).toBe(true);
  expect(screen.queryByTestId("energy-health-use")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Stop using Apple Health" }),
  ).toBeOnTheScreen();
});

test("a day Health has the active energy of counts that alone", async () => {
  mockHealth.reader = health(684);
  await withYes();
  await showSheet();
  await waitFor(() =>
    expect(
      screen.getByLabelText("Active energy, from Apple Health, 684 kcal"),
    ).toBeOnTheScreen(),
  );
  // The run is listed, not added again.
  expect(screen.getByLabelText(`Run · 4.01 km, 07:10, ${RUN} kcal`)).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Your activities are already inside Apple Health's active energy: they are not added again.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByTestId("energy-used")).toHaveTextContent(
    `${REST_SO_FAR + 684} kcal`,
  );
  expect(screen.getByLabelText(`Used (est.), ${REST_SO_FAR + 684}`)).toBeOnTheScreen();
});

test("the day is read from its start to the start of the next, on the phone's clock", async () => {
  const reader = health(684);
  mockHealth.reader = reader;
  await withYes();
  await showSheet();
  await waitFor(() => expect(reader.activeEnergy).toHaveBeenCalled());
  const from = new Date(2026, 10, 23).getTime();
  const to = new Date(2026, 10, 24).getTime();
  expect(reader.activeEnergy).toHaveBeenCalledWith(from, to);
  expect(reader.workouts).toHaveBeenCalledWith(from, to);
});

test("a number written by hand moves a day counted from Health by the difference", async () => {
  mockHealth.reader = health(684);
  await withYes();
  await act(async () => {
    writeActivityKcal("run", 350);
  });
  await showSheet();
  await waitFor(() =>
    expect(screen.getByTestId("energy-used")).toHaveTextContent(
      `${REST_SO_FAR + 684 + (350 - RUN)} kcal`,
    ),
  );
});

test("a day Health has nothing for counts the activities, other apps' too", async () => {
  mockHealth.reader = health(null, [workout("ride", 17)]);
  await withYes();
  await showSheet();
  await waitFor(() =>
    expect(
      screen.getByLabelText("Bike · 21.40 km, 17:30, from Apple Health, 530 kcal"),
    ).toBeOnTheScreen(),
  );
  expect(
    screen.getByText(
      "Apple Health has nothing for this day: your activities are counted.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId("energy-health-active")).toBeNull();
  expect(screen.getByTestId("energy-used")).toHaveTextContent(
    `${REST_SO_FAR + RUN + 530} kcal`,
  );
});

test("a workout MuW wrote to Health, or the same outing from a watch, is not counted twice", async () => {
  mockHealth.reader = health(null, [
    // The run itself, as MuW saved it in Health.
    workout("mine", 7, { syncId: "run", sourceName: "MuW", kcal: 280, metres: 4007 }),
    // The same run from a watch: 07:15 to 07:28, inside the run of 07:10.
    {
      ...workout("watch", 7, { activityType: 37, kcal: 301, metres: 4100 }),
      startMs: new Date(2026, 10, 23, 7, 15).getTime(),
      endMs: new Date(2026, 10, 23, 7, 28).getTime(),
    },
  ]);
  await withYes();
  await showSheet();
  await waitFor(() =>
    expect(screen.getByTestId("energy-used")).toHaveTextContent(
      `${REST_SO_FAR + RUN} kcal`,
    ),
  );
  expect(screen.queryByTestId("energy-other-mine")).toBeNull();
  expect(screen.queryByTestId("energy-other-watch")).toBeNull();
});

test("the calories of a workout of another app can be written by hand too", async () => {
  mockHealth.reader = health(null, [workout("ride", 17)]);
  await withYes();
  await showSheet();
  await fireEvent.press(await screen.findByTestId("energy-other-ride"));
  expect(screen.getByText("Bike · 21.40 km · 17:30")).toBeOnTheScreen();
  expect(screen.getByTestId("energy-edit-estimate")).toHaveTextContent(
    "MuW's estimate: 530 kcal",
  );
  await fireEvent.changeText(screen.getByTestId("energy-edit-input"), "600");
  await fireEvent.press(screen.getByTestId("energy-edit-save"));
  expect(
    screen.getByLabelText(
      "Bike · 21.40 km, 17:30, from Apple Health, 600 kcal, edited",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByTestId("energy-used")).toHaveTextContent(
    `${REST_SO_FAR + RUN + 600} kcal`,
  );
});

test("«Stop using Apple Health» forgets the yes, and the activities count again", async () => {
  mockHealth.reader = health(684);
  await withYes();
  await showSheet();
  await fireEvent.press(await screen.findByTestId("energy-health-stop"));
  expect(loadHealthEnergyOn()).toBe(false);
  expect(screen.queryByTestId("energy-health-active")).toBeNull();
  expect(screen.getByTestId("energy-used")).toHaveTextContent(
    `${REST_SO_FAR + RUN} kcal`,
  );
  expect(screen.getByTestId("energy-health-use")).toBeOnTheScreen();
});

test("a Health that does not answer is a day without data", async () => {
  const reader = health(684);
  reader.activeEnergy.mockRejectedValue(new Error("no"));
  mockHealth.reader = reader;
  await withYes();
  await showSheet();
  await waitFor(() =>
    expect(screen.getByTestId("energy-used")).toHaveTextContent(
      `${REST_SO_FAR + RUN} kcal`,
    ),
  );
});
