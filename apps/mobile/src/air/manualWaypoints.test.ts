import type { KeptList } from "../storage/keptList";
import {
  addManualWaypoint,
  MAX_MANUAL,
  manualWaypointsNow,
  nextName,
  removeManualWaypoints,
  resetManualWaypoints,
} from "./manualWaypoints";
import type { Waypoint } from "./waypoints";

function memory(): KeptList<Waypoint> & { items: Waypoint[] } {
  const list = {
    items: [] as Waypoint[],
    load: () => list.items,
    save: (items: Waypoint[]) => {
      list.items = items;
      return true;
    },
  };
  return list as unknown as KeptList<Waypoint> & { items: Waypoint[] };
}

beforeEach(() => resetManualWaypoints());

it("names waypoints W01, W02… and landings L01… apart", () => {
  const list = memory();
  addManualWaypoint([46, 11], false, list);
  addManualWaypoint([46.1, 11], true, list);
  addManualWaypoint([46.2, 11], false, list);
  expect(manualWaypointsNow(list).map((one) => [one.name, one.landing])).toEqual([
    ["W01", false],
    ["L01", true],
    ["W02", false],
  ]);
  // No height: the map gives none.
  expect(manualWaypointsNow(list)[0].altM).toBeNull();
  expect(list.items).toHaveLength(3);
});

it("goes on from the highest number kept", () => {
  const one = (name: string): Waypoint => ({
    name,
    code: null,
    point: [46, 11],
    altM: null,
    landing: false,
    description: null,
  });
  expect(nextName([one("W01"), one("W07"), one("TAKEOFF")], false)).toBe("W08");
  expect(nextName([], true)).toBe("L01");
});

it("keeps the newest when too many", () => {
  const list = memory();
  for (let i = 0; i < MAX_MANUAL + 3; i += 1) {
    addManualWaypoint([46 + i / 1000, 11], false, list);
  }
  expect(manualWaypointsNow(list)).toHaveLength(MAX_MANUAL);
  expect(manualWaypointsNow(list)[0].name).toBe("W04");
});

it("removes them all", () => {
  const list = memory();
  addManualWaypoint([46, 11], false, list);
  removeManualWaypoints(list);
  expect(manualWaypointsNow(list)).toEqual([]);
});
