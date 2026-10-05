import type { LatLon } from "@shaperoute/shared-types";

import { thumbSegments } from "../explore/RouteThumb";
import { turnedLine, unturnedPoint } from "./turnedLine";

const RAD = Math.PI / 180;

/**
 * A stroke from Trento, `length` degrees of latitude long, towards `compass`
 * degrees clockwise from north, in metres: its longitudes are stretched as
 * the turn itself reads them, by the latitude of its middle.
 */
function stroke(compass: number, length: number = 0.01): LatLon[] {
  const north = length * Math.cos(compass * RAD);
  const east = length * Math.sin(compass * RAD);
  const k = Math.cos((46 + north / 2) * RAD);
  return [
    [46, 11],
    [46 + north, 11 + east / k],
  ];
}

// An «L» in Trento: nothing about it is symmetric.
const EL: LatLon[] = [
  [46.07, 11.12],
  [46.06, 11.12],
  [46.06, 11.127],
];

function middle(line: LatLon[]): LatLon {
  return [
    line.reduce((sum, [lat]) => sum + lat, 0) / line.length,
    line.reduce((sum, [, lon]) => sum + lon, 0) / line.length,
  ];
}

test("north up, the line is itself", () => {
  expect(turnedLine(EL, 0)).toBe(EL);
  expect(unturnedPoint([46.06, 11.12], EL, 0)).toEqual([46.06, 11.12]);
  expect(turnedLine([], -30)).toEqual([]);
});

test("what points to the bearing points up, as long as it was", () => {
  // The «up» of a shape turned 30° counterclockwise points 30° west of
  // north; its map has a bearing of -30.
  const [from, to] = turnedLine(stroke(-30), -30);
  expect(to[1]).toBeCloseTo(from[1], 9);
  expect(to[0] - from[0]).toBeCloseTo(0.01, 9);

  // On a map with east up, a stroke to the east points up.
  const [west, east] = turnedLine(stroke(90), 90);
  expect(east[1]).toBeCloseTo(west[1], 9);
  expect(east[0] - west[0]).toBeCloseTo(0.01, 9);
});

test("a card draws it straight up", () => {
  const [segment] = thumbSegments(turnedLine(stroke(-30), -30), 173, 114, 12);
  // Up the screen, from the foot of the box to its top.
  expect(segment.angle).toBeCloseTo(-90, 6);
  expect(segment.length).toBeCloseTo(114 - 2 * 12, 6);
  // Not turned, it leans to the left.
  const [leaning] = thumbSegments(stroke(-30), 173, 114, 12);
  expect(leaning.angle).toBeCloseTo(-120, 6);
});

test("the line turns about its middle", () => {
  const turned = turnedLine(EL, 40);
  expect(turned).toHaveLength(EL.length);
  expect(middle(turned)[0]).toBeCloseTo(middle(EL)[0], 9);
  expect(middle(turned)[1]).toBeCloseTo(middle(EL)[1], 9);
});

test("a point of the picture is found again on the earth", () => {
  for (const bearing of [-45, -30, 20, 45, 180]) {
    turnedLine(EL, bearing).forEach((point, i) => {
      const [lat, lon] = unturnedPoint(point, EL, bearing);
      expect(lat).toBeCloseTo(EL[i][0], 9);
      expect(lon).toBeCloseTo(EL[i][1], 9);
    });
  }
});
