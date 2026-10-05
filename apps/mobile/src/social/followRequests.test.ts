import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { answers, apiError } from "../account/testing";
import type { AccountState } from "../account/useAccount";
import { useFollowRequestsOf } from "./followRequests";

// How many ask to follow the account (TASK-239): the number on the way
// to «Profile», asked while the app is open.

const URL = "http://api";
const EVERY_MS = 1000;
const ended = jest.fn();

let appState: (next: AppStateStatus) => void = () => {};
const removeAppState = jest.fn();

function state(token: string | null): AccountState {
  return token === null
    ? { status: "signedOut", notice: null }
    : { status: "signedIn", session: { ...(session as Session), token } };
}

function waiting(total: number) {
  return { status: 200, body: { people: [], next: null, total } };
}

type Props = { token: string | null };

async function hook(fetchFn: jest.Mock, token: string | null = "one") {
  return renderHook(
    ({ token }: Props) =>
      useFollowRequestsOf(
        URL,
        { state: state(token), sessionEnded: ended },
        { fetchFn, key: null, everyMs: EVERY_MS },
      ),
    { initialProps: { token } },
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  ended.mockReset();
  removeAppState.mockReset();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    appState = listener;
    return { remove: removeAppState };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("with nobody signed in nobody waits, and nothing is asked", async () => {
  const fetchFn = answers();
  const { result } = await hook(fetchFn, null);
  await act(async () => jest.advanceTimersByTime(3 * EVERY_MS));
  expect(result.current.count).toBe(0);
  expect(fetchFn).not.toHaveBeenCalled();
});

test("signed in, the number is asked at once, with one member only", async () => {
  const fetchFn = answers(waiting(2));
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(result.current.count).toBe(2));
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/me/follow-requests?limit=1");
  expect(fetchFn.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: "Bearer one" },
  });
});

test("it is asked again every while: a new request shows on its own", async () => {
  const fetchFn = answers(waiting(0), waiting(1), waiting(3));
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  expect(result.current.count).toBe(0);
  await act(async () => jest.advanceTimersByTime(EVERY_MS));
  await waitFor(() => expect(result.current.count).toBe(1));
  await act(async () => jest.advanceTimersByTime(EVERY_MS));
  await waitFor(() => expect(result.current.count).toBe(3));
});

test("away from the screen nothing is asked; back on it, at once", async () => {
  const fetchFn = answers(waiting(0), waiting(4));
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  await act(async () => appState("background"));
  await act(async () => jest.advanceTimersByTime(5 * EVERY_MS));
  expect(fetchFn).toHaveBeenCalledTimes(1);
  await act(async () => appState("active"));
  await waitFor(() => expect(result.current.count).toBe(4));
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("without an answer the last number stays", async () => {
  const fetchFn = answers(waiting(2), new Error("offline"), {
    status: 500,
    body: apiError("engine_error"),
  });
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(result.current.count).toBe(2));
  await act(async () => jest.advanceTimersByTime(2 * EVERY_MS));
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(3));
  expect(result.current.count).toBe(2);
  expect(ended).not.toHaveBeenCalled();
});

test("an API older than following is asked once", async () => {
  const fetchFn = answers({ status: 404, body: apiError("http_error", "Not Found") });
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  await act(async () => jest.advanceTimersByTime(3 * EVERY_MS));
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(result.current.count).toBe(0);
});

test("a session that ended signs out", async () => {
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  await hook(fetchFn);
  await waitFor(() => expect(ended).toHaveBeenCalledWith("one"));
});

test("what «Profile» counted is the newest: an answer asked before it is dropped", async () => {
  let answer: (response: Response) => void = () => {};
  const fetchFn = jest.fn(
    () =>
      new Promise<Response>((resolve) => {
        answer = resolve;
      }),
  );
  const { result } = await hook(fetchFn as unknown as jest.Mock);
  await act(async () => result.current.counted(0));
  await act(async () => answer(Response.json({ people: [], next: null, total: 1 })));
  expect(result.current.count).toBe(0);
});

test("another account's number is not this one's; leaving stops the asking", async () => {
  const fetchFn = answers(waiting(2), waiting(0));
  const { result, rerender, unmount } = await hook(fetchFn);
  await waitFor(() => expect(result.current.count).toBe(2));
  await rerender({ token: null });
  expect(result.current.count).toBe(0);
  await rerender({ token: "two" });
  expect(result.current.count).toBe(0);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
  expect(fetchFn.mock.calls[1][1]).toMatchObject({
    headers: { Authorization: "Bearer two" },
  });
  await unmount();
  expect(removeAppState).toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(3 * EVERY_MS));
  expect(fetchFn).toHaveBeenCalledTimes(2);
});
