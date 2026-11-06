import { useEffect, useState, useSyncExternalStore } from "react";

import { gymKey } from "../gym/gymKey";
import { newPoolSwim, type PoolSwim } from "./poolSwim";
import { loadPoolSwim, savePoolSwim } from "./poolStore";

/**
 * The swim in a pool under way, one for the app (TASK-400 part B): kept
 * here and in its file at every change, so «Start swim» in «Draw» and the
 * screen over the app read the same one, and an app opened again finds it.
 * As the workout at the gym (gym/useWorkout.ts).
 */

/** undefined until the file is read, at the first use. */
let held: PoolSwim | null | undefined;
const listeners = new Set<() => void>();

function now(): PoolSwim | null {
  if (held === undefined) {
    held = loadPoolSwim();
  }
  return held;
}

function put(next: PoolSwim | null): void {
  held = next;
  savePoolSwim(next);
  for (const listener of [...listeners]) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** «Start swim»: a new swim in a pool of `poolLengthM`, unless one is under
 * way already. Its key is made as a workout's: no first fix to make it. */
export function startPoolSwim(poolLengthM: number, nowMs: number = Date.now()): void {
  if (now() === null) {
    put(newPoolSwim(gymKey(nowMs), poolLengthM, nowMs));
  }
}

/** Changes the swim with `change` at this moment; false when there is none. */
export function changePoolSwim(
  change: (swim: PoolSwim, nowMs: number) => PoolSwim,
): boolean {
  const swim = now();
  if (swim === null) {
    return false;
  }
  put(change(swim, Date.now()));
  return true;
}

/** «Save» done or «Discard»: no swim any more. */
export function endPoolSwim(): void {
  put(null);
}

/** For the tests: forget what was read, as an app opened again. */
export function forgetHeldPoolSwim(): void {
  held = undefined;
  listeners.clear();
}

/** How often the clock ticks while a swim lasts. */
export const TICK_MS = 1000;

/** The swim and the time, ticking each second while it lasts. */
export function usePoolSwim(): { swim: PoolSwim | null; nowMs: number } {
  const swim = useSyncExternalStore(subscribe, now, now);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const going = swim !== null && swim.endedMs === null;
  useEffect(() => {
    if (!going) {
      return;
    }
    // At once, then each second: a swim opened again shows its time.
    const tick = () => setNowMs(Date.now());
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [going]);
  return { swim, nowMs };
}
