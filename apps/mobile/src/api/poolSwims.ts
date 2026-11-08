import type {
  PoolSwim,
  PoolSwimFigures,
  PoolSwimRequest,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * A swim in a pool on the API (TASK-400 part B, ADR-0334, docs/API.md
 * «Pool swim»): a run of the activity `swimming` without a track, the pool
 * and the lengths in place of a line. The body is
 * packages/shared-types/fixtures/pool-swim.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isCount(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function isPoolSwim(body: unknown): body is PoolSwim {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { id, started_at, duration_s, distance_m, pool_length_m, lengths } =
    body as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof started_at === "string" &&
    isCount(duration_s) &&
    isCount(distance_m) &&
    typeof pool_length_m === "number" &&
    Number.isFinite(pool_length_m) &&
    isCount(lengths)
  );
}

/** PUT /me/pool-swims/{key}: the swim saved; the same again gives it back
 * as it was. 422 for a body the API will not take (too fast among them),
 * 409 for the key of a run. */
export function savePoolSwimOnApi(
  baseUrl: string,
  token: string,
  key: string,
  request: PoolSwimRequest,
  options: Options = {},
): Promise<AccountOutcome<PoolSwim>> {
  return ask(
    baseUrl,
    `/me/pool-swims/${encodeURIComponent(key)}`,
    { method: "PUT", body: request, token },
    isPoolSwim,
    options,
  );
}

/** GET /me/pool-swims/{key} (TASK-400 part C): the swim as its owner sees
 * it, for the picture shared; 404 for a key that is not one. */
export function fetchPoolSwim(
  baseUrl: string,
  token: string,
  key: string,
  options: Options = {},
): Promise<AccountOutcome<PoolSwim>> {
  return ask(
    baseUrl,
    `/me/pool-swims/${encodeURIComponent(key)}`,
    { method: "GET", token },
    isPoolSwim,
    options,
  );
}

/** A heart rate the API may leave out (TASK-409 part B): absent, or a
 * count. */
function isOptionalCount(value: unknown): boolean {
  return value === undefined || isCount(value);
}

export function isPoolSwimFigures(body: unknown): body is PoolSwimFigures {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { pool_length_m, lengths, heart_avg_bpm, heart_max_bpm } = body as Record<
    string,
    unknown
  >;
  return (
    typeof pool_length_m === "number" &&
    Number.isFinite(pool_length_m) &&
    pool_length_m > 0 &&
    isCount(lengths) &&
    isOptionalCount(heart_avg_bpm) &&
    isOptionalCount(heart_max_bpm)
  );
}

/** GET /drawings/{id}/pool-swim (TASK-400 part C): the pool and the
 * lengths of a post of a swim in a pool, for whoever sees it; 404 for an
 * app that does not read it. */
export function fetchPoolFigures(
  baseUrl: string,
  token: string,
  drawingId: string,
  options: Options = {},
): Promise<AccountOutcome<PoolSwimFigures>> {
  return ask(
    baseUrl,
    `/drawings/${encodeURIComponent(drawingId)}/pool-swim`,
    { method: "GET", token },
    isPoolSwimFigures,
    options,
  );
}
