import type { Gear } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";
import { isGearList } from "./gear";

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * GET /drawings/{id}/gear (TASK-486 part E, ADR-0393): the gear on the
 * activity of a post, for whoever sees the post, without the items «Hide
 * from profile». A post one does not see answers 404, as an API without
 * gear: null then, and the post shows no gear.
 */
export function fetchPostGear(
  baseUrl: string,
  token: string,
  drawingId: string,
  options: Options = {},
): Promise<AccountOutcome<Gear[] | null>> {
  return ask(
    baseUrl,
    `/drawings/${encodeURIComponent(drawingId)}/gear`,
    { method: "GET", token },
    isGearList,
    options,
  ).then((outcome) =>
    outcome.kind === "ok"
      ? { kind: "ok", value: outcome.value.gear }
      : outcome.kind === "api_error" && outcome.code === "http_error"
        ? { kind: "ok", value: null }
        : outcome,
  );
}
