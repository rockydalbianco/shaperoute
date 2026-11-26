import drawingDetails from "@shaperoute/shared-types/fixtures/drawing-details.json";
import runStats from "@shaperoute/shared-types/fixtures/run-stats.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { answers, held } from "../account/testing";
import type { RunStats } from "../api/runStats";
import type { Account } from "../account/useAccount";
import { useDrawingsOf } from "../social/drawingsDoor";
import { FollowsContext } from "../social/followsDoor";
import { usePostStats } from "./usePostStats";

/**
 * A post's page and the map it opens read one answer of GET /drawings/{id}
 * (TASK-501, O11): the page asks for the figures, the map takes what the
 * page holds.
 */

const URL = "http://api";
const signedIn = session as Session;
const ID = drawingDetails.id;
const DETAIL = { ...drawingDetails, stats: runStats };
const doors = { onOpened: jest.fn(), onBack: jest.fn() };

function account(token = signedIn.token): Account {
  return {
    state: { status: "signedIn", session: { ...signedIn, token } },
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
  };
}

function signedInAs(token = signedIn.token) {
  const it = account(token);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <FollowsContext.Provider
        value={{ apiUrl: URL, account: it, openProfile: jest.fn() }}
      >
        {children}
      </FollowsContext.Provider>
    );
  };
}

/** The post's page, open on `id`, asking with `fetchFn`. */
async function postOpen(fetchFn: jest.Mock, id = ID, token = signedIn.token) {
  return renderHook<RunStats | null, { shown: string }>(
    ({ shown }) => usePostStats(shown, { fetchFn }),
    {
      initialProps: { shown: id },
      wrapper: signedInAs(token),
    },
  );
}

/** The door that opens a drawing on the map, as «Profile» makes it. */
async function mapDoor(fetchFn: jest.Mock, token = signedIn.token) {
  const { result } = await renderHook(() =>
    useDrawingsOf(URL, account(token), doors, { fetchFn }),
  );
  return result;
}

function drawingsAsked(fetchFn: jest.Mock): number {
  return fetchFn.mock.calls.filter(([url]) => String(url).includes("/drawings/"))
    .length;
}

test("opening a post and then its map asks for the drawing once", async () => {
  const fetchFn = answers({ status: 200, body: DETAIL });
  const page = await postOpen(fetchFn);
  const door = await mapDoor(fetchFn);
  await waitFor(() => expect(page.result.current).not.toBeNull());
  expect(page.result.current?.splits_km).toEqual(runStats.splits_km);

  await act(async () => {
    door.current.open({ id: ID });
  });
  await waitFor(() => expect(door.current.opened?.id).toBe(ID));
  expect(drawingsAsked(fetchFn)).toBe(1);
  expect(String(fetchFn.mock.calls[0][0])).toBe(`${URL}/drawings/${ID}`);
});

test("the map tapped while the figures are still coming waits for the same answer", async () => {
  const { fetchFn, answer } = held();
  const page = await postOpen(fetchFn);
  const door = await mapDoor(fetchFn);
  await act(async () => {
    door.current.open({ id: ID });
  });
  expect(door.current.opening).toBe(ID);
  // As the feed does it: the page closes as the map opens.
  await page.unmount();

  await act(async () => {
    answer(200, DETAIL);
  });
  await waitFor(() => expect(door.current.opened?.id).toBe(ID));
  expect(drawingsAsked(fetchFn)).toBe(1);
});

test("with the post closed, the map asks again", async () => {
  const fetchFn = answers({ status: 200, body: DETAIL }, { status: 200, body: DETAIL });
  const page = await postOpen(fetchFn);
  await waitFor(() => expect(page.result.current).not.toBeNull());
  await page.unmount();

  const door = await mapDoor(fetchFn);
  await act(async () => {
    door.current.open({ id: ID });
  });
  await waitFor(() => expect(door.current.opened?.id).toBe(ID));
  expect(drawingsAsked(fetchFn)).toBe(2);
});

test("an answer that was not the drawing is not kept: the map asks again", async () => {
  const fetchFn = answers(new Error("offline"), { status: 200, body: DETAIL });
  const page = await postOpen(fetchFn);
  await waitFor(() => expect(drawingsAsked(fetchFn)).toBe(1));
  await act(async () => {
    await new Promise((tick) => setTimeout(tick, 0));
  });
  expect(page.result.current).toBeNull();

  const door = await mapDoor(fetchFn);
  await act(async () => {
    door.current.open({ id: ID });
  });
  await waitFor(() => expect(door.current.opened?.id).toBe(ID));
  expect(drawingsAsked(fetchFn)).toBe(2);
});

test("another drawing, or another account, is asked for on its own", async () => {
  const fetchFn = answers(
    { status: 200, body: DETAIL },
    { status: 200, body: { ...DETAIL, id: "another" } },
    { status: 200, body: DETAIL },
  );
  const page = await postOpen(fetchFn);
  await waitFor(() => expect(page.result.current).not.toBeNull());

  const door = await mapDoor(fetchFn);
  await act(async () => {
    door.current.open({ id: "another" });
  });
  await waitFor(() => expect(door.current.opened?.id).toBe("another"));

  const someoneElse = await mapDoor(fetchFn, "another-token");
  await act(async () => {
    someoneElse.current.open({ id: ID });
  });
  await waitFor(() => expect(someoneElse.current.opened?.id).toBe(ID));
  expect(drawingsAsked(fetchFn)).toBe(3);
  expect(fetchFn.mock.calls.map(([url]) => String(url))).toEqual([
    `${URL}/drawings/${ID}`,
    `${URL}/drawings/another`,
    `${URL}/drawings/${ID}`,
  ]);
});

test("a post opened after another shows only its own figures", async () => {
  const fetchFn = answers(
    { status: 200, body: DETAIL },
    { status: 200, body: { ...DETAIL, id: "another", stats: null } },
  );
  const page = await postOpen(fetchFn);
  await waitFor(() => expect(page.result.current).not.toBeNull());
  await page.rerender({ shown: "another" });
  expect(page.result.current).toBeNull();
  await waitFor(() => expect(drawingsAsked(fetchFn)).toBe(2));
});
