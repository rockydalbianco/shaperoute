/**
 * The editor of the flight screen (TASK-479 part B2): add, remove, move,
 * resize, a unit per widget, pages and profiles; never a widget off the
 * grid or over another.
 */
import {
  defaultFlightPrefs,
  MAX_PAGES,
  MAX_PROFILES,
  type Page,
  pageFits,
  pagesOf,
  PRESET_PAGES,
  profileName,
  profileOf,
} from "./flightLayout";
import {
  addPage,
  addProfile,
  addWidget,
  deleteProfile,
  duplicateProfile,
  freeSpot,
  moveWidget,
  removePage,
  removeWidget,
  resetProfile,
  resizeWidget,
  setWidgetUnit,
  unitsFor,
  withPage,
} from "./layoutEdit";

const TWO: Page = [
  { widget: "vario", col: 0, row: 0, w: 2, h: 1 },
  { widget: "altitude", col: 2, row: 0, w: 2, h: 1 },
];

describe("widgets on a page", () => {
  it("are added where they fit, two cells wide", () => {
    const page = addWidget(TWO, "clock");
    expect(page?.[2]).toEqual({ widget: "clock", col: 0, row: 1, w: 2, h: 1 });
    expect(pageFits(page!)).toBe(true);
  });

  it("are added one cell wide when only one is free, and not at all on a full page", () => {
    const full: Page = Array.from({ length: 6 }, (_, row) => ({
      widget: "clock" as const,
      col: 0,
      row,
      w: 4,
      h: 1,
    }));
    expect(addWidget(full, "vario")).toBeNull();
    const almost: Page = [
      ...full.slice(0, 5),
      { widget: "clock", col: 0, row: 5, w: 3, h: 1 },
    ];
    expect(addWidget(almost, "vario")?.[6]).toEqual({
      widget: "vario",
      col: 3,
      row: 5,
      w: 1,
      h: 1,
    });
    expect(freeSpot(full, 1, 1)).toBeNull();
  });

  it("are removed", () => {
    expect(removeWidget(TWO, 0)).toEqual([TWO[1]]);
  });

  it("move a cell onto free cells", () => {
    expect(moveWidget(TWO, 0, "down")?.[0]).toEqual({
      widget: "vario",
      col: 0,
      row: 1,
      w: 2,
      h: 1,
    });
    expect(moveWidget(TWO, 0, "up")).toBeNull();
    expect(moveWidget(TWO, 0, "left")).toBeNull();
  });

  it("change places with a widget of their size", () => {
    const swapped = moveWidget(TWO, 0, "right");
    expect(swapped).toEqual([
      { widget: "vario", col: 2, row: 0, w: 2, h: 1 },
      { widget: "altitude", col: 0, row: 0, w: 2, h: 1 },
    ]);
  });

  it("do not move onto a widget of another size", () => {
    const page: Page = [
      { widget: "vario", col: 0, row: 0, w: 2, h: 1 },
      { widget: "altitude", col: 2, row: 0, w: 1, h: 1 },
      { widget: "clock", col: 3, row: 0, w: 1, h: 1 },
    ];
    expect(moveWidget(page, 0, "right")).toBeNull();
  });

  it("go through the sizes that fit, moved left when they would leave the grid", () => {
    const one: Page = [{ widget: "vario", col: 3, row: 5, w: 1, h: 1 }];
    // 2×1 from column 3 goes to column 2; 2×2 has no room on the last row.
    expect(resizeWidget(one, 0)?.[0]).toEqual({
      widget: "vario",
      col: 2,
      row: 5,
      w: 2,
      h: 1,
    });
    const grown = resizeWidget(resizeWidget(one, 0)!, 0)!;
    expect(grown[0]).toEqual({ widget: "vario", col: 0, row: 5, w: 4, h: 1 });
    expect(pageFits(grown)).toBe(true);
  });

  it("keep their size when no other fits", () => {
    const tight: Page = [
      { widget: "vario", col: 0, row: 0, w: 1, h: 1 },
      { widget: "clock", col: 1, row: 0, w: 3, h: 6 },
      { widget: "altitude", col: 0, row: 1, w: 1, h: 5 },
    ];
    expect(resizeWidget(tight, 0)).toBeNull();
  });

  it("take a unit of their own kind, and give it back", () => {
    expect(unitsFor(TWO[0])).toEqual(["mps", "fpm", "kt"]);
    expect(unitsFor({ widget: "clock", col: 0, row: 0, w: 1, h: 1 })).toEqual([]);
    const kt = setWidgetUnit(TWO, 0, "kt");
    expect(kt[0].unit).toBe("kt");
    expect(setWidgetUnit(TWO, 0, "ft")).toBe(TWO);
    expect(setWidgetUnit(kt, 0, null)[0]).toEqual(TWO[0]);
  });
});

describe("pages", () => {
  it("are added up to the most, and the last one stays", () => {
    let pages: Page[] = [TWO];
    for (let i = 1; i < MAX_PAGES; i += 1) {
      pages = addPage(pages)!;
    }
    expect(pages).toHaveLength(MAX_PAGES);
    expect(addPage(pages)).toBeNull();
    expect(removePage([TWO], 0)).toEqual([TWO]);
    expect(removePage([TWO, []], 0)).toEqual([[]]);
  });

  it("are changed in the profile on screen only", () => {
    const prefs = { ...defaultFlightPrefs("km"), current: 1 };
    const next = withPage(prefs, 0, TWO);
    expect(pagesOf(next)[0]).toEqual(TWO);
    expect(next.profiles[0]).toBe(prefs.profiles[0]);
  });
});

describe("profiles", () => {
  it("are duplicated with the next number, the copy on screen", () => {
    const prefs = { ...defaultFlightPrefs("km"), current: 1 };
    const twice = duplicateProfile(duplicateProfile(prefs)!)!;
    expect(twice.profiles.map(profileName)).toEqual([
      "Thermal",
      "XC",
      "Minimal",
      "XC 2",
      "XC 3",
    ]);
    expect(twice.current).toBe(4);
  });

  it("stop at the most", () => {
    let prefs = defaultFlightPrefs("km");
    while (prefs.profiles.length < MAX_PROFILES) {
      prefs = duplicateProfile(prefs)!;
    }
    expect(duplicateProfile(prefs)).toBeNull();
    expect(addProfile(prefs, profileOf("xc"))).toBeNull();
  });

  it("go back to their preset", () => {
    const changed = withPage(defaultFlightPrefs("km"), 0, TWO);
    expect(pagesOf(resetProfile(changed))).toEqual(PRESET_PAGES.thermal);
  });

  it("are deleted, the one before on screen, the last one stays", () => {
    const prefs = { ...defaultFlightPrefs("km"), current: 2 };
    const fewer = deleteProfile(prefs);
    expect(fewer.profiles.map(profileName)).toEqual(["Thermal", "XC"]);
    expect(fewer.current).toBe(1);
    const one = deleteProfile(deleteProfile(fewer));
    expect(one.profiles).toHaveLength(1);
    expect(deleteProfile(one)).toBe(one);
  });

  it("from a file come with a number of their own", () => {
    const added = addProfile(defaultFlightPrefs("km"), profileOf("thermal"))!;
    expect(profileName(added.profiles[added.current])).toBe("Thermal 2");
  });
});
