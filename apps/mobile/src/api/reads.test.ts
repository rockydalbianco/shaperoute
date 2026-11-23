import fixture from "@shaperoute/shared-types/fixtures/reads.json";
import { RUN_ACTIVITIES } from "@shaperoute/shared-types";

import { OLD_APP_ACTIVITIES, READS, READS_HEADER, reads, readsHeaders } from "./reads";

// The same JSON is read by the API's tests/test_reads.py (TASK-387).

// With the sleep on everywhere (TASK-467 part C) the header ends with
// `sleep`, as `this_app` of the JSON does; readsSleep.test.ts tells the
// switch.

test("the header and the activities of before are the API's", () => {
  expect(READS_HEADER).toBe(fixture.header);
  expect(OLD_APP_ACTIVITIES).toEqual(fixture.old_app_activities);
});

test("this app says every activity it can save, and only values the API knows", () => {
  expect(readsHeaders()).toEqual({ "X-MuW-Reads": fixture.this_app });
  expect([...OLD_APP_ACTIVITIES, ...READS]).toEqual([
    ...RUN_ACTIVITIES,
    "trackless",
    "pool",
    "photos",
    "plans",
  ]);
  for (const kind of READS) {
    expect(fixture.kinds).toContain(kind);
  }
});

test("a post without a track is said, now that its screens show one (TASK-385 B0)", () => {
  expect(READS).toContain("trackless");
  expect(READS).toContain("gym");
});

test("a post of photos only is said, now that the app shows one (TASK-312 C2)", () => {
  expect(READS).toContain("photos");
});

test("a gym plan posted is said, now that the Feed shows one (TASK-485 B)", () => {
  expect(READS).toContain("plans");
});

test("the post of a night is said, now that the sleep is on (TASK-467 C)", () => {
  expect(reads()).toEqual([...READS, "sleep"]);
  expect(fixture.kinds).toContain("sleep");
});

test("a swim in a pool is said, now that the app records one (TASK-400 B)", () => {
  expect(READS).toContain("swimming");
  expect(READS).toContain("pool");
});
