import type { LatLon } from "@shaperoute/shared-types";

import { tLater } from "../i18n";
import type { Place } from "../places/photon";

/** A place of «Explore» with «Paddle» (TASK-191): a lake or a stretch of
 * sea, and the point of its shore its examples start from. */
export type WaterPlace = {
  name: string;
  /** Where on its shore, for the line over the examples: an English text
   * to show with `t` (TASK-210). */
  from: string;
  point: LatLon;
};

/**
 * The places the user chose: two lakes and two beaches (ADR-0169). Each
 * point is on the shore, chosen by hand where one walks to the water; the
 * engine starts the route at the shore point nearest the shape, within 2 km.
 * Riva del Garda, Jesolo and Riccione are the starts of the samples judged by
 * the user (A1); Como is the lakefront of the town, Lungo Lario Trento.
 */
export const WATER_PLACES: readonly WaterPlace[] = [
  {
    name: "Lago di Garda",
    from: tLater("from Riva del Garda"),
    point: [45.88114, 10.84559],
  },
  { name: "Lago di Como", from: tLater("from Como"), point: [45.8132, 9.08029] },
  { name: "Jesolo", from: tLater("from the beach"), point: [45.50137, 12.63925] },
  { name: "Riccione", from: tLater("from the beach"), point: [44.00355, 12.66338] },
];

/** As a place of «Explore»: its examples are known by its point. */
export function asPlace(place: WaterPlace): Place {
  return { label: place.name, point: place.point };
}
