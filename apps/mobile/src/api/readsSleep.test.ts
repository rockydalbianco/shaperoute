import reads from "@shaperoute/shared-types/fixtures/reads.json";

import { sleepPostsOn } from "../health/sleepModules";
import { READS, reads as said, readsHeaders, readsHeadersWith } from "./reads";

// What the app says it reads about the post of a night of sleep (TASK-467
// part E): `sleep` only while the sleep is on, as it is everywhere since
// part C (`this_app` of the JSON ends with it). Off, the header is the one
// of before and the API never sends one.

jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => false),
}));

const on = jest.mocked(sleepPostsOn);
/** What the app said before the sleep. */
const BEFORE = reads.this_app.replace(/,sleep$/, "");

test("off: the header is the one of before, without `sleep`", () => {
  on.mockReturnValue(false);
  expect(said()).toEqual(READS);
  expect(BEFORE).not.toBe(reads.this_app);
  expect(readsHeaders()).toEqual({ "X-MuW-Reads": BEFORE });
  expect(readsHeaders()["X-MuW-Reads"].split(",")).not.toContain("sleep");
  expect(readsHeadersWith("post")["X-MuW-Reads"]).toBe(`${BEFORE},post`);
});

test("on: `sleep` is said after everything of before, a kind the API knows", () => {
  on.mockReturnValue(true);
  expect(said()).toEqual([...READS, "sleep"]);
  expect(reads.kinds).toContain("sleep");
  expect(readsHeaders()).toEqual({ "X-MuW-Reads": reads.this_app });
  expect(readsHeadersWith("post")["X-MuW-Reads"]).toBe(`${reads.this_app},post`);
});

test("the list of before is never changed by the switch", () => {
  on.mockReturnValue(true);
  said();
  expect(READS).not.toContain("sleep");
});
