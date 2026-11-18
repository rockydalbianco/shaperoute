import { metresBetween } from "../map/coordinates";
import { climbM } from "../navigation/runMetrics";
import type { Track, TrackFix } from "../navigation/trackRecorder";

/**
 * A race on foot and in the air, hike & fly (TASK-305 part R6b, ADR-0375
 * «precisazione R6»; the user's choice of 2026-11-12, «Dentro Paragliding»):
 * one recording, divided by itself into its parts on foot and in the air,
 * from the GPS alone (no barometer). The pilot's touch on «On foot | In the
 * air» corrects it (phaseMarks.ts).
 *
 * - **Take-off**, on foot: for at least TAKEOFF_VARIO_WINDOW_MS up or down
 *   faster than TAKEOFF_VARIO_MPS (a runner uphill makes 0.5 m/s at most),
 *   or for at least TAKEOFF_SPEED_WINDOW_MS faster than TAKEOFF_SPEED_MPS
 *   over the ground. The part in the air starts where that stretch began.
 * - **Landing**, in the air: for at least LANDING_WINDOW_MS slower than
 *   LANDING_SPEED_MPS, and up or down slower than LANDING_VARIO_MPS. A
 *   minute, so that hanging still into the wind is no landing.
 * - A part shorter than MIN_PART_MS joins the one before it (the first one
 *   the one after): no flicker.
 * - A touch sets the kind from its moment; what the GPS sees then counts
 *   again only once it has stopped seeing it: the car of the retrieve,
 *   corrected to «On foot», stays on foot while it drives. A touch within
 *   UNDO_WITHIN_MS of a change the GPS made undoes that change, from when
 *   it was made.
 */

export type PhaseKind = "foot" | "air";

/** The pilot's touch: from `atMs` the flight is of `kind`. */
export type PhaseMark = { atMs: number; kind: PhaseKind };

export type FlightPart = {
  kind: PhaseKind;
  startMs: number;
  endMs: number;
  /** Its time, the pauses left out. */
  movingMs: number;
  metres: number;
  /** Metres climbed; null without heights. */
  climbM: number | null;
  /** Its highest point; null without heights. */
  maxAltM: number | null;
};

export const TAKEOFF_VARIO_MPS = 1.5;
export const TAKEOFF_VARIO_WINDOW_MS = 15_000;
/** 25 km/h. */
export const TAKEOFF_SPEED_MPS = 25 / 3.6;
export const TAKEOFF_SPEED_WINDOW_MS = 20_000;
/** 9 km/h. */
export const LANDING_SPEED_MPS = 9 / 3.6;
export const LANDING_VARIO_MPS = 0.7;
export const LANDING_WINDOW_MS = 60_000;
export const MIN_PART_MS = 60_000;
/** A touch this soon after a change the GPS made undoes that change: the
 * pilot corrects what the app just saw, from when it saw it. */
export const UNDO_WITHIN_MS = 5 * 60_000;
/** A window counts when the fixes cover this much of it. */
const COVERED = 0.8;

function heightOf(fix: TrackFix): number | null {
  const height = fix.altitudeM;
  return height === undefined || height === null || !Number.isFinite(height)
    ? null
    : height;
}

/** The metres from the first fix to each, no step across a pause's gap. */
function metresTo(fixes: readonly TrackFix[]): number[] {
  const along = [0];
  for (let i = 1; i < fixes.length; i += 1) {
    const step =
      fixes[i].gap === true ? 0 : metresBetween(fixes[i - 1].point, fixes[i].point);
    along.push(along[i - 1] + step);
  }
  return along;
}

type Window = { fromMs: number; mps: number; varioMps: number | null };

/** For each fix, the stretch of `windowMs` that ends on it: when it began,
 * its speed over the ground and its climb a second; null when the fixes do
 * not cover enough of it. */
function windows(
  fixes: readonly TrackFix[],
  along: readonly number[],
  windowMs: number,
): (Window | null)[] {
  const found: (Window | null)[] = [];
  let j = 0;
  for (let i = 0; i < fixes.length; i += 1) {
    while (j < i && fixes[i].timeMs - fixes[j].timeMs > windowMs) {
      j += 1;
    }
    const spanMs = fixes[i].timeMs - fixes[j].timeMs;
    if (spanMs < windowMs * COVERED) {
      found.push(null);
      continue;
    }
    const seconds = spanMs / 1000;
    const from = heightOf(fixes[j]);
    const to = heightOf(fixes[i]);
    found.push({
      fromMs: fixes[j].timeMs,
      mps: (along[i] - along[j]) / seconds,
      varioMps: from === null || to === null ? null : (to - from) / seconds,
    });
  }
  return found;
}

type Change = { kind: PhaseKind; atMs: number; byGps?: true };

/** Where the flight changes kind, the first at its start. */
function changesOf(track: Track, marks: readonly PhaseMark[]): Change[] {
  const fixes = track.fixes;
  if (fixes.length === 0) {
    return [];
  }
  const along = metresTo(fixes);
  const vario = windows(fixes, along, TAKEOFF_VARIO_WINDOW_MS);
  const speed = windows(fixes, along, TAKEOFF_SPEED_WINDOW_MS);
  const landing = windows(fixes, along, LANDING_WINDOW_MS);
  const sorted = [...marks].sort((a, b) => a.atMs - b.atMs);
  const changes: Change[] = [{ kind: "foot", atMs: fixes[0].timeMs }];
  let kind: PhaseKind = "foot";
  // After a touch, what the GPS sees counts once it has stopped seeing it.
  let armed = true;
  let m = 0;
  const change = (next: PhaseKind, atMs: number, byGps: boolean) => {
    const last = changes[changes.length - 1];
    changes.push({
      kind: next,
      atMs: Math.max(atMs, last.atMs),
      ...(byGps ? { byGps: true as const } : {}),
    });
    kind = next;
  };
  for (let i = 0; i < fixes.length; i += 1) {
    while (m < sorted.length && sorted[m].atMs <= fixes[i].timeMs) {
      const touch = sorted[m];
      const last = changes[changes.length - 1];
      if (touch.kind !== kind) {
        if (
          last.byGps === true &&
          changes.length > 1 &&
          touch.atMs - last.atMs <= UNDO_WITHIN_MS
        ) {
          // What the GPS just saw was not so: as if it never had.
          changes.pop();
          kind = touch.kind;
        } else {
          change(touch.kind, touch.atMs, false);
        }
      }
      armed = false;
      m += 1;
    }
    let from: number | null = null;
    if (kind === "foot") {
      const up = vario[i];
      const fast = speed[i];
      if (up?.varioMps != null && Math.abs(up.varioMps) > TAKEOFF_VARIO_MPS) {
        from = up.fromMs;
      } else if (fast !== null && fast.mps > TAKEOFF_SPEED_MPS) {
        from = fast.fromMs;
      }
    } else {
      const still = landing[i];
      if (
        still !== null &&
        still.mps < LANDING_SPEED_MPS &&
        (still.varioMps === null || Math.abs(still.varioMps) < LANDING_VARIO_MPS)
      ) {
        from = still.fromMs;
      }
    }
    if (from === null) {
      armed = true;
    } else if (armed) {
      change(kind === "foot" ? "air" : "foot", from, true);
    }
  }
  return changes;
}

type Span = { kind: PhaseKind; startMs: number; endMs: number };

/** The spans between the changes; a short one joins its neighbour, and
 * two of a kind side by side become one. */
function spansOf(changes: readonly Change[], endMs: number): Span[] {
  let spans: Span[] = changes
    .map((c, i) => ({
      kind: c.kind,
      startMs: c.atMs,
      endMs: i + 1 < changes.length ? changes[i + 1].atMs : endMs,
    }))
    .filter((span) => span.endMs > span.startMs || changes.length === 1);
  const joined = (list: Span[]): Span[] =>
    list.reduce<Span[]>((out, span) => {
      const last = out[out.length - 1];
      if (last !== undefined && last.kind === span.kind) {
        last.endMs = span.endMs;
      } else {
        out.push({ ...span });
      }
      return out;
    }, []);
  spans = joined(spans);
  for (;;) {
    const i = spans.findIndex((span) => span.endMs - span.startMs < MIN_PART_MS);
    if (i === -1 || spans.length < 2) {
      return spans;
    }
    const into = i > 0 ? i - 1 : i + 1;
    spans[i] = { ...spans[i], kind: spans[into].kind };
    spans = joined(spans);
  }
}

/** The milliseconds of `track`'s pauses inside [fromMs, toMs]. */
function pausedIn(track: Track, fromMs: number, toMs: number, endMs: number): number {
  return (track.pauses ?? []).reduce((sum, pause) => {
    const start = Math.max(fromMs, pause.fromMs);
    const end = Math.min(toMs, pause.toMs ?? endMs);
    return sum + Math.max(0, end - start);
  }, 0);
}

/**
 * The parts of `track` on foot and in the air, in their order, with the
 * pilot's `marks`. A step between two fixes is of the part its second fix
 * is in. None for a track without fixes.
 */
export function flightParts(
  track: Track,
  marks: readonly PhaseMark[] = [],
): FlightPart[] {
  const fixes = track.fixes;
  if (fixes.length === 0) {
    return [];
  }
  const endMs = fixes[fixes.length - 1].timeMs;
  const spans = spansOf(changesOf(track, marks), endMs);
  return spans.map((span, k) => {
    const last = k === spans.length - 1;
    const inside = (fix: TrackFix) =>
      fix.timeMs >= span.startMs &&
      (last ? fix.timeMs <= span.endMs : fix.timeMs < span.endMs);
    let metres = 0;
    let maxAltM: number | null = null;
    const mine: TrackFix[] = [];
    fixes.forEach((fix, i) => {
      if (!inside(fix)) {
        return;
      }
      mine.push(fix);
      if (i > 0 && fix.gap !== true) {
        metres += metresBetween(fixes[i - 1].point, fix.point);
      }
      const height = heightOf(fix);
      if (height !== null) {
        maxAltM = maxAltM === null ? height : Math.max(maxAltM, height);
      }
    });
    const spanMs = span.endMs - span.startMs;
    return {
      kind: span.kind,
      startMs: span.startMs,
      endMs: span.endMs,
      movingMs: Math.max(0, spanMs - pausedIn(track, span.startMs, span.endMs, endMs)),
      metres,
      climbM: climbM({ fixes: mine, distanceM: metres }),
      maxAltM,
    };
  });
}

/** The parts of one kind added up. */
export type FlightSide = {
  movingMs: number;
  metres: number;
  climbM: number | null;
  maxAltM: number | null;
};

/** A flight with parts on foot and in the air, each kind added up; null
 * when it has only one kind: then it is shown as a flight alone. */
export function flightSplit(
  parts: readonly FlightPart[],
): { foot: FlightSide; air: FlightSide } | null {
  const side = (kind: PhaseKind): FlightSide | null => {
    const mine = parts.filter((part) => part.kind === kind);
    if (mine.length === 0) {
      return null;
    }
    const climbs = mine.flatMap((part) => (part.climbM === null ? [] : [part.climbM]));
    const highs = mine.flatMap((part) => (part.maxAltM === null ? [] : [part.maxAltM]));
    return {
      movingMs: mine.reduce((sum, part) => sum + part.movingMs, 0),
      metres: mine.reduce((sum, part) => sum + part.metres, 0),
      climbM: climbs.length > 0 ? climbs.reduce((a, b) => a + b, 0) : null,
      maxAltM: highs.length > 0 ? Math.max(...highs) : null,
    };
  };
  const foot = side("foot");
  const air = side("air");
  return foot === null || air === null ? null : { foot, air };
}

/** The kind of the flight now, as the GPS and the touches say it: the last
 * change, however short, so that a take-off shows at once in flight. */
export function phaseNow(track: Track, marks: readonly PhaseMark[] = []): PhaseKind {
  const changes = changesOf(track, marks);
  const last = changes[changes.length - 1]?.kind ?? "foot";
  // A touch after the last fix already counts.
  const touched = [...marks]
    .filter((mark) => mark.atMs > (track.fixes[track.fixes.length - 1]?.timeMs ?? -1))
    .sort((a, b) => a.atMs - b.atMs)
    .pop();
  return touched?.kind ?? last;
}
