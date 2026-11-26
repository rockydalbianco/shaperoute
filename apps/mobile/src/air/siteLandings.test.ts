import type { FlyingSites } from "../api/flyingSites";
import type { KeptList } from "../storage/keptList";
import {
  boxAround,
  type KeptLandings,
  landingsOf,
  refreshSiteLandings,
  resetSiteLandings,
  siteLandingsNow,
  STALE_MS,
  stillGood,
} from "./siteLandings";

function memory(): KeptList<KeptLandings> & { items: KeptLandings[] } {
  const list = {
    items: [] as KeptLandings[],
    load: () => list.items,
    save: (items: KeptLandings[]) => {
      list.items = items;
      return true;
    },
  };
  return list as unknown as KeptList<KeptLandings> & { items: KeptLandings[] };
}

// Invented sites.
const SITES: FlyingSites = {
  sites: [
    { id: "n1", kind: "landing", lat: 45.7, lon: 10.8, name: "Test field", ele_m: 300 },
    { id: "n2", kind: "landing", lat: 45.72, lon: 10.82, name: null, ele_m: null },
  ],
  more: false,
  attribution: "© OpenStreetMap contributors",
};
const HERE: [number, number] = [45.73, 10.83];
const NOW = Date.UTC(2026, 10, 26, 10);

beforeEach(() => resetSiteLandings());

it("asks the box around the take-off, as wide on the ground as it is high", () => {
  const box = boxAround([60, 10]);
  expect(box.north - box.south).toBeCloseTo(0.5, 9);
  // At 60° a degree of longitude is half as long: twice as many.
  expect(box.east - box.west).toBeCloseTo(1, 9);
});

it("turns the sites into landings, with OSM's height or none", () => {
  expect(landingsOf(SITES).map((one) => [one.name, one.altM, one.landing])).toEqual([
    ["Test field", 300, true],
    ["Landing", null, true],
  ]);
});

it("asks once, keeps them, and asks again only elsewhere or after a week", async () => {
  const list = memory();
  const ask = jest.fn(() => Promise.resolve({ kind: "ok" as const, value: SITES }));
  expect(await refreshSiteLandings(HERE, NOW, ask, list)).toBe("fetched");
  expect(siteLandingsNow(list)?.landings).toHaveLength(2);
  expect(list.items).toHaveLength(1);
  expect(await refreshSiteLandings(HERE, NOW + 1000, ask, list)).toBe("kept");
  expect(ask).toHaveBeenCalledTimes(1);
  expect(stillGood(siteLandingsNow(list), HERE, NOW + STALE_MS)).toBe(false);
  expect(stillGood(siteLandingsNow(list), [47, 12], NOW)).toBe(false);
});

it("keeps what it had when the server says nothing, with no table, or no network", async () => {
  const list = memory();
  const empty = { ...SITES, sites: [] };
  expect(
    await refreshSiteLandings(
      HERE,
      NOW,
      () => Promise.resolve({ kind: "ok", value: empty }),
      list,
    ),
  ).toBe("fetched");
  expect(siteLandingsNow(list)?.landings).toEqual([]);
  resetSiteLandings();
  const elsewhere: [number, number] = [47, 12];
  expect(
    await refreshSiteLandings(
      elsewhere,
      NOW,
      () => Promise.resolve({ kind: "unreachable", url: "http://api" }),
      list,
    ),
  ).toBe("failed");
  expect(await refreshSiteLandings(elsewhere, NOW, () => null, list)).toBe("failed");
  expect(
    await refreshSiteLandings(
      elsewhere,
      NOW,
      () => Promise.reject(new Error("off")),
      list,
    ),
  ).toBe("failed");
  expect(siteLandingsNow(list)?.landings).toEqual([]);
});

it("draws the box around the place rounded to about a kilometre", () => {
  const box = boxAround([45.73456, 10.83789]);
  expect((box.north + box.south) / 2).toBeCloseTo(45.73, 9);
  expect((box.east + box.west) / 2).toBeCloseTo(10.84, 9);
});
