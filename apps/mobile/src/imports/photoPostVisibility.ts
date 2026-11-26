import type { PhotoPostVisibility } from "@shaperoute/shared-types";

import { loadVisibility, saveVisibility } from "../social/visibilityChoice";

/**
 * Who sees a post of photos only when its form opens (TASK-312 part C2):
 * the last choice the account saved, as a run (ADR-0304, the user's «L'ultima
 * scelta», 2026-11-21); «Everyone» the first time, and after a run kept for
 * «Only me», which a post of photos only does not have.
 */
export function startVisibility(owner: number | null): PhotoPostVisibility {
  return loadVisibility(owner) === "followers" ? "followers" : "everyone";
}

/** «Post»: the choice is the next run's and the next post's start too. */
export function keepVisibility(owner: number, visibility: PhotoPostVisibility): void {
  saveVisibility(owner, visibility);
}
