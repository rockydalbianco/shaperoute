import { EXERCISES, MORE_EXERCISES, sessionSeconds } from "./exercises";
import { MINUTES, routine, routineExercises, ROUTINES } from "./routines";

describe("the stretching routines", () => {
  it("are «Morning», «After run» and «After gym»", () => {
    expect(ROUTINES.map((r) => r.key)).toEqual(["morning", "afterRun", "afterGym"]);
    expect(ROUTINES.map((r) => r.name)).toEqual(["Morning", "After run", "After gym"]);
  });

  it("come close to the minutes they say, never much over", () => {
    for (const { key } of ROUTINES) {
      for (const minutes of MINUTES) {
        const seconds = sessionSeconds(routineExercises(key, minutes));
        expect({ key, minutes, ok: seconds >= minutes * 54 }).toEqual({
          key,
          minutes,
          ok: true,
        });
        expect({ key, minutes, ok: seconds <= minutes * 63 }).toEqual({
          key,
          minutes,
          ok: true,
        });
      }
    }
  });

  it("hold every stretch at least 20 seconds and add more as they grow", () => {
    for (const { key } of ROUTINES) {
      const [short, middle, long] = MINUTES.map((m) => routineExercises(key, m));
      for (const exercise of [...short, ...middle, ...long]) {
        expect(exercise.seconds).toBeGreaterThanOrEqual(20);
      }
      expect(middle.length).toBeGreaterThanOrEqual(short.length);
      expect(long.length).toBeGreaterThan(middle.length);
    }
  });

  it("never do one stretch twice", () => {
    for (const { key } of ROUTINES) {
      for (const minutes of MINUTES) {
        const keys = routineExercises(key, minutes).map((e) => e.key);
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it("use every one of the fifteen stretches", () => {
    const used = new Set(
      ROUTINES.flatMap(({ key }) =>
        MINUTES.flatMap((m) => routineExercises(key, m).map((e) => e.key)),
      ),
    );
    expect(used).toEqual(new Set([...EXERCISES, ...MORE_EXERCISES].map((e) => e.key)));
    expect(used.size).toBe(15);
  });

  it("stretch the legs after a run and the arms after the gym", () => {
    expect(routineExercises("afterRun", 3)[0].key).toBe("quad");
    expect(routineExercises("afterGym", 3).map((e) => e.key)).toContain("triceps");
    expect(routine("morning").plans[3].keys[0]).toBe("overheadReach");
  });

  it("leave the stretches they take from unchanged", () => {
    const before = EXERCISES.map((e) => e.seconds);
    routineExercises("afterRun", 10);
    expect(EXERCISES.map((e) => e.seconds)).toEqual(before);
  });
});
