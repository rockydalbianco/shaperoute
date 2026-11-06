import request from "@shaperoute/shared-types/fixtures/pool-swim.json";
import type { PoolSwimRequest } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import { isPoolSwim, savePoolSwimOnApi } from "./poolSwims";

// TASK-400 part B: «Save» of a swim in a pool, PUT /me/pool-swims/{key}.

const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const SAVED = {
  id: "key12345",
  started_at: request.started_at,
  duration_s: 2400,
  distance_m: 1500,
  pool_length_m: 25,
  lengths: 60,
};

test("a swim saved is what the API gives back", () => {
  expect(isPoolSwim(SAVED)).toBe(true);
  expect(isPoolSwim({ ...SAVED, pool_length_m: 33.33 })).toBe(true);
  expect(isPoolSwim({ ...SAVED, lengths: 1.5 })).toBe(false);
  expect(isPoolSwim({ ...SAVED, distance_m: undefined })).toBe(false);
});

test("the swim is PUT by its key, with the account's token and the reads", async () => {
  const fetchFn = answers({ status: 201, body: SAVED });
  const outcome = await savePoolSwimOnApi(
    URL,
    TOKEN,
    "key12345",
    request as PoolSwimRequest,
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: SAVED });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/pool-swims/key12345");
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(init?.body as string)).toEqual(request);
  const headers = init?.headers as Record<string, string>;
  expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
  expect(headers["X-MuW-Reads"].split(",")).toEqual(
    expect.arrayContaining(["swimming", "trackless", "pool"]),
  );
});

test("a swim the API will not take is its error", async () => {
  const fetchFn = answers({ status: 422, body: apiError("invalid_request") });
  const outcome = await savePoolSwimOnApi(
    URL,
    TOKEN,
    "key12345",
    request as PoolSwimRequest,
    options(fetchFn),
  );
  expect(outcome).toMatchObject({ kind: "api_error", code: "invalid_request" });
});
