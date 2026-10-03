import drawing from "@shaperoute/shared-types/fixtures/drawing.json";
import request from "@shaperoute/shared-types/fixtures/drawing-request.json";
import drawings from "@shaperoute/shared-types/fixtures/drawings.json";
import myDrawing from "@shaperoute/shared-types/fixtures/my-drawing.json";

import { answers, apiError } from "../account/testing";
import {
  drawingProblem,
  fetchDrawing,
  fetchMyDrawing,
  fetchMyDrawings,
  fetchUserDrawings,
  isDrawing,
  isDrawingDetail,
  isDrawingsPage,
  isMyDrawing,
  saveDrawing,
  titleOf,
  worthAgain,
} from "./drawings";

const URL = "http://api";
const TOKEN = "the-token";
const KEY = "7c2e91a4b05d3f68";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the examples of the API are what the app reads", () => {
  expect(isMyDrawing(myDrawing)).toBe(true);
  expect(isMyDrawing({ ...myDrawing, id: null, title: null, public: false })).toBe(
    true,
  );
  expect(isMyDrawing({ ...myDrawing, public: "yes" })).toBe(false);
  expect(isDrawingsPage(drawings)).toBe(true);
  expect(isDrawing(drawings.drawings[0])).toBe(true);
  // A run without a route: no score.
  expect(isDrawing({ ...drawings.drawings[0], score: null, fidelity: null })).toBe(
    true,
  );
  expect(isDrawing({ ...drawings.drawings[0], track_preview: [[46]] })).toBe(false);
  expect(isDrawingDetail(drawing)).toBe(true);
  expect(isDrawingDetail({ ...drawing, author: null })).toBe(false);
  // The body of the choice: both fields, nothing else.
  expect(Object.keys(request).sort()).toEqual(["public", "title"]);
});

test("a title loses the spaces around it, and empty is none", () => {
  expect(titleOf("  Sunday heart  ")).toBe("Sunday heart");
  expect(titleOf("   ")).toBeNull();
  expect(titleOf("")).toBeNull();
});

test("the choice for a run is asked with the token", async () => {
  const fetchFn = answers({ status: 200, body: myDrawing });
  const outcome = await fetchMyDrawing(URL, TOKEN, KEY, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: myDrawing });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/me/activities/${KEY}/drawing`);
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
});

test("the choice goes whole, both fields every time", async () => {
  const fetchFn = answers({ status: 200, body: myDrawing });
  const outcome = await saveDrawing(
    URL,
    TOKEN,
    KEY,
    { title: "Sunday heart by the river", public: true },
    options(fetchFn),
  );
  expect(outcome.kind).toBe("ok");
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/me/activities/${KEY}/drawing`);
  expect(init).toMatchObject({ method: "PUT", headers: AUTH });
  expect(JSON.parse(String(init?.body))).toEqual(request);

  const off = answers({
    status: 200,
    body: { ...myDrawing, title: null, public: false },
  });
  await saveDrawing(URL, TOKEN, KEY, { title: null, public: false }, options(off));
  expect(JSON.parse(String(off.mock.calls[0][1]?.body))).toEqual({
    title: null,
    public: false,
  });
});

test("the runs with a title or public come as a list", async () => {
  const fetchFn = answers({ status: 200, body: { drawings: [myDrawing] } });
  expect(await fetchMyDrawings(URL, TOKEN, options(fetchFn))).toEqual({
    kind: "ok",
    value: [myDrawing],
  });
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/me/drawings");
});

test("an API from before drawings has none", async () => {
  const fetchFn = answers({ status: 404, body: apiError("http_error") });
  expect(await fetchMyDrawings(URL, TOKEN, options(fetchFn))).toEqual({
    kind: "ok",
    value: [],
  });
});

test("the drawings of a profile come a page at a time", async () => {
  const fetchFn = answers(
    { status: 200, body: { ...drawings, next: "abc/1" } },
    { status: 200, body: drawings },
  );
  const first = await fetchUserDrawings(URL, TOKEN, "a b", null, options(fetchFn));
  expect(first.kind === "ok" && first.value.next).toBe("abc/1");
  await fetchUserDrawings(URL, TOKEN, "a b", "abc/1", options(fetchFn));
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/users/a%20b/drawings");
  expect(fetchFn.mock.calls[1][0]).toBe(
    "http://api/users/a%20b/drawings?cursor=abc%2F1",
  );
  expect(fetchFn.mock.calls[1][1]).toMatchObject({ method: "GET", headers: AUTH });
});

test("a drawing is asked by its id", async () => {
  const fetchFn = answers({ status: 200, body: drawing });
  expect(await fetchDrawing(URL, TOKEN, drawing.id, options(fetchFn))).toEqual({
    kind: "ok",
    value: drawing,
  });
  expect(fetchFn.mock.calls[0][0]).toBe(`http://api/drawings/${drawing.id}`);
});

test("only no network and a busy API are worth another try", () => {
  expect(worthAgain({ kind: "unreachable", url: URL })).toBe(true);
  expect(worthAgain({ kind: "bad_answer", status: 502 })).toBe(true);
  expect(worthAgain({ kind: "bad_answer", status: 400 })).toBe(false);
  const busy = {
    kind: "api_error",
    retryAfterS: 30,
    ...apiError("too_many_requests").error,
  };
  expect(worthAgain(busy as never)).toBe(true);
  const gone = {
    kind: "api_error",
    retryAfterS: null,
    ...apiError("http_error").error,
  };
  expect(worthAgain(gone as never)).toBe(false);
  expect(worthAgain({ kind: "ok", value: myDrawing })).toBe(false);
});

test("a problem is said in words, the API's own for a refused choice", () => {
  expect(drawingProblem({ kind: "ok", value: null })).toBeNull();
  expect(drawingProblem({ kind: "unreachable", url: URL })).toBe(
    "No connection. Try again when you are online.",
  );
  const short = {
    kind: "api_error",
    retryAfterS: null,
    code: "invalid_request",
    message: "This run is too short to publish.",
  };
  expect(drawingProblem(short as never)).toBe("This run is too short to publish.");
  const gone = {
    kind: "api_error",
    retryAfterS: null,
    ...apiError("http_error").error,
  };
  expect(drawingProblem(gone as never)).toBe(
    "This run is no longer in your activities.",
  );
  const ended = {
    kind: "api_error",
    retryAfterS: null,
    ...apiError("session_expired").error,
  };
  expect(drawingProblem(ended as never)).toBe("Your session has ended. Log in again.");
});
