import assert from "node:assert/strict";
import { test } from "node:test";

import drawingRequest from "../fixtures/drawing-request.json" with { type: "json" };
import drawing from "../fixtures/drawing.json" with { type: "json" };
import drawings from "../fixtures/drawings.json" with { type: "json" };
import myDrawing from "../fixtures/my-drawing.json" with { type: "json" };
import publicProfile from "../fixtures/public-profile.json" with { type: "json" };
import {
  DRAWING_TITLE_MAX_LENGTH,
  type DrawingDetail,
  type DrawingRequest,
  type DrawingsPage,
  type LatLon,
  type MyDrawing,
} from "../src/index.ts";

// The same JSON is validated by the API's test_drawings.py (TASK-117).
const asked: DrawingRequest = drawingRequest;
const mine: MyDrawing = myDrawing;
const page: DrawingsPage = {
  ...drawings,
  drawings: drawings.drawings.map((d) => ({
    ...d,
    style: null,
    track_preview: d.track_preview.map(([lat, lon]): LatLon => [lat, lon]),
  })),
};
const whole: DrawingDetail = {
  ...drawing,
  style: null,
  track: drawing.track.map(([lat, lon]): LatLon => [lat, lon]),
};

test("the drawing request keeps the API's limits", () => {
  assert.ok([...(asked.title ?? "")].length <= DRAWING_TITLE_MAX_LENGTH);
  assert.deepEqual(Object.keys(asked).sort(), ["public", "title"]);
});

test("the owner's drawing names its run and the id the others open", () => {
  assert.deepEqual(Object.keys(mine).sort(), [
    "id",
    "key",
    "public",
    "published_at",
    "title",
  ]);
  assert.equal(mine.public, mine.published_at !== null);
});

test("a drawing seen by the others has no route, times or email", () => {
  for (const seen of [page.drawings[0], whole]) {
    const keys = Object.keys(seen);
    for (const hidden of [
      "points",
      "route_preview",
      "pauses",
      "walks",
      "key",
      "email",
    ]) {
      assert.ok(!keys.includes(hidden), hidden);
    }
  }
  assert.equal(whole.id, page.drawings[0]?.id);
  assert.equal(whole.author.public_id, publicProfile.public_id);
  assert.deepEqual(Object.keys(whole.author).sort(), ["public_id", "username"]);
});
