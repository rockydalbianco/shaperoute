import type { ApiError, Direction, LatLon } from "@shaperoute/shared-types";

import { apiKey, keyHeaders } from "./apiUrl";
import { isApiError, isDirection } from "./routes";

/**
 * The directions of a route the app has only as points, one of "Explore"
 * (TASK-145, ADR-0117): POST /route-directions. The bodies are
 * packages/shared-types/fixtures/route-directions-request.json and
 * route-directions.json.
 */

/** Every way asking for a route's directions can end. */
export type DirectionsOutcome =
  | { kind: "directions"; directions: Direction[] }
  | ({ kind: "api_error" } & ApiError["error"])
  | { kind: "unreachable"; url: string }
  | { kind: "bad_answer"; status: number }
  | { kind: "cancelled" };

/** Asks the API for the directions along `points`. Never throws. */
export async function requestDirections(
  baseUrl: string,
  points: LatLon[],
  {
    signal,
    fetchFn = fetch,
    key = apiKey(),
  }: { signal?: AbortSignal; fetchFn?: typeof fetch; key?: string | null } = {},
): Promise<DirectionsOutcome> {
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/route-directions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...keyHeaders(key) },
      body: JSON.stringify({ points }),
      signal,
    });
  } catch {
    return signal?.aborted
      ? { kind: "cancelled" }
      : { kind: "unreachable", url: baseUrl };
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && isDirections(body)) {
    return { kind: "directions", directions: body.directions };
  }
  return !response.ok && isApiError(body)
    ? { kind: "api_error", ...body.error }
    : { kind: "bad_answer", status: response.status };
}

export function isDirections(body: unknown): body is { directions: Direction[] } {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { directions } = body as Record<string, unknown>;
  // The start at least: a route the API matched has where it begins.
  return (
    Array.isArray(directions) && directions.length > 0 && directions.every(isDirection)
  );
}
