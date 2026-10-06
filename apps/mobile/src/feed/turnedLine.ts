import type { LatLon } from "@shaperoute/shared-types";

/**
 * A line turned for a picture (TASK-232, ADR-0195). A card draws its line
 * with north up (`thumbSegments`); to draw it as a map at a bearing shows
 * it, the line itself is turned about its middle, in metres east and north,
 * and drawn as ever. The map under it takes the same bearing (`lineCamera`).
 */

/** The middle a line is turned about, and the turn. */
type Frame = { lat: number; lon: number; k: number; cos: number; sin: number };

function frameOf(line: LatLon[], bearing: number): Frame {
  const lat = line.reduce((sum, [each]) => sum + each, 0) / line.length;
  const lon = line.reduce((sum, [, each]) => sum + each, 0) / line.length;
  const turn = (bearing * Math.PI) / 180;
  return {
    lat,
    lon,
    // Degrees of longitude to degrees of latitude, as in `thumbSegments`.
    k: Math.cos((lat * Math.PI) / 180),
    cos: Math.cos(turn),
    sin: Math.sin(turn),
  };
}

/**
 * `line` as a map at `bearing` (degrees clockwise from north, MapLibre's)
 * shows it, said as a line with north up: what points to `bearing` points
 * up. Its middle stays where it is. North up already, it is `line` itself.
 */
export function turnedLine(line: LatLon[], bearing: number): LatLon[] {
  if (bearing === 0 || line.length === 0) {
    return line;
  }
  const f = frameOf(line, bearing);
  return line.map(([lat, lon]) => {
    const east = (lon - f.lon) * f.k;
    const north = lat - f.lat;
    return [
      f.lat + east * f.sin + north * f.cos,
      f.lon + (east * f.cos - north * f.sin) / f.k,
    ];
  });
}

/**
 * Where a point of the picture of `turnedLine(line, bearing)` is on the
 * earth: the turn undone, about the same middle.
 */
export function unturnedPoint(point: LatLon, line: LatLon[], bearing: number): LatLon {
  if (bearing === 0 || line.length === 0) {
    return point;
  }
  const f = frameOf(line, bearing);
  const right = (point[1] - f.lon) * f.k;
  const up = point[0] - f.lat;
  return [
    f.lat + up * f.cos - right * f.sin,
    f.lon + (right * f.cos + up * f.sin) / f.k,
  ];
}
