import type {
  GymPause,
  GymPlanItem,
  GymSessionRequest,
  GymSet,
} from "@shaperoute/shared-types";

import {
  type Rest,
  restFor,
  restOver,
  restTakenS,
  shiftRest,
  startRest,
} from "./restTimer";
import {
  type Entry,
  entryKey,
  entryOf,
  sameEntry,
  type SetValues,
  setOf,
  valuesOf,
} from "./setKinds";

/**
 * A workout at the gym as the phone keeps it while it lasts (TASK-385 part
 * B, ADR-0327): when it began, its pauses, the exercise being done, the
 * sets, the rest under way and the rests counted. No GPS: the time is that
 * of the clock. Every change is a new value, so the screen, the file and
 * the tests read the same thing. The choices are the user's (2026-11-04):
 * a rest is no pause and the clock runs through it; a set or a rest ends
 * a «Pause»; after 30 minutes with nothing «Still training?», and without
 * an answer the workout ends at its last set.
 */

/** A set of the workout, with the number the screen tells it by. */
export type LoggedSet = GymSet & { n: number };

/** A «Pause», in ms since the epoch; `toMs` null while it lasts. */
export type WorkoutPause = { fromMs: number; toMs: number | null };

/** The plan a workout follows (TASK-411 C, ADR-0341 point 4): copied when
 * it starts, so changing the plan later leaves the workout as it was. */
export type WorkoutPlan = { key: string; name: string; items: GymPlanItem[] };

export type Workout = {
  /** Its key on the API (gymKey.ts). */
  key: string;
  startedMs: number;
  pauses: WorkoutPause[];
  /** The exercise being done; null before the first «+ Exercise». */
  current: Entry | null;
  sets: LoggedSet[];
  /** The rest under way; null between rests. */
  rest: Rest | null;
  /** The rests counted, and their seconds summed. */
  rests: number;
  restS: number;
  /** The last rest chosen for each exercise, by entryKey. */
  restChoices: Record<string, number>;
  /** The last thing done: a set, a rest, an answer. «Still training?»
   * counts from it. */
  lastActiveMs: number;
  /** When it ended («Finish workout», or no answer); null while it lasts. */
  endedMs: number | null;
  /** The number of the next set. */
  nextN: number;
  /** The plan it follows; absent or null for a free workout. */
  plan?: WorkoutPlan | null;
};

/** «Still training?» after this long with nothing. */
export const STILL_AFTER_MS = 30 * 60_000;
/** Without an answer for this long after the question, it ends. */
export const ANSWER_MS = 5 * 60_000;
/** The longest workout the API keeps (gym_sessions.py MAX_WORKOUT). */
export const MAX_WORKOUT_MS = 24 * 3_600_000;

export function newWorkout(
  key: string,
  nowMs: number,
  plan: WorkoutPlan | null = null,
): Workout {
  const first = plan?.items[0];
  return {
    key,
    startedMs: nowMs,
    pauses: [],
    // A plan begins with its first exercise.
    current: first === undefined ? null : entryOf(first),
    sets: [],
    rest: null,
    rests: 0,
    restS: 0,
    restChoices: {},
    lastActiveMs: nowMs,
    endedMs: null,
    nextN: 1,
    ...(plan === null ? {} : { plan }),
  };
}

/** How many sets of each item of the plan are done, in order: a set counts
 * for the first item of its exercise still short of its sets. */
function planDone(workout: Workout): number[] {
  const items = workout.plan?.items ?? [];
  const done = items.map(() => 0);
  for (const set of workout.sets) {
    const entry = entryOf(set);
    const index = items.findIndex(
      (item, i) => done[i] < item.sets && sameEntry(entryOf(item), entry),
    );
    if (index >= 0) {
      done[index] += 1;
    }
  }
  return done;
}

/** «Plan: {done}/{total} sets»; null for a free workout. */
export function planProgress(workout: Workout): { done: number; total: number } | null {
  const items = workout.plan?.items;
  if (items === undefined || items.length === 0) {
    return null;
  }
  return {
    done: planDone(workout).reduce((sum, n) => sum + n, 0),
    total: items.reduce((sum, item) => sum + item.sets, 0),
  };
}

/** The first item of the plan not finished; null for a free workout or a
 * plan done. */
export function nextPlanItem(workout: Workout): GymPlanItem | null {
  const items = workout.plan?.items ?? [];
  const done = planDone(workout);
  return items.find((item, i) => done[i] < item.sets) ?? null;
}

/** The values the plan aims at for `entry`, from its first item of it not
 * finished; null when the plan has none. */
export function planTarget(workout: Workout, entry: Entry): SetValues | null {
  const items = workout.plan?.items ?? [];
  const done = planDone(workout);
  const item =
    items.find((one, i) => done[i] < one.sets && sameEntry(entryOf(one), entry)) ??
    items.find((one) => sameEntry(entryOf(one), entry));
  if (item === undefined) {
    return null;
  }
  const { exercise: _e, name: _n, kind: _k, sets: _s, ...values } = item;
  return Object.keys(values).length === 0 ? null : (values as SetValues);
}

/** Where the exercise under way is in the plan (part F): «Set 2 of 4», and
 * the plan's next exercise not finished after it; null when it is not of
 * the plan, or the plan is done with it. */
export function planStep(
  workout: Workout,
): { set: number; sets: number; then: GymPlanItem | null } | null {
  const current = workout.current;
  const items = workout.plan?.items ?? [];
  if (current === null || items.length === 0) {
    return null;
  }
  const done = planDone(workout);
  const index = items.findIndex(
    (item, i) => done[i] < item.sets && sameEntry(entryOf(item), current),
  );
  if (index < 0) {
    return null;
  }
  return {
    set: done[index] + 1,
    sets: items[index].sets,
    then: items.find((item, i) => i > index && done[i] < item.sets) ?? null,
  };
}

/** After a set: when the plan's exercise under way has all its sets, the
 * next one of the plan is the exercise under way. */
function followPlan(workout: Workout): Workout {
  const current = workout.current;
  if (current === null || workout.plan == null) {
    return workout;
  }
  const items = workout.plan.items;
  const done = planDone(workout);
  const open = items.some(
    (item, i) => done[i] < item.sets && sameEntry(entryOf(item), current),
  );
  const next = nextPlanItem(workout);
  return open || next === null ? workout : { ...workout, current: entryOf(next) };
}

/** Whether the workout is in «Pause». */
export function isPaused(workout: Workout): boolean {
  return workout.pauses.some((pause) => pause.toMs === null);
}

/** The ms of «Pause» in it up to `nowMs`. */
function pausedMs(workout: Workout, nowMs: number): number {
  return workout.pauses.reduce(
    (total, pause) => total + Math.max(0, (pause.toMs ?? nowMs) - pause.fromMs),
    0,
  );
}

/** Its time at `nowMs` (or at its end): from start to now without the
 * pauses; the rests are in it. */
export function activeMs(workout: Workout, nowMs: number): number {
  const end = workout.endedMs ?? nowMs;
  return Math.max(0, end - workout.startedMs - pausedMs(workout, end));
}

/** Seconds since it began, as the API counts a set's `at_s`. */
function secondsAt(workout: Workout, nowMs: number): number {
  return Math.max(0, Math.round((nowMs - workout.startedMs) / 1000));
}

/** The rest under way counted, if it is over or cut short at `nowMs`. */
function endRest(workout: Workout, nowMs: number): Workout {
  if (workout.rest === null) {
    return workout;
  }
  const taken = restTakenS(workout.rest, nowMs);
  return {
    ...workout,
    rest: null,
    rests: taken > 0 ? workout.rests + 1 : workout.rests,
    restS: workout.restS + taken,
  };
}

/** A rest that ran out while nobody looked, counted. */
export function settle(workout: Workout, nowMs: number): Workout {
  return workout.rest !== null && restOver(workout.rest, nowMs)
    ? endRest(workout, workout.rest.endsMs)
    : workout;
}

function closePause(workout: Workout, nowMs: number): Workout {
  return isPaused(workout)
    ? {
        ...workout,
        pauses: workout.pauses.map((pause) =>
          pause.toMs === null ? { ...pause, toMs: nowMs } : pause,
        ),
      }
    : workout;
}

/** «Pause»: everything stops, the rest under way too. */
export function pauseWorkout(workout: Workout, nowMs: number): Workout {
  if (isPaused(workout) || workout.endedMs !== null) {
    return workout;
  }
  const rested = endRest(workout, nowMs);
  return {
    ...rested,
    pauses: [...rested.pauses, { fromMs: nowMs, toMs: null }],
    lastActiveMs: nowMs,
  };
}

/** Back from «Pause». */
export function resumeWorkout(workout: Workout, nowMs: number): Workout {
  return { ...closePause(workout, nowMs), lastActiveMs: nowMs };
}

/** «+ Exercise»: `entry` is what the next sets are of. */
export function chooseExercise(workout: Workout, entry: Entry, nowMs: number): Workout {
  return { ...workout, current: entry, lastActiveMs: nowMs };
}

/** The sets of `entry`, in order. */
export function setsOf(workout: Workout, entry: Entry): LoggedSet[] {
  return workout.sets.filter((set) => sameEntry(entryOf(set), entry));
}

/** The number «Set {n}» of the next set of the current exercise. */
export function nextSetNumber(workout: Workout): number {
  return workout.current === null ? 1 : setsOf(workout, workout.current).length + 1;
}

/** The last rest chosen for `entry`. */
export function restSecondsFor(workout: Workout, entry: Entry): number {
  return restFor(workout.restChoices, entryKey(entry));
}

/**
 * «Log set»: a set of the current exercise with `values`; null when there
 * is none or the values are not a set. A «Pause» ends, a rest under way
 * ends, and the rest of this exercise starts by itself. After the end
 * (corrections before «Save») it is no live set and no rest starts.
 */
export function logSet(
  workout: Workout,
  values: SetValues,
  nowMs: number,
): Workout | null {
  if (workout.current === null) {
    return null;
  }
  if (workout.endedMs !== null) {
    return addAfter(workout, workout.current, values);
  }
  const set = setOf(workout.current, values, secondsAt(workout, nowMs), true);
  if (set === null) {
    return null;
  }
  const going = endRest(closePause(workout, nowMs), nowMs);
  return followPlan({
    ...going,
    sets: [...going.sets, { ...set, n: going.nextN }],
    nextN: going.nextN + 1,
    rest: startRest(nowMs, restSecondsFor(going, workout.current)),
    lastActiveMs: nowMs,
  });
}

/** A set added at the end, before «Save»: not live (it will not count for
 * the leaderboard), logged at the end of the workout. */
function addAfter(workout: Workout, entry: Entry, values: SetValues): Workout | null {
  const endS = workout.endedMs === null ? 0 : secondsAt(workout, workout.endedMs);
  const set = setOf(entry, values, endS, false);
  if (set === null) {
    return null;
  }
  return {
    ...workout,
    sets: [...workout.sets, { ...set, n: workout.nextN }],
    nextN: workout.nextN + 1,
  };
}

/** What «Same again» types: the last set of the current exercise. */
export function sameAgainValues(workout: Workout): SetValues | null {
  if (workout.current === null) {
    return null;
  }
  const last = setsOf(workout, workout.current).at(-1);
  return last === undefined ? null : valuesOf(last);
}

/** A set corrected; null when the values are not a set. Its time and
 * whether it was live stay. */
export function editSet(
  workout: Workout,
  n: number,
  values: SetValues,
): Workout | null {
  const old = workout.sets.find((set) => set.n === n);
  if (old === undefined) {
    return null;
  }
  const set = setOf(entryOf(old), values, old.at_s, old.live);
  if (set === null) {
    return null;
  }
  return {
    ...workout,
    sets: workout.sets.map((item) => (item.n === n ? { ...set, n } : item)),
  };
}

export function deleteSet(workout: Workout, n: number): Workout {
  return { ...workout, sets: workout.sets.filter((set) => set.n !== n) };
}

/** A rest of `seconds` now, by hand («Rest», a duration chosen): the
 * duration is remembered for the current exercise. It ends a «Pause». */
export function restNow(workout: Workout, seconds: number, nowMs: number): Workout {
  const going = endRest(closePause(workout, nowMs), nowMs);
  const rest = startRest(nowMs, seconds);
  const chosen = Math.round((rest.endsMs - rest.fromMs) / 1000);
  return {
    ...going,
    rest,
    restChoices:
      workout.current === null
        ? going.restChoices
        : { ...going.restChoices, [entryKey(workout.current)]: chosen },
    lastActiveMs: nowMs,
  };
}

/** «−15 s» / «+15 s». */
export function shiftWorkoutRest(
  workout: Workout,
  deltaS: number,
  nowMs: number,
): Workout {
  return workout.rest === null
    ? workout
    : { ...workout, rest: shiftRest(workout.rest, deltaS, nowMs), lastActiveMs: nowMs };
}

/** «Skip»: the rest ends now, counted as long as it lasted. */
export function skipRest(workout: Workout, nowMs: number): Workout {
  return { ...endRest(workout, nowMs), lastActiveMs: nowMs };
}

/** Whether to ask «Still training?» at `nowMs`. */
export function stillAsking(workout: Workout, nowMs: number): boolean {
  return (
    workout.endedMs === null &&
    (workout.rest === null || restOver(workout.rest, nowMs)) &&
    nowMs - workout.lastActiveMs >= STILL_AFTER_MS
  );
}

/** «Yes, keep going». */
export function stillTraining(workout: Workout, nowMs: number): Workout {
  return { ...workout, lastActiveMs: nowMs };
}

/** Whether nobody answered «Still training?», or it lasted the most the
 * API keeps: it ends by itself. */
export function unanswered(workout: Workout, nowMs: number): boolean {
  return (
    workout.endedMs === null &&
    (nowMs - workout.lastActiveMs >= STILL_AFTER_MS + ANSWER_MS ||
      nowMs - workout.startedMs >= MAX_WORKOUT_MS)
  );
}

/** «Finish workout» at `endMs`: the pause and the rest under way end. */
export function finishWorkout(workout: Workout, endMs: number): Workout {
  if (workout.endedMs !== null) {
    return workout;
  }
  const end = Math.min(endMs, workout.startedMs + MAX_WORKOUT_MS);
  const ended = endRest(closePause(workout, end), end);
  return { ...ended, endedMs: end };
}

/** Ended by itself, with nobody there: at its last set, or at the last
 * thing done when there is none; a second after it began at the least. */
export function closeUnanswered(workout: Workout): Workout {
  const last = workout.sets.at(-1);
  const endMs =
    last === undefined ? workout.lastActiveMs : workout.startedMs + last.at_s * 1000;
  return finishWorkout(workout, Math.max(workout.startedMs + 1000, endMs));
}

/** Whether there is anything to «Save»: a second of time at least. */
export function savable(workout: Workout): boolean {
  return workout.endedMs !== null && workout.endedMs - workout.startedMs >= 1000;
}

/** PUT /me/gym-sessions/{key} for an ended workout, in the API's terms:
 * pauses and sets in seconds since the start, within it. */
export function sessionRequest(workout: Workout): GymSessionRequest | null {
  if (workout.endedMs === null || !savable(workout)) {
    return null;
  }
  const endedMs = workout.endedMs;
  const endS = (endedMs - workout.startedMs) / 1000;
  const pauses: GymPause[] = workout.pauses
    .map((pause) => ({
      from_s: Math.max(0, (pause.fromMs - workout.startedMs) / 1000),
      to_s: Math.min(endS, ((pause.toMs ?? endedMs) - workout.startedMs) / 1000),
    }))
    .filter((pause) => pause.to_s > pause.from_s);
  return {
    started_at: new Date(workout.startedMs).toISOString(),
    ended_at: new Date(endedMs).toISOString(),
    pauses,
    rests: workout.rests,
    rest_s: workout.restS,
    show_exercises: true,
    sets: workout.sets.map(({ n: _n, ...set }) => ({
      ...set,
      at_s: Math.min(set.at_s, Math.floor(endS)),
    })),
    ...(workout.plan == null ? {} : { plan: workout.plan.key }),
  };
}
