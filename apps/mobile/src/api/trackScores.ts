import type {
  ApiError,
  TrackScoreRequest,
  TrackScoreResult,
} from "@shaperoute/shared-types";

import type { ScorableRun } from "../navigation/trackStore";
import { apiKey, keyHeaders } from "./apiUrl";
import { isApiError } from "./routes";

/** Every way asking for the score of a run can end. */
export type ScoreOutcome =
  | { kind: "score"; score: TrackScoreResult }
  | ({ kind: "api_error" } & ApiError["error"])
  | { kind: "unreachable"; url: string }
  | { kind: "bad_answer"; status: number }
  | { kind: "cancelled" };

/** The run as POST /track-scores wants it. The walks of a word with the pen
 * up go with it (TASK-198): the run is judged on the letters alone. */
export function toScoreRequest(run: ScorableRun): TrackScoreRequest {
  return {
    points: run.route,
    similarity: run.similarity,
    track: run.track.fixes.map((fix) => ({
      point: fix.point,
      time_ms: fix.timeMs,
      accuracy_m: fix.accuracyM,
    })),
    // Only with walks: the request of any other run is as it was.
    ...(run.walks !== undefined && run.walks.length > 0 ? { walks: run.walks } : {}),
  };
}

/**
 * Asks the API for the score of a run against the route it followed
 * (TASK-113, ADR-0093). The API keeps nothing. Never throws.
 */
export async function requestTrackScore(
  baseUrl: string,
  run: ScorableRun,
  {
    signal,
    fetchFn = fetch,
    key = apiKey(),
  }: { signal?: AbortSignal; fetchFn?: typeof fetch; key?: string | null } = {},
): Promise<ScoreOutcome> {
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/track-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...keyHeaders(key) },
      body: JSON.stringify(toScoreRequest(run)),
      signal,
    });
  } catch {
    return signal?.aborted
      ? { kind: "cancelled" }
      : { kind: "unreachable", url: baseUrl };
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && isTrackScore(body)) {
    return { kind: "score", score: body };
  }
  return !response.ok && isApiError(body)
    ? { kind: "api_error", ...body.error }
    : { kind: "bad_answer", status: response.status };
}

export function isTrackScore(body: unknown): body is TrackScoreResult {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const score = body as Record<string, unknown>;
  return (
    typeof score.score === "number" &&
    score.score >= 0 &&
    score.score <= 100 &&
    typeof score.fidelity === "number" &&
    typeof score.covered === "number" &&
    typeof score.on_route === "number" &&
    typeof score.distance_m === "number"
  );
}
