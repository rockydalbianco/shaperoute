import { exerciseByKey } from "./allExercises";
import { CATEGORIES, type Category } from "./categories";
import { type Exercise, sessionSeconds } from "./exercises";

/**
 * A stretching routine made from a category and a few choices (TASK-520,
 * ADR-0415): how long, how hard, and whether there is a mat. Nobody wrote
 * the routines one by one: a category is an ordered list of exercises
 * (`categories.ts`), and the same choices always give the same routine.
 *
 * How it goes: the exercises that fit the choices are taken from the top of
 * the category's list, with one hold for all of them near the one the
 * length and the level ask for, as many and held as long as it takes so that
 * the session on the screen (`sessionSeconds`: «Get ready», holds, «Switch
 * sides») fills the minutes. A short list is held longer than its level is
 * easy with before it goes round a second time, and a third at most;
 * when even that does not fill the minutes, that length is not offered
 * that way. Each round is done standing first and on the floor after,
 * the rests last.
 */

export type Level = "gentle" | "intense";
/** With a mat, anywhere; or standing and on a chair only. */
export type Where = "any" | "standing";
export type Choice = { minutes: number; level: Level; where: Where };

/** Fewer exercises than this is not a routine: the choice is not offered. */
export const MIN_EXERCISES = 3;
/** How many times a short list may go round. */
export const MAX_ROUNDS = 3;
/** How far from its minutes a routine may end, in seconds. */
export function slack(minutes: number): number {
  return Math.max(20, minutes * 3);
}

/** The holds a routine may have, in seconds. */
export const HOLDS: readonly number[] = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
/** The longest hold a level is easy with; longer only to fill the minutes. */
export const EASY: Readonly<Record<Level, number>> = { gentle: 40, intense: 60 };

/** The hold a length starts from, before it is fitted to the minutes. */
function firstHold(minutes: number, level: Level): number {
  const gentle = minutes <= 3 ? 20 : minutes <= 5 ? 25 : minutes <= 15 ? 30 : 35;
  return level === "gentle" ? gentle : gentle + 10;
}

/** The category with this key. */
export function category(key: string): Category {
  const found = CATEGORIES.find((c) => c.key === key);
  if (found === undefined) {
    throw new Error(`no stretching category ${key}`);
  }
  return found;
}

/** A category's exercises, in its order. */
function all(of: Category): Exercise[] {
  return of.exercises.map((key) => {
    const exercise = exerciseByKey(key);
    if (exercise === undefined) {
      throw new Error(`no stretch ${key}`);
    }
    return exercise;
  });
}

/** The exercises of a category that fit a level and a place, in its order. */
export function pool(of: Category, level: Level, where: Where): Exercise[] {
  return all(of).filter(
    (exercise) =>
      (level === "intense" || exercise.level !== "intense") &&
      (where === "any" || exercise.position !== "floor"),
  );
}

/** A rest is held twice as long as a stretch: it is not one to hurry. */
function held(exercise: Exercise, hold: number): Exercise {
  return { ...exercise, seconds: exercise.seconds >= 60 ? 2 * hold : hold };
}

/** Standing and on a chair first, then on the floor, the rests last. */
function rank(exercise: Exercise): number {
  if (exercise.seconds >= 60) {
    return 2;
  }
  return exercise.position === "floor" ? 1 : 0;
}

export type Composed = {
  /** The choice it was made for. */
  choice: Choice;
  /** In the order they are done, each with its time. */
  exercises: Exercise[];
  /** One side's hold, or one movement's time. */
  hold: number;
  /** The whole session on the screen, in seconds. */
  seconds: number;
};

/** The routine for exactly this choice; none, when nothing fills its minutes. */
function made(of: Category, choice: Choice): Composed | null {
  const fit = pool(of, choice.level, choice.where);
  if (fit.length < MIN_EXERCISES) {
    return null;
  }
  // «Intense» adds deep stretches: the same routine held longer is not
  // offered as another.
  if (choice.level === "intense" && !fit.some((e) => e.level === "intense")) {
    return null;
  }
  const target = choice.minutes * 60;
  const taken = (count: number) =>
    Array.from({ length: count }, (_, i) => fit[i % fit.length]);
  const lasts = (count: number, hold: number) =>
    sessionSeconds(taken(count).map((exercise) => held(exercise, hold)));
  const first = firstHold(choice.minutes, choice.level);
  const easy = HOLDS.filter((hold) => hold <= EASY[choice.level]);

  // Each exercise once at a hold the level is easy with; if that leaves the
  // minutes short, held longer; then a second round, and a third.
  const stages: readonly (readonly [number, readonly number[]])[] = [
    [1, easy],
    [1, HOLDS],
    [2, easy],
    [2, HOLDS],
    [MAX_ROUNDS, HOLDS],
  ];
  let best: { count: number; hold: number } | null = null;
  for (const [rounds, holds] of stages) {
    let cost = [Infinity, Infinity];
    for (let count = MIN_EXERCISES; count <= fit.length * rounds; count += 1) {
      for (const hold of holds) {
        const off = Math.abs(lasts(count, hold) - target);
        // Of the ones that fill the minutes: the hold nearest the one this
        // length starts from, then the closest to the minutes.
        const now = [Math.abs(hold - first), off];
        if (
          off <= slack(choice.minutes) &&
          (now[0] < cost[0] || (now[0] === cost[0] && now[1] < cost[1]))
        ) {
          cost = now;
          best = { count, hold };
        }
      }
    }
    if (best !== null) {
      break;
    }
  }
  if (best === null) {
    return null;
  }
  const { count, hold } = best;

  // Round by round, each one standing first and resting last: the second
  // time through is a second set, not the same stretch twice in a row.
  const exercises = taken(count)
    .map((exercise, i) => ({ exercise, i, round: Math.floor(i / fit.length) }))
    .sort(
      (a, b) => a.round - b.round || rank(a.exercise) - rank(b.exercise) || a.i - b.i,
    )
    .map(({ exercise }) => held(exercise, hold));
  return { choice, exercises, hold, seconds: sessionSeconds(exercises) };
}
/**
 * Whether a category can be done this way: it comes in that length, enough
 * exercises fit the level and the place, and they fill the minutes.
 */
export function offers(of: Category, choice: Choice): boolean {
  if (!of.minutes.includes(choice.minutes)) {
    return false;
  }
  return made(of, choice) !== null;
}

/**
 * The nearest choice the category offers: its closest length (the shorter
 * of two as near), then the level and the place asked, or the other level,
 * or with a mat, or both.
 */
export function settle(of: Category, asked: Choice): Choice {
  const lengths = [...of.minutes].sort(
    (a, b) => Math.abs(a - asked.minutes) - Math.abs(b - asked.minutes) || a - b,
  );
  const other: Level = asked.level === "gentle" ? "intense" : "gentle";
  const ways: readonly (readonly [Level, Where])[] = [
    [asked.level, asked.where],
    [other, asked.where],
    [asked.level, "any"],
    [other, "any"],
  ];
  for (const minutes of lengths) {
    for (const [level, where] of ways) {
      const choice = { minutes, level, where };
      if (offers(of, choice)) {
        return choice;
      }
    }
  }
  throw new Error(`stretching category ${of.key} has no routine`);
}

/** The choice proposed first: 5 minutes, gentle, with a mat; where a
 * category has no such thing, the nearest it has. */
export function defaultChoice(of: Category): Choice {
  return settle(of, { minutes: 5, level: "gentle", where: "any" });
}

/** The routine of a category for a choice, settled on what the category
 * offers: always the same one. */
export function compose(of: Category, asked: Choice): Composed {
  const routine = made(of, settle(of, asked));
  if (routine === null) {
    throw new Error(`stretching category ${of.key} has no routine`);
  }
  return routine;
}
