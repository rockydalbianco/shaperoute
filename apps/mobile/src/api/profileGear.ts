import type { Gear } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";
import { isGearList } from "./gear";

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * GET /users/{public_id}/gear (TASK-486 part D, ADR-0393): the gear of a
 * profile, in use first, without the items «Hide from profile». A profile
 * a block keeps apart answers 404, as an API without gear: null then, and
 * the profile shows no «Gear».
 */
export function fetchProfileGear(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<Gear[] | null>> {
  return ask(
    baseUrl,
    `/users/${encodeURIComponent(publicId)}/gear`,
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
