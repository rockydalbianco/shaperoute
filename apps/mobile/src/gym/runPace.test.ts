import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan, GymProgram } from "@shaperoute/shared-types";

import {
  clock,
  DEFAULT_RUNNER,
  fasterRunner,
  paceOf,
  runFor,
  runnerFromRuns,
  timeOf,
  withRunner,
} from "./runPace";

// The run days made for their runner (TASK-452): paces from the pace over
// 10 km, the long run theirs, and new paces proposed from the runs saved.

const [, , , LIFT_AND_RUN] = plans.plans as GymPlan[];
const PROGRAM = LIFT_AND_RUN.program as GymProgram;
const RUNNER = { pace_10k_s: 330, long_m: 12000 };

test("the paces of each kind come from the pace over 10 km", () => {
  expect(clock(paceOf({ kind: "easy", distance_m: 6000 }, RUNNER))).toBe("6:35");
  expect(clock(paceOf({ kind: "long", distance_m: 12000 }, RUNNER))).toBe("6:45");
  expect(clock(paceOf({ kind: "intervals", reps: 6, rep_m: 400 }, RUNNER))).toBe(
    "5:05",
  );
  expect(clock(paceOf({ kind: "intervals", reps: 4, rep_m: 800 }, RUNNER))).toBe(
    "5:15",
  );
  expect(clock(paceOf({ kind: "intervals", reps: 3, rep_m: 1000 }, RUNNER))).toBe(
    "5:20",
  );
  expect(clock(paceOf({ kind: "intervals", reps: 8, rep_s: 90 }, RUNNER))).toBe("5:10");
});

test("how long a run takes at its pace", () => {
  expect(timeOf({ kind: "long", distance_m: 13000 }, 405)).toBe("≈ 1 h 28");
  expect(timeOf({ kind: "easy", distance_m: 5000 }, 395)).toBe("≈ 33 min");
  expect(timeOf({ kind: "intervals", reps: 6, rep_m: 400 }, 305)).toBeNull();
  expect(timeOf({ kind: "easy", duration_s: 1800 }, 395)).toBeNull();
});

test("the long run is theirs, the easy run about half of it", () => {
  expect(runFor({ kind: "long", distance_m: 8000 }, RUNNER)).toEqual({
    kind: "long",
    distance_m: 12000,
  });
  expect(runFor({ kind: "easy", distance_m: 5000 }, RUNNER)).toEqual({
    kind: "easy",
    distance_m: 6000,
  });
  // Never under 3 km; by time, half the minutes.
  expect(
    runFor({ kind: "easy", distance_m: 5000 }, { pace_10k_s: 420, long_m: 4000 }),
  ).toEqual({ kind: "easy", distance_m: 3000 });
  expect(
    runFor({ kind: "long", distance_m: 8000 }, { pace_10k_s: 330, long_s: 5400 }),
  ).toEqual({ kind: "long", duration_s: 5400 });
  expect(
    runFor({ kind: "easy", distance_m: 5000 }, { pace_10k_s: 330, long_s: 5400 }),
  ).toEqual({ kind: "easy", duration_s: 2700 });
  const intervals = { kind: "intervals", reps: 6, rep_m: 400 } as const;
  expect(runFor(intervals, RUNNER)).toBe(intervals);
});

test("a program made for its runner keeps the runner, fits its run days", () => {
  const made = withRunner(PROGRAM, DEFAULT_RUNNER);
  expect(made.runner).toEqual(DEFAULT_RUNNER);
  const runs = made.sessions
    .filter((one) => one.run !== undefined)
    .map((one) => one.run);
  expect(runs).toEqual([
    { kind: "easy", distance_m: 6000 },
    { kind: "intervals", reps: 6, rep_m: 400 },
    { kind: "long", distance_m: 12000 },
  ]);
  // The gym's workouts as they were.
  expect(made.sessions[0]).toBe(PROGRAM.sessions[0]);
});

const NOW = new Date("2026-11-26T12:00:00Z");
const run = (daysAgo: number, km: number, minutes: number, activity?: string) => ({
  started_at: new Date(NOW.getTime() - daysAgo * 86400000).toISOString(),
  distance_m: km * 1000,
  duration_s: minutes * 60,
  ...(activity === undefined ? {} : { activity }),
});

test("the runs of the last four weeks say the runner", () => {
  // 10 km in 52 minutes: 5:12/km; a 5 km in 25 minutes is better over 10.
  const said = runnerFromRuns([run(3, 10, 52), run(10, 5, 25), run(20, 14, 84)], NOW);
  expect(said).toEqual({ pace_10k_s: 312, long_m: 14000 });
  // Too short, too old, not running: nothing.
  expect(
    runnerFromRuns([run(2, 2, 10), run(40, 10, 50), run(1, 20, 60, "cycling")], NOW),
  ).toBeNull();
});

test("new paces are proposed at the end of a cycle, only when faster", () => {
  // The program starts on Monday 2 November: the 26th is in week 4 of 4.
  const program = withRunner(PROGRAM, RUNNER);
  const faster = fasterRunner(program, [run(3, 10, 52)], NOW);
  expect(faster).toEqual({ runner: { pace_10k_s: 312, long_m: 12000 }, cycle: 0 });
  // Not in the last week; not faster by 5 s/km; no runner.
  expect(
    fasterRunner(program, [run(3, 10, 52)], new Date("2026-11-18T12:00:00Z")),
  ).toBeNull();
  expect(fasterRunner(program, [run(3, 10, 54.7)], NOW)).toBeNull();
  expect(fasterRunner(PROGRAM_WITHOUT_RUNNER, [run(3, 10, 52)], NOW)).toBeNull();
});

const { runner: _runner, ...PROGRAM_WITHOUT_RUNNER } = PROGRAM;
