import type { GymCalendarWorkout, GymSession } from "@shaperoute/shared-types";

import { exerciseName } from "../gym/catalog";
import { sessionRequest, type Workout } from "../gym/workout";
import { decimal, t } from "../i18n";
import type { Language } from "../i18n/languages";
import { buildCoachInput, type CoachRaw } from "./coachData";
import { allTips, type Tip } from "./rules";

/**
 * «Next time» at the end of a workout (TASK-491 part C, ADR-0399): the
 * workout just ended read with the weeks before it, and the first «Add
 * weight» (P1) among its own exercises. Only P1: the line says a weight;
 * the other tips stay on the Coach's page.
 */

/** The workout just ended in the API's terms, before it is saved. */
function ended(workout: Workout): {
  session: GymSession;
  entry: GymCalendarWorkout;
} | null {
  const request = sessionRequest(workout);
  if (request === null) {
    return null;
  }
  const pausedS = (request.pauses ?? []).reduce(
    (sum, one) => sum + one.to_s - one.from_s,
    0,
  );
  const durationS = Math.max(
    0,
    Math.round(
      (Date.parse(request.ended_at) - Date.parse(request.started_at)) / 1000 - pausedS,
    ),
  );
  return {
    session: {
      id: workout.key,
      started_at: request.started_at,
      duration_s: durationS,
      rests: workout.rests,
      rest_s: workout.restS,
      show_exercises: true,
      sets: request.sets ?? [],
      ...(request.plan === undefined ? {} : { plan: request.plan }),
    },
    entry: {
      id: workout.key,
      started_at: request.started_at,
      duration_s: durationS,
      drawing_id: null,
    },
  };
}

/** The P1 tip for one of this workout's exercises, or null. `raw` is what
 * the API holds; the workout counts once even when it is already there. */
export function nextTimeTip(raw: CoachRaw, workout: Workout): Tip | null {
  const one = ended(workout);
  if (one === null) {
    return null;
  }
  const done = new Set(
    one.session.sets.flatMap((set) =>
      set.exercise === undefined ? [] : [set.exercise],
    ),
  );
  const endedMs = workout.endedMs ?? raw.now.getTime();
  const input = buildCoachInput({
    ...raw,
    now: new Date(Math.max(raw.now.getTime(), endedMs)),
    calendar: [one.entry, ...raw.calendar.filter((other) => other.id !== workout.key)],
    sessions: [
      one.session,
      ...raw.sessions.filter((other) => other.id !== workout.key),
    ],
  });
  return (
    allTips(input).find(
      (tip) =>
        tip.rule === "P1" && tip.exercise !== undefined && done.has(tip.exercise),
    ) ?? null
  );
}

/** «Next time: Bench press 62.5 kg». */
export function nextTimeText(tip: Tip, language: Language): string {
  const kg = tip.values.kg ?? 0;
  return t("Next time: {exercise} {kg} kg", {
    exercise: exerciseName({ exercise: tip.exercise ?? "" }, language),
    kg: Number.isInteger(kg) ? String(kg) : decimal(kg),
  });
}
