import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { answers, type MemorySecureStore } from "./testing";
import { useAccount } from "./useAccount";

// Logging out takes this phone's push token back first (TASK-262): after
// DELETE /session the API would not know whose it is.

jest.mock("expo-secure-store", () =>
  jest.requireActual<typeof import("./testing")>("./testing").memorySecureStore(),
);

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const URL = "http://api";
const PHONE = "ExponentPushToken[this-phone]";
const SESSION_KEY = "shaperoute.session";
const SENT_KEY = "shaperoute.push-token";

beforeEach(() => {
  store.kept.clear();
  store.kept.set(SESSION_KEY, JSON.stringify(session));
});

async function signedIn(fetchFn: jest.Mock) {
  const { result } = await renderHook(() => useAccount(URL, { fetchFn, key: null }));
  // The check of the session when the app opens.
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  return result;
}

function sent(userId: number) {
  store.kept.set(SENT_KEY, JSON.stringify({ userId, token: PHONE, language: "en" }));
}

test("the push token goes before the session, and the phone forgets it", async () => {
  sent(session.user.id);
  const fetchFn = answers(
    { status: 200, body: session.user },
    { status: 204 },
    { status: 204 },
  );
  const result = await signedIn(fetchFn);
  await act(async () => result.current.signOut());
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(3));
  const asked = fetchFn.mock.calls
    .slice(1)
    .map(([url, init]) => `${init?.method} ${url}`);
  expect(asked).toEqual([
    `DELETE ${URL}/me/push-token/${encodeURIComponent(PHONE)}`,
    `DELETE ${URL}/session`,
  ]);
  expect(store.kept.has(SENT_KEY)).toBe(false);
});

test("with no token sent from this phone, only the session goes", async () => {
  // Another account's: not this one's to take back.
  sent(session.user.id + 1);
  const fetchFn = answers({ status: 200, body: session.user }, { status: 204 });
  const result = await signedIn(fetchFn);
  await act(async () => result.current.signOut());
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
  expect(fetchFn.mock.calls[1][0]).toBe(`${URL}/session`);
});

test("deleting the account forgets the token sent: the API deleted it", async () => {
  sent(session.user.id);
  const fetchFn = answers({ status: 200, body: session.user }, { status: 204 });
  const result = await signedIn(fetchFn);
  await act(async () => result.current.deleteAccount());
  await waitFor(() =>
    expect(result.current.state).toEqual({ status: "signedOut", notice: "deleted" }),
  );
  expect(fetchFn).toHaveBeenCalledTimes(2);
  expect(store.kept.has(SENT_KEY)).toBe(false);
});
