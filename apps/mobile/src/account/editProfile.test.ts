import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { NO_PROFILE_EDITS } from "../profile/profileFields";
import { NO_API, SESSION_ENDED } from "./messages";
import { answers, apiError, type MemorySecureStore } from "./testing";
import { useAccount } from "./useAccount";

// «Edit profile» through the account (TASK-116): the answer of PATCH /me
// becomes the account on the phone, as a sign-in does.

jest.mock("expo-secure-store", () =>
  jest.requireActual<typeof import("./testing")>("./testing").memorySecureStore(),
);

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const URL = "http://192.168.1.23:8000";
const KEY = "shaperoute.session";
const EDITED = { ...session.user, username: "Ada_runs", bio: "Hearts on Sundays." };

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

test("a profile saved shows at once and is kept for the next opening", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 200, body: EDITED },
  );
  const result = await signedIn(fetchFn);
  let problem: string | null = "not yet";
  await act(async () => {
    problem = await result.current.editProfile({
      username: "Ada_runs",
      bio: "Hearts on Sundays.",
    });
  });
  expect(problem).toBeNull();
  expect(result.current.state).toEqual({
    status: "signedIn",
    session: { token: session.token, user: EDITED },
  });
  expect(kept()).toEqual({ token: session.token, user: EDITED });
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe(`${URL}/me`);
  expect(init).toMatchObject({
    method: "PATCH",
    headers: { Authorization: `Bearer ${session.token}` },
  });
  expect(JSON.parse(init!.body as string)).toEqual({
    username: "Ada_runs",
    bio: "Hearts on Sundays.",
  });
  // The page that asked says what went wrong: the account's own line stays.
  expect(result.current.problem).toBeNull();
});

test("a change refused leaves the account as it was, and says why", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 409, body: apiError("username_taken") },
    { status: 405, body: apiError("http_error", "Method Not Allowed") },
    new Error("Network request failed"),
  );
  const result = await signedIn(fetchFn);
  const ask = async () => {
    let problem: string | null = null;
    await act(async () => {
      problem = await result.current.editProfile({ username: "other_runner" });
    });
    return problem;
  };
  expect(await ask()).toBe("This username is taken. Try another one.");
  // The published server, before TASK-116, has no PATCH /me.
  expect(await ask()).toBe(NO_PROFILE_EDITS);
  expect(await ask()).toBe(
    `Cannot reach the API at ${URL}. Check the connection and try again.`,
  );
  expect(result.current.state).toEqual({ status: "signedIn", session });
  expect(kept()).toEqual(session);
});

test("a session that ended signs out, as any other request", async () => {
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 401, body: apiError("session_expired") },
  );
  const result = await signedIn(fetchFn);
  let problem: string | null = null;
  await act(async () => {
    problem = await result.current.editProfile({ bio: "Hi" });
  });
  expect(problem).toBe(SESSION_ENDED);
  expect(result.current.state).toEqual({ status: "signedOut", notice: "ended" });
  expect(kept()).toBeNull();
});

test("an answer that comes after logging out changes nothing", async () => {
  // Each request waits for its own answer, given by hand in any order.
  const waiting: ((response: Response) => void)[] = [];
  const fetchFn = jest.fn(
    (_url: string, _init?: RequestInit) =>
      new Promise<Response>((resolve) => waiting.push(resolve)),
  );
  const result = await signedIn(fetchFn, URL);
  await act(async () => waiting[0](Response.json(session.user)));
  let saving: Promise<string | null> = Promise.resolve("not asked");
  await act(async () => {
    saving = result.current.editProfile({ bio: "Hi" });
  });
  await act(async () => result.current.signOut());
  await act(async () => waiting[2](new Response(null, { status: 204 })));
  await act(async () => waiting[1](Response.json(EDITED)));
  expect(await saving).toBeNull();
  expect(fetchFn.mock.calls.map(([, init]) => init?.method)).toEqual([
    "GET",
    "PATCH",
    "DELETE",
  ]);
  expect(result.current.state).toEqual({ status: "signedOut", notice: "loggedOut" });
  expect(kept()).toBeNull();
});

test("without an API address, or signed out, nothing is asked", async () => {
  const fetchFn = answers();
  const result = await signedIn(fetchFn, null);
  expect(await result.current.editProfile({ bio: "Hi" })).toBe(NO_API);
  await act(async () => result.current.signOut());
  expect(await result.current.editProfile({ bio: "Hi" })).toBe(SESSION_ENDED);
  expect(fetchFn).not.toHaveBeenCalled();
});
