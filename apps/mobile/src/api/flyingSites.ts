import { type AccountOutcome, ask } from "./accounts";

/**
 * The free-flight sites of OpenStreetMap (TASK-493 part A, ADR-0400,
 * docs/API.md «Flying sites»), as part D6 of TASK-479 reads them: the
 * landings of a box around the take-off. The same for everyone, so no
 * token. The types are this file's own until TASK-493 part C brings the
 * shared ones; the format only ever gains fields.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

export type FlyingSite = {
  id: string | number;
  kind: "takeoff" | "landing";
  lat: number;
  lon: number;
  name: string | null;
  ele_m: number | null;
};

export type FlyingSites = { sites: FlyingSite[]; more: boolean; attribution: string };

/** A box of the map: south, west, north, east, degrees. */
export type Box = { south: number; west: number; north: number; east: number };

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function isFlyingSite(value: unknown): value is FlyingSite {
  if (!isObject(value)) {
    return false;
  }
  const { id, kind, lat, lon, name, ele_m } = value;
  return (
    (typeof id === "string" || typeof id === "number") &&
    (kind === "takeoff" || kind === "landing") &&
    isNumber(lat) &&
    isNumber(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    (name === null || name === undefined || typeof name === "string") &&
    (ele_m === null || ele_m === undefined || isNumber(ele_m))
  );
}

export function isFlyingSites(body: unknown): body is FlyingSites {
  return (
    isObject(body) &&
    Array.isArray(body.sites) &&
    body.sites.every(isFlyingSite) &&
    typeof body.more === "boolean" &&
    typeof body.attribution === "string"
  );
}

/** GET /flying-sites: the landings of `box`, at most 1000. */
export function fetchLandings(
  baseUrl: string,
  box: Box,
  options: Options = {},
): Promise<AccountOutcome<FlyingSites>> {
  const fixed = (n: number) => n.toFixed(4);
  return ask(
    baseUrl,
    `/flying-sites?south=${fixed(box.south)}&west=${fixed(box.west)}&north=${fixed(
      box.north,
    )}&east=${fixed(box.east)}&kind=landing`,
    { method: "GET" },
    isFlyingSites,
    options,
  );
}
