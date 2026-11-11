import assert from "node:assert/strict";
import { test } from "node:test";

import jobDone from "../fixtures/route-job-done.json" with { type: "json" };
import jobFirst from "../fixtures/route-job-first.json" with { type: "json" };
import jobRunning from "../fixtures/route-job-running.json" with { type: "json" };
import whole from "../fixtures/route-result.json" with { type: "json" };
import type { RouteJob, RouteJobWithFirst } from "../src/index.ts";

// The first route of a job that still computes (TASK-435, ADR-0361). The
// same JSON is read by the API's test_first_route.py.

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// A job read with ?first=1 has one field more; read without, it is the
// RouteJob of before, field for field.
const withFirst: Same<keyof typeof jobFirst, keyof RouteJobWithFirst> = true;
const asBefore: Same<keyof typeof jobRunning, keyof RouteJob> &
  Same<keyof typeof jobDone, keyof RouteJob> = true;
const oneMore: Same<Exclude<keyof RouteJobWithFirst, keyof RouteJob>, "first"> = true;

const job = jobFirst as unknown as RouteJobWithFirst;

test("the types say what the fixtures hold", () => {
  assert.ok(withFirst && asBefore && oneMore);
});

test("a job has its first route while it computes, and no result yet", () => {
  assert.equal(job.status, "computing");
  assert.equal(job.result, null);
  assert.equal(job.error, null);
  assert.ok(job.first !== null);
});

test("the first route is a whole route, alone", () => {
  const first = job.first;
  assert.ok(first !== null);
  assert.deepEqual(Object.keys(first).sort(), Object.keys(whole).sort());
  assert.ok(first.points.length >= 2);
  assert.deepEqual(first.alternatives, []);
});

test("a job read without ?first=1 has no such field", () => {
  assert.equal("first" in jobRunning, false);
  assert.equal("first" in jobDone, false);
});
