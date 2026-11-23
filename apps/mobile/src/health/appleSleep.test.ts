import { appleSleepReader, type SleepKitModule } from "./appleSleep";

// Apple Health as a reader of the sleep (TASK-467 part C), on a kit that
// answers as the library does.

type Found = Awaited<ReturnType<SleepKitModule["queryCategorySamples"]>>;

function kit(found: Found = [], changes: Partial<SleepKitModule> = {}) {
  return {
    isHealthDataAvailable: jest.fn(() => true),
    requestAuthorization: jest.fn(async () => true),
    queryCategorySamples: jest.fn(async () => found),
    ...changes,
  } satisfies SleepKitModule;
}

const at = (hour: number, minute = 0) => new Date(2026, 8, 21, hour, minute);

test("the phone is asked to read the sleep, and nothing else", async () => {
  const health = kit();
  await appleSleepReader(health).ask();
  expect(health.requestAuthorization).toHaveBeenCalledTimes(1);
  expect(health.requestAuthorization).toHaveBeenCalledWith({
    toRead: ["HKCategoryTypeIdentifierSleepAnalysis"],
  });
  // Nothing is written, and nothing is read by asking.
  expect(health.queryCategorySamples).not.toHaveBeenCalled();
});

test("the samples of the span, each with its stage; «in bed» is left out", async () => {
  const health = kit([
    { startDate: at(0), endDate: at(7), value: 0 },
    { startDate: at(0, 10), endDate: at(1), value: 3 },
    { startDate: at(1), endDate: at(2), value: 4 },
    { startDate: at(2), endDate: at(2, 10), value: 2 },
    { startDate: at(2, 10), endDate: at(3), value: 5 },
    { startDate: at(3), endDate: at(4), value: 1 },
    // A value a later iOS may add: not known, not sleep.
    { startDate: at(4), endDate: at(5), value: 9 },
  ]);
  const fromMs = at(0).getTime() - 86_400_000;
  const toMs = at(9).getTime();
  const samples = await appleSleepReader(health).samples(fromMs, toMs);
  expect(samples).toEqual([
    { fromMs: at(0, 10).getTime(), toMs: at(1).getTime(), stage: "light" },
    { fromMs: at(1).getTime(), toMs: at(2).getTime(), stage: "deep" },
    { fromMs: at(2).getTime(), toMs: at(2, 10).getTime(), stage: "awake" },
    { fromMs: at(2, 10).getTime(), toMs: at(3).getTime(), stage: "rem" },
    { fromMs: at(3).getTime(), toMs: at(4).getTime(), stage: "asleep" },
  ]);
  expect(health.queryCategorySamples).toHaveBeenCalledWith(
    "HKCategoryTypeIdentifierSleepAnalysis",
    {
      filter: { date: { startDate: new Date(fromMs), endDate: new Date(toMs) } },
      limit: 0,
      ascending: true,
    },
  );
  // Reading asks for no permission by itself.
  expect(health.requestAuthorization).not.toHaveBeenCalled();
});

test("a phone without health data says so", async () => {
  const none = kit([], { isHealthDataAvailable: jest.fn(() => false) });
  expect(await appleSleepReader(none).available()).toBe(false);
  expect(await appleSleepReader(kit()).available()).toBe(true);
  expect(appleSleepReader(kit()).store).toBe("apple");
});

test("a reading that fails is the caller's to tell", async () => {
  const failing = kit([], {
    queryCategorySamples: jest.fn(async () => {
      throw new Error("locked");
    }),
  });
  await expect(appleSleepReader(failing).samples(0, 1)).rejects.toThrow("locked");
});
