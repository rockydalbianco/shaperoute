import type { LatLon } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { Place } from "../places/photon";
import {
  byName,
  type SpotAway,
  USUAL_DISTANCE_M,
  WATER_SPOTS,
  type WaterSpot,
} from "./waterSpots";

/**
 * A lake or a beach offered as a start in «Draw», «Another place», with
 * «Paddle» (TASK-240): a point of WATER_SPOTS, on the shore, and the
 * distance its shapes fit at.
 */
export type SpotPlace = Place & { distance_m: number };

/** What the empty search field says with «Paddle»: an English text, shown
 * with `t`. */
export const SPOT_SEARCH_HINT = tLater("Lake, beach, city or street");
/** The lakes and beaches offered above the streets and towns. */
export const SPOT_PLACES_SHOWN = 3;
/** A word of more than this share of the names says nothing of a lake:
 * «lago», «di», «del». In a short list, a word of more than this many. */
const COMMON_SHARE = 0.02;
const COMMON_NAMES = 3;
/** A typed word shorter than this tells no lake from another. */
const MIN_TELLING_LENGTH = 3;

/** Lower case, without accents, as the search of «Explore» (waterSpots). */
function plain(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function wordsOf(text: string): string[] {
  return plain(text)
    .split(/[\s,'’()-]+/)
    .filter(Boolean);
}

/**
 * The names a text typed as an address means. Typed words in no name are
 * left out («Terme», «via»), and so are the common ones («lago», «di») when
 * another word tells the lake: «lago di Levico Terme» finds «Lago di
 * Levico». With common words alone every typed word must be in the name, as
 * in «Explore»: «lago» finds every lake, «via al lago» none. Only the last
 * word typed may be the beginning of a word of a name, as it is still being
 * written; a word before it must be a whole one: «via Roma» does not find
 * «Viareggio» (TASK-245). The nearest first.
 */
export function findSpots(
  spots: readonly WaterSpot[],
  query: string,
  from: LatLon | null,
): SpotAway[] {
  const typed = wordsOf(query);
  if (typed.length === 0) {
    return [];
  }
  const named = byName(spots, from).map((found) => ({
    found,
    words: wordsOf(found.spot.name),
  }));
  const names = new Map<string, number>();
  for (const { words } of named) {
    for (const word of new Set(words)) {
      names.set(word, (names.get(word) ?? 0) + 1);
    }
  }
  const all = Array.from(names.keys());
  const many = Math.max(COMMON_NAMES, named.length * COMMON_SHARE);
  const common = all.filter((word) => (names.get(word) ?? 0) > many);

  // Only the last word is still being typed: the ones before it are whole.
  const parts = typed.map((text, i) => ({ text, whole: i < typed.length - 1 }));
  const fits = (word: string, part: (typeof parts)[number]) =>
    part.whole ? word === part.text : word.startsWith(part.text);
  const known = parts.filter((part) => all.some((word) => fits(word, part)));
  const telling = known.filter(
    (part) =>
      part.text.length >= MIN_TELLING_LENGTH &&
      !common.some((word) => fits(word, part)),
  );
  if (telling.length === 0 && known.length < parts.length) {
    return [];
  }
  const wanted = telling.length > 0 ? telling : parts;
  return named
    .filter(({ words }) =>
      wanted.every((part) => words.some((word) => fits(word, part))),
    )
    .map(({ found }) => found);
}

/** The lakes and beaches to offer for a text typed in «Another place». */
export function spotPlaces(
  query: string,
  near: LatLon | null,
  spots: readonly WaterSpot[] = WATER_SPOTS,
): SpotPlace[] {
  return findSpots(spots, query, near)
    .slice(0, SPOT_PLACES_SHOWN)
    .map(({ spot }) => ({
      label: spot.name,
      point: spot.point,
      distance_m: spot.distance_m,
    }));
}

function isSpotPlace(place: Place): place is SpotPlace {
  return typeof (place as Partial<SpotPlace>).distance_m === "number";
}

/**
 * The distance to draw at from a place just chosen, when the one asked does
 * not fit: a small lake's shapes fit at 1.5 or 1 km. Null to keep the
 * distance: a street, a lake of the usual 2 km, a distance already short
 * enough.
 */
export function distanceOnSpot(place: Place, asked_m: number | null): number | null {
  if (!isSpotPlace(place) || place.distance_m >= USUAL_DISTANCE_M) {
    return null;
  }
  return asked_m === null || asked_m > place.distance_m ? place.distance_m : null;
}
