import list from "@shaperoute/shared-types/fixtures/gear-list.json";

import { answers, apiError } from "../account/testing";
import { fetchPostGear } from "./postGear";

// The gear of a post (TASK-486 part E): GET /drawings/{id}/gear.

const URL = "http://api";
const TOKEN = "the-token";

test("the gear of a post is asked with the token", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  const outcome = await fetchPostGear(URL, TOKEN, "a b", { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: list.gear });
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("http://api/drawings/a%20b/gear");
  expect(init.method).toBe("GET");
  expect(init.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
});

test("a post one does not see, or an API without gear, is no gear", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  expect(await fetchPostGear(URL, TOKEN, "p", { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: null,
  });
});

test("an ended session is told", async () => {
  const fetchFn: jest.Mock = answers({
    status: 401,
    body: apiError("session_expired"),
  });
  const outcome = await fetchPostGear(URL, TOKEN, "p", { fetchFn, key: null });
  expect(outcome).toMatchObject({ kind: "api_error", code: "session_expired" });
});
