import type { LatLon } from "@shaperoute/shared-types";

export type Segment = { left: number; top: number; length: number; angle: number };

/**
 * The segments of several lines drawn in one box `width` × `height`: all of
 * them fitted together inside `pad`, north up, proportions kept (metres east
 * and north, not degrees). As RouteThumb's for one line (src/explore): here
 * the run and its route share the frame, so one lies on the other where the
 * runner followed it. One list of segments for each line, in order. With a
 * `bearing` (degrees clockwise from north, MapLibre's) the lines are drawn
 * as a map turned so shows them (TASK-232): what points to `bearing` points
 * up. All of them turn about one middle, so they still lie on each other.
 */
export function fitLines(
  lines: LatLon[][],
  width: number,
  height: number,
  pad: number,
  bearing: number = 0,
): Segment[][] {
  const all = lines.flat();
  if (all.length < 2) {
    return lines.map(() => []);
  }
  const midLat = all.reduce((sum, [lat]) => sum + lat, 0) / all.length;
  const midLon = all.reduce((sum, [, lon]) => sum + lon, 0) / all.length;
  const k = Math.cos((midLat * Math.PI) / 180);
  const turn = (bearing * Math.PI) / 180;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  // A point on the plane, east and north in degrees of latitude, turned
  // about the middle of every line (as turnedLine does for one).
  const plane = ([lat, lon]: LatLon): [number, number] => {
    const east = (lon - midLon) * k;
    const north = lat - midLat;
    return bearing === 0
      ? [east, north]
      : [east * cos - north * sin, east * sin + north * cos];
  };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of all) {
    const [x, y] = plane(point);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  const at = (point: LatLon): [number, number] => {
    const [x, y] = plane(point);
    return [offX + (x - minX) * scale, offY + (maxY - y) * scale];
  };
  return lines.map((line) => {
    const segments: Segment[] = [];
    if (line.length === 0) {
      return segments;
    }
    // A segment starts where the last one drawn ended (TASK-254): points
    // too close to draw are skipped, not lost, so a long run with a point
    // every few metres is still one line.
    let [x1, y1] = at(line[0]);
    for (let i = 1; i < line.length; i += 1) {
      const [x2, y2] = at(line[i]);
      const length = Math.hypot(x2 - x1, y2 - y1);
      if (length < 0.5) {
        continue;
      }
      segments.push({
        // A View turns about its centre: place the centre mid-segment.
        left: (x1 + x2) / 2 - length / 2,
        top: (y1 + y2) / 2,
        length,
        angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
      });
      [x1, y1] = [x2, y2];
    }
    return segments;
  });
}
