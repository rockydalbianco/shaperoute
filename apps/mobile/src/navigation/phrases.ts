import type { Direction, Turn } from "@shaperoute/shared-types";

/**
 * What the app shows and says for a direction (TASK-049), in English like
 * the rest of the interface. The street is the one OpenStreetMap names; a
 * road without a name is called by its kind, never given one (ADR-0045);
 * the street it runs beside, when the API deduced one, is said as "beside",
 * never as the road's own name (ADR-0058).
 */

const VERBS: Record<Turn, string> = {
  depart: "Head out",
  left: "Turn left",
  right: "Turn right",
  "sharp-left": "Turn sharp left",
  "sharp-right": "Turn sharp right",
  straight: "Continue straight",
  "u-turn": "Make a U-turn",
};

/** An arrow for the banner. */
export const ARROWS: Record<Turn, string> = {
  depart: "↑",
  left: "←",
  right: "→",
  "sharp-left": "↙",
  "sharp-right": "↘",
  straight: "↑",
  "u-turn": "↩",
};

/** OSM `highway` values a runner meets without a name, in plain words. */
const KINDS: Record<string, string> = {
  footway: "the footpath",
  pedestrian: "the pedestrian street",
  path: "the path",
  cycleway: "the cycle path",
  track: "the track",
  steps: "the steps",
  service: "the service road",
  living_street: "the street",
  residential: "the street",
};

/**
 * "onto Via Roma", "onto the footpath", "onto the footpath beside Via Roma",
 * or nothing when OSM says nothing. `street` always wins over `along`.
 */
export function onto(direction: Direction): string {
  if (direction.street) {
    return ` onto ${direction.street}`;
  }
  // A merged edge can be "footway / steps": the first kind is enough.
  const kind = direction.road_type?.split(" / ")[0];
  const words = kind ? (KINDS[kind] ?? "the road") : null;
  // `along` is missing from an API older than TASK-060.
  const beside = direction.along ? ` beside ${direction.along}` : "";
  return words ? ` onto ${words}${beside}` : beside;
}

/** "Turn left onto Via Roma"; the departure says where it starts. */
export function instruction(direction: Direction): string {
  if (direction.turn === "depart") {
    return `${VERBS.depart}${onto(direction).replace(" onto ", " on ")}`;
  }
  return `${VERBS[direction.turn]}${onto(direction)}`;
}

/**
 * The words said before a junction: "In 50 metres, turn left onto Via Roma,
 * then turn right onto the footpath". `chain` is the direction and those
 * joined to it (a street crossed in a few metres), said together.
 */
export function announcement(chain: Direction[], inM: number | null): string {
  const said = chain.map(instruction);
  const first =
    inM === null ? said[0] : `In ${roundMetres(inM)} metres, ${lower(said[0])}`;
  return [first, ...said.slice(1).map((words) => `then ${lower(words)}`)].join(", ");
}

/** The banner's second line: "Then turn right onto Via Verdi". */
export function thenText(then: Direction[]): string {
  return `Then ${then.map((d) => lower(instruction(d))).join(", then ")}`;
}

/** Metres as a runner hears them: to 10 m, and never "0 metres". */
export function roundMetres(metres: number): number {
  return Math.max(10, Math.round(metres / 10) * 10);
}

/** For the banner: "120 m", "1.4 km". */
export function distanceLabel(metres: number): string {
  if (metres >= 1000) {
    return `${(metres / 1000).toFixed(1)} km`;
  }
  return `${roundMetres(metres)} m`;
}

function lower(words: string): string {
  return words.charAt(0).toLowerCase() + words.slice(1);
}
