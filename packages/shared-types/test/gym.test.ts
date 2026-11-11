import assert from "node:assert/strict";
import { test } from "node:test";

import catalog from "../fixtures/gym-exercises.json" with { type: "json" };
import gymCalendar from "../fixtures/gym-calendar.json" with { type: "json" };
import gymLeaderboard from "../fixtures/gym-leaderboard.json" with { type: "json" };
import gymLevels from "../fixtures/gym-levels.json" with { type: "json" };
import gymPlans from "../fixtures/gym-plans.json" with { type: "json" };
import runActivities from "../fixtures/run-activities.json" with { type: "json" };
import session from "../fixtures/gym-session.json" with { type: "json" };
import {
  GYM_LEVEL_MEASURES,
  GYM_PLAN_MODES,
  GYM_RUN_KINDS,
  GYM_SET_KINDS,
  MAX_GYM_PLAN_ITEMS,
  MAX_GYM_PLAN_WEEKS,
  MAX_GYM_PLANS,
  MAX_GYM_PROGRAM_ITEMS,
  type GymCalendar,
  type GymLeaderboard,
  type GymLevel,
  type GymPlans,
  type GymSessionRequest,
  type GymSetKind,
  RUN_ACTIVITIES,
  TRACKLESS_ACTIVITIES,
  type TracklessActivity,
} from "../src/index.ts";
import { TRACKLESS_SPORTS } from "../src/sports/index.ts";

// The same fixtures are checked by the API's test_gym_catalog.py and
// test_gym.py (TASK-385, ADR-0327).

test("a workout at the gym is the activity saved without a track", () => {
  assert.deepEqual([...TRACKLESS_ACTIVITIES], runActivities.trackless_activities);
  assert.deepEqual(
    TRACKLESS_SPORTS.map((sport) => sport.trackless),
    [true],
  );
  // One of RUN_ACTIVITIES since the app shows a post without a line (B0),
  // after all those with a track.
  assert.deepEqual(RUN_ACTIVITIES.slice(-TRACKLESS_ACTIVITIES.length), [
    ...TRACKLESS_ACTIVITIES,
  ]);
  const gym: TracklessActivity = "gym";
  assert.equal(gym, "gym");
});

test("the example workout is a request of the contract", () => {
  const request: GymSessionRequest = {
    ...session,
    sets: session.sets.map((item) => ({ ...item, kind: item.kind as GymSetKind })),
  };
  assert.ok(Date.parse(request.ended_at) > Date.parse(request.started_at));
  for (const item of request.sets ?? []) {
    assert.ok(GYM_SET_KINDS.includes(item.kind));
    assert.ok((item.exercise === undefined) !== (item.name === undefined));
  }
});

test("the catalog names each exercise once, of a kind and a scale it has", () => {
  const keys = catalog.exercises.map((exercise) => exercise.key);
  assert.equal(keys.length, 91);
  assert.equal(new Set(keys).size, keys.length);
  for (const exercise of catalog.exercises) {
    assert.ok(
      (GYM_SET_KINDS as readonly string[]).includes(exercise.kind),
      exercise.key,
    );
    if (exercise.scale !== null) {
      assert.ok(exercise.scale in catalog.scales, exercise.key);
    }
  }
  for (const scale of Object.values(catalog.scales)) {
    assert.equal(scale.levels.length, catalog.figures.length);
    assert.deepEqual(
      [...scale.levels].sort((a, b) => a - b),
      scale.levels,
    );
  }
});

test("a level on the profile is the one its value reaches on its scale", () => {
  const levels = gymLevels.gym_levels as GymLevel[];
  assert.ok(levels.length > 0);
  const scales: Record<
    string,
    { measure: string; levels: number[]; cap: number | null }
  > = catalog.scales;
  for (const level of levels) {
    assert.ok(GYM_LEVEL_MEASURES.includes(level.measure));
    const exercise = catalog.exercises.find((item) => item.key === level.exercise);
    assert.ok(exercise?.scale, level.exercise);
    const scale = scales[exercise.scale];
    assert.equal(scale.measure, level.measure);
    const reached = scale.levels.filter((step) => level.value >= step).length;
    assert.equal(level.level, reached, level.exercise);
    assert.ok(level.level >= 1 && level.level <= catalog.figures.length);
  }
  // The highest level first.
  const order = levels.map((level) => level.level);
  assert.deepEqual(
    order,
    [...order].sort((a, b) => b - a),
  );
});

test("a leaderboard ranks the best first, measured as its exercise's scale", () => {
  const board: GymLeaderboard = {
    ...gymLeaderboard,
    measure: gymLeaderboard.measure as GymLeaderboard["measure"],
  };
  const exercise = catalog.exercises.find((item) => item.key === board.exercise);
  assert.ok(exercise?.scale);
  const scales: Record<string, { measure: string }> = catalog.scales;
  assert.equal(scales[exercise.scale].measure, board.measure);
  assert.match(board.month, /^\d{4}-(0[1-9]|1[0-2])$/);
  const ranks = board.rows.map((row) => row.rank);
  assert.deepEqual(
    ranks,
    [...ranks].sort((a, b) => a - b),
  );
  const values = board.rows.map((row) => row.value);
  assert.deepEqual(
    values,
    [...values].sort((a, b) => b - a),
  );
  assert.ok(board.people >= board.rows.length);
  assert.ok(board.rows.some((row) => row.rank === board.mine?.rank));
});

test("a calendar lists its days in order, and its count and time add up", () => {
  const calendar: GymCalendar = gymCalendar;
  assert.match(calendar.month, /^\d{4}-(0[1-9]|1[0-2])$/);
  const days = calendar.days.map((day) => day.day);
  assert.deepEqual(
    days,
    [...days].sort((a, b) => a - b),
  );
  const workouts = calendar.days.flatMap((day) => day.workouts);
  assert.ok(calendar.days.every((day) => day.workouts.length > 0));
  assert.equal(calendar.count, workouts.length);
  assert.equal(
    calendar.duration_s,
    workouts.reduce((total, workout) => total + workout.duration_s, 0),
  );
  assert.deepEqual(calendar.last, workouts.at(-1));
  for (const skipped of calendar.skipped ?? []) {
    assert.ok(
      !calendar.days.some(
        (day) =>
          day.day === skipped.day && day.workouts.some((w) => w.plan === skipped.plan),
      ),
    );
  }
});

test("a plan's days are of the week once, its exercises of the catalog and its kind", () => {
  const plans = gymPlans as GymPlans;
  assert.ok(plans.plans.length <= MAX_GYM_PLANS);
  for (const plan of plans.plans) {
    assert.ok(plan.name.length >= 1 && plan.name.length <= 40);
    assert.ok(plan.days.every((day) => day >= 1 && day <= 7));
    assert.equal(new Set(plan.days).size, plan.days.length);
    assert.ok(plan.items.length <= MAX_GYM_PLAN_ITEMS);
    const program = plan.program ?? null;
    const sessions =
      program === null
        ? []
        : [...program.sessions, ...program.custom.flatMap((week) => week.sessions)];
    const items = [...plan.items, ...sessions.flatMap((one) => one.items)];
    for (const item of items) {
      assert.ok(item.sets >= 1 && item.sets <= 20);
      assert.ok((item.exercise === undefined) !== (item.name === undefined));
      if (item.exercise !== undefined) {
        const exercise = catalog.exercises.find((one) => one.key === item.exercise);
        assert.equal(exercise?.kind, item.kind);
      }
    }
    if (program !== null) {
      // The days kept are the program's, its weeks of its cycle.
      assert.deepEqual(plan.days, [...new Set(sessions.map((one) => one.day))].sort());
      assert.ok(program.weeks >= 1 && program.weeks <= MAX_GYM_PLAN_WEEKS);
      assert.ok((GYM_PLAN_MODES as readonly string[]).includes(program.mode));
      assert.ok(
        program.custom.every((week) => week.week >= 2 && week.week <= program.weeks),
      );
      assert.ok(sessions.length > 0 && items.length <= MAX_GYM_PROGRAM_ITEMS);
      if (program.runner !== undefined) {
        // A pace of 3:00 to 15:00 a km; the long run a distance or a time.
        const { pace_10k_s, long_m, long_s } = program.runner;
        assert.ok(pace_10k_s >= 180 && pace_10k_s <= 900);
        assert.ok((long_m === undefined) !== (long_s === undefined));
      }
      for (const session of sessions) {
        if (session.run !== undefined) {
          // A run day has no exercises, and a distance, a time or its reps.
          assert.equal(session.items.length, 0);
          assert.ok((GYM_RUN_KINDS as readonly string[]).includes(session.run.kind));
          const { distance_m, duration_s, reps } = session.run;
          assert.ok(
            session.run.kind === "intervals"
              ? reps !== undefined
              : (distance_m === undefined) !== (duration_s === undefined),
          );
        }
      }
    }
  }
});
