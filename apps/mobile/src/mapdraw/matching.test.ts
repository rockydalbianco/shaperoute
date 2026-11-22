import answered from "@shaperoute/shared-types/fixtures/stroke-match.json";
import type { LatLon, StrokeMatchResult } from "@shaperoute/shared-types";

import {
  answered as answeredStroke,
  askOf,
  fromAfter,
  keeps,
  snapping,
  type Stroke,
  strokesOfLines,
} from "./matching";

const MATCH = answered as StrokeMatchResult;

const LINE: LatLon[] = [
  [46.0702, 11.1265],
  [46.0706, 11.1278],
  [46.0712, 11.1291],
  [46.0716, 11.1306],
];

const pending = (over: Partial<Stroke> = {}): Stroke => ({
  line: 0,
  points: LINE,
  state: "pending",
  match: null,
  retry: false,
  ...over,
});

test("each line drawn gives its strokes, pending, with the index of its line", () => {
  const strokes = strokesOfLines([LINE, [LINE[0]], LINE]);
  expect(strokes.map((stroke) => [stroke.line, stroke.state])).toEqual([
    [0, "pending"],
    [2, "pending"],
  ]);
});

test("the next stroke starts at the end of a matched stroke's route", () => {
  const matched = pending({ state: "matched", match: MATCH });
  expect(fromAfter(matched)).toEqual(MATCH.points[MATCH.points.length - 1]);
  expect(fromAfter(pending())).toBeUndefined();
  expect(fromAfter(pending({ state: "off_roads", match: MATCH }))).toBeUndefined();
  expect(fromAfter(undefined)).toBeUndefined();
});

test("the request has the magnet and the start only when there are some", () => {
  expect(askOf("running", undefined, LINE, undefined).request).toEqual({
    activity: "running",
    line: LINE,
  });
  expect(askOf("cycling", 0.5, LINE, [46.07, 11.12]).request).toEqual({
    activity: "cycling",
    fit: 0.5,
    line: LINE,
    from: [46.07, 11.12],
  });
});

test("the key changes with the points, the magnet, the activity and the start", () => {
  const key = askOf("running", 0.5, LINE, undefined).key;
  expect(askOf("running", 0.5, LINE, undefined).key).toBe(key);
  expect(askOf("running", 0.6, LINE, undefined).key).not.toBe(key);
  expect(askOf("cycling", 0.5, LINE, undefined).key).not.toBe(key);
  expect(askOf("running", 0.5, LINE, [46.07, 11.12]).key).not.toBe(key);
  expect(askOf("running", 0.5, LINE.slice(1), undefined).key).not.toBe(key);
});

test("what each answer makes of a stroke", () => {
  expect(
    answeredStroke(pending(), { kind: "match", match: MATCH, by: "phone" }),
  ).toMatchObject({
    state: "matched",
    match: MATCH,
    by: "phone",
    retry: false,
  });
  expect(
    answeredStroke(pending(), {
      kind: "match",
      match: { ...MATCH, off_roads: true },
      by: "server",
    }),
  ).toMatchObject({ state: "off_roads", by: "server" });
  expect(
    answeredStroke(pending(), {
      kind: "verdict",
      code: "shape_not_drawable",
      message: "collapses",
    }),
  ).toMatchObject({ state: "failed", match: null, retry: false });
  expect(answeredStroke(pending(), { kind: "none", why: "no server" })).toMatchObject({
    state: "failed",
    retry: true,
  });
  expect(answeredStroke(pending(), { kind: "cancelled" })).toBeNull();
});

test("only matches and verdicts are kept", () => {
  expect(keeps({ kind: "match", match: MATCH, by: "phone" })).toBe(true);
  expect(keeps({ kind: "verdict", code: "invalid_request", message: "" })).toBe(true);
  expect(keeps({ kind: "none", why: "" })).toBe(false);
  expect(keeps({ kind: "cancelled" })).toBe(false);
});

test("snapping while a stroke is pending", () => {
  expect(snapping([pending({ state: "matched", match: MATCH }), pending()])).toBe(true);
  expect(snapping([pending({ state: "matched", match: MATCH })])).toBe(false);
  expect(snapping([])).toBe(false);
});
