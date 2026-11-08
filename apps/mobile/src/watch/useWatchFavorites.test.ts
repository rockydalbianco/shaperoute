import type { Direction, LatLon } from "@shaperoute/shared-types";
import favorite from "@shaperoute/shared-types/fixtures/favorite.json";
import favoriteWalks from "@shaperoute/shared-types/fixtures/favorite-walks.json";
import { act, renderHook } from "@testing-library/react-native";

import type { Favorite, FavoriteDetail } from "../api/favorites";
import type { KeptList } from "../storage/keptList";
import { type SyncDoors, syncFavorites, useWatchFavorites } from "./useWatchFavorites";
import type { WatchLink } from "./watchLink";
import type { WatchMessage } from "./watchMessages";

// The favorites on the watch by themselves (TASK-370 part B3a2).

const STAR = favorite as FavoriteDetail;
const WORD = favoriteWalks as FavoriteDetail;

function detailOf(key: string): FavoriteDetail {
  return { ...(key === "word" ? WORD : STAR), id: key };
}

const DIRECTION: Direction = {
  node: 1,
  point: STAR.points[0],
  distance_m: 0,
  turn: "depart",
  angle_deg: 0,
  street: "Via Roma",
  road_type: "residential",
  branches: 3,
  joined: false,
};

/** Doors that log what is asked, in order; `offline` keys get nothing. */
function doors(offline: ReadonlySet<string> = new Set()) {
  const log: string[] = [];
  const transferred: WatchMessage[] = [];
  const saved: string[][] = [];
  let asking: string | null = null;
  const link: WatchLink = {
    send: () => {},
    transfer: (message) => {
      log.push(message.type === "route" ? `send ${message.route.key}` : "send keys");
      transferred.push(message);
    },
    listen: () => () => {},
    ready: () => Promise.resolve(true),
  };
  const sync: SyncDoors = {
    link,
    detail: async (key) => {
      // One at a time: nothing else is asked while a favorite is.
      expect(asking).toBeNull();
      asking = key;
      log.push(`detail ${key}`);
      await Promise.resolve();
      asking = null;
      return offline.has(key) ? null : detailOf(key);
    },
    directions: async (points: LatLon[]) => {
      log.push(`directions ${points.length}`);
      await Promise.resolve();
      return offline.has("directions") ? null : [DIRECTION];
    },
    now: () => 9,
    saveSent: (keys) => saved.push(keys),
  };
  return { sync, log, transferred, saved };
}

test("sends each favorite the watch lacks, one at a time, then the keys", async () => {
  const { sync, log, transferred, saved } = doors();
  const sent = await syncFavorites(["a", "word"], [], sync);
  expect(sent).toEqual(["a", "word"]);
  expect(log).toEqual([
    "detail a",
    "directions 5",
    "send a",
    "detail word",
    "directions 8",
    "send word",
    "send keys",
  ]);
  expect(transferred[0]).toMatchObject({
    type: "route",
    favorite: true,
    at: 9,
    route: { key: "a", title: "Star", directions: [{ street: "Via Roma" }] },
  });
  expect(transferred[1]).toMatchObject({
    route: { key: "word", word: "II", walks: [[2, 5]] },
  });
  expect(transferred[2]).toEqual({ type: "routes", favorites: ["a", "word"], at: 9 });
  // Written after each, so a stop keeps what went.
  expect(saved[0]).toEqual(["a"]);
  expect(saved[saved.length - 1]).toEqual(["a", "word"]);
});

test("stops without the network, keeps what went, and goes on at the next sync", async () => {
  const first = doors(new Set(["b"]));
  const sent = await syncFavorites(["a", "b", "c"], [], first.sync);
  expect(sent).toEqual(["a"]);
  expect(first.log).toEqual([
    "detail a",
    "directions 5",
    "send a",
    "detail b",
    "send keys",
  ]);
  expect(first.saved[first.saved.length - 1]).toEqual(["a"]);

  const second = doors();
  const after = await syncFavorites(["a", "b", "c"], sent, second.sync);
  expect(after).toEqual(["a", "b", "c"]);
  expect(second.log.filter((line) => line.startsWith("detail"))).toEqual([
    "detail b",
    "detail c",
  ]);
});

test("stops too when the directions do not come", async () => {
  const { sync, log, saved } = doors(new Set(["directions"]));
  expect(await syncFavorites(["a"], [], sync)).toEqual([]);
  expect(log).toEqual(["detail a", "directions 5"]);
  expect(saved).toEqual([]);
});

test("lets the watch go of a favorite taken out, with nothing fetched", async () => {
  const { sync, log, transferred, saved } = doors();
  expect(await syncFavorites(["a"], ["a", "b"], sync)).toEqual(["a"]);
  expect(log).toEqual(["send keys"]);
  expect(transferred).toEqual([{ type: "routes", favorites: ["a"], at: 9 }]);
  expect(saved).toEqual([["a"]]);
});

test("sends nothing when the watch has them all", async () => {
  const { sync, log } = doors();
  expect(await syncFavorites(["a", "b"], ["b", "a"], sync)).toEqual(["a", "b"]);
  expect(log).toEqual([]);
});

test("asks no directions on the water", async () => {
  const { sync, log, transferred } = doors();
  const paddle = jest.fn(async (key: string) => ({
    ...detailOf(key),
    activity: "paddling",
  }));
  await syncFavorites(["p"], [], { ...sync, detail: paddle });
  expect(log).toEqual(["send p", "send keys"]);
  expect(transferred[0]).toMatchObject({ route: { paddle: true, directions: [] } });
});

test("does not try again a favorite the watch cannot keep", async () => {
  const { sync, transferred } = doors();
  const one = async (key: string) => ({ ...detailOf(key), points: [STAR.points[0]] });
  expect(await syncFavorites(["x"], [], { ...sync, detail: one })).toEqual(["x"]);
  expect(transferred).toEqual([{ type: "routes", favorites: ["x"], at: 9 }]);
});

describe("the hook", () => {
  function store(): KeptList<string> & { list: string[] } {
    const kept = {
      list: [] as string[],
      load: () => [...kept.list],
      save: (keys: string[]) => {
        kept.list = keys;
        return true;
      },
    };
    return kept;
  }

  function favorites(...ids: string[]): Favorite[] {
    return ids.map((id) => ({ ...STAR, id, start: STAR.points[0], preview: [] }));
  }

  /** A fetch that answers the favorite's detail or the directions, held
   * until `release` while `hold` is set. */
  function fakeFetch() {
    let hold: Promise<void> | null = null;
    let release = () => {};
    const calls: string[] = [];
    const fetchFn = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (hold !== null) {
        await hold;
      }
      const key = url.split("/").pop() ?? "";
      const body = url.endsWith("/route-directions")
        ? { directions: [DIRECTION] }
        : { ...STAR, id: key };
      return { ok: true, status: 200, json: async () => body } as Response;
    });
    return {
      fetchFn,
      calls,
      holdOn: () => {
        hold = new Promise((resolve) => {
          release = () => {
            hold = null;
            resolve();
          };
        });
      },
      release: () => release(),
    };
  }

  function linkLog() {
    const sent: string[] = [];
    const link: WatchLink = {
      send: () => {},
      transfer: (message) =>
        sent.push(message.type === "route" ? message.route.key : "keys"),
      listen: () => () => {},
      ready: () => Promise.resolve(true),
    };
    return { link, sent };
  }

  test("a change while a sync runs is synced after it, never beside it", async () => {
    const net = fakeFetch();
    const kept = store();
    const { link, sent } = linkLog();
    net.holdOn();
    const { rerender } = await renderHook(
      ({ list }: { list: Favorite[] }) =>
        useWatchFavorites("http://api", "token", list, {
          link,
          fetchFn: net.fetchFn,
          store: kept,
          now: () => 1,
        }),
      { initialProps: { list: favorites("a") } },
    );
    await act(async () => {});
    // «a» is being fetched; «b» comes meanwhile.
    await rerender({ list: favorites("a", "b") });
    await act(async () => {});
    expect(net.calls.filter((url) => url.includes("/me/favorites/"))).toEqual([
      "http://api/me/favorites/a",
    ]);
    await act(async () => net.release());
    await act(async () => {});
    expect(sent).toEqual(["a", "keys", "b", "keys"]);
    expect(kept.list).toEqual(["a", "b"]);
  });

  test("nothing without a watch, or signed out", async () => {
    const net = fakeFetch();
    await renderHook(() =>
      useWatchFavorites("http://api", null, favorites("a"), {
        link: linkLog().link,
        fetchFn: net.fetchFn,
        store: store(),
      }),
    );
    await renderHook(() =>
      useWatchFavorites("http://api", "token", favorites("a"), {
        link: null,
        fetchFn: net.fetchFn,
        store: store(),
      }),
    );
    await act(async () => {});
    expect(net.fetchFn).not.toHaveBeenCalled();
  });
});
