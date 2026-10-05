import comment from "@shaperoute/shared-types/fixtures/comment.json";
import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { renderHook } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import type { Account } from "../account/useAccount";
import { useCommentsOf } from "./commentsDoor";

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
    changeEmail: jest.fn(),
    changePhone: jest.fn(),
    changeNotifications: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
    ...over,
  };
}

test("nobody signed in: no comments asked for", async () => {
  const fetchFn = answers();
  const { result } = await renderHook(() =>
    useCommentsOf(
      URL,
      account({ state: { status: "signedOut", notice: null } }),
      options(fetchFn),
    ),
  );
  expect(await result.current.pageOf("d", null)).toBeNull();
  expect(await result.current.write("d", "Hi")).toBeNull();
  expect(await result.current.remove("c")).toBeNull();
  expect(await result.current.photoOf("p")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("a comment goes with the session's token", async () => {
  const fetchFn = answers({ status: 201, body: comment });
  const { result } = await renderHook(() =>
    useCommentsOf(URL, account(), options(fetchFn)),
  );
  const outcome = await result.current.write("d", comment.text);
  expect(outcome).toEqual({ kind: "ok", value: comment });
  expect(fetchFn.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: `Bearer ${signedIn.token}` },
  });
});

test("a session the API says is over is ended", async () => {
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  const signedInAccount = account();
  const { result } = await renderHook(() =>
    useCommentsOf(URL, signedInAccount, options(fetchFn)),
  );
  await result.current.pageOf("d", null);
  expect(signedInAccount.sessionEnded).toHaveBeenCalledWith(signedIn.token);
});

test("the picture of who wrote is asked once per profile", async () => {
  const fetchFn = answers({ status: 200, body: publicProfile });
  const { result } = await renderHook(() =>
    useCommentsOf(URL, account(), options(fetchFn)),
  );
  const first = await result.current.photoOf(publicProfile.public_id);
  const again = await result.current.photoOf(publicProfile.public_id);
  expect(first).toBe(`data:image/jpeg;base64,${publicProfile.photo}`);
  expect(again).toBe(first);
  expect(fetchFn).toHaveBeenCalledTimes(1);
});
