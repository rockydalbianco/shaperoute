import {
  clearProgress,
  clearRoute,
  clearStops,
  clearTrack,
  follow,
  pageScript,
  parsePageMessage,
  setPosition,
  showOthers,
  showProgress,
  showRoute,
  showStops,
  showTrack,
  START_HERE_M,
  stopFollow,
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

test("a word with the pen up sends its letters and its walks apart (TASK-198)", () => {
  const route: [number, number][] = [
    [46.01, 11.3],
    [46.02, 11.3],
    [46.03, 11.3],
    [46.03, 11.31],
    [46.02, 11.31],
  ];
  expect(showRoute(route, null, [[1, 3]])).toEqual({
    type: "showRoute",
    // The whole line still frames the map.
    coordinates: [
      [11.3, 46.01],
      [11.3, 46.02],
      [11.3, 46.03],
      [11.31, 46.03],
      [11.31, 46.02],
    ],
    startHere: null,
    letters: [
      [
        [11.3, 46.01],
        [11.3, 46.02],
      ],
      [
        [11.31, 46.03],
        [11.31, 46.02],
      ],
    ],
    walks: [
      [
        [11.3, 46.02],
        [11.3, 46.03],
        [11.31, 46.03],
      ],
    ],
  });
  // No walks, or walks that do not fit the route: the message of before.
  const before = showRoute(route);
  expect(showRoute(route, null, [])).toEqual(before);
  expect(showRoute(route, null, [[3, 9]])).toEqual(before);
  expect(before).not.toHaveProperty("walks");
});

test("a bike route marks its stretches with the bike on foot over it (TASK-206)", () => {
  const route: [number, number][] = [
    [46.01, 11.3],
    [46.02, 11.3],
    [46.03, 11.3],
    [46.03, 11.31],
  ];
  expect(showRoute(route, null, null, [[1, 2]])).toEqual({
    type: "showRoute",
    // The route is one line, as without: the stretches are part of it.
    coordinates: [
      [11.3, 46.01],
      [11.3, 46.02],
      [11.3, 46.03],
      [11.31, 46.03],
    ],
    startHere: null,
    onFoot: [
      [
        [11.3, 46.02],
        [11.3, 46.03],
      ],
    ],
  });
  // With the walks of a word with the pen up, only on its letters.
  expect(showRoute(route, null, [[1, 2]], [[0, 3]])).toMatchObject({
    onFoot: [
      [
        [11.3, 46.01],
        [11.3, 46.02],
      ],
      [
        [11.3, 46.03],
        [11.31, 46.03],
      ],
    ],
  });
  // None, or none that fit: the message of before.
  const before = showRoute(route);
  expect(showRoute(route, null, null, [])).toEqual(before);
  expect(showRoute(route, null, null, [[2, 7]])).toEqual(before);
  expect(before).not.toHaveProperty("onFoot");
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
    heading: null,
  });
});

test("follow sends the heading in whole degrees, stopFollow ends it", () => {
  expect(follow([46.0671, 11.1214], 44.6)).toEqual({
    type: "follow",
    lngLat: [11.1214, 46.0671],
    heading: 45,
  });
  // 359.7 is north, not 360.
  expect(follow([46.0671, 11.1214], 359.7)).toMatchObject({ heading: 0 });
  expect(stopFollow()).toEqual({ type: "stopFollow" });
});

test("showTrack sends the run in MapLibre order, clearTrack removes it", () => {
  expect(
    showTrack([
      [46.0671, 11.1214],
      [46.0122, 11.2986],
    ]),
  ).toEqual({
    type: "showTrack",
    coordinates: [
      [11.1214, 46.0671],
      [11.2986, 46.0122],
    ],
  });
  expect(clearTrack()).toEqual({ type: "clearTrack" });
});

test("showStops sends each place in MapLibre order, passed or not", () => {
  expect(
    showStops([
      { name: "Piazza del Duomo", point: [45.4642, 9.19], passed: true },
      { name: "Brera", point: [45.472, 9.188], passed: false },
    ]),
  ).toEqual({
    type: "showStops",
    stops: [
      { name: "Piazza del Duomo", lngLat: [9.19, 45.4642], passed: true },
      { name: "Brera", lngLat: [9.188, 45.472], passed: false },
    ],
  });
  expect(clearStops()).toEqual({ type: "clearStops" });
});

test("showOthers sends each route in MapLibre order, and none to clear", () => {
  expect(
    showOthers([
      [
        [46.0671, 11.1214],
        [46.068, 11.122],
      ],
    ]),
  ).toEqual({
    type: "showOthers",
    lines: [
      [
        [11.1214, 46.0671],
        [11.122, 46.068],
      ],
    ],
  });
  expect(showOthers([])).toEqual({ type: "showOthers", lines: [] });
});

test("showProgress sends the part run and the part left in MapLibre order (TASK-224)", () => {
  const split = {
    done: [
      [
        [46.0, 11.0],
        [46.001, 11.0],
      ],
    ] as [number, number][][],
    ahead: [
      [
        [46.001, 11.0],
        [46.002, 11.0],
      ],
    ] as [number, number][][],
  };
  expect(showProgress(split, true)).toEqual({
    type: "showProgress",
    done: [
      [
        [11.0, 46.0],
        [11.0, 46.001],
      ],
    ],
    ahead: [
      [
        [11.0, 46.001],
        [11.0, 46.002],
      ],
    ],
    blink: true,
  });
  // In pocket mode the dashes keep still.
  expect(showProgress(split, false)).toMatchObject({ blink: false });
  expect(clearProgress()).toEqual({ type: "clearProgress" });
});
