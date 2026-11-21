import type { StretchSession, StretchSessionRequest } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * A stretching session on the API (TASK-475 part B, ADR-0386, docs/API.md
 * «Stretching»): a run of the activity `stretching` without a track, the
 * routine in place of a line. The body is
 * packages/shared-types/fixtures/stretch-session.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isCount(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function isStretchSession(body: unknown): body is StretchSession {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { id, started_at, duration_s, routine, minutes, exercises } = body as Record<
    string,
    unknown
  >;
  return (
    typeof id === "string" &&
    typeof started_at === "string" &&
    isCount(duration_s) &&
    typeof routine === "string" &&
    isCount(minutes) &&
    isCount(exercises)
  );
}

/** PUT /me/stretch-sessions/{key}: the session saved; the same again gives
 * it back as it was. 422 for a body the API will not take, 409 for the key
 * of a run. */
export function saveStretchSession(
  baseUrl: string,
  token: string,
  key: string,
  request: StretchSessionRequest,
  options: Options = {},
): Promise<AccountOutcome<StretchSession>> {
  return ask(
    baseUrl,
    `/me/stretch-sessions/${encodeURIComponent(key)}`,
    { method: "PUT", body: request, token },
    isStretchSession,
    options,
  );
}
