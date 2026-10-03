import activity from "@shaperoute/shared-types/fixtures/strava-activity.json";
import connect from "@shaperoute/shared-types/fixtures/strava-connect.json";
import send from "@shaperoute/shared-types/fixtures/strava-send.json";
import status from "@shaperoute/shared-types/fixtures/strava-status.json";

import { answers, apiError } from "../account/testing";
import {
  connectStrava,
  disconnectStrava,
  fetchStravaActivity,
  fetchStravaStatus,
  isStravaActivity,
  isStravaStatus,
  notConnected,
  sendToStrava,
  STRAVA_OFF,
  type StravaActivity,
  type StravaOutcome,
  stravaProblem,
  worthAgain,
} from "./strava";

const URL = "http://api";
const TOKEN = "the-token";
const KEY = "7c2e91a4b05d3f68";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the examples of the API are what the app reads", () => {
  expect(isStravaStatus(status)).toBe(true);
  expect(isStravaStatus({ ...status, athlete: null })).toBe(true);
  expect(isStravaStatus({ available: true })).toBe(false);
  expect(isStravaActivity(activity)).toBe(true);
  expect(isStravaActivity({ status: "processing", url: null })).toBe(true);
  expect(isStravaActivity({ status: "gone", url: null })).toBe(false);
  // The body of a sending with a typed name: only the name.
  expect(Object.keys(send)).toEqual(["name"]);
});

test("Strava's state is asked with the token", async () => {
  const fetchFn = answers({ status: 200, body: status });
  const outcome = await fetchStravaStatus(URL, TOKEN, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: status, http: 200 });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/strava");
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
});

test("an API from before Strava is Strava off", async () => {
  const fetchFn = answers({ status: 404, body: apiError("http_error") });
  expect(await fetchStravaStatus(URL, TOKEN, options(fetchFn))).toEqual({
    kind: "ok",
    value: STRAVA_OFF,
    http: 404,
  });
});

test("connecting gives Strava's page, and only an https one", async () => {
  const fetchFn = answers(
    { status: 200, body: connect },
    { status: 200, body: { url: "javascript:alert(1)" } },
  );
  expect(await connectStrava(URL, TOKEN, options(fetchFn))).toEqual({
    kind: "ok",
    value: connect.url,
    http: 200,
  });
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/me/strava/connect");
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "POST", headers: AUTH });
  expect(await connectStrava(URL, TOKEN, options(fetchFn))).toMatchObject({
    kind: "bad_answer",
  });
});

test("disconnecting is a DELETE that answers nothing", async () => {
  const fetchFn = answers({ status: 204 });
  expect(await disconnectStrava(URL, TOKEN, options(fetchFn))).toEqual({
    kind: "ok",
    value: null,
    http: 204,
  });
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
});

test("what Strava has of a run is asked by its key", async () => {
  const fetchFn = answers({ status: 200, body: activity });
  expect(await fetchStravaActivity(URL, TOKEN, KEY, options(fetchFn))).toEqual({
    kind: "ok",
    value: activity,
    http: 200,
  });
  expect(fetchFn.mock.calls[0][0]).toBe(`http://api/me/activities/${KEY}/strava`);
});

test("a run goes with the name typed, or with no body at all", async () => {
  const fetchFn = answers(
    { status: 200, body: activity },
    { status: 202, body: { status: "processing", url: null } },
    { status: 200, body: activity },
  );
  await sendToStrava(URL, TOKEN, KEY, "  Heart in Trento ", options(fetchFn));
  const processing = await sendToStrava(URL, TOKEN, KEY, null, options(fetchFn));
  await sendToStrava(URL, TOKEN, KEY, "   ", options(fetchFn));

  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/me/activities/${KEY}/strava`);
  expect(init).toMatchObject({ method: "POST", headers: AUTH });
  expect(JSON.parse(String(init?.body))).toEqual(send);
  // Nothing typed: the request of before names could be typed.
  expect(fetchFn.mock.calls[1][1]?.body).toBeUndefined();
  expect(fetchFn.mock.calls[2][1]?.body).toBeUndefined();
  expect(processing).toEqual({
    kind: "ok",
    value: { status: "processing", url: null },
    http: 202,
  });
});

function failed(http: number, code: string): StravaOutcome<StravaActivity> {
  return {
    kind: "api_error",
    code,
    message: "…",
    suggested_distance_m: null,
    reason: null,
    retryAfterS: null,
    http,
  } as StravaOutcome<StravaActivity>;
}

test("what is worth sending again, and what never is", () => {
  const sent: StravaOutcome<StravaActivity> = {
    kind: "ok",
    value: activity as StravaActivity,
    http: 200,
  };
  const reading: StravaOutcome<StravaActivity> = {
    kind: "ok",
    value: { status: "processing", url: null },
    http: 202,
  };
  expect(worthAgain(sent)).toBe(false);
  expect(worthAgain(reading)).toBe(true);
  expect(worthAgain({ kind: "unreachable", url: URL, http: null })).toBe(true);
  expect(worthAgain({ kind: "bad_answer", status: 500, http: 500 })).toBe(true);
  expect(worthAgain({ kind: "bad_answer", status: 200, http: 200 })).toBe(false);
  expect(worthAgain(failed(502, "http_error"))).toBe(true);
  expect(worthAgain(failed(429, "too_many_requests"))).toBe(true);
  expect(worthAgain(failed(401, "session_expired"))).toBe(true);
  // Not connected, a file Strava cannot read, a run gone, Strava off.
  expect(worthAgain(failed(409, "http_error"))).toBe(false);
  expect(worthAgain(failed(422, "invalid_request"))).toBe(false);
  expect(worthAgain(failed(404, "http_error"))).toBe(false);
  expect(worthAgain(failed(503, "http_error"))).toBe(false);
});

test("a 409 is an athlete not connected any more", () => {
  expect(notConnected(failed(409, "http_error"))).toBe(true);
  expect(notConnected(failed(502, "http_error"))).toBe(false);
});

test("each trouble in words the runner can act on", () => {
  expect(stravaProblem({ kind: "ok", value: null, http: 204 })).toBeNull();
  expect(stravaProblem({ kind: "unreachable", url: URL, http: null })).toBe(
    "No connection. Try again when you are online.",
  );
  expect(stravaProblem(failed(409, "http_error"))).toBe(
    "Strava is not connected. Connect it and try again.",
  );
  expect(stravaProblem(failed(422, "invalid_request"))).toBe(
    "Strava could not read this run.",
  );
  expect(stravaProblem(failed(429, "too_many_requests"))).toBe(
    "Strava is taking no more runs for now. Try again later.",
  );
  expect(stravaProblem(failed(404, "http_error"))).toBe(
    "This run is no longer in your activities.",
  );
  expect(stravaProblem(failed(503, "http_error"))).toBe(
    "Strava is not available on this API.",
  );
  expect(stravaProblem(failed(502, "http_error"))).toBe(
    "Strava did not answer. Try again in a while.",
  );
  expect(stravaProblem(failed(401, "not_signed_in"))).toBe(
    "Your session has ended. Log in again.",
  );
});
