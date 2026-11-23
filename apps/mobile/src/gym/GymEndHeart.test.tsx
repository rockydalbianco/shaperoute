/**
 * The heart rate at the end of a workout at the gym (TASK-385 part G, the
 * user's «Un sì per tutti», 2026-11-23): the swim's button «Add heart rate
 * from Apple Health» and one consent for both; then the average, the time
 * in each zone, the energy from the heart rate (Keytel) with a sex, a
 * weight and a year of birth, «Show heart rate» in the post; the workout
 * goes to the API with them.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { NO_BODY, saveBody } from "../body/bodyProfile";
import type { HeartReader, HeartSample } from "../health/heartSamples";
import { fakeApi, SignedIn } from "../health/sleepEnd.testing";
import { keepPoolHeartOn, loadPoolHeartOn } from "../pool/poolHeart";
import { GymEnd } from "./GymEnd";
import { useGymOutbox } from "./useGymOutbox";
import { forgetHeldWorkout } from "./useWorkout";
import { chooseExercise, finishWorkout, logSet, newWorkout } from "./workout";

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

const T0 = Date.UTC(2026, 10, 23, 17);
const MIN = 60_000;
const SESSIONS = /^\/me\/gym-sessions\/[^/]+$/;
const KEPT = {
  id: "x",
  started_at: new Date(T0).toISOString(),
  duration_s: 3600,
  rests: 0,
  rest_s: 90,
  show_exercises: true,
  sets: [],
};

/** An hour of bench press, one set. */
const WORKOUT = (() => {
  let workout = newWorkout("gymkey12345", T0);
  workout = chooseExercise(workout, { exercise: "bench_press", kind: "load" }, T0);
  workout = logSet(workout, { reps: 10, load_kg: 60 }, T0 + MIN)!;
  return finishWorkout(workout, T0 + 60 * MIN);
})();

/** A watch's readings: 30 min at 110, 30 at 126, one every 5 s; an
 * average of 118 and a maximum of 126. */
function watch(): HeartSample[] {
  const samples: HeartSample[] = [];
  for (let s = 0; s < 3600; s += 5) {
    const at = T0 + s * 1000;
    samples.push({ fromMs: at, toMs: at, bpm: s < 1800 ? 110 : 126 });
  }
  return samples;
}

function reader(samples: HeartSample[] = watch()) {
  return {
    store: "apple",
    available: jest.fn(async () => true),
    ask: jest.fn(async () => {}),
    samples: jest.fn(async () => samples),
  } satisfies HeartReader;
}

function End({ fetchFn, heart }: { fetchFn: typeof fetch; heart: HeartReader | null }) {
  const { save } = useGymOutbox(fetchFn);
  return (
    <GymEnd workout={WORKOUT} onSave={save} health={null} sleep={null} heart={heart} />
  );
}

async function ended(heart: HeartReader | null) {
  const api = fakeApi(KEPT, SESSIONS);
  await render(
    <SignedIn>
      <End fetchFn={api.fetchFn} heart={heart} />
    </SignedIn>,
  );
  await act(async () => {});
  return api;
}

/** What the workout's PUT carried. */
function sentWorkout(api: ReturnType<typeof fakeApi>): Record<string, unknown> {
  const put = api.calls.find(
    (call) => call.method === "PUT" && SESSIONS.test(call.path),
  );
  return put?.body as Record<string, unknown>;
}

async function save() {
  await fireEvent.press(screen.getByTestId("gym-save"));
  await act(async () => {});
}

beforeEach(() => {
  files.clear();
  forgetHeldWorkout();
  // A man of 70 kg born in 1986: Keytel holds; a max of 180 for the zones.
  saveBody({ ...NO_BODY, sex: "male", weightKg: 70, birthYear: 1986 });
});

afterEach(() => {
  saveBody(NO_BODY);
});

test("nothing is read before the tap; the tap asks the phone and is the swim's consent too", async () => {
  const phone = reader();
  await ended(phone);
  expect(screen.getByText("Add heart rate from Apple Health")).toBeOnTheScreen();
  expect(phone.samples).not.toHaveBeenCalled();
  expect(screen.queryByText("Show heart rate")).toBeNull();
  // Without the heart rate, the estimate of the sets (gymKcal.test.ts).
  expect(screen.getByTestId("gym-end-kcal")).toHaveTextContent("184 kcal");

  await fireEvent.press(screen.getByTestId("pool-heart-add"));
  await act(async () => {});
  expect(phone.ask).toHaveBeenCalled();
  expect(loadPoolHeartOn()).toBe(true);
  expect(screen.getByTestId("pool-heart-avg")).toHaveTextContent(
    "Avg heart rate: 118 bpm",
  );
  expect(screen.getByText("Time in zones")).toBeOnTheScreen();
  expect(screen.getByTestId("pool-zone-2")).toHaveTextContent(
    "Zone 2 Endurance · 30:00",
  );
  expect(screen.getByTestId("pool-zone-3")).toHaveTextContent("Zone 3 Tempo · 30:00");
  // Keytel: (-55.0969 + 0.6309·118 + 0.1988·70 + 0.2017·40) / 4.184 · 60,
  // 593, less 73.5 at rest (heartKcal.test.ts).
  expect(screen.getByTestId("gym-end-kcal")).toHaveTextContent("519 kcal");
  expect(screen.getByRole("switch", { name: "Show heart rate" })).toBeChecked();
});

test("after the swim's consent it is read at once, and goes to the API with the workout", async () => {
  keepPoolHeartOn();
  const phone = reader();
  const api = await ended(phone);
  expect(phone.ask).not.toHaveBeenCalled();
  expect(phone.samples).toHaveBeenCalledWith(T0, T0 + 60 * MIN);
  expect(screen.getByTestId("pool-heart-avg")).toHaveTextContent(
    "Avg heart rate: 118 bpm",
  );
  await save();
  expect(sentWorkout(api)).toMatchObject({
    heart_avg_bpm: 118,
    heart_max_bpm: 126,
    heart_shown: true,
  });
});

test("«Show heart rate» off hides it from others", async () => {
  keepPoolHeartOn();
  const api = await ended(reader());
  await fireEvent.press(screen.getByRole("switch", { name: "Show heart rate" }));
  await save();
  expect(sentWorkout(api)).toMatchObject({ heart_avg_bpm: 118, heart_shown: false });
});

test("a watch that wrote nothing: no line, the estimate, the workout without it", async () => {
  keepPoolHeartOn();
  const api = await ended(reader([]));
  expect(screen.queryByTestId("pool-heart")).toBeNull();
  // The swim's line speaks of a swim: a workout shows none.
  expect(screen.queryByTestId("pool-heart-none")).toBeNull();
  expect(screen.queryByText("Add heart rate from Apple Health")).toBeNull();
  expect(screen.queryByText("Show heart rate")).toBeNull();
  expect(screen.getByTestId("gym-end-kcal")).toHaveTextContent("184 kcal");
  await save();
  expect(
    Object.keys(sentWorkout(api)).filter((key) => key.startsWith("heart_")),
  ).toEqual([]);
});

test("without a sex said, the heart rate shows and the energy stays the estimate", async () => {
  saveBody({ ...NO_BODY, sex: "unsaid", weightKg: 70, birthYear: 1986 });
  keepPoolHeartOn();
  await ended(reader());
  expect(screen.getByTestId("pool-heart-avg")).toBeOnTheScreen();
  expect(screen.getByTestId("gym-end-kcal")).toHaveTextContent("184 kcal");
});

test("without Apple Health, nothing about the heart rate shows", async () => {
  const api = await ended(null);
  expect(screen.queryByText("Add heart rate from Apple Health")).toBeNull();
  expect(screen.queryByTestId("pool-heart")).toBeNull();
  await save();
  expect(sentWorkout(api)).not.toHaveProperty("heart_avg_bpm");
});
