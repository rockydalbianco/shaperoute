import item from "@shaperoute/shared-types/fixtures/gear.json";

import { answers, apiError } from "../account/testing";
import { fetchGearItem } from "./gearItem";

// An item of gear as a viewer sees it (TASK-486 part F): GET /gear/{id}.

const URL = "http://api";
const TOKEN = "the-token";

test("an item is asked with the token", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: item });
  const outcome = await fetchGearItem(URL, TOKEN, "a b", { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: item });
  const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("http://api/gear/a%20b");
  expect(init.method).toBe("GET");
  expect(init.headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
});

test("an item one does not see, or an API without gear, is none", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  expect(await fetchGearItem(URL, TOKEN, "g", { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: null,
  });
});

test("an ended session is told", async () => {
  const fetchFn: jest.Mock = answers({
    status: 401,
    body: apiError("session_expired"),
  });
  const outcome = await fetchGearItem(URL, TOKEN, "g", { fetchFn, key: null });
  expect(outcome).toMatchObject({ kind: "api_error", code: "session_expired" });
});
