import {
  clearRoute,
  pageScript,
  parsePageMessage,
  setPosition,
  showRoute,
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
  });
  expect(clearRoute()).toEqual({ type: "clearRoute" });
});

test("pageScript hands the message to the page and returns true", () => {
  const script = pageScript(setPosition([46.0671, 11.1214]));
  expect(script).toBe(
    'window.shaperoute && window.shaperoute.receive({"type":"setPosition","lngLat":[11.1214,46.0671]}); true;',
  );
});

test("parsePageMessage reads ready and error", () => {
  expect(parsePageMessage('{"type":"ready"}')).toEqual({ type: "ready" });
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
