import type { LatLon } from "@shaperoute/shared-types";

export type Segment = { left: number; top: number; length: number; angle: number };

/**
 * The segments of several lines drawn in one box `width` × `height`: all of
 * them fitted together inside `pad`, north up, proportions kept (metres east
 * and north, not degrees). As RouteThumb's for one line (src/explore): here
 * the run and its route share the frame, so one lies on the other where the
 * runner followed it. One list of segments for each line, in order.
 */
export function fitLines(
  lines: LatLon[][],
  width: number,
  height: number,
  pad: number,
): Segment[][] {
  const all = lines.flat();
  if (all.length < 2) {
    return lines.map(() => []);
  }
  const midLat = all.reduce((sum, [lat]) => sum + lat, 0) / all.length;
  const k = Math.cos((midLat * Math.PI) / 180);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [lat, lon] of all) {
    minX = Math.min(minX, lon * k);
    maxX = Math.max(maxX, lon * k);
    minY = Math.min(minY, lat);
    maxY = Math.max(maxY, lat);
  }
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  const at = ([lat, lon]: LatLon): [number, number] => [
    offX + (lon * k - minX) * scale,
    offY + (maxY - lat) * scale,
  ];
  return lines.map((line) => {
    const segments: Segment[] = [];
    for (let i = 1; i < line.length; i += 1) {
      const [x1, y1] = at(line[i - 1]);
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
    }
    return segments;
  });
}
