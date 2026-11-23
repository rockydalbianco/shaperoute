import type { Gear } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";
import { isGear } from "./gear";

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * GET /gear/{id} (TASK-486 part F, ADR-0393): an item of gear as a viewer
 * sees it, for the dot of a tagged item. One «Hide from profile», hidden
 * after a report, of a profile a block keeps apart or gone answers 404, as
 * an API without gear: null then, and the dot shows no line of gear.
 */
export function fetchGearItem(
  baseUrl: string,
  token: string,
  gearId: string,
  options: Options = {},
): Promise<AccountOutcome<Gear | null>> {
  return ask(
    baseUrl,
    `/gear/${encodeURIComponent(gearId)}`,
    { method: "GET", token },
    isGear,
    options,
  ).then((outcome) =>
    outcome.kind === "api_error" && outcome.code === "http_error"
      ? { kind: "ok", value: null }
      : outcome,
  );
}
