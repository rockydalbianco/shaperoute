import { File, Paths } from "expo-file-system";

import type { Place } from "../places/photon";
import { isPlaces } from "../places/placeFinder";

/** The cities chosen last in "Explore", first (TASK-131). */
export const MAX_RECENT = 5;
const RECENT_FILE = "recent-cities.json";

/** `place` first, without a copy of it, at most MAX_RECENT. */
export function remember(recent: Place[], place: Place): Place[] {
  return [place, ...recent.filter((p) => p.label !== place.label)].slice(0, MAX_RECENT);
}

/** The cities saved on the phone; none when there are none or they do not read. */
export function loadRecentCities(): Place[] {
  try {
    const file = new File(Paths.document, RECENT_FILE);
    if (!file.exists) {
      return [];
    }
    const data: unknown = JSON.parse(file.textSync());
    const body = { places: data };
    return isPlaces(body) ? body.places.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

/** Keeps them for the next opening; a phone that refuses keeps nothing. */
export function saveRecentCities(recent: Place[]): void {
  try {
    const file = new File(Paths.document, RECENT_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(recent));
  } catch {
    // Remembering is a convenience: nothing breaks without it.
  }
}
