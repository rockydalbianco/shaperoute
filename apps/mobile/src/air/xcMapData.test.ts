import { xcFeatures } from "./xcMapData";
import type { XcScore } from "./xcScore";

const base = {
  closed: false,
  multiplier: 1,
  distanceKm: 10,
  points: 10,
  start: [45, 10] as [number, number],
  finish: [45.1, 10.1] as [number, number],
  turnpoints: [
    [45.01, 10.01],
    [45.02, 10.02],
    [45.03, 10.03],
  ] as [number, number][],
};

describe("xcFeatures", () => {
  it("draws free distance from start to finish through the turnpoints, lon first", () => {
    const score: XcScore = { ...base, kind: "free", closingKm: null };
    const { features } = xcFeatures(score);
    expect(features[0]).toEqual({
      type: "Feature",
      properties: { part: "leg" },
      geometry: {
        type: "LineString",
        coordinates: [
          [10, 45],
          [10.01, 45.01],
          [10.02, 45.02],
          [10.03, 45.03],
          [10.1, 45.1],
        ],
      },
    });
    expect(features.some((f) => f.properties.part === "gap")).toBe(false);
    expect(
      features.flatMap((f) =>
        f.properties.part === "turnpoint" ? [f.properties.label] : [],
      ),
    ).toEqual(["1", "2", "3"]);
  });

  it("draws a triangle's three sides and its gap from finish to start", () => {
    const score: XcScore = { ...base, kind: "fai", multiplier: 1.4, closingKm: 0.5 };
    const { features } = xcFeatures(score);
    expect(features[0].geometry.coordinates).toEqual([
      [10.01, 45.01],
      [10.02, 45.02],
      [10.03, 45.03],
      [10.01, 45.01],
    ]);
    expect(features[1]).toEqual({
      type: "Feature",
      properties: { part: "gap" },
      geometry: {
        type: "LineString",
        coordinates: [
          [10.1, 45.1],
          [10, 45],
        ],
      },
    });
    expect(features.filter((f) => f.geometry.type === "Point")).toHaveLength(5);
  });
});
