import { color } from "../theme/tokens";
import {
  buildMapPage,
  FOLLOW_ZOOM,
  isExternalUrl,
  MAP_BACKGROUND,
  MAP_STYLE,
  MAPLIBRE_CSS_SRI,
  MAPLIBRE_CSS_URL,
  MAPLIBRE_JS_SRI,
  MAPLIBRE_JS_URL,
  MAPLIBRE_VERSION,
  POSITION_COLOR,
  ROUTE_COLOR,
  START_HERE_COLOR,
  START_HERE_LABEL,
} from "./mapPage";

const page = buildMapPage();

/** Every colour the tokens name, the map's included. */
const tokenColours = new Set<string>(
  [...Object.values(color), ...Object.values(color.map)].flatMap((value) =>
    typeof value === "string" ? [value] : [],
  ),
);

test("loads a pinned MapLibre GL JS with SRI hashes", () => {
  expect(MAPLIBRE_JS_URL).toContain(`maplibre-gl@${MAPLIBRE_VERSION}/`);
  expect(MAPLIBRE_CSS_URL).toContain(`maplibre-gl@${MAPLIBRE_VERSION}/`);
  expect(page).toContain(`src="${MAPLIBRE_JS_URL}" integrity="${MAPLIBRE_JS_SRI}"`);
  expect(page).toContain(`href="${MAPLIBRE_CSS_URL}" integrity="${MAPLIBRE_CSS_SRI}"`);
  expect(MAPLIBRE_JS_SRI).toMatch(/^sha384-/);
  expect(MAPLIBRE_CSS_SRI).toMatch(/^sha384-/);
});

test("writes the dark style into the page, and no key", () => {
  expect(page).toContain(
    `style: ${JSON.stringify(MAP_STYLE).replace(/</g, "\\u003c")}`,
  );
  expect(page).not.toContain("styles/liberty");
  expect(page).not.toMatch(/key|token/i);
});

test("lets no string in the style close the script early", () => {
  // The attribution is HTML: its "</a>" must reach the page escaped.
  expect(JSON.stringify(MAP_STYLE)).toContain("</a>");
  expect(page).not.toContain("</a>");
});

test("paints the page behind the map dark, so it never flashes white", () => {
  expect(MAP_BACKGROUND).toBe(color.map.background);
  expect(page).toContain(`background: ${MAP_BACKGROUND};`);
});

test("takes every colour in the page from the tokens", () => {
  const used = page.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
  expect(used.length).toBeGreaterThan(0);
  for (const hex of used) {
    expect(tokenColours.has(hex)).toBe(true);
  }
});

test("reports tiles that cannot be described, not just a missing style", () => {
  expect(Object.keys(MAP_STYLE.sources)).toContain("openmaptiles");
  expect(page).toContain('event.sourceId === "openmaptiles" && !event.tile');
});

test("keeps the attribution expanded", () => {
  expect(page).toContain("new maplibregl.AttributionControl({ compact: false })");
});

test("starts on Italy, with the bounds in MapLibre order", () => {
  expect(page).toContain("bounds: [[6.6,35.5],[18.6,47.1]]");
});

test("reports a script that did not load", () => {
  expect(page).toContain(`onerror="fail('MapLibre GL JS did not load')"`);
});

test.each([
  ["https://www.openstreetmap.org/copyright", true],
  ["http://example.org", true],
  ["about:blank", false],
  ["data:text/html,hello", false],
])("isExternalUrl(%s) is %s", (url, expected) => {
  expect(isExternalUrl(url)).toBe(expected);
});

test("has a yellow route line, and handles the route messages", () => {
  expect(ROUTE_COLOR).toBe(color.accent);
  expect(page).toContain('map.addSource("route"');
  expect(page).toContain(`"line-color": "${ROUTE_COLOR}"`);
  expect(page).toContain('message.type === "showRoute"');
  expect(page).toContain('message.type === "clearRoute"');
});

test("marks the start in a colour that is neither the route nor Start here", () => {
  expect(page).toContain(`new maplibregl.Marker({ color: "${POSITION_COLOR}" })`);
  expect(POSITION_COLOR).not.toBe(ROUTE_COLOR);
  expect(POSITION_COLOR).not.toBe(START_HERE_COLOR);
});

test("marks where a moved route begins, and frames it with the start", () => {
  expect(START_HERE_LABEL).toBe("Start here");
  expect(START_HERE_COLOR).toBe(color.startHere);
  expect(START_HERE_COLOR).not.toBe(ROUTE_COLOR);
  expect(page).toContain(`.setText("${START_HERE_LABEL}")`);
  expect(page).toContain(`new maplibregl.Marker({ color: "${START_HERE_COLOR}" })`);
  expect(page).toContain("setStartHere(message.startHere)");
  expect(page).toContain("bounds.extend(marker.getLngLat())");
  expect(page).toContain("setStartHere(null)");
});

test("the page follows the runner close up, without framing the route again", () => {
  const handler = page.slice(page.indexOf('message.type === "follow"'));
  expect(handler).toContain(`zoom: ${FOLLOW_ZOOM}`);
  expect(handler.slice(0, handler.indexOf("clearRoute"))).not.toContain("fitBounds");
});
