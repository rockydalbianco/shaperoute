import type { PoolSwim, PoolSwimRequest } from "@shaperoute/shared-types";

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
