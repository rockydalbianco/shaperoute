import assert from "node:assert/strict";
import { test } from "node:test";

import contract from "../fixtures/contract.json" with { type: "json" };
import request from "../fixtures/route-request.json" with { type: "json" };
import result from "../fixtures/route-result.json" with { type: "json" };
import {
  ACTIVITIES,
  MAX_DISTANCE_M,
  MIN_DISTANCE_M,
  SHAPES,
  type RouteRequest,
  type RouteResult,
} from "../src/index.ts";

// Checked by `tsc`: the fixtures have exactly the fields of the types, so a
// field added or renamed on one side only fails the typecheck.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const requestFields: Same<keyof typeof request, keyof RouteRequest> = true;
const resultFields: Same<keyof typeof result, keyof RouteResult> = true;

const isShape = (value: string): boolean =>
  (SHAPES as readonly string[]).includes(value);

test("the fixtures have the fields of the types", () => {
  assert.ok(requestFields && resultFields);
});

test("shapes, activities and distance limits match the route engine", () => {
  assert.deepEqual([...SHAPES], contract.shapes);
  assert.deepEqual([...ACTIVITIES], contract.activities);
  assert.equal(MIN_DISTANCE_M, contract.min_distance_m);
  assert.equal(MAX_DISTANCE_M, contract.max_distance_m);
});

test("the request fixture is a valid request", () => {
  assert.equal(request.start.length, 2);
  assert.ok(isShape(request.shape));
  assert.ok((ACTIVITIES as readonly string[]).includes(request.activity));
  assert.ok(Number.isInteger(request.distance_m));
  assert.ok(
    MIN_DISTANCE_M <= request.distance_m && request.distance_m <= MAX_DISTANCE_M,
  );
});

test("the result fixture is a closed route of [lat, lon] points", () => {
  assert.ok(result.points.every((point) => point.length === 2));
  assert.deepEqual(result.points.at(0), result.points.at(-1));
  assert.ok(isShape(result.shape));
  assert.ok(0 <= result.similarity && result.similarity <= 1);
});
