/**
 * The map under a drawing that is turned (TASK-232, ADR-0195): the picture
 * is taken at the bearing that shows the drawing upright. The rest of the
 * page is in feedMapPage.test.ts.
 */
import type { LatLon } from "@shaperoute/shared-types";

import { buildFeedMapPage, feedMapScript, lineCamera } from "./feedMapPage";
import { turnedLine } from "./turnedLine";

const RAD = Math.PI / 180;
const K = Math.cos(46.065 * RAD);

// A square in Trento, as wide in metres as it is tall.
const SQUARE: LatLon[] = [
  [46.06, 11.12],
  [46.06, 11.12 + 0.01 / K],
  [46.07, 11.12 + 0.01 / K],
  [46.07, 11.12],
  [46.06, 11.12],
];
// An «L»: nothing about it is symmetric.
const EL: LatLon[] = [
  [46.07, 11.12],
  [46.06, 11.12],
  [46.06, 11.127],
];

test("north up, the camera is the one it was, with no bearing", () => {
  const camera = lineCamera(EL, 173, 114, 12, 0);
  expect(camera).toEqual(lineCamera(EL, 173, 114, 12));
  expect(camera !== null && "bearing" in camera).toBe(false);
  expect(lineCamera([[46.06, 11.12]], 173, 114, 12, -30)).toBeNull();
});

test("a square turned 45° is a diamond: seen from further, over the same middle", () => {
  const upright = lineCamera(SQUARE, 173, 114, 12);
  const turned = lineCamera(SQUARE, 173, 114, 12, 45);
  expect(turned?.bearing).toBe(45);
  // √2 wider and taller: half a zoom level out.
  expect(turned?.zoom).toBeCloseTo((upright?.zoom ?? 0) - 0.5, 4);
  expect(turned?.center[0]).toBeCloseTo(upright?.center[0] ?? 0, 6);
  expect(turned?.center[1]).toBeCloseTo(upright?.center[1] ?? 0, 6);
});

test("the turned map lies under the line a card draws turned", () => {
  const bearing = -30;
  const camera = lineCamera(EL, 173, 114, 12, bearing);
  expect(camera).not.toBeNull();
  const [lon, lat] = camera?.center ?? [0, 0];
  // The zoom is the fit of the turned line.
  expect(camera?.zoom).toBeCloseTo(
    lineCamera(turnedLine(EL, bearing), 173, 114, 12)?.zoom ?? 0,
    9,
  );
  // On a map at that bearing, the line is as far to the left of the middle
  // as to the right, and as far up as down: the picture's middle is its own.
  const k = Math.cos(lat * RAD);
  const right = EL.map(
    ([pLat, pLon]) =>
      (pLon - lon) * k * Math.cos(bearing * RAD) -
      (pLat - lat) * Math.sin(bearing * RAD),
  );
  const up = EL.map(
    ([pLat, pLon]) =>
      (pLon - lon) * k * Math.sin(bearing * RAD) +
      (pLat - lat) * Math.cos(bearing * RAD),
  );
  expect(Math.min(...right)).toBeCloseTo(-Math.max(...right), 6);
  expect(Math.min(...up)).toBeCloseTo(-Math.max(...up), 6);
  // And it is not where the map north up looks.
  expect(lon).not.toBeCloseTo(lineCamera(EL, 173, 114, 12)?.center[0] ?? 0, 4);
});

test("the page is asked for the bearing, and takes the picture turned", () => {
  const script = feedMapScript({
    type: "shoot",
    key: "a:173x114@-30",
    center: [11.12, 46.06],
    zoom: 13,
    bearing: -30,
    width: 173,
    height: 114,
  });
  expect(script).toContain('"bearing":-30');

  const page = buildFeedMapPage();
  // North up unless asked: the map is the same one for every picture.
  expect(page).toContain("var bearing = message.bearing || 0;");
  expect(page).toContain(
    "map.jumpTo({ center: message.center, zoom: message.zoom, bearing: bearing });",
  );
  // The first picture too.
  const made = page.slice(page.indexOf("new maplibregl.Map("));
  expect(made.slice(0, made.indexOf("});"))).toContain("bearing: bearing,");
});
