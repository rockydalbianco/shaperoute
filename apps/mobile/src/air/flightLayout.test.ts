/**
 * The flight screen's layout (TASK-479 part B1): the presets' pages fit
 * the grid, the pilot's choices are kept and read back.
 */
import type { KeptList } from "../storage/keptList";
import {
  defaultFlightPrefs,
  type FlightPrefs,
  isFlightPrefs,
  loadFlightPrefs,
  pageFits,
  PRESET_PAGES,
  PRESETS,
  saveFlightPrefs,
  WIDGET_NAME,
} from "./flightLayout";

function memory(): KeptList<FlightPrefs> & { items: FlightPrefs[] } {
  const list = {
    items: [] as FlightPrefs[],
    load: () => list.items.filter(isFlightPrefs),
    save: (items: FlightPrefs[]) => {
      list.items = items;
      return true;
    },
  };
  return list;
}

describe("presets", () => {
  it.each(PRESETS)("«%s» fits the grid, page by page", (preset) => {
    for (const page of PRESET_PAGES[preset]) {
      expect(pageFits(page)).toBe(true);
    }
  });

  it("uses only widgets with a name", () => {
    for (const preset of PRESETS) {
      for (const page of PRESET_PAGES[preset]) {
        for (const cell of page) {
          expect(WIDGET_NAME[cell.widget]).toBeTruthy();
        }
      }
    }
  });
});

describe("pageFits", () => {
  it("refuses a cell off the grid", () => {
    expect(pageFits([{ widget: "vario", col: 3, row: 0, w: 2, h: 1 }])).toBe(false);
    expect(pageFits([{ widget: "vario", col: 0, row: 5, w: 1, h: 2 }])).toBe(false);
  });

  it("refuses two cells on one another", () => {
    expect(
      pageFits([
        { widget: "vario", col: 0, row: 0, w: 2, h: 2 },
        { widget: "altitude", col: 1, row: 1, w: 1, h: 1 },
      ]),
    ).toBe(false);
  });
});

describe("prefs", () => {
  it("start as «Thermal», dark, in the app's units", () => {
    expect(loadFlightPrefs("km", memory())).toEqual({
      preset: "thermal",
      look: "dark",
      units: { altitude: "m", vario: "mps", speed: "kmh" },
    });
  });

  it("are kept and read back", () => {
    const list = memory();
    const prefs: FlightPrefs = { ...defaultFlightPrefs("mi"), preset: "xc", look: "sun" };
    expect(saveFlightPrefs(prefs, list)).toBe(true);
    expect(loadFlightPrefs("km", list)).toEqual(prefs);
  });

  it("are left out when not whole", () => {
    expect(isFlightPrefs({ preset: "race", look: "dark", units: defaultFlightPrefs("km").units })).toBe(
      false,
    );
  });
});
