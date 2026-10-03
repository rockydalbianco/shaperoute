import assert from "node:assert/strict";
import { test } from "node:test";

import drawingDetails from "../fixtures/drawing-details.json" with { type: "json" };
import photoRequest from "../fixtures/drawing-photo-request.json" with { type: "json" };
import requestDetails from "../fixtures/drawing-request-details.json" with { type: "json" };
import drawingRequest from "../fixtures/drawing-request.json" with { type: "json" };
import drawingsDetails from "../fixtures/drawings-details.json" with { type: "json" };
import myDrawingDetails from "../fixtures/my-drawing-details.json" with { type: "json" };
import myDrawing from "../fixtures/my-drawing.json" with { type: "json" };
import people from "../fixtures/people.json" with { type: "json" };
import {
  ACTIVITIES,
  type Activity,
  DRAWING_DESCRIPTION_MAX_LENGTH,
  DRAWING_MAX_PHOTOS,
  DRAWING_MAX_TAGS,
  type DrawingDetail,
  type DrawingPhotoRequest,
  type DrawingRequest,
  type DrawingsPage,
  type LatLon,
  type MyDrawing,
  VISIBILITIES,
  type Visibility,
} from "../src/index.ts";

// The same JSON is validated by the API's test_drawings.py (TASK-208).
function visibility(value: string): Visibility {
  const found = VISIBILITIES.find((v) => v === value);
  assert.ok(found, value);
  return found;
}

function activity(value: string): Activity {
  const found = ACTIVITIES.find((a) => a === value);
  assert.ok(found, value);
  return found;
}

const asked: DrawingRequest = {
  ...requestDetails,
  visibility: visibility(requestDetails.visibility),
  activity: activity(requestDetails.activity),
};
// What an app before TASK-208 sends is still a request.
const askedBefore: DrawingRequest = drawingRequest;
const mine: MyDrawing = {
  ...myDrawingDetails,
  visibility: visibility(myDrawingDetails.visibility),
  activity: activity(myDrawingDetails.activity),
};
// And what an API before TASK-208 answered is still a MyDrawing.
const mineBefore: MyDrawing = myDrawing;
const whole: DrawingDetail = {
  ...drawingDetails,
  style: null,
  visibility: visibility(drawingDetails.visibility),
  activity: activity(drawingDetails.activity),
  track: drawingDetails.track.map(([lat, lon]): LatLon => [lat, lon]),
};
const page: DrawingsPage = {
  ...drawingsDetails,
  drawings: drawingsDetails.drawings.map((d) => ({
    ...d,
    style: null,
    visibility: visibility(d.visibility),
    activity: activity(d.activity),
    track_preview: d.track_preview.map(([lat, lon]): LatLon => [lat, lon]),
  })),
};
const photo: DrawingPhotoRequest = photoRequest;

test("the request says who can see it once, and keeps the API's limits", () => {
  assert.equal(asked.public, undefined);
  assert.equal(typeof askedBefore.public, "boolean");
  assert.equal(askedBefore.visibility, undefined);
  assert.ok([...(asked.description ?? "")].length <= DRAWING_DESCRIPTION_MAX_LENGTH);
  assert.ok((asked.tags ?? []).length <= DRAWING_MAX_TAGS);
  assert.deepEqual(asked.tags, [people.people[1]?.public_id]);
});

test("the owner's drawing has the fields of TASK-208 beside those before", () => {
  assert.deepEqual(
    Object.keys(mine).sort(),
    [
      ...Object.keys(mineBefore),
      "activity",
      "description",
      "photos",
      "tags",
      "visibility",
    ].sort(),
  );
  // `public` is "everyone" for an app before TASK-208.
  assert.equal(mine.public, mine.visibility === "everyone");
  assert.deepEqual(mine.tags, whole.tags);
  assert.deepEqual(mine.photos, whole.photos);
});

test("a drawing has its tags by name and its photos by address, never the email", () => {
  for (const seen of [whole, page.drawings[0]]) {
    assert.ok(seen);
    for (const tag of seen.tags ?? []) {
      assert.deepEqual(Object.keys(tag).sort(), ["public_id", "username"]);
    }
    for (const shown of seen.photos ?? []) {
      assert.ok(shown.n >= 1 && shown.n <= DRAWING_MAX_PHOTOS);
      assert.match(
        shown.url,
        new RegExp(`^/drawings/${seen.id}/photos/${shown.n}\\?v=\\d+$`),
      );
    }
    assert.ok(!JSON.stringify(seen).includes("email"));
  }
  assert.equal(whole.public, whole.visibility === "everyone");
});

test("a photo is sent as base64", () => {
  assert.match(photo.image, /^[A-Za-z0-9+/]+=*$/);
});
