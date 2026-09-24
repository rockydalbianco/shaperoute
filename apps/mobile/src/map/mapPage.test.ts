import {
  buildMapPage,
  isExternalUrl,
  MAP_STYLE_URL,
  MAPLIBRE_CSS_SRI,
  MAPLIBRE_CSS_URL,
  MAPLIBRE_JS_SRI,
  MAPLIBRE_JS_URL,
  MAPLIBRE_VERSION,
  ROUTE_COLOR,
  START_HERE_COLOR,
  START_HERE_LABEL,
} from "./mapPage";

const page = buildMapPage();

test("loads a pinned MapLibre GL JS with SRI hashes", () => {
  expect(MAPLIBRE_JS_URL).toContain(`maplibre-gl@${MAPLIBRE_VERSION}/`);
  expect(MAPLIBRE_CSS_URL).toContain(`maplibre-gl@${MAPLIBRE_VERSION}/`);
  expect(page).toContain(`src="${MAPLIBRE_JS_URL}" integrity="${MAPLIBRE_JS_SRI}"`);
  expect(page).toContain(`href="${MAPLIBRE_CSS_URL}" integrity="${MAPLIBRE_CSS_SRI}"`);
  expect(MAPLIBRE_JS_SRI).toMatch(/^sha384-/);
  expect(MAPLIBRE_CSS_SRI).toMatch(/^sha384-/);
});

test("uses the OpenFreeMap style and no key", () => {
  expect(page).toContain(`style: "${MAP_STYLE_URL}"`);
  expect(page).not.toMatch(/key|token/i);
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

test("has a route line, and handles the route messages", () => {
  expect(page).toContain('map.addSource("route"');
  expect(page).toContain(`"line-color": "${ROUTE_COLOR}"`);
  expect(page).toContain('message.type === "showRoute"');
  expect(page).toContain('message.type === "clearRoute"');
});

test("marks where a moved route begins, and frames it with the start", () => {
  expect(START_HERE_LABEL).toBe("Start here");
  expect(page).toContain(`.setText("${START_HERE_LABEL}")`);
  expect(page).toContain(`new maplibregl.Marker({ color: "${START_HERE_COLOR}" })`);
  expect(page).toContain("setStartHere(message.startHere)");
  expect(page).toContain("bounds.extend(marker.getLngLat())");
  expect(page).toContain("setStartHere(null)");
});
