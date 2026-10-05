import { useCallback, useState } from "react";

/**
 * The map turned as the drawing (TASK-232, ADR-0195): the engine may turn a
 * shape up to 45° to follow the roads, and says by how much
 * (`RouteResult.rotation_deg`, counterclockwise); the map takes the opposite
 * bearing, so the shape reads upright. With the map turned there is a north
 * arrow: a tap puts north up, a second one turns the map as the drawing
 * again.
 */

/** A map turned less than this, in degrees, is north-up: no north arrow. */
export const TURNED_MIN_DEG = 0.5;

/**
 * The bearing of the map, in degrees clockwise from north in (-180, 180],
 * that shows upright a shape turned `rotationDeg` counterclockwise. 0, north
 * up, for a route that does not say: one of an older API, a circle.
 */
export function bearingOf(rotationDeg: number | null | undefined): number {
  if (typeof rotationDeg !== "number" || !Number.isFinite(rotationDeg)) {
    return 0;
  }
  // In [-180, 180), then the one end moved to the other.
  const bearing = ((((-rotationDeg + 180) % 360) + 360) % 360) - 180;
  return bearing === -180 ? 180 : bearing;
}

/** Whether a map at `bearing` is turned: north is not up. */
export function isTurned(bearing: number): boolean {
  return Math.abs(bearing) >= TURNED_MIN_DEG;
}

/**
 * Where a tap on the north arrow turns the map: north up when it is turned,
 * `shown` being its bearing now; back as its drawing, `drawn`, when north
 * is up already.
 */
export function tapBearing(shown: number, drawn: number): number {
  return isTurned(shown) ? 0 : drawn;
}

/** How far the north arrow is turned on the screen, clockwise: it points
 * where north is on a map at `bearing`. */
export function arrowTurnDeg(bearing: number): number {
  return bearing === 0 ? 0 : -bearing;
}

/** A turn asked of the map: a new one for each tap, also to where the map
 * was asked to turn before. */
export type Turn = { bearing: number };

export type TurnedMap = {
  /** `MapView`'s `bearing`: the one that shows the route upright. */
  bearing: number;
  /** `MapView`'s `turn`: what the last tap on the arrow asked, if any. */
  turn: Turn | null;
  /** `MapView`'s `onTurned`. */
  onTurned: (bearing: number) => void;
  /** The map's bearing now, for the arrow. */
  shown: number;
  /** Whether there is a north arrow: the map is turned, or would be as its
   * drawing. */
  arrow: boolean;
  /** A tap on the arrow. */
  onArrow: () => void;
};

/**
 * The map's turn for a route turned `rotationDeg` (none: north up), and its
 * north arrow. The map says how it is turned, also by two fingers; the
 * arrow follows it.
 */
export function useTurnedMap(rotationDeg: number | null | undefined): TurnedMap {
  const bearing = bearingOf(rotationDeg);
  const [shown, setShown] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  const onArrow = useCallback(
    () => setTurn({ bearing: tapBearing(shown, bearing) }),
    [shown, bearing],
  );
  return {
    bearing,
    turn,
    onTurned: setShown,
    shown,
    arrow: isTurned(shown) || isTurned(bearing),
    onArrow,
  };
}
