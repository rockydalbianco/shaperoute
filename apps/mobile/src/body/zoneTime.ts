import type { HeartSample } from "../health/heartSamples";
import type { Zone } from "./heartZones";

/**
 * The time spent in each zone of the heart rate (TASK-409 part B, the
 * user's «Tabella + tempo in zona» of TASK-374, ADR-0318 point 8): from the
 * readings a watch wrote, with the zones of «Heart rate zones»
 * (heartZones.ts). Built for a swim in a pool; TASK-374 D hooks the runs to
 * it. Stays on the phone (ADR-0318 point 1).
 *
 * A reading lasts until the next one, never more than MAX_GAP_MS: a watch
 * writes one every few seconds in a workout, and a longer hole is a reading
 * missed, not the same beat. The last one lasts until `endMs`, within the
 * same limit. Under zone 1 a reading is in no zone; over the max, in zone 5.
 */

/** The longest a reading counts for. */
export const MAX_GAP_MS = 60_000;

/** The seconds in each of `zones`, rounded, in their order; samples the
 * earliest first (heartSamples.inWindow). */
export function zoneSeconds(
  samples: readonly HeartSample[],
  zones: readonly Zone[],
  endMs: number,
): number[] {
  const ms = zones.map(() => 0);
  samples.forEach((sample, i) => {
    const next = i + 1 < samples.length ? samples[i + 1].fromMs : endMs;
    const lasts = Math.min(MAX_GAP_MS, Math.max(0, next - sample.fromMs));
    const zone = zoneOf(sample.bpm, zones);
    if (zone !== null) {
      ms[zone] += lasts;
    }
  });
  return ms.map((value) => Math.round(value / 1000));
}

/** The index of the zone of `bpm`; null under the first. */
function zoneOf(bpm: number, zones: readonly Zone[]): number | null {
  if (zones.length === 0 || bpm < zones[0].fromBpm) {
    return null;
  }
  const index = zones.findIndex((zone) => bpm < zone.toBpm);
  return index === -1 ? zones.length - 1 : index;
}
