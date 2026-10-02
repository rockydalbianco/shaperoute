import activities from "@shaperoute/shared-types/fixtures/activities.json";
import { act, renderHook } from "@testing-library/react-native";

import { answers, apiError, held } from "../account/testing";
import type { ActivitiesPage, Activity } from "../api/activities";
import { useActivities } from "./useActivities";

const URL = "http://api";
const [STAR, FREE] = activities.activities as Activity[];
const CURSOR = "1789796402000000-3";

/** A run of the list that began `days` before the star's. */
function earlier(days: number): Activity {
  const began = new Date(Date.parse(STAR.started_at) - days * 86_400_000);
  return { ...FREE, id: `earlier${days}key00`, started_at: began.toISOString() };
}

function page(
  list: Activity[],
  next: string | null = null,
  total = list.length,
): ActivitiesPage {
  return { activities: list, next, total };
}

type Props = { token: string | null; baseUrl?: string | null };

async function hook(fetchFn: jest.Mock, token: string | null = "one") {
  const ended = jest.fn();
  const rendered = await renderHook(
    ({ token, baseUrl = URL }: Props) =>
      useActivities(baseUrl, token, ended, { fetchFn, key: null }),
    { initialProps: { token } },
  );
  return { ...rendered, ended };
}

test("with nobody signed in there are no activities, and nothing is asked", async () => {
  const fetchFn = answers();
  const { result } = await hook(fetchFn, null);
  expect(result.current).toMatchObject({
    status: "off",
    list: [],
    total: null,
    more: false,
    problem: null,
  });
  await act(async () => {
    result.current.refresh();
    result.current.loadMore();
    result.current.remove(STAR.id);
  });
  expect(fetchFn).not.toHaveBeenCalled();
});

test("signed in, the first page is asked for at once", async () => {
  const waiting = held();
  const { result } = await hook(waiting.fetchFn);
  expect(result.current.status).toBe("loading");
  expect(result.current.total).toBeNull();
  await act(async () => waiting.answer(200, activities));
  expect(result.current).toMatchObject({
    status: "ready",
    list: activities.activities,
    total: 2,
    more: false,
  });
  expect(waiting.fetchFn.mock.calls[0][0]).toBe("http://api/me/activities");
});

test("the next page comes after the ones here, with its cursor", async () => {
  const waiting = held();
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) =>
    String(url).includes("cursor=")
      ? waiting.fetchFn(url, init)
      : Response.json(page([STAR], CURSOR, 2)),
  );
  const { result } = await hook(fetchFn);
  expect(result.current).toMatchObject({ list: [STAR], total: 2, more: true });
  await act(async () => result.current.loadMore());
  expect(result.current.loadingMore).toBe(true);
  // Asked once, however many times the button is tapped.
  await act(async () => result.current.loadMore());
  expect(fetchFn).toHaveBeenCalledTimes(2);
  expect(fetchFn.mock.calls[1][0]).toBe(`http://api/me/activities?cursor=${CURSOR}`);
  await act(async () => waiting.answer(200, page([FREE], null, 2)));
  expect(result.current).toMatchObject({
    list: [STAR, FREE],
    total: 2,
    more: false,
    loadingMore: false,
  });
  // The last page: nothing more to ask.
  await act(async () => result.current.loadMore());
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("a page never repeats a run already here", async () => {
  const fetchFn = answers(
    { status: 200, body: page([STAR, FREE], CURSOR, 3) },
    { status: 200, body: page([FREE, earlier(5)], null, 3) },
  );
  const { result } = await hook(fetchFn);
  await act(async () => result.current.loadMore());
  expect(result.current.list.map((activity) => activity.id)).toEqual([
    STAR.id,
    FREE.id,
    earlier(5).id,
  ]);
});

test("a page that does not come says why, and can be asked again", async () => {
  const fetchFn = answers(
    { status: 200, body: page([STAR], CURSOR, 2) },
    new Error("no network"),
    { status: 200, body: page([FREE], null, 2) },
  );
  const { result } = await hook(fetchFn);
  await act(async () => result.current.loadMore());
  expect(result.current).toMatchObject({
    list: [STAR],
    more: true,
    loadingMore: false,
  });
  expect(result.current.problem).toContain("Cannot reach the API");
  await act(async () => result.current.loadMore());
  expect(result.current).toMatchObject({ list: [STAR, FREE], problem: null });
});

test("a page of the list as it was is dropped once the list is asked again", async () => {
  const old = held();
  let firstPages = 0;
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    if (String(url).includes("cursor=")) {
      return old.fetchFn(url, init);
    }
    firstPages += 1;
    return Response.json(
      firstPages === 1 ? page([STAR], CURSOR, 2) : page([earlier(1)], null, 1),
    );
  });
  const { result } = await hook(fetchFn);
  await act(async () => result.current.loadMore());
  await act(async () => result.current.refresh());
  expect(result.current).toMatchObject({ list: [earlier(1)], total: 1, more: false });
  await act(async () => old.answer(200, page([FREE], null, 2)));
  expect(result.current).toMatchObject({
    list: [earlier(1)],
    total: 1,
    loadingMore: false,
  });
});

test("a run deleted goes at once", async () => {
  const waiting = held();
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) =>
    init?.method === "DELETE" ? waiting.fetchFn(url, init) : Response.json(activities),
  );
  const { result } = await hook(fetchFn);
  await act(async () => result.current.remove(STAR.id));
  expect(result.current).toMatchObject({ list: [FREE], total: 1 });
  const [url, init] = waiting.fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/me/activities/${STAR.id}`);
  expect(init).toMatchObject({ method: "DELETE" });
  await act(async () => waiting.answer(204));
  expect(result.current).toMatchObject({ list: [FREE], total: 1, problem: null });
});

test("a run the API does not delete comes back where it was", async () => {
  const fetchFn = answers(
    { status: 200, body: page([STAR, FREE, earlier(9)], null, 3) },
    { status: 500, body: apiError("engine_error", "The database is away.") },
  );
  const { result } = await hook(fetchFn);
  await act(async () => result.current.remove(FREE.id));
  expect(result.current.list.map((activity) => activity.id)).toEqual([
    STAR.id,
    FREE.id,
    earlier(9).id,
  ]);
  expect(result.current.total).toBe(3);
  expect(result.current.problem).toContain("The database is away.");
  await act(async () => result.current.clearProblem());
  expect(result.current.problem).toBeNull();
});

test("a run that is not in the list is not asked away", async () => {
  const fetchFn = answers({ status: 200, body: activities });
  const { result } = await hook(fetchFn);
  await act(async () => result.current.remove("0000000000000000"));
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(result.current.total).toBe(2);
});

test("a list that never came can be asked again; one that did stays", async () => {
  const fetchFn = answers(
    new Error("no network"),
    { status: 200, body: activities },
    new Error("no network"),
  );
  const { result } = await hook(fetchFn);
  expect(result.current).toMatchObject({ status: "failed", list: [], total: null });
  await act(async () => result.current.refresh());
  expect(result.current).toMatchObject({ status: "ready", total: 2 });
  await act(async () => result.current.refresh());
  expect(result.current).toMatchObject({
    status: "ready",
    list: activities.activities,
  });
});

test("a session that ended signs the account out", async () => {
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  const { result, ended } = await hook(fetchFn);
  expect(result.current.status).toBe("failed");
  expect(ended).toHaveBeenCalledWith("one");
});

test("a session that ended while deleting signs out too", async () => {
  const fetchFn = answers(
    { status: 200, body: activities },
    { status: 401, body: apiError("not_signed_in") },
  );
  const { result, ended } = await hook(fetchFn);
  await act(async () => result.current.remove(STAR.id));
  expect(ended).toHaveBeenCalledWith("one");
  expect(result.current.list).toEqual(activities.activities);
});

test("another account has its own list, and the answers of the first are dropped", async () => {
  const first = held();
  const fetchFn = jest.fn(async (url: string, init?: RequestInit) => {
    const auth = (init?.headers as Record<string, string>).Authorization;
    return auth === "Bearer one"
      ? first.fetchFn(url, init)
      : Response.json(page([FREE]));
  });
  const { result, rerender } = await hook(fetchFn);
  await rerender({ token: "two" });
  expect(result.current).toMatchObject({ status: "ready", list: [FREE], total: 1 });
  await act(async () => first.answer(200, page([STAR])));
  expect(result.current.list).toEqual([FREE]);
  await rerender({ token: null });
  expect(result.current).toMatchObject({ status: "off", list: [], total: null });
});

test("without an API the list fails, and nothing is asked", async () => {
  const fetchFn: jest.Mock = answers();
  const ended = jest.fn();
  const { result } = await renderHook(() =>
    useActivities(null, "one", ended, { fetchFn, key: null }),
  );
  expect(result.current.status).toBe("failed");
  expect(fetchFn).not.toHaveBeenCalled();
});
