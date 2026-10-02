import type { LatLon } from "@shaperoute/shared-types";

/**
 * The name of a route among an account's favorites (TASK-171): made from
 * its line, so the same route has the same key on every phone and however
 * it was reached, and the API keeps it once. 16 hex digits.
 *
 * Two FNV-1a hashes over the points rounded to five decimals (about a
 * metre): not a secret, only a name. Two routes of one account with the
 * same key would take 2^32 favorites to become likely.
 */
export function favoriteKey(points: LatLon[]): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (const [lat, lon] of points) {
    for (const value of [Math.round(lat * 1e5), Math.round(lon * 1e5)]) {
      // The four bytes of the whole number, one at a time.
      for (let shift = 0; shift < 32; shift += 8) {
        const byte = (value >> shift) & 0xff;
        a = Math.imul(a ^ byte, 0x01000193);
        b = Math.imul(b ^ byte, 0x85ebca6b) + 0x9e3779b9;
      }
    }
  }
  return hex(a) + hex(b);
}

function hex(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
}
