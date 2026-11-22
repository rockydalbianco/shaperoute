import type {
  Activity,
  LatLon,
  StrokeMatchRequest,
  StrokeMatchResult,
} from "@shaperoute/shared-types";

import type { MatchAnswer } from "../engine/matchOnPhone";
import { strokesOf } from "./strokes";

/**
 * The strokes of a drawing on the map and how each is anchored to the roads
 * (TASK-347 part C, ADR-0300), without React: what useMapMatching keeps.
 * Each line drawn with a finger gives one stroke or more (strokes.ts); each
 * stroke starts from where the stroke before it ended on the roads, so the
 * strokes join along them.
 */

/**
 * - `pending`: being anchored, or waiting for its turn;
 * - `matched`: the roads draw it, `match` says how;
 * - `off_roads`: the engine's guess in the fields, which the app leaves as
 *   a ghost with a notice; `match` holds the guess;
 * - `failed`: nothing to draw. `retry` says whether asking again may help
 *   (no signal, no zone yet), rather than a verdict of the engine.
 */
export type StrokeState = "pending" | "matched" | "off_roads" | "failed";

export type Stroke = {
  /** The line drawn this stroke comes from, by its index. */
  line: number;
  /** The stroke as sent: smoothed and straightened. */
  points: LatLon[];
  /** Where the route starts: the end of the stroke before on the roads. */
  from?: LatLon;
  state: StrokeState;
  match: StrokeMatchResult | null;
  /** Anchored by the phone or the server, for the iPhone check. */
  by?: "phone" | "server";
  retry: boolean;
};

/** What one stroke needs for its request, and its key in the cache. */
export type Ask = { request: StrokeMatchRequest; key: string };

/** The strokes of the lines drawn, in order, none anchored yet. */
export function strokesOfLines(lines: readonly (readonly LatLon[])[]): Stroke[] {
  return lines.flatMap((line, index) =>
    strokesOf(line).map((points): Stroke => ({
      line: index,
      points,
      state: "pending",
      match: null,
      retry: false,
    })),
  );
}

/** Where the stroke after `before` starts: the last point of its route on
 * the roads. None after a stroke left as drawn: the next one starts afresh. */
export function fromAfter(before: Stroke | undefined): LatLon | undefined {
  if (before === undefined || before.state !== "matched" || before.match === null) {
    return undefined;
  }
  const { points } = before.match;
  return points[points.length - 1];
}

const round = ([lat, lon]: LatLon) => `${lat.toFixed(6)},${lon.toFixed(6)}`;

/** The request for `points` from `from`, and the key the answer is kept by:
 * the same points, magnet, activity and start give the same roads. */
export function askOf(
  activity: Activity,
  fit: number | undefined,
  points: LatLon[],
  from: LatLon | undefined,
): Ask {
  const request: StrokeMatchRequest = {
    activity,
    line: points,
    ...(fit === undefined ? {} : { fit }),
    ...(from === undefined ? {} : { from }),
  };
  const key = [
    activity,
    fit ?? "-",
    from === undefined ? "-" : round(from),
    points.map(round).join(";"),
  ].join("|");
  return { request, key };
}

/** What an answer makes of a stroke; null when it was cancelled, and the
 * stroke stays as it was. */
export function answered(stroke: Stroke, answer: MatchAnswer): Stroke | null {
  switch (answer.kind) {
    case "cancelled":
      return null;
    case "match":
      return {
        ...stroke,
        state: answer.match.off_roads ? "off_roads" : "matched",
        match: answer.match,
        by: answer.by,
        retry: false,
      };
    case "verdict":
      return { ...stroke, state: "failed", match: null, retry: false };
    case "none":
      return { ...stroke, state: "failed", match: null, retry: true };
  }
}

/** Whether an answer is worth keeping: a match or a verdict comes back the
 * same next time; "none" may not. */
export function keeps(answer: MatchAnswer): boolean {
  return answer.kind === "match" || answer.kind === "verdict";
}

/** Whether any stroke is being anchored now. */
export function snapping(strokes: readonly Stroke[]): boolean {
  return strokes.some((stroke) => stroke.state === "pending");
}
