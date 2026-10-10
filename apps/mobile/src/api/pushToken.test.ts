import request from "@shaperoute/shared-types/fixtures/push-token-request.json";
import type { PushTokenRequest } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import { forgetPushToken, keepPushToken } from "./pushToken";

const URL = "http://api";
const TOKEN = "the-token";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const PHONE: PushTokenRequest = { ...request, platform: "ios", language: "it" };

test("the token goes with the session, and comes back with no body", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 }, { status: 204 });
  const kept = await keepPushToken(URL, TOKEN, PHONE, { fetchFn, key: null });
  expect(kept).toEqual({ kind: "ok", value: null });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/push-token");
  expect(init).toMatchObject({ method: "PUT", headers: AUTH });
  expect(JSON.parse(init.body)).toEqual(PHONE);
  const gone = await forgetPushToken(URL, TOKEN, PHONE.token, { fetchFn, key: null });
  expect(gone).toEqual({ kind: "ok", value: null });
  // The brackets of an Expo token are written so a path can carry them.
  expect(fetchFn.mock.calls[1][0]).toBe(
    `http://api/me/push-token/${encodeURIComponent(PHONE.token)}`,
  );
  expect(fetchFn.mock.calls[1][1]).toMatchObject({ method: "DELETE", headers: AUTH });
});

test("what the API refuses comes back with its code", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 404, body: apiError("http_error", "Not Found") },
    { status: 401, body: apiError("session_expired") },
    new Error("Network request failed"),
  );
  const ask = () => keepPushToken(URL, TOKEN, PHONE, { fetchFn, key: null });
  // An API older than TASK-262.
  expect(await ask()).toMatchObject({ kind: "api_error", code: "http_error" });
  expect(await ask()).toMatchObject({ kind: "api_error", code: "session_expired" });
  expect(await ask()).toMatchObject({ kind: "unreachable" });
});
