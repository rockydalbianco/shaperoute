import comment from "@shaperoute/shared-types/fixtures/comment.json";
import reactions from "@shaperoute/shared-types/fixtures/comment-reactions.json";
import reply from "@shaperoute/shared-types/fixtures/comment-reply.json";
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

// TASK-454 part C (ADR-0377): the replies and the reactions to a comment.
describe("replies and reactions", () => {
  const AUTH = { headers: { Authorization: `Bearer ${signedIn.token}` } };

  test("nobody signed in: nothing asked for", async () => {
    const fetchFn = answers();
    const { result } = await renderHook(() =>
      useCommentsOf(
        URL,
        account({ state: { status: "signedOut", notice: null } }),
        options(fetchFn),
      ),
    );
    expect(await result.current.threads?.repliesOf("c", null)).toBeNull();
    expect(await result.current.threads?.react("c", "fire")).toBeNull();
    expect(await result.current.threads?.react("c", null)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test("a reply goes under what it answers, with the session's token", async () => {
    const fetchFn = answers({ status: 201, body: reply });
    const { result } = await renderHook(() =>
      useCommentsOf(URL, account(), options(fetchFn)),
    );
    const outcome = await result.current.write("d", reply.text, "answered");
    expect(outcome).toEqual({ kind: "ok", value: reply });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://api/drawings/d/comments");
    expect(init).toMatchObject(AUTH);
    expect(JSON.parse(String(init?.body))).toEqual({
      text: reply.text,
      reply_to: "answered",
    });
  });

  test("the replies of a comment, a reaction left and one taken away", async () => {
    const page = { comments: [reply], next: null, total: 1 };
    const fetchFn = answers(
      { status: 200, body: page },
      { status: 200, body: reactions },
      { status: 200, body: reactions },
    );
    const { result } = await renderHook(() =>
      useCommentsOf(URL, account(), options(fetchFn)),
    );
    const { threads } = result.current;
    expect(await threads?.repliesOf("c", "n2")).toEqual({ kind: "ok", value: page });
    expect(await threads?.react("c", "fire")).toEqual({ kind: "ok", value: reactions });
    await threads?.react("c", null);
    const calls = fetchFn.mock.calls.map(([url, init]) => `${init?.method} ${url}`);
    expect(calls).toEqual([
      "GET http://api/comments/c/replies?cursor=n2",
      "PUT http://api/comments/c/reaction",
      "DELETE http://api/comments/c/reaction",
    ]);
    for (const [, init] of fetchFn.mock.calls) {
      expect(init).toMatchObject(AUTH);
    }
  });

  test("a session the API says is over is ended", async () => {
    const fetchFn = answers({ status: 401, body: apiError("session_expired") });
    const signedInAccount = account();
    const { result } = await renderHook(() =>
      useCommentsOf(URL, signedInAccount, options(fetchFn)),
    );
    await result.current.threads?.react("c", "wow");
    expect(signedInAccount.sessionEnded).toHaveBeenCalledWith(signedIn.token);
  });
});
