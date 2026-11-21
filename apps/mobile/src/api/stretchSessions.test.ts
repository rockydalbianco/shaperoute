import request from "@shaperoute/shared-types/fixtures/stretch-session.json";

import { answers, apiError } from "../account/testing";
import { isStretchSession, saveStretchSession } from "./stretchSessions";

// TASK-475 part B: a stretching session saved, PUT /me/stretch-sessions/{key}.

const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const SAVED = {
  id: "key12345",
  started_at: request.started_at,
  duration_s: 600,
  routine: "morning",
  minutes: 10,
  exercises: 10,
};

test("a session saved is what the API gives back", () => {
  expect(isStretchSession(SAVED)).toBe(true);
  expect(isStretchSession({ ...SAVED, minutes: 2.5 })).toBe(false);
  expect(isStretchSession({ ...SAVED, routine: undefined })).toBe(false);
  expect(isStretchSession(null)).toBe(false);
});

test("the session is PUT by its key, with the account's token and the reads", async () => {
  const fetchFn = answers({ status: 201, body: SAVED });
  const outcome = await saveStretchSession(
    URL,
    TOKEN,
    "key12345",
    request,
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: SAVED });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/stretch-sessions/key12345");
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(init?.body as string)).toEqual(request);
  const headers = init?.headers as Record<string, string>;
  expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
  expect(headers["X-MuW-Reads"].split(",")).toEqual(
    expect.arrayContaining(["stretching", "trackless"]),
  );
});

test("a session the API will not take is its error", async () => {
  const fetchFn = answers({ status: 422, body: apiError("invalid_request") });
  const outcome = await saveStretchSession(
    URL,
    TOKEN,
    "key12345",
    request,
    options(fetchFn),
  );
  expect(outcome.kind).toBe("api_error");
});
