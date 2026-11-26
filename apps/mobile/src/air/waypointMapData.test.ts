import { waypointFeatures } from "./waypointMapData";
import type { Waypoint } from "./waypoints";

const one = (name: string, lat: number, landing: boolean): Waypoint => ({
  name,
  code: null,
  point: [lat, 11],
  altM: null,
  landing,
  description: null,
});

it("puts the file's waypoints and the pilot's own on the map, longitude first", () => {
  const map = waypointFeatures([one("TEST HILL", 46, false)], [one("L01", 46.1, true)]);
  expect(map.features).toEqual([
    {
      type: "Feature",
      properties: { name: "TEST HILL", landing: false, manual: false },
      geometry: { type: "Point", coordinates: [11, 46] },
    },
    {
      type: "Feature",
      properties: { name: "L01", landing: true, manual: true },
      geometry: { type: "Point", coordinates: [11, 46.1] },
    },
  ]);
});
