/**
 * The two rings of a day (TASK-489 part H): how far round each goes. One
 * scale for both, so that at a glance the longer ring is the larger number:
 * the largest of what was eaten, what was used and the user's own target
 * goes all the way round. MuW adds no number of its own to the scale.
 */
export type RingShares = {
  /** 0 to 1: how far the ring of «Eaten» goes. */
  eaten: number;
  /** 0 to 1: the ring of «Used (est.)». */
  used: number;
  /** 0 to 1: where the user's target is on the ring of «Eaten»; null with
   * no target. */
  target: number | null;
};

export function ringShares(
  eatenKcal: number | null,
  usedKcal: number | null,
  targetKcal: number | null,
): RingShares {
  const eaten = Math.max(0, eatenKcal ?? 0);
  const used = Math.max(0, usedKcal ?? 0);
  const target = targetKcal !== null && targetKcal > 0 ? targetKcal : null;
  const full = Math.max(eaten, used, target ?? 0);
  if (full <= 0) {
    return { eaten: 0, used: 0, target: null };
  }
  return {
    eaten: eaten / full,
    used: used / full,
    target: target === null ? null : target / full,
  };
}
