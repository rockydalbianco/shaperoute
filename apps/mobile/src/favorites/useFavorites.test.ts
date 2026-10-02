import walkedRequest from "@shaperoute/shared-types/fixtures/favorite-request-walks.json";
import favorites from "@shaperoute/shared-types/fixtures/favorites.json";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { answers, apiError, held } from "../account/testing";
import type { Favorite, FavoriteRequest } from "../api/favorites";
import type { Keepable } from "./favoriteRoute";
import { useFavorites } from "./useFavorites";

const URL = "http://api";
const [STAR, WORD] = favorites.favorites as Favorite[];
const NOW = new Date("2026-10-02T09:00:00Z");

/** The star, as the heart on the map hands it over. */
const ROUTE: Keepable = {
  id: STAR.id,
  request: {
    city: STAR.city,
    shape: STAR.shape,
    word: null,
    style: null,
    title: null,
    distance_m: STAR.distance_m,
    route_m: STAR.route_m,
    similarity: STAR.similarity,
    points: STAR.preview,
  },
};

type Props = { token: string | null; baseUrl?: string | null };

async function hook(fetchFn: jest.Mock, token: string | null = "one") {
  const ended = jest.fn();
  const rendered = await renderHook(
    ({ token, baseUrl = URL }: Props) =>
      useFavorites(baseUrl, token, ended, { fetchFn, key: null, now: () => NOW }),
    { initialProps: { token } },
  );
  return { ...rendered, ended };
}

test("with nobody signed in there are no favorites, and nothing is asked", async () => {
  const fetchFn = answers();
  const { result } = await hook(fetchFn, null);
  expect(result.current).toMatchObject({ status: "off", list: [], problem: null });
  await act(async () => {
    result.current.toggle(ROUTE);
    result.current.remove(STAR.id);
    result.current.refresh();
  });
  expect(fetchFn).not.toHaveBeenCalled();
});

test("signed in, the list is asked for at once", async () => {
  const waiting = held();
  const { result } = await hook(waiting.fetchFn);
  expect(result.current.status).toBe("loading");
  await act(async () => waiting.answer(200, favorites));
  expect(result.current.status).toBe("ready");
  expect(result.current.list).toEqual(favorites.favorites);
  expect(result.current.has(WORD.id)).toBe(true);
  expect(result.current.has("0000000000000000")).toBe(false);
});

test("a route is kept at once, then as the API has it", async () => {
  const fromApi = { ...STAR, created_at: "2026-10-02T09:00:01Z" };
  const fetchFn = answers(
    { status: 200, body: { favorites: [WORD] } },
    { status: 201, body: fromApi },
  );
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(result.current.status).toBe("ready"));
  await act(async () => {
    result.current.toggle(ROUTE);
    // Before the API answers: first of the list, with the phone's date.
    expect(result.current.list).toHaveLength(1);
  });
  await waitFor(() => expect(result.current.list[0]).toEqual(fromApi));
  expect(result.current.list.map((favorite) => favorite.id)).toEqual([
    STAR.id,
    WORD.id,
  ]);
});

test("the heart on a word with the pen up keeps its walks (TASK-199)", async () => {
  const route: Keepable = {
    id: "0123456789abcdef",
    request: walkedRequest as FavoriteRequest,
  };
  const { walks: _walks, ...listed } = walkedRequest;
  const fromApi = {
    ...STAR,
    ...listed,
    id: route.id,
    start: walkedRequest.points[0],
    preview: walkedRequest.points,
  };
  const fetchFn = answers(
    { status: 200, body: { favorites: [] } },
    { status: 201, body: fromApi },
  );
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(result.current.status).toBe("ready"));
  await act(async () => result.current.toggle(route));
  await waitFor(() => expect(result.current.list[0]).toEqual(fromApi));
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe(`${URL}/me/favorites/${route.id}`);
  expect(JSON.parse(String(init?.body))).toEqual(walkedRequest);
});

test("removed and refused, it goes back to its place", async () => {
  const fetchFn = answers(
    { status: 200, body: favorites },
    { status: 500, body: apiError("engine_error") },
  );
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(result.current.status).toBe("ready"));
  await act(async () => result.current.remove(WORD.id));
  await waitFor(() => expect(result.current.problem).not.toBeNull());
  expect(result.current.list).toEqual(favorites.favorites);
  await act(async () => result.current.clearProblem());
  expect(result.current.problem).toBeNull();
});

test("a session that ended is told to the account", async () => {
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  const { result, ended } = await hook(fetchFn);
  await waitFor(() => expect(result.current.status).toBe("failed"));
  expect(ended).toHaveBeenCalledWith("one");
});

test("another account starts from its own list, and late answers are dropped", async () => {
  // Every request waits for its own answer, in the order they were sent.
  const pending: ((body: unknown) => void)[] = [];
  const fetchFn = jest.fn(
    (_url: string, _init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        pending.push((body) => resolve(Response.json(body)));
      }),
  );
  const { result, rerender } = await hook(fetchFn);
  // Signed out and in as somebody else before the first list came.
  await rerender({ token: "two" });
  expect(result.current).toMatchObject({ status: "loading", list: [] });
  expect(pending).toHaveLength(2);
  // The answer to the first account's request changes nothing.
  await act(async () => pending[0](favorites));
  expect(result.current).toMatchObject({ status: "loading", list: [] });
  await act(async () => pending[1]({ favorites: [WORD] }));
  expect(result.current).toMatchObject({ status: "ready", list: [WORD] });

  await rerender({ token: null });
  expect(result.current).toMatchObject({ status: "off", list: [] });
});

test("asked again, a list that came stays while the API is away", async () => {
  const fetchFn = answers({ status: 200, body: favorites }, new Error("offline"));
  const { result } = await hook(fetchFn);
  await waitFor(() => expect(result.current.status).toBe("ready"));
  await act(async () => result.current.refresh());
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
  expect(result.current).toMatchObject({ status: "ready", problem: null });
  expect(result.current.list).toEqual(favorites.favorites);
});

test("without an API the list cannot come", async () => {
  const fetchFn: jest.Mock = answers();
  const { result } = await renderHook(() =>
    useFavorites(null, "one", jest.fn(), { fetchFn, key: null }),
  );
  expect(result.current.status).toBe("failed");
  expect(fetchFn).not.toHaveBeenCalled();
});
