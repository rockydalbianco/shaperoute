import assert from "node:assert/strict";
import { test } from "node:test";

import apiErrorCodes from "../fixtures/api-error-codes.json" with { type: "json" };
import apiError from "../fixtures/api-error.json" with { type: "json" };
import contract from "../fixtures/contract.json" with { type: "json" };
import gpxRequest from "../fixtures/gpx-request.json" with { type: "json" };
import jobDone from "../fixtures/route-job-done.json" with { type: "json" };
import jobFailed from "../fixtures/route-job-failed.json" with { type: "json" };
import jobRunning from "../fixtures/route-job-running.json" with { type: "json" };
import jobStatuses from "../fixtures/route-job-statuses.json" with { type: "json" };
import request from "../fixtures/route-request.json" with { type: "json" };
import result from "../fixtures/route-result.json" with { type: "json" };
import {
  ACTIVITIES,
  API_ERROR_CODES,
  JOB_STATUSES,
  MAX_DISTANCE_M,
  MIN_DISTANCE_M,
  SHAPES,
  type ApiError,
  type GpxRequest,
  type RouteJob,
  type RouteRequest,
  type RouteResult,
} from "../src/index.ts";

// Checked by `tsc`: the fixtures have exactly the fields of the types, so a
// field added or renamed on one side only fails the typecheck.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const requestFields: Same<keyof typeof request, keyof RouteRequest> = true;
const resultFields: Same<keyof typeof result, keyof RouteResult> = true;
const errorFields: Same<keyof typeof apiError, keyof ApiError> = true;
const errorDetailFields: Same<keyof typeof apiError.error, keyof ApiError["error"]> =
  true;

const jobFields: Same<keyof typeof jobRunning, keyof RouteJob> &
  Same<keyof typeof jobDone, keyof RouteJob> &
  Same<keyof typeof jobFailed, keyof RouteJob> = true;
const jobResultFields: Same<keyof typeof jobDone.result, keyof RouteResult> = true;
const jobErrorFields: Same<keyof typeof jobFailed.error, keyof ApiError["error"]> =
  true;

const gpxFields: Same<keyof typeof gpxRequest, keyof GpxRequest> &
  Same<keyof typeof gpxRequest.request, keyof RouteRequest> &
  Same<keyof typeof gpxRequest.result, keyof RouteResult> = true;

const isShape = (value: string): boolean =>
  (SHAPES as readonly string[]).includes(value);

test("the fixtures have the fields of the types", () => {
  assert.ok(requestFields && resultFields && errorFields && errorDetailFields);
  assert.ok(jobFields && jobResultFields && jobErrorFields && gpxFields);
});

test("the GPX request carries the request and result fixtures", () => {
  assert.deepEqual(gpxRequest.request, request);
  assert.deepEqual(gpxRequest.result, result);
});

test("route jobs carry a result only when done, an error only when failed", () => {
  assert.deepEqual([...JOB_STATUSES], jobStatuses);
  for (const job of [jobRunning, jobDone, jobFailed]) {
    assert.ok((JOB_STATUSES as readonly string[]).includes(job.status));
  }
  assert.equal(jobRunning.result, null);
  assert.equal(jobRunning.error, null);
  assert.equal(jobDone.status, "done");
  assert.deepEqual(jobDone.result, result);
  assert.equal(jobFailed.status, "failed");
  assert.deepEqual(jobFailed.error, apiError.error);
});

test("the error fixture uses a known code, and the codes match the API", () => {
  assert.ok((API_ERROR_CODES as readonly string[]).includes(apiError.error.code));
  assert.deepEqual([...API_ERROR_CODES], apiErrorCodes);
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
