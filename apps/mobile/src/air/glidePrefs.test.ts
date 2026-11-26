import type { KeptList } from "../storage/keptList";
import {
  DEFAULT_GLIDE,
  type GlidePrefs,
  glidePrefsNow,
  isGlidePrefs,
  loadGlidePrefs,
  resetGlidePrefs,
  setGlidePrefs,
} from "./glidePrefs";

function memory(): KeptList<GlidePrefs> & { items: GlidePrefs[] } {
  const list = {
    items: [] as GlidePrefs[],
    load: () => list.items,
    save: (items: GlidePrefs[]) => {
      list.items = items;
      return true;
    },
  };
  return list as unknown as KeptList<GlidePrefs> & { items: GlidePrefs[] };
}

beforeEach(() => resetGlidePrefs());

it("glides at L/D 8 with the estimated wind until the pilot chooses", () => {
  expect(loadGlidePrefs(memory())).toEqual(DEFAULT_GLIDE);
  expect(DEFAULT_GLIDE).toEqual({ ld: 8, wind: "estimated" });
});

it("keeps the pilot's choice and reads it back", () => {
  const list = memory();
  setGlidePrefs({ ld: 10, wind: "none" }, list);
  expect(glidePrefsNow()).toEqual({ ld: 10, wind: "none" });
  expect(loadGlidePrefs(list)).toEqual({ ld: 10, wind: "none" });
});

it("refuses what it does not offer", () => {
  expect(isGlidePrefs({ ld: 8, wind: "estimated" })).toBe(true);
  expect(isGlidePrefs({ ld: 20, wind: "estimated" })).toBe(false);
  expect(isGlidePrefs({ ld: 8, wind: "manual" })).toBe(false);
  expect(isGlidePrefs(null)).toBe(false);
});
