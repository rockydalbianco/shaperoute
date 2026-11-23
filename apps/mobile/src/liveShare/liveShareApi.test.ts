/**
 * The requests of «Share live» (TASK-424 part B1; docs/API.md «Live
 * shares»): the bodies of the shared fixtures, the token, and what each
 * answer means to the sender.
 */
import request from "@shaperoute/shared-types/fixtures/live-share-request.json";
import update from "@shaperoute/shared-types/fixtures/live-share-update.json";
import type { LiveShareRequest, LiveUpdate } from "@shaperoute/shared-types";

import { answers } from "../account/testing";
import { createLiveShare, sendLiveUpdate, stopLiveShareRequest } from "./liveShareApi";

const API = "http://api";
const CREATED = {
  id: "0f8e2c1a-7d3b-4c55-9a10-3b2f6e1d4c77",
  url: "https://getmuw.app/live/#AbCdEfGhIjKlMnOpQrStUv",
  expires_at: "2026-11-10T07:00:00Z",
};
const SHARE = { id: CREATED.id, status: "live", expires_at: CREATED.expires_at };

function options(fetchFn: ReturnType<typeof answers>) {
  return {
    baseUrl: API,
    token: "tok",
    fetchFn: fetchFn as unknown as typeof fetch,
    key: "k",
  };
}

test("making the link: POST with the activity, the token and the key", async () => {
  const fetchFn = answers({ status: 201, body: CREATED });
  const answer = await createLiveShare(options(fetchFn), request as LiveShareRequest);
  expect(answer).toEqual({ kind: "ok", value: CREATED });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${API}/me/live-shares`);
  expect(init?.method).toBe("POST");
  expect(init?.headers).toMatchObject({
    Authorization: "Bearer tok",
    "X-API-Key": "k",
    "Content-Type": "application/json",
  });
  expect(JSON.parse(String(init?.body))).toEqual({ activity: "running" });
});

test("an update goes to the link's own path, with the fixture's body", async () => {
  const fetchFn = answers({ status: 200, body: SHARE });
  const answer = await sendLiveUpdate(
    options(fetchFn),
    CREATED.id,
    update as LiveUpdate,
  );
  expect(answer).toEqual({ kind: "ok", value: SHARE });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${API}/me/live-shares/${CREATED.id}/updates`);
  expect(JSON.parse(String(init?.body))).toEqual(update);
});

test("the stop is a DELETE, answered 204", async () => {
  const fetchFn = answers({ status: 204 });
  expect(await stopLiveShareRequest(options(fetchFn), CREATED.id)).toEqual({
    kind: "ok",
    value: null,
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${API}/me/live-shares/${CREATED.id}`);
  expect(init?.method).toBe("DELETE");
  expect(init?.body).toBeUndefined();
});

test.each([
  [410, { kind: "ended" }],
  [404, { kind: "ended" }],
  [401, { kind: "ended" }],
  [422, { kind: "rejected", status: 422 }],
  [429, { kind: "retry", status: 429 }],
  [503, { kind: "retry", status: 503 }],
])("an update answered %i", async (status, expected) => {
  const fetchFn = answers({ status, body: { detail: "…" } });
  expect(await sendLiveUpdate(options(fetchFn), "s", update as LiveUpdate)).toEqual(
    expected,
  );
});

test("no network, or an answer that is not a link, can go again later", async () => {
  expect(
    await createLiveShare(options(answers(new TypeError("offline"))), {
      activity: "running",
    }),
  ).toEqual({ kind: "retry", status: null });
  expect(
    await createLiveShare(options(answers({ status: 201, body: { id: "x" } })), {
      activity: "running",
    }),
  ).toEqual({ kind: "retry", status: 201 });
});
