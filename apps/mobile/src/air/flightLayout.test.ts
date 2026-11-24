/**
 * The flight screen's layout (TASK-479 parts B1 and B2): the presets'
 * pages fit the grid, the pilot's profiles are kept and read back, and
 * what B1 kept becomes B2's profiles.
 */
import type { KeptList } from "../storage/keptList";
import {
  defaultFlightPrefs,
  type FlightPrefs,
  isCell,
  isFlightPrefs,
  isProfile,
  loadFlightPrefs,
  pageFits,
  pagesOf,
  profileName,
  profileOf,
  PRESET_PAGES,
  PRESETS,
  saveFlightPrefs,
  upgradeFlightPrefs,
  WIDGET_NAME,
} from "./flightLayout";

function memory(): KeptList<unknown> & { items: unknown[] } {
  const list = {
    items: [] as unknown[],
    load: () => list.items,
    save: (items: unknown[]) => {
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

describe("cells", () => {
  it("take a unit only of their own kind", () => {
    expect(isCell({ widget: "vario", col: 0, row: 0, w: 1, h: 1, unit: "kt" })).toBe(
      true,
    );
    expect(isCell({ widget: "vario", col: 0, row: 0, w: 1, h: 1, unit: "ft" })).toBe(
      false,
    );
    expect(isCell({ widget: "clock", col: 0, row: 0, w: 1, h: 1, unit: "m" })).toBe(
      false,
    );
    expect(isCell({ widget: "radar", col: 0, row: 0, w: 1, h: 1 })).toBe(false);
  });
});

describe("prefs", () => {
  it("start with a profile per preset, «Thermal» on screen, dark, in the app's units", () => {
    const prefs = loadFlightPrefs("km", memory());
    expect(prefs.profiles.map(profileName)).toEqual([
      "Thermal",
      "XC",
      "Minimal",
      "Competition",
    ]);
    expect(prefs.current).toBe(0);
    expect(pagesOf(prefs)).toEqual(PRESET_PAGES.thermal);
    expect(prefs.look).toBe("dark");
    expect(prefs.units).toEqual({ altitude: "m", vario: "mps", speed: "kmh" });
  });

  it("are kept and read back", () => {
    const list = memory();
    const prefs: FlightPrefs = { ...defaultFlightPrefs("mi"), current: 1, look: "sun" };
    expect(saveFlightPrefs(prefs, list)).toBe(true);
    expect(loadFlightPrefs("km", list)).toEqual(prefs);
  });

  it("from what part B1 kept: its preset on screen", () => {
    const list = memory();
    list.items = [{ preset: "xc", look: "sun", units: defaultFlightPrefs("mi").units }];
    const prefs = loadFlightPrefs("km", list);
    expect(profileName(prefs.profiles[prefs.current])).toBe("XC");
    expect(prefs.look).toBe("sun");
    expect(prefs.units).toEqual(defaultFlightPrefs("mi").units);
  });

  it("are left out when not whole", () => {
    const whole = defaultFlightPrefs("km");
    expect(isFlightPrefs({ ...whole, current: 4 })).toBe(false);
    expect(isFlightPrefs({ ...whole, profiles: [] })).toBe(false);
    expect(
      upgradeFlightPrefs({ preset: "race", look: "dark", units: whole.units }),
    ).toBeNull();
    // Two widgets on one another.
    const broken = profileOf("minimal");
    broken.pages = [
      [...broken.pages[0], { widget: "clock", col: 0, row: 0, w: 1, h: 1 }],
    ];
    expect(isProfile(broken)).toBe(false);
  });

  it("name a second copy with its number", () => {
    expect(profileName(profileOf("xc", 2))).toBe("XC 2");
  });
});

describe("«Competition» (part D2)", () => {
  it("is added once to the profiles kept before it", () => {
    const list = memory();
    const before = defaultFlightPrefs("km");
    const old = {
      ...before,
      profiles: before.profiles.filter((one) => one.from !== "competition"),
    };
    delete (old as { competitionAdded?: true }).competitionAdded;
    list.items = [old];
    const prefs = loadFlightPrefs("km", list);
    expect(prefs.profiles.map(profileName)).toEqual([
      "Thermal",
      "XC",
      "Minimal",
      "Competition",
    ]);
    // Deleted by the pilot, it stays deleted.
    const without = { ...prefs, profiles: prefs.profiles.slice(0, 3) };
    expect(saveFlightPrefs(without, list)).toBe(true);
    expect(loadFlightPrefs("km", list).profiles).toHaveLength(3);
  });

  it("has the task's widgets and fits", () => {
    const widgets = PRESET_PAGES.competition.flat().map((cell) => cell.widget);
    expect(widgets).toEqual(
      expect.arrayContaining([
        "nextTurnpoint",
        "glideToGoal",
        "startGate",
        "taskDistance",
      ]),
    );
  });
});
