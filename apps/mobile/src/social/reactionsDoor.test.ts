import result from "@shaperoute/shared-types/fixtures/reaction-result.json";
import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { renderHook } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import type { Account } from "../account/useAccount";
import { useReactionsOf } from "./reactionsDoor";

const URL = "http://api";
const signedIn = session as Session;
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

function account(over: Partial<Account> = {}): Account {
  return {
    state: { status: "signedIn", session: signedIn },
    busy: null,
    problem: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    editProfile: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
    ...over,
  };
}

test("nobody signed in: no reactions asked for", async () => {
  const fetchFn = answers();
  const { result: door } = await renderHook(() =>
    useReactionsOf(
      URL,
      account({ state: { status: "signedOut", notice: null } }),
      options(fetchFn),
    ),
  );
  expect(await door.current.of("d")).toBeNull();
  expect(await door.current.leave("d", "fire", null)).toBeNull();
  expect(await door.current.remove("d")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("reading, leaving and taking away go with the session's token", async () => {
  const fetchFn = answers(
    { status: 200, body: reactions },
    { status: 200, body: result },
    { status: 200, body: reactions },
  );
  const { result: door } = await renderHook(() =>
    useReactionsOf(URL, account(), options(fetchFn)),
  );
  expect(await door.current.of("d")).toEqual({ kind: "ok", value: reactions });
  expect(await door.current.leave("d", "super_like", "Nice one")).toEqual({
    kind: "ok",
    value: result,
  });
  expect(await door.current.remove("d")).toEqual({ kind: "ok", value: reactions });
  expect(fetchFn.mock.calls.map(([, init]) => init?.method)).toEqual([
    "GET",
    "PUT",
    "DELETE",
  ]);
  for (const [, init] of fetchFn.mock.calls) {
    expect(init).toMatchObject({
      headers: { Authorization: `Bearer ${signedIn.token}` },
    });
  }
});

test("a session the API says is over is ended", async () => {
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  const signedInAccount = account();
  const { result: door } = await renderHook(() =>
    useReactionsOf(URL, signedInAccount, options(fetchFn)),
  );
  await door.current.leave("d", "fire", null);
  expect(signedInAccount.sessionEnded).toHaveBeenCalledWith(signedIn.token);
});
