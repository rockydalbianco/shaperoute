import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { NO_NOTIFICATIONS } from "../settings/notificationFields";
import { NO_API, SESSION_ENDED } from "./messages";
import { answers, apiError, type MemorySecureStore } from "./testing";
import { useAccount } from "./useAccount";

// The notification switches through the account (TASK-185): the answer of
// the API becomes the account on the phone, as a sign-in does.

jest.mock("expo-secure-store", () =>
  jest.requireActual<typeof import("./testing")>("./testing").memorySecureStore(),
);

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const URL = "http://192.168.1.23:8000";
const KEY = "shaperoute.session";
const PUSH_ON = { ...session.user, notifications: { email: false, push: true } };
const BOTH_ON = { ...session.user, notifications: { email: true, push: true } };

beforeEach(() => {
  store.kept.clear();
  store.kept.set(KEY, JSON.stringify(session));
});

function kept() {
  const value = store.kept.get(KEY);
  return value === undefined ? null : JSON.parse(value);
}

/** Signed in, with GET /me of the opening answered by the first answer. */
async function signedIn(fetchFn: jest.Mock, baseUrl: string | null = URL) {
  const { result } = await renderHook(() =>
    useAccount(baseUrl, { fetchFn, key: null }),
  );
  if (baseUrl !== null) {
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  }
  return result;
}

test("a switch turned on shows at once and is kept for the next opening", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 200, body: PUSH_ON },
    { status: 200, body: BOTH_ON },
  );
  const result = await signedIn(fetchFn);
  let problem: string | null = "not yet";
  await act(async () => {
    problem = await result.current.changeNotifications({ push: true });
  });
  expect(problem).toBeNull();
  expect(result.current.state).toEqual({
    status: "signedIn",
    session: { token: session.token, user: PUSH_ON },
  });
  expect(kept()).toEqual({ token: session.token, user: PUSH_ON });
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe(`${URL}/me/notifications`);
  expect(init).toMatchObject({
    method: "PUT",
    headers: { Authorization: `Bearer ${session.token}` },
  });
  // Only what changes is sent.
  expect(JSON.parse(init!.body as string)).toEqual({ push: true });
  await act(async () => {
    expect(await result.current.changeNotifications({ email: true })).toBeNull();
  });
  expect(kept()).toEqual({ token: session.token, user: BOTH_ON });
  expect(JSON.parse(fetchFn.mock.calls[2][1]!.body as string)).toEqual({ email: true });
  expect(result.current.problem).toBeNull();
});

test("a switch refused leaves the account as it was, and says why", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 404, body: apiError("http_error", "Not Found") },
    { status: 503, body: apiError("accounts_unavailable") },
    new Error("Network request failed"),
  );
  const result = await signedIn(fetchFn);
  const turn = async () => {
    let problem: string | null = null;
    await act(async () => {
      problem = await result.current.changeNotifications({ email: true });
    });
    return problem;
  };
  // The published server, before TASK-185, has no such endpoint.
  expect(await turn()).toBe(NO_NOTIFICATIONS);
  expect(await turn()).toBe("Accounts are not available right now. Try again later.");
  expect(await turn()).toBe(
    `No connection. Check the network and try again. (Cannot reach the API at ${URL}.)`,
  );
  expect(result.current.state).toEqual({ status: "signedIn", session });
  expect(kept()).toEqual(session);
});

test("an account kept by an app of before reads with both switches off", async () => {
  // What the phone kept before TASK-185, and what an API of before answers.
  const { notifications: _notifications, ...before } = session.user;
  store.kept.set(KEY, JSON.stringify({ token: session.token, user: before }));
  const fetchFn = answers({ status: 200, body: before });
  const result = await signedIn(fetchFn);
  expect(result.current.state).toEqual({
    status: "signedIn",
    session: { token: session.token, user: before },
  });
});

test("a session that ended signs out, and says so", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 401, body: apiError("session_expired") },
  );
  const result = await signedIn(fetchFn);
  let problem: string | null = null;
  await act(async () => {
    problem = await result.current.changeNotifications({ push: true });
  });
  expect(problem).toBe(SESSION_ENDED);
  expect(result.current.state).toEqual({ status: "signedOut", notice: "ended" });
  expect(kept()).toBeNull();
});

test("without an API nothing is asked", async () => {
  const fetchFn = answers();
  const result = await signedIn(fetchFn, null);
  let problem: string | null = null;
  await act(async () => {
    problem = await result.current.changeNotifications({ push: true });
  });
  expect(problem).toBe(NO_API);
  expect(fetchFn).not.toHaveBeenCalled();
});
