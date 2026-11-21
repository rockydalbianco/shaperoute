import {
  type Cell,
  type FlightPrefs,
  GRID_COLUMNS,
  GRID_ROWS,
  MAX_PAGES,
  MAX_PROFILES,
  type Page,
  pageFits,
  PRESET_PAGES,
  type PresetId,
  type Profile,
  type UnitChoice,
  UNITS_OF_KIND,
  WIDGET_UNIT_KIND,
  type WidgetId,
} from "./flightLayout";

/**
 * The editor of the flight screen (TASK-479 part B2, ADR-0388): what a
 * long press on a widget does, as pure steps on pages and profiles. Every
 * step gives a new value, or null when the grid has no room for it: a
 * page never ends up with a widget off the grid or over another.
 */

/** The sizes a widget takes, in the order «Size» goes through them. */
export const SIZES: readonly { w: number; h: number }[] = [
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 2, h: 2 },
  { w: 4, h: 1 },
  { w: 4, h: 2 },
  { w: 4, h: 3 },
];

export type Direction = "up" | "down" | "left" | "right";

const STEP: Readonly<Record<Direction, { dc: number; dr: number }>> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

function replaced(page: Page, index: number, next: Cell): Page {
  return page.map((one, i) => (i === index ? next : one));
}

/** The first place, row by row, where a `w` × `h` widget fits on `page`. */
export function freeSpot(
  page: Page,
  w: number,
  h: number,
): { col: number; row: number } | null {
  for (let row = 0; row + h <= GRID_ROWS; row += 1) {
    for (let col = 0; col + w <= GRID_COLUMNS; col += 1) {
      if (pageFits([...page, { widget: "clock", col, row, w, h }])) {
        return { col, row };
      }
    }
  }
  return null;
}

/** `widget` added where it fits, two cells wide if it can, one if not. */
export function addWidget(page: Page, widget: WidgetId): Page | null {
  for (const size of [SIZES[1], SIZES[0]]) {
    const spot = freeSpot(page, size.w, size.h);
    if (spot !== null) {
      return [...page, { widget, ...spot, ...size }];
    }
  }
  return null;
}

export function removeWidget(page: Page, index: number): Page {
  return page.filter((_, i) => i !== index);
}

/**
 * The widget at `index` one cell towards `direction`. Onto another widget
 * of its own size, the two change places; otherwise the step must land on
 * free cells.
 */
export function moveWidget(
  page: Page,
  index: number,
  direction: Direction,
): Page | null {
  const one = page[index];
  const { dc, dr } = STEP[direction];
  const moved = { ...one, col: one.col + dc, row: one.row + dr };
  const others = removeWidget(page, index);
  if (pageFits([...others, moved])) {
    return replaced(page, index, moved);
  }
  // A swap: by its own size, so the other lands where this one was.
  const step = direction === "up" || direction === "down" ? one.h : one.w;
  const jumped = { ...one, col: one.col + dc * step, row: one.row + dr * step };
  const other = page.findIndex(
    (cell, i) =>
      i !== index &&
      cell.col === jumped.col &&
      cell.row === jumped.row &&
      cell.w === one.w &&
      cell.h === one.h,
  );
  if (other === -1) {
    return null;
  }
  const swapped = page.map((cell, i) =>
    i === index ? jumped : i === other ? { ...cell, col: one.col, row: one.row } : cell,
  );
  return pageFits(swapped) ? swapped : null;
}

/** The widget at `index` in the next size of SIZES that fits, from its
 * corner (moved left if it would leave the grid); null when none fits. */
export function resizeWidget(page: Page, index: number): Page | null {
  const one = page[index];
  const at = SIZES.findIndex((size) => size.w === one.w && size.h === one.h);
  const others = removeWidget(page, index);
  for (let k = 1; k <= SIZES.length; k += 1) {
    const size = SIZES[(Math.max(0, at) + k) % SIZES.length];
    if (size.w === one.w && size.h === one.h) {
      continue;
    }
    const col = Math.min(one.col, GRID_COLUMNS - size.w);
    const next = { ...one, ...size, col };
    if (pageFits([...others, next])) {
      return replaced(page, index, next);
    }
  }
  return null;
}

/** The units the widget at `index` may show: none for one without. */
export function unitsFor(cell: Cell): readonly UnitChoice[] {
  const kind = WIDGET_UNIT_KIND[cell.widget];
  return kind === undefined ? [] : UNITS_OF_KIND[kind];
}

/** The widget at `index` in `unit`, or back to the profile's with null. */
export function setWidgetUnit(
  page: Page,
  index: number,
  unit: UnitChoice | null,
): Page {
  const one = page[index];
  if (unit === null) {
    const { unit: _left, ...rest } = one;
    return replaced(page, index, rest);
  }
  return unitsFor(one).includes(unit) ? replaced(page, index, { ...one, unit }) : page;
}

/** A page added at the end, empty; null past MAX_PAGES. */
export function addPage(pages: readonly Page[]): Page[] | null {
  return pages.length >= MAX_PAGES ? null : [...pages, []];
}

/** The page at `index` taken away; the last one stays. */
export function removePage(pages: readonly Page[], index: number): Page[] {
  return pages.length <= 1 ? [...pages] : pages.filter((_, i) => i !== index);
}

/** `prefs` with the page `pageIndex` of the profile on screen as `page`. */
export function withPage(
  prefs: FlightPrefs,
  pageIndex: number,
  page: Page,
): FlightPrefs {
  return withPages(
    prefs,
    prefs.profiles[prefs.current].pages.map((one, i) => (i === pageIndex ? page : one)),
  );
}

export function withPages(prefs: FlightPrefs, pages: Page[]): FlightPrefs {
  return {
    ...prefs,
    profiles: prefs.profiles.map((profile, i) =>
      i === prefs.current ? { ...profile, pages } : profile,
    ),
  };
}

/** The next free copy number of `preset` among `profiles`. */
function nextCopy(profiles: readonly Profile[], preset: PresetId): number {
  return (
    profiles
      .filter((one) => one.from === preset)
      .reduce((most, one) => Math.max(most, one.copy), 0) + 1
  );
}

/** A copy of the profile on screen, put on screen; null past MAX_PROFILES. */
export function duplicateProfile(prefs: FlightPrefs): FlightPrefs | null {
  if (prefs.profiles.length >= MAX_PROFILES) {
    return null;
  }
  const from = prefs.profiles[prefs.current];
  const copy: Profile = {
    from: from.from,
    copy: nextCopy(prefs.profiles, from.from),
    pages: from.pages.map((page) => [...page]),
  };
  return {
    ...prefs,
    profiles: [...prefs.profiles, copy],
    current: prefs.profiles.length,
  };
}

/** The profile on screen back to its preset's pages. */
export function resetProfile(prefs: FlightPrefs): FlightPrefs {
  const profile = prefs.profiles[prefs.current];
  return withPages(
    prefs,
    PRESET_PAGES[profile.from].map((page) => [...page]),
  );
}

/** The profile on screen taken away, the one before it on screen; the
 * last one stays. */
export function deleteProfile(prefs: FlightPrefs): FlightPrefs {
  if (prefs.profiles.length <= 1) {
    return prefs;
  }
  return {
    ...prefs,
    profiles: prefs.profiles.filter((_, i) => i !== prefs.current),
    current: Math.max(0, prefs.current - 1),
  };
}

/** A profile from elsewhere (a file) added and put on screen, with a copy
 * number of its own; null past MAX_PROFILES. */
export function addProfile(prefs: FlightPrefs, profile: Profile): FlightPrefs | null {
  if (prefs.profiles.length >= MAX_PROFILES) {
    return null;
  }
  const added = { ...profile, copy: nextCopy(prefs.profiles, profile.from) };
  return {
    ...prefs,
    profiles: [...prefs.profiles, added],
    current: prefs.profiles.length,
  };
}
