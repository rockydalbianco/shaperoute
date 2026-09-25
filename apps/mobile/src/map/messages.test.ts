import {
  clearRoute,
  follow,
  pageScript,
  parsePageMessage,
  setPosition,
  showRoute,
  START_HERE_M,
} from "./messages";

test("setPosition sends the point in MapLibre order", () => {
  expect(setPosition([46.0671, 11.1214])).toEqual({
    type: "setPosition",
    lngLat: [11.1214, 46.0671],
  });
});

test("showRoute sends every point in MapLibre order", () => {
  expect(
    showRoute([
      [46.0671, 11.1214],
      [46.0122, 11.2986],
    ]),
  ).toEqual({
    type: "showRoute",
    coordinates: [
      [11.1214, 46.0671],
      [11.2986, 46.0122],
    ],
    startHere: null,
  });
  expect(clearRoute()).toEqual({ type: "clearRoute" });
});

test("showRoute marks where to go only when the route begins away", () => {
  const route: [number, number][] = [
    [46.0122, 11.2986],
    [46.0671, 11.1214],
    [46.0122, 11.2986],
  ];
  // The route begins 30 m from the requested start: just the nearest road.
  expect(showRoute(route, [46.01247, 11.2986])).toMatchObject({ startHere: null });
  // It begins 1 km north of it: the engine moved the shape there.
  expect(showRoute(route, [46.0032, 11.2986])).toMatchObject({
    startHere: [11.2986, 46.0122],
  });
  expect(START_HERE_M).toBe(50);
});

test("pageScript hands the message to the page and returns true", () => {
  const script = pageScript(setPosition([46.0671, 11.1214]));
  expect(script).toBe(
    'window.shaperoute && window.shaperoute.receive({"type":"setPosition","lngLat":[11.1214,46.0671]}); true;',
  );
});

test("parsePageMessage reads ready, loaded and error", () => {
  expect(parsePageMessage('{"type":"ready"}')).toEqual({ type: "ready" });
  expect(parsePageMessage('{"type":"loaded"}')).toEqual({ type: "loaded" });
  expect(parsePageMessage('{"type":"error","message":"style not found"}')).toEqual({
    type: "error",
    message: "style not found",
  });
});

test.each([
  ["not JSON", "ready"],
  ["not an object", "42"],
  ["null", "null"],
  ["no type", "{}"],
  ["unknown type", '{"type":"hello"}'],
  ["error without text", '{"type":"error"}'],
])("parsePageMessage ignores %s", (_case, data) => {
  expect(parsePageMessage(data)).toBeNull();
});

test("follow sends the position in MapLibre order", () => {
  expect(follow([46.0671, 11.1214])).toEqual({
    type: "follow",
    lngLat: [11.1214, 46.0671],
  });
});
