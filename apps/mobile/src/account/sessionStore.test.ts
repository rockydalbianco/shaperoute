import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";

import { forgetSession, loadSession, saveSession } from "./sessionStore";
import type { MemorySecureStore } from "./testing";

jest.mock("expo-secure-store", () =>
  jest.requireActual<typeof import("./testing")>("./testing").memorySecureStore(),
);

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const SESSION = session as Session;

beforeEach(() => {
  store.kept.clear();
  jest.clearAllMocks();
});

test("a session kept is the session the next opening finds", async () => {
  expect(loadSession()).toBeNull();
  expect(await saveSession(SESSION)).toBe(true);
  expect(loadSession()).toEqual(session);
  await forgetSession();
  expect(loadSession()).toBeNull();
});

test("the keychain holds it under one key, as JSON", async () => {
  await saveSession(SESSION);
  expect([...store.kept.keys()]).toEqual(["shaperoute.session"]);
  expect(JSON.parse(store.kept.get("shaperoute.session")!)).toEqual(session);
});

test("something unreadable in the keychain is no session", () => {
  for (const kept of ["{", '{"token":"t"}', "null", '"text"']) {
    store.kept.set("shaperoute.session", kept);
    expect(loadSession()).toBeNull();
  }
  store.getItem.mockImplementationOnce(() => {
    throw new Error("Keychain locked");
  });
  expect(loadSession()).toBeNull();
});

test("a keychain that refuses does not throw", async () => {
  store.setItemAsync.mockRejectedValueOnce(new Error("No space"));
  expect(await saveSession(SESSION)).toBe(false);
  store.deleteItemAsync.mockRejectedValueOnce(new Error("Locked"));
  await expect(forgetSession()).resolves.toBeUndefined();
});
