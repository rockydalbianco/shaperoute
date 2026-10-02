import type { LatLon } from "@shaperoute/shared-types";

/**
 * The name of a run among an account's activities (TASK-172): made from
 * when and where its track begins, so the same run has the same key every
 * time it is sent, and the API saves it once. 16 hex digits.
 *
 * Two FNV-1a hashes over the first fix: its time in milliseconds and its
 * point rounded to five decimals (about a metre). Not a secret, only a
 * name: no two runs of one account begin in the same millisecond.
 */
export function activityKey(first: { point: LatLon; timeMs: number }): string {
  const ms = Math.round(first.timeMs);
  const values = [
    // The time is more than 32 bits: its two halves.
    ms % 0x100000000,
    Math.floor(ms / 0x100000000),
    Math.round(first.point[0] * 1e5),
    Math.round(first.point[1] * 1e5),
  ];
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (const value of values) {
    // The four bytes of the whole number, one at a time.
    for (let shift = 0; shift < 32; shift += 8) {
      const byte = (value >> shift) & 0xff;
      a = Math.imul(a ^ byte, 0x01000193);
      b = Math.imul(b ^ byte, 0x85ebca6b) + 0x9e3779b9;
    }
  }
  return hex(a) + hex(b);
}

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}
