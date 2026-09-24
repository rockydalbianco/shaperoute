import { color } from "../theme/tokens";

import { ATTRIBUTION, GLYPHS_URL, sgravaDarkStyle, TILE_SOURCE_URL } from "./mapStyle";

/**
 * These tests catch the mistakes that make a MapLibre style fail *silently*:
 * a vector layer without `source-layer`, a layer pointing at a source that is
 * not declared, a duplicate id. None of them throws — the map just comes up
 * missing a layer, which is easy to miss on a phone.
 *
 * What they cannot check is whether the tiles and glyphs actually answer: that
 * needs the network and a real map. See `docs/tasks/TASK-046.md`.
 */

const vectorLayers = sgravaDarkStyle.layers.filter(
  (layer) => layer.type !== "background",
);

describe("sgravaDarkStyle", () => {
  it("is a version 8 style with one declared source", () => {
    expect(sgravaDarkStyle.version).toBe(8);
    expect(Object.keys(sgravaDarkStyle.sources)).toEqual(["openmaptiles"]);
    expect(sgravaDarkStyle.sources.openmaptiles.url).toBe(TILE_SOURCE_URL);
    expect(sgravaDarkStyle.glyphs).toBe(GLYPHS_URL);
  });

  it("keeps the OpenStreetMap attribution, which the licence requires", () => {
    expect(sgravaDarkStyle.sources.openmaptiles.attribution).toBe(ATTRIBUTION);
    expect(ATTRIBUTION).toContain("openstreetmap.org/copyright");
  });

  it("gives every data layer a source and a source-layer", () => {
    for (const layer of vectorLayers) {
      expect(layer).toHaveProperty("source", "openmaptiles");
      expect(typeof (layer as { "source-layer"?: unknown })["source-layer"]).toBe(
        "string",
      );
    }
  });

  it("has no duplicate layer ids", () => {
    const ids = sgravaDarkStyle.layers.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws bigger roads after smaller ones, so they sit on top", () => {
    const ids = sgravaDarkStyle.layers.map((layer) => layer.id);
    expect(ids.indexOf("road-faint")).toBeLessThan(ids.indexOf("road-minor"));
    expect(ids.indexOf("road-minor")).toBeLessThan(ids.indexOf("road-medium"));
    expect(ids.indexOf("road-medium")).toBeLessThan(ids.indexOf("road-major"));
  });

  it("takes every colour from the tokens, so the map cannot drift", () => {
    const known = new Set<string>(Object.values(color.map));
    const used = JSON.stringify(sgravaDarkStyle).match(/#[0-9A-Fa-f]{6}/g) ?? [];
    expect(used.length).toBeGreaterThan(0);
    for (const hex of used) {
      expect(known.has(hex)).toBe(true);
    }
  });

  it("never paints anything in the brand yellow: that is the route's alone", () => {
    expect(JSON.stringify(sgravaDarkStyle)).not.toContain(color.accent);
  });
});
