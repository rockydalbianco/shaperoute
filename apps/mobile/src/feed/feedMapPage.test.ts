import type { LatLon } from "@shaperoute/shared-types";

import { thumbSegments } from "../explore/RouteThumb";
import {
  MAP_BACKGROUND,
  MAP_STYLE,
  MAPLIBRE_JS_SRI,
  MAPLIBRE_JS_URL,
} from "../map/mapPage";
import { color } from "../theme/tokens";
import {
  buildFeedMapPage,
  feedMapScript,
  lineCamera,
  parseFeedMapMessage,
} from "./feedMapPage";
import { SAMPLE_FEED } from "./sampleFeed";

const page = buildFeedMapPage();

const WIDTH = 358;
const HEIGHT = 222;
const PAD = 24;

/** Where MapLibre draws a point, in a box `WIDTH` × `HEIGHT`: Web Mercator,
 * a world 512 points wide at zoom 0. */
function onMap(
  [lat, lon]: LatLon,
  camera: { center: [number, number]; zoom: number },
): [number, number] {
  const world = 512 * 2 ** camera.zoom;
  const x = (lon: number) => ((lon + 180) / 360) * world;
  const y = (lat: number) =>
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * world;
  return [
    WIDTH / 2 + x(lon) - x(camera.center[0]),
    HEIGHT / 2 + y(lat) - y(camera.center[1]),
  ];
}

test("the map lies under the line: every stretch is where the map has it", () => {
  // The smallest drawing and the largest: 1 km and 5 km across.
  for (const id of ["trento-star-5000-0", "bologna-heart-21000-4"]) {
    const post = SAMPLE_FEED.find((each) => each.id === id);
    const line = post?.line ?? [];
    const camera = lineCamera(line, WIDTH, HEIGHT, PAD);
    expect(camera).not.toBeNull();
    // Two points far apart, so no stretch is too short to be drawn.
    const ends: LatLon[] = [line[0], line[Math.floor(line.length / 2)]];
    const [drawn] = thumbSegments(ends, WIDTH, HEIGHT, PAD);
    const whole = lineCamera(ends, WIDTH, HEIGHT, PAD);
    const [x1, y1] = onMap(ends[0], whole!);
    const [x2, y2] = onMap(ends[1], whole!);
    // A stretch is told by its middle, its length and its turn.
    expect(drawn.left + drawn.length / 2).toBeCloseTo((x1 + x2) / 2, 0);
    expect(drawn.top).toBeCloseTo((y1 + y2) / 2, 0);
    expect(drawn.length).toBeCloseTo(Math.hypot(x2 - x1, y2 - y1), 0);
    // The whole drawing, on the map: in the middle, as large as the padding
    // lets it be.
    const points = line.map((point) => onMap(point, camera!));
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(WIDTH / 2, 0);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(HEIGHT / 2, 0);
    expect(Math.max(spanX / (WIDTH - 2 * PAD), spanY / (HEIGHT - 2 * PAD))).toBeCloseTo(
      1,
      2,
    );
  }
});

test("the camera is in MapLibre order, close enough to see the streets", () => {
  const camera = lineCamera(SAMPLE_FEED[1].line, WIDTH, HEIGHT, PAD);
  // Trento: longitude first.
  expect(camera?.center[0]).toBeCloseTo(11.12, 1);
  expect(camera?.center[1]).toBeCloseTo(46.07, 1);
  expect(camera?.zoom).toBeGreaterThan(12);
  expect(camera?.zoom).toBeLessThan(15);
});

test("no camera for a line with nothing to frame", () => {
  expect(lineCamera([[46, 11]], WIDTH, HEIGHT, PAD)).toBeNull();
});

test("loads the MapLibre GL JS of the map page, pinned, and its style", () => {
  expect(page).toContain(`src="${MAPLIBRE_JS_URL}" integrity="${MAPLIBRE_JS_SRI}"`);
  expect(page).toContain(
    `style: ${JSON.stringify(MAP_STYLE).replace(/</g, "\\u003c")}`,
  );
  expect(page).not.toContain("</a>");
  expect(page).not.toMatch(/key=|token/i);
});

test("takes every colour in the page from the tokens", () => {
  const tokenColours = new Set<string>(
    [...Object.values(color), ...Object.values(color.map)].flatMap((value) =>
      typeof value === "string" ? [value] : [],
    ),
  );
  const used = page.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
  expect(used.length).toBeGreaterThan(0);
  for (const hex of used) {
    expect(tokenColours.has(hex)).toBe(true);
  }
  expect(page).toContain(`background: ${MAP_BACKGROUND};`);
});

test("the page is a picture, not a map to move", () => {
  expect(page).toContain("interactive: false");
  expect(page).toContain("attributionControl: false");
  expect(page).not.toContain("NavigationControl");
  // The canvas can be read only if it keeps what it drew.
  expect(page).toContain("preserveDrawingBuffer: true");
  expect(page).toContain('toDataURL("image/jpeg"');
});

test("makes the map at the first picture, as large as the drawing", () => {
  const shoot = page.slice(page.indexOf("function shoot"));
  expect(shoot.indexOf('box.style.width = message.width + "px"')).toBeLessThan(
    shoot.indexOf("new maplibregl.Map"),
  );
  expect(shoot).toContain("center: message.center");
  expect(shoot).toContain("map.resize()");
  // Nothing is loaded before a picture is asked for.
  expect(page.slice(0, page.indexOf("function shoot"))).not.toContain(
    "new maplibregl.Map",
  );
});

test("answers when every tile is drawn, and says when one did not come", () => {
  expect(page).toContain('map.once("idle"');
  expect(page).toContain('post({ type: "miss", key: message.key })');
  // A picture given up on is not answered late, with another one's map.
  expect(page).toContain("if (asked !== message.key)");
});

test("reports a script that did not load", () => {
  expect(page).toContain("message: 'MapLibre GL JS did not load'");
});

test("a picture is asked with its key, its camera and its size", () => {
  expect(
    feedMapScript({
      type: "shoot",
      key: "a:358x222",
      center: [11.12, 46.07],
      zoom: 13.5,
      width: 358,
      height: 222,
    }),
  ).toBe(
    'window.shaperoute && window.shaperoute.receive({"type":"shoot","key":"a:358x222","center":[11.12,46.07],"zoom":13.5,"width":358,"height":222}); true;',
  );
});

test.each([
  ['{"type":"ready"}', { type: "ready" }],
  [
    '{"type":"shot","key":"a","image":"data:image/jpeg;base64,AAAA"}',
    { type: "shot", key: "a", image: "data:image/jpeg;base64,AAAA" },
  ],
  ['{"type":"miss","key":"a"}', { type: "miss", key: "a" }],
  ['{"type":"error","message":"no"}', { type: "error", message: "no" }],
  // Only a picture is shown as one.
  ['{"type":"shot","key":"a","image":"https://example.org/a.jpg"}', null],
  ['{"type":"shot","image":"data:image/jpeg;base64,AAAA"}', null],
  ['{"type":"loaded"}', null],
  ["not json", null],
  ["null", null],
])("reads %s from the page", (data, expected) => {
  expect(parseFeedMapMessage(data)).toEqual(expected);
});
