import fixture from "@shaperoute/shared-types/fixtures/activities.json";
import { act, render, screen } from "@testing-library/react-native";

import { ActivityRow } from "../activities/ActivityRow";
import { startedLabel } from "../activities/activityText";
import type { Activity } from "../api/activities";
import { forgetNutrition, writeActivityKcal } from "./useNutrition";

// The private list with «Nutrition» on (TASK-489 part C1): every activity
// ends with the calories its day's balance counts.

jest.mock("./nutritionOn", () => ({ NUTRITION_ON: true }));

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

/** The run of the fixture: 4007 m in 19 minutes, 280 kcal for 70 kg. */
const STAR = fixture.activities[0] as unknown as Activity;
const WHEN = startedLabel(STAR.started_at);
const GYM: Activity = {
  ...STAR,
  id: "gym",
  activity: "gym",
  place: null,
  shape: null,
  distance_m: 0,
  duration_s: 3000,
  route_preview: null,
  track_preview: [],
};

afterEach(async () => {
  await act(async () => forgetNutrition());
  disk.files.clear();
});

async function row(activity: Activity) {
  await render(
    <ActivityRow
      activity={activity}
      isPublic={false}
      title={null}
      opening={false}
      onOpen={() => {}}
      onDelete={() => {}}
    />,
  );
}

test("a run ends with its estimated calories, as a screen reader hears too", async () => {
  await row(STAR);
  expect(screen.getByTestId("facts-kcal")).toHaveTextContent("280 kcal");
  expect(
    screen.getByRole("button", {
      name: `${WHEN}, Trento · Star, 4.01 km · 19:00 · 4:45 /km · 280 kcal, open on the map`,
    }),
  ).toBeOnTheScreen();
});

test("a workout at the gym has its calories after its time", async () => {
  await row(GYM);
  expect(screen.getByText(/^50:00 · \d+ kcal$/)).toBeOnTheScreen();
});

test("calories the user wrote in «Nutrition» show here, and say «edited»", async () => {
  await row(STAR);
  await act(async () => {
    writeActivityKcal(STAR.id, 350);
  });
  expect(screen.getByTestId("facts-kcal")).toHaveTextContent("350 kcal (edited)");
  await act(async () => {
    writeActivityKcal(STAR.id, null);
  });
  expect(screen.getByTestId("facts-kcal")).toHaveTextContent("280 kcal");
});
