import {
  appleHeartReader,
  type HeartKitModule,
  type HeartReader,
  heartSummary,
  inWindow,
  readHeart,
} from "./heartSamples";

// TASK-409 part B, ADR-0334 precisazione D: the heart rate a watch wrote in
// Apple Health during a swim, read back after it.

const T0 = Date.UTC(2026, 10, 8, 7);
const S = 1000;

const at = (s: number, bpm: number) => ({ fromMs: T0 + s * S, toMs: T0 + s * S, bpm });

test("only the readings of the window count, out of the pauses and in the limits", () => {
  const samples = [
    at(30, 140),
    at(-5, 100), // before the start
    at(10, 120),
    at(65, 150), // in the pause
    at(130, 160), // after the end
    at(20, 29), // under 30
    at(25, 231), // over 230
    at(90, 155),
  ];
  expect(
    inWindow(samples, T0, T0 + 120 * S, [{ fromMs: T0 + 60 * S, toMs: T0 + 80 * S }]),
  ).toEqual([at(10, 120), at(30, 140), at(90, 155)]);
});

test("the average and the maximum, whole; none without readings", () => {
  expect(heartSummary([at(0, 140), at(5, 150), at(10, 161)])).toEqual({
    avgBpm: 150,
    maxBpm: 161,
  });
  expect(heartSummary([])).toBeNull();
  // Readings with decimals: the average never passes the maximum.
  expect(heartSummary([at(0, 140.6), at(5, 140.6)])).toEqual({
    avgBpm: 141,
    maxBpm: 141,
  });
});

function fakeKit(found: { startDate: Date; endDate: Date; quantity: number }[]) {
  const kit = {
    isHealthDataAvailable: jest.fn(() => true),
    requestAuthorization: jest.fn(async () => true),
    queryQuantitySamples: jest.fn(async () => found),
  };
  return kit satisfies HeartKitModule;
}

test("Apple Health asks to read the heart rate only, and gives its readings", async () => {
  const kit = fakeKit([
    { startDate: new Date(T0 + 5 * S), endDate: new Date(T0 + 5 * S), quantity: 142 },
  ]);
  const reader = appleHeartReader(kit);
  expect(reader.store).toBe("apple");
  expect(await reader.available()).toBe(true);
  await reader.ask();
  expect(kit.requestAuthorization).toHaveBeenCalledWith({
    toRead: ["HKQuantityTypeIdentifierHeartRate"],
  });
  expect(await reader.samples(T0, T0 + 60 * S)).toEqual([at(5, 142)]);
  expect(kit.queryQuantitySamples).toHaveBeenCalledWith(
    "HKQuantityTypeIdentifierHeartRate",
    expect.objectContaining({
      filter: { date: { startDate: new Date(T0), endDate: new Date(T0 + 60 * S) } },
      unit: "count/min",
    }),
  );
});

test("a reader that fails, or reading refused, gives no readings", async () => {
  const failing: HeartReader = {
    store: "apple",
    available: async () => true,
    ask: async () => {},
    samples: async () => {
      throw new Error("no");
    },
  };
  expect(await readHeart(failing, T0, T0 + 60 * S)).toEqual([]);
  // Refused, Apple Health just answers with nothing.
  expect(await readHeart(appleHeartReader(fakeKit([])), T0, T0 + 60 * S)).toEqual([]);
});
