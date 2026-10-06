import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { NO_EMAIL_CHANGE, NO_PHONE } from "../settings/contactFields";
import { NO_API, SESSION_ENDED } from "./messages";
import { answers, apiError, type MemorySecureStore } from "./testing";
import { useAccount } from "./useAccount";

// «Change email» and «Phone number» through the account (TASK-183): the
// answer of the API becomes the account on the phone, as a sign-in does.

jest.mock("expo-secure-store", () =>
  jest.requireActual<typeof import("./testing")>("./testing").memorySecureStore(),
);

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const URL = "http://192.168.1.23:8000";
const KEY = "shaperoute.session";
const NEW_EMAIL = { ...session.user, email: "new@example.com" };
const WITH_PHONE = { ...session.user, phone: "+393331234567" };
const REQUEST = { email: "new@example.com", password: "correct horse battery" };

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

test("a new email shows at once and is kept for the next opening", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 200, body: NEW_EMAIL },
  );
  const result = await signedIn(fetchFn);
  let problem: string | null = "not yet";
  await act(async () => {
    problem = await result.current.changeEmail(REQUEST);
  });
  expect(problem).toBeNull();
  expect(result.current.state).toEqual({
    status: "signedIn",
    session: { token: session.token, user: NEW_EMAIL },
  });
  expect(kept()).toEqual({ token: session.token, user: NEW_EMAIL });
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe(`${URL}/me/email`);
  expect(init).toMatchObject({
    method: "PUT",
    headers: { Authorization: `Bearer ${session.token}` },
  });
  expect(JSON.parse(init!.body as string)).toEqual(REQUEST);
  // The password is sent, never kept.
  expect(JSON.stringify(kept())).not.toContain(REQUEST.password);
  expect(result.current.problem).toBeNull();
});

test("a phone number is kept, and taken away, the same way", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 200, body: WITH_PHONE },
    { status: 200, body: session.user },
  );
  const result = await signedIn(fetchFn);
  await act(async () => {
    expect(await result.current.changePhone({ phone: "+393331234567" })).toBeNull();
  });
  expect(kept()).toEqual({ token: session.token, user: WITH_PHONE });
  expect(fetchFn.mock.calls[1][0]).toBe(`${URL}/me/phone`);
  await act(async () => {
    expect(await result.current.changePhone({ phone: null })).toBeNull();
  });
  expect(kept()).toEqual(session);
  expect(JSON.parse(fetchFn.mock.calls[2][1]!.body as string)).toEqual({ phone: null });
});

test("a change refused leaves the account as it was, and says why", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 403, body: apiError("wrong_credentials", "Wrong password.") },
    { status: 409, body: apiError("email_taken") },
    { status: 404, body: apiError("http_error", "Not Found") },
    { status: 404, body: apiError("http_error", "Not Found") },
    new Error("Network request failed"),
  );
  const result = await signedIn(fetchFn);
  const email = async () => {
    let problem: string | null = null;
    await act(async () => {
      problem = await result.current.changeEmail(REQUEST);
    });
    return problem;
  };
  // A wrong password is not a session that ended: still signed in.
  expect(await email()).toBe("Wrong password.");
  expect(await email()).toBe("Another account has this email.");
  // The published server, before TASK-183, has neither endpoint.
  expect(await email()).toBe(NO_EMAIL_CHANGE);
  let phone: string | null = null;
  await act(async () => {
    phone = await result.current.changePhone({ phone: "+393331234567" });
  });
  expect(phone).toBe(NO_PHONE);
  expect(await email()).toBe(
    `No connection. Check the network and try again. (Cannot reach the API at ${URL}.)`,
  );
  expect(result.current.state).toEqual({ status: "signedIn", session });
  expect(kept()).toEqual(session);
});

test("a session that ended signs out, and says so", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 401, body: apiError("session_expired") },
  );
  const result = await signedIn(fetchFn);
  let problem: string | null = null;
  await act(async () => {
    problem = await result.current.changePhone({ phone: null });
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
    problem = await result.current.changeEmail(REQUEST);
  });
  expect(problem).toBe(NO_API);
  expect(fetchFn).not.toHaveBeenCalled();
});
