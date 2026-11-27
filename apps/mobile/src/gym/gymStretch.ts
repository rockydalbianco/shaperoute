import type { GymStretch } from "@shaperoute/shared-types";
import { useSyncExternalStore } from "react";

import { isGymStretch } from "../api/gym";
import type { StretchDone } from "../stretch/StretchScreen";
import { keptList } from "../storage/keptList";

/**
 * The stretching at the end of a workout at the gym (TASK-466 part C2,
 * «ADR-0378, aggiunta C ed E»): as the workout ends, «Remember to stretch»
 * with «Skip» and «Stretch»; «Stretch» opens «After gym», and what it was
 * goes with the workout at «Save» (`stretch` of PUT /me/gym-sessions/{key},
 * the user's choice «Dentro l'allenamento»). One workout at a time, as the
 * workout itself (useWorkout): kept in its own file, beside workout.ts and
 * not inside it, so an app closed on the reminder asks again and one closed
 * after the stretching still saves it. A workout opened again later, ended
 * already, is not asked.
 */

export const GYM_STRETCH_FILE = "gym-stretch.json";

/** Where the stretching of a workout is: asked, under way, or over (done or
 * skipped). */
export type GymStretchStep = "ask" | "stretching" | "done";

type Held = {
  /** The workout's key. */
  key: string;
  step: GymStretchStep;
  /** What was done, for «Save»; null when skipped or nothing was held. */
  stretch: GymStretch | null;
};

function isHeld(value: unknown): value is Held {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.key === "string" &&
    (item.step === "ask" || item.step === "stretching" || item.step === "done") &&
    (item.stretch === null || isGymStretch(item.stretch))
  );
}

const kept = keptList(GYM_STRETCH_FILE, isHeld);

/** undefined until the file is read, at the first use. */
let held: Held | null | undefined;
const listeners = new Set<() => void>();

function now(): Held | null {
  if (held === undefined) {
    held = kept.load()[0] ?? null;
  }
  return held;
}

function put(next: Held | null): void {
  held = next;
  kept.save(next === null ? [] : [next]);
  for (const listener of [...listeners]) {
    listener();
  }
}

/**
 * What a stretching session was, as the API keeps it with the workout: its
 * seconds without its pauses (overlapping or not, as the API counts a
 * session's); null for one whose length was not chosen, with no exercise
 * held to its end, or outside the API's limits.
 */
export function gymStretch(done: StretchDone): GymStretch | null {
  if (done.minutes === null || done.exercises < 1) {
    return null;
  }
  const lengthS = (done.endedAt - done.startedAt) / 1000;
  const spans = done.pauses
    .map((pause) => [Math.min(pause.from_s, lengthS), Math.min(pause.to_s, lengthS)])
    .sort((a, b) => a[0] - b[0]);
  let paused = 0;
  let reached = 0;
  for (const [from, to] of spans) {
    const start = Math.max(from, reached);
    if (to > start) {
      paused += to - start;
    }
    reached = Math.max(reached, to);
  }
  const stretch = {
    routine: done.routine,
    minutes: done.minutes,
    duration_s: Math.round(lengthS - paused),
    exercises: done.exercises,
  };
  return isGymStretch(stretch) ? stretch : null;
}

/** The workout `key` has just ended: «Remember to stretch». */
export function askStretch(key: string): void {
  put({ key, step: "ask", stretch: null });
}

/** Where the stretching of workout `key` is: "done" for a workout never
 * asked (opened again later, ended already). */
export function stretchStep(key: string): GymStretchStep {
  const on = now();
  return on !== null && on.key === key ? on.step : "done";
}

/** «Stretch»: «After gym» opens. */
export function startStretch(key: string): void {
  if (now()?.key === key) {
    put({ key, step: "stretching", stretch: null });
  }
}

/** «Skip», or the stretching over: told what it was (StretchScreen's
 * `onDone`), kept for «Save»; left without it (`onLeave`, right after
 * `onDone`, or «Skip»), what was told stays. */
export function endStretch(key: string, done?: StretchDone): void {
  const on = now();
  if (on !== null && on.key === key) {
    put({
      key,
      step: "done",
      stretch: done === undefined ? on.stretch : gymStretch(done),
    });
  }
}

/** What goes with workout `key` at «Save»; null for none. */
export function stretchOf(key: string): GymStretch | null {
  const on = now();
  return on !== null && on.key === key ? on.stretch : null;
}

/** The workout is saved, discarded or gone: its stretching too. */
export function forgetStretch(): void {
  if (now() !== null) {
    put(null);
  }
}

/** The step of workout `key`, rendered again as it changes. */
export function useStretchStep(key: string | null): GymStretchStep {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => (key === null ? "done" : stretchStep(key)),
  );
}

/** For the tests: forget what was read, as a new start of the app. */
export function resetGymStretchForTests(): void {
  held = undefined;
}
