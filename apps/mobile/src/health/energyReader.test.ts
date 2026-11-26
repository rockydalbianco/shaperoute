import {
  ACTIVE_ENERGY_TYPE,
  appleEnergyReader,
  type EnergyKitModule,
  kcalOf,
  type KitWorkout,
  metresOf,
  WORKOUT_TYPE,
  workoutFrom,
} from "./energyReader";

// The one reader of workouts and active energy from Apple Health (TASK-489
// part C2; TASK-312 D reads workouts through it too).

const START = new Date(2026, 10, 23, 17, 30);
const END = new Date(2026, 10, 23, 18, 20);

const RIDE: KitWorkout = {
  uuid: "A1",
  workoutActivityType: 13,
  startDate: START,
  endDate: END,
  totalEnergyBurned: { unit: "kcal", quantity: 530.4 },
  totalDistance: { unit: "m", quantity: 21400 },
  metadata: { HKSyncIdentifier: "ride-key" },
  sourceRevision: {
    source: { name: "Garmin Connect", bundleIdentifier: "com.garmin" },
  },
};

function kit(workouts: readonly KitWorkout[], kcal: number | undefined) {
  const module = {
    isHealthDataAvailable: jest.fn(() => true),
    requestAuthorization: jest.fn(async () => true),
    queryWorkoutSamples: jest.fn(async () => workouts),
    queryStatisticsForQuantity: jest.fn(async () =>
      kcal === undefined ? {} : { sumQuantity: { unit: "kcal", quantity: kcal } },
    ),
  };
  return module as typeof module & EnergyKitModule;
}

test("an energy is read in kilocalories, whatever unit Health gives it in", () => {
  expect(kcalOf({ unit: "kcal", quantity: 530 })).toBe(530);
  expect(kcalOf({ unit: "Cal", quantity: 530 })).toBe(530);
  expect(kcalOf({ unit: "cal", quantity: 530000 })).toBe(530);
  expect(kcalOf({ unit: "kJ", quantity: 4184 })).toBe(1000);
  expect(kcalOf({ unit: "J", quantity: 4184 })).toBe(1);
  // Not an energy, or not a number: not known.
  expect(kcalOf({ unit: "km", quantity: 5 })).toBeNull();
  expect(kcalOf({ unit: "kcal", quantity: Number.NaN })).toBeNull();
  expect(kcalOf(undefined)).toBeNull();
});

test("a distance is read in metres", () => {
  expect(metresOf({ unit: "m", quantity: 21400 })).toBe(21400);
  expect(metresOf({ unit: "km", quantity: 21.4 })).toBeCloseTo(21400);
  expect(metresOf({ unit: "mi", quantity: 1 })).toBeCloseTo(1609.344);
  expect(metresOf({ unit: "kcal", quantity: 1 })).toBeNull();
  expect(metresOf(undefined)).toBeNull();
});

test("a workout is read with who wrote it and the key MuW gives its own", () => {
  expect(workoutFrom(RIDE)).toEqual({
    id: "A1",
    activityType: 13,
    startMs: START.getTime(),
    endMs: END.getTime(),
    kcal: 530.4,
    metres: 21400,
    sourceName: "Garmin Connect",
    sourceBundleId: "com.garmin",
    syncId: "ride-key",
  });
});

test("a workout with little said of it is still a workout", () => {
  expect(
    workoutFrom({
      uuid: "B2",
      workoutActivityType: 50,
      startDate: START,
      endDate: END,
    }),
  ).toEqual({
    id: "B2",
    activityType: 50,
    startMs: START.getTime(),
    endMs: END.getTime(),
    kcal: null,
    metres: null,
    sourceName: null,
    sourceBundleId: null,
    syncId: null,
  });
  // Moments that are not moments: not a workout.
  expect(workoutFrom({ ...RIDE, startDate: new Date("never") })).toBeNull();
  expect(workoutFrom({ ...RIDE, endDate: new Date(START.getTime() - 1) })).toBeNull();
});

test("the sheet asks to read workouts and active energy, and nothing else", async () => {
  const module = kit([], undefined);
  const reader = appleEnergyReader(module);
  expect(await reader.available()).toBe(true);
  await reader.ask();
  expect(module.requestAuthorization).toHaveBeenCalledWith({
    toRead: [WORKOUT_TYPE, ACTIVE_ENERGY_TYPE],
  });
});

test("the workouts of a stretch of time are the ones that began in it", async () => {
  const before: KitWorkout = {
    ...RIDE,
    uuid: "before",
    // Began the evening before and ended inside the day.
    startDate: new Date(2026, 10, 22, 23, 50),
    endDate: new Date(2026, 10, 23, 0, 30),
  };
  const module = kit([before, RIDE], undefined);
  const reader = appleEnergyReader(module);
  const from = new Date(2026, 10, 23).getTime();
  const to = new Date(2026, 10, 24).getTime();
  expect((await reader.workouts(from, to)).map((workout) => workout.id)).toEqual([
    "A1",
  ]);
  expect(module.queryWorkoutSamples).toHaveBeenCalledWith({
    filter: { date: { startDate: new Date(from), endDate: new Date(to) } },
    limit: 0,
    ascending: true,
  });
});

test("the active energy is Health's own sum, in kilocalories; none is none", async () => {
  const from = new Date(2026, 10, 23).getTime();
  const to = new Date(2026, 10, 24).getTime();
  const module = kit([], 684.2);
  expect(await appleEnergyReader(module).activeEnergy(from, to)).toBe(684.2);
  expect(module.queryStatisticsForQuantity).toHaveBeenCalledWith(
    ACTIVE_ENERGY_TYPE,
    ["cumulativeSum"],
    {
      filter: { date: { startDate: new Date(from), endDate: new Date(to) } },
      unit: "kcal",
    },
  );
  // A permission turned off, or a day without a watch: no data, not zero.
  expect(await appleEnergyReader(kit([], undefined)).activeEnergy(from, to)).toBeNull();
  expect(await appleEnergyReader(kit([], 0)).activeEnergy(from, to)).toBeNull();
});
