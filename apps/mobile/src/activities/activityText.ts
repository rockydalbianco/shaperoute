import { favoriteTitle } from "../favorites/favoriteRoute";
import { clockLabel, kmLabel, paceLabel } from "../navigation/freeRun";

/**
 * A run of «My activities» in words (TASK-172): when it began, where, what
 * it drew, how far and how fast. The moment is read on the phone's clock.
 */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function two(value: number): string {
  return String(value).padStart(2, "0");
}

/** "Fri 2 Oct 2026": the day the run began, on the phone's clock, without
 * the time (a drawing others see, TASK-117); "" for a moment that is not one. */
export function dayLabel(startedAt: string): string {
  const when = new Date(startedAt);
  if (Number.isNaN(when.getTime())) {
    return "";
  }
  return `${DAYS[when.getDay()]} ${when.getDate()} ${MONTHS[when.getMonth()]} ${when.getFullYear()}`;
}

/** "Fri 2 Oct 2026 · 08:12": the day and the time the run began, on the
 * phone's clock; "" for a moment that is not one. */
export function startedLabel(startedAt: string): string {
  const when = new Date(startedAt);
  if (Number.isNaN(when.getTime())) {
    return "";
  }
  return `${dayLabel(startedAt)} · ${two(when.getHours())}:${two(when.getMinutes())}`;
}

type Drawn = { shape: string | null; word: string | null; title: string | null };

/** "Trento · Star", "Trento", "Star": where the run began and what its
 * route drew; "Run" when nobody knows either. */
export function whereAndWhat(
  run: Drawn & { place: string | null },
  /** Whether the run followed a route: without one it drew nothing. */
  withRoute: boolean,
): string {
  const parts = [run.place, withRoute ? favoriteTitle(run) : null].filter(
    (part): part is string => part !== null && part !== "",
  );
  return parts.length > 0 ? parts.join(" · ") : "Run";
}

/** "4.01 km · 19:00 · 4:44 /km": distance, time and average pace; no pace
 * for a run too short to have one. */
export function runFacts(run: { distance_m: number; duration_s: number }): string {
  const ms = run.duration_s * 1000;
  return [kmLabel(run.distance_m), clockLabel(ms), paceLabel(run.distance_m, ms)]
    .filter((part): part is string => part !== null)
    .join(" · ");
}
