import type { Winds } from "../api/winds";
import type { KeptList } from "../storage/keptList";
import {
  FRESH_MS,
  type KeptWinds,
  refreshWinds,
  resetWinds,
  stillGood,
  WIND_NEAR_M,
  windOnMap,
  windsNow,
} from "./windStore";

function memory(): KeptList<KeptWinds> & { items: KeptWinds[] } {
  const list = {
    items: [] as KeptWinds[],
    load: () => list.items,
    save: (items: KeptWinds[]) => {
      list.items = items;
      return true;
    },
  };
  return list as unknown as KeptList<KeptWinds> & { items: KeptWinds[] };
}

// Made-up winds.
const WINDS: Winds = {
  source: "icon-d2",
  run: "2026-11-26T06:00:00Z",
  attribution: "DWD ICON-D2, CC BY 4.0",
  lat: 45.74,
  lon: 10.84,
  levels: [850, 700, 600, 500],
  hours: [],
};
const HERE: [number, number] = [45.74, 10.84];
const NOW = Date.UTC(2026, 10, 26, 7);

beforeEach(() => resetWinds());

it("asks once, keeps it, and asks again elsewhere or when old", async () => {
  const list = memory();
  const ask = jest.fn(() => Promise.resolve({ kind: "ok" as const, value: WINDS }));
  expect(await refreshWinds(HERE, NOW, ask, list)).toBe("fetched");
  expect(windsNow(list)?.winds.source).toBe("icon-d2");
  expect(await refreshWinds([45.76, 10.85], NOW + 60_000, ask, list)).toBe("kept");
  expect(ask).toHaveBeenCalledTimes(1);
  expect(stillGood(windsNow(list), HERE, NOW + FRESH_MS)).toBe(false);
  expect(stillGood(windsNow(list), [46, 11], NOW)).toBe(false);
});

it("keeps what it had without an answer", async () => {
  const list = memory();
  await refreshWinds(
    HERE,
    NOW,
    () => Promise.resolve({ kind: "ok", value: WINDS }),
    list,
  );
  const later = NOW + FRESH_MS;
  expect(
    await refreshWinds(
      HERE,
      later,
      () => Promise.resolve({ kind: "unreachable", url: "http://api" }),
      list,
    ),
  ).toBe("failed");
  expect(await refreshWinds(HERE, later, () => null, list)).toBe("failed");
  expect(
    await refreshWinds(HERE, later, () => Promise.reject(new Error("off")), list),
  ).toBe("failed");
  expect(windsNow(list)?.winds).toEqual(WINDS);
});

describe("windOnMap", () => {
  const HEIGHTS = { 850: 1500, 700: 3000, 600: 4200, 500: 5600 };
  const kept = (hours: Winds["hours"]): KeptWinds => ({
    place: HERE,
    fetchedAtMs: NOW,
    winds: { ...WINDS, hours },
  });
  const at = (h: number) => new Date(Date.UTC(2026, 10, 26, h)).toISOString();
  const levels = [
    { hpa: 850, speed_ms: null, from_deg: null },
    { hpa: 700, speed_ms: 5, from_deg: 217 },
    { hpa: 600, speed_ms: 8, from_deg: 230 },
    { hpa: 500, speed_ms: 12, from_deg: 250 },
  ];

  it("takes the hour now and the level nearest the pilot", () => {
    const winds = kept([
      { time: at(6), winds: levels },
      { time: at(7), winds: levels.map((one) => ({ ...one, from_deg: 1 })) },
    ]);
    expect(windOnMap(winds, Date.UTC(2026, 10, 26, 7, 10), 4000, HEIGHTS)).toEqual({
      place: HERE,
      hpa: 600,
      fromDeg: 1,
      speedMs: 8,
    });
    // Low, but 850 hPa is under the ground: the nearest known level.
    expect(windOnMap(winds, Date.UTC(2026, 10, 26, 6, 10), 1400, HEIGHTS)?.hpa).toBe(
      700,
    );
  });

  it("is drawn by the pilot, and not at all far from the forecast's place", () => {
    const winds = kept([{ time: at(7), winds: levels }]);
    const nowMs = Date.UTC(2026, 10, 26, 7, 10);
    // About 5.6 km north: still the take-off's wind, beside the pilot.
    const near: [number, number] = [45.79, 10.84];
    expect(windOnMap(winds, nowMs, 3000, HEIGHTS, near)?.place).toEqual(near);
    // About 22 km north: another place's wind, not drawn.
    expect(windOnMap(winds, nowMs, 3000, HEIGHTS, [45.94, 10.84])).toBeNull();
    expect(WIND_NEAR_M).toBe(20_000);
  });

  it("has none without wind, or for hours long gone", () => {
    expect(windOnMap(null, NOW, 2000, HEIGHTS)).toBeNull();
    expect(
      windOnMap(kept([{ time: at(1), winds: levels }]), NOW, 2000, HEIGHTS),
    ).toBeNull();
  });
});
