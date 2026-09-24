import { toNote, toNotes } from "./warnings";

// The texts as the route engine writes them today (validation.py,
// optimizer.py, network.py): when the engine changes one, change it here too,
// word for word, or the app shows the raw text again.
test.each([
  [
    "start moved 1.2 km north of the requested point, where the shape closes on the roads",
    "info",
    "The route starts 1.2 km north of your start, where the shape fits the roads. Go to “Start here”.",
  ],
  ["120 m of the route on steps", "caution", "There are 120 m of steps along the way."],
  [
    "1400 m of the route on main roads",
    "caution",
    "1.4 km runs along main roads, with traffic.",
  ],
  ["60 m of the route in tunnels", "caution", "60 m runs through tunnels."],
  [
    "24% of the route is on roads already travelled (limit 20%)",
    "info",
    "About 24% of the route goes over the same roads twice.",
  ],
  [
    "31% of the route runs next to another stretch of it, within 25 m (limit 30%)",
    "info",
    "About 31% of the route runs alongside itself.",
  ],
  [
    "distance on roads is +12% from the target after 18 attempts",
    "info",
    "The route is 12% longer than asked.",
  ],
  [
    "distance on roads is -8% from the target after 18 attempts",
    "info",
    "The route is 8% shorter than asked.",
  ],
  [
    "shape similarity 0.86 is below 0.90 after 18 attempts",
    "caution",
    "The roads here follow the shape only roughly.",
  ],
  [
    "sparse road network: shape points are 140 m from the nearest road on average (threshold 120 m)",
    "caution",
    "Few roads here: the route follows the shape loosely.",
  ],
  [
    "start is 250 m from the nearest road; the route begins there",
    "info",
    "The nearest road is 250 m away: the route begins there.",
  ],
  [
    "no road path to shape point 17; skipped",
    "caution",
    "A bit of the shape has no road to follow, so the route skips it.",
  ],
])("%j reads %s: %j", (warning, tone, text) => {
  expect(toNote(warning)).toEqual({ tone, text });
});

test("a warning the app does not know is shown as it is", () => {
  expect(toNote("something new from the engine")).toEqual({
    tone: "info",
    text: "something new from the engine",
  });
});

test("things to watch for come first, and a sentence is said once", () => {
  expect(
    toNotes([
      "distance on roads is +12% from the target after 18 attempts",
      "no road path to shape point 3; skipped",
      "no road path to shape point 9; skipped",
      "120 m of the route on steps",
    ]).map((note) => note.text),
  ).toEqual([
    "A bit of the shape has no road to follow, so the route skips it.",
    "There are 120 m of steps along the way.",
    "The route is 12% longer than asked.",
  ]);
});
