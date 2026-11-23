import type {
  ApiError,
  StrokeMatchRequest,
  StrokeMatchResult,
} from "@shaperoute/shared-types";

import { PHONE_HEADER } from "../engine/prefetch";
import { apiKey, keyHeaders } from "./apiUrl";
import { isApiError } from "./routes";

/**
 * A stroke drawn on the map, anchored to the roads (TASK-347, ADR-0300):
 * POST /stroke-matches, sent only to a server whose probe (GET
 * /stroke-matches) answered 204. An API older than TASK-347 answers 404 to
 * both, and the stroke stays free geometry. The bodies are
 * packages/shared-types/fixtures/stroke-match-request.json and
 * stroke-match.json.
 */

/** Every way asking for a stroke can end. */
export type StrokeMatchOutcome =
  | { kind: "match"; match: StrokeMatchResult }
  | ({ kind: "api_error" } & ApiError["error"])
  | { kind: "unreachable"; url: string }
  | { kind: "bad_answer"; status: number }
  | { kind: "cancelled" };

type FetchOptions = { fetchFn?: typeof fetch; key?: string | null };

/** What each server said to the probe, while the app runs: the answer does
 * not change until it is updated, and the app asks again on its next start. */
const probed = new Map<string, boolean>();

/**
 * Whether the server at `baseUrl` anchors strokes: true on 204, false on
 * 404 (an older API), null when it could not tell (no signal, another
 * status), and then it asks again next time. Never throws.
 */
export async function strokeMatchesOnServer(
  baseUrl: string,
  { fetchFn = fetch, key = apiKey() }: FetchOptions = {},
): Promise<boolean | null> {
  const known = probed.get(baseUrl);
  if (known !== undefined) {
    return known;
  }
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/stroke-matches`, {
      headers: keyHeaders(key),
    });
  } catch {
    return null;
  }
  if (response.status !== 204 && response.status !== 404) {
    return null;
  }
  const knows = response.status === 204;
  probed.set(baseUrl, knows);
  return knows;
}

/** Forgets what the servers said to the probe (for tests). */
export function forgetStrokeMatchProbes(): void {
  probed.clear();
}

/** Asks the API to anchor one stroke. `phone` is the phone's anonymous id
 * (prefetch.phoneId), by which the API counts its requests. Never throws. */
export async function requestStrokeMatch(
  baseUrl: string,
  request: StrokeMatchRequest,
  {
    signal,
    fetchFn = fetch,
    key = apiKey(),
    phone = null,
  }: FetchOptions & { signal?: AbortSignal; phone?: string | null } = {},
): Promise<StrokeMatchOutcome> {
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/stroke-matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...keyHeaders(key),
        ...(phone === null ? {} : { [PHONE_HEADER]: phone }),
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    return signal?.aborted
      ? { kind: "cancelled" }
      : { kind: "unreachable", url: baseUrl };
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && isStrokeMatch(body)) {
    return { kind: "match", match: body };
  }
  return !response.ok && isApiError(body)
    ? { kind: "api_error", ...body.error }
    : { kind: "bad_answer", status: response.status };
}

function isPoint(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

/** The answer of POST /stroke-matches, from the server or the phone's
 * engine: a route of one point at least (the engine allows a route on a
 * single node when the stroke starts from the one before), and one distance
 * for each point of the stroke sent when `sent` is given. */
export function isStrokeMatch(body: unknown, sent?: number): body is StrokeMatchResult {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { points, away_m, off_roads } = body as Record<string, unknown>;
  return (
    Array.isArray(points) &&
    points.length >= 1 &&
    points.every(isPoint) &&
    Array.isArray(away_m) &&
    away_m.every((m) => typeof m === "number" && Number.isFinite(m) && m >= 0) &&
    (sent === undefined || away_m.length === sent) &&
    typeof off_roads === "boolean"
  );
}
