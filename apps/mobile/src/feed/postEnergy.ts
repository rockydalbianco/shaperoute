import { kcal } from "../navigation/runMetrics";
import type { SamplePost } from "./sampleFeed";

/**
 * "355 kcal": about how much energy the run of a post took, as the run
 * screen counted it (TASK-345, ADR-0298). The weight is the same for
 * everyone, so the distance alone says it: nothing is kept on the server.
 * Only a run has it (ADR-0219): a ride or a paddle has none, and neither
 * has a run with no metres.
 */
export function postEnergy(post: SamplePost): string | null {
  if ((post.activity ?? "running") !== "running") {
    return null;
  }
  const energy = kcal(post.route_m);
  return energy > 0 ? `${energy} kcal` : null;
}
