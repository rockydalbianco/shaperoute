import { t, tLater } from "../i18n";
import { type KeptList, keptList } from "../storage/keptList";
import type { Units } from "../units/units";
import {
  ALTITUDE_UNITS,
  type AltitudeUnit,
  defaultFlightUnits,
  type FlightUnits,
  isFlightUnits,
  SPEED_UNITS,
  type SpeedUnit,
  VARIO_UNITS,
  type VarioUnit,
} from "./flightUnits";

/**
 * The flight screen's layout (TASK-479 part B1, ADR-0388): pages of
 * widgets on a grid, the presets the user approved on 2026-11-21, and the
 * pilot's choices kept on the phone, never on the server. Part B1 has the
 * widgets of the numbers; the map (A1), the airspace (E), the turnpoints
 * and the task (D) come with their parts, and with them the «Map» and
 * «Competition» presets. Part B2 (the editor) turns the presets into the
 * pilot's profiles: copies of a preset, changed widget by widget.
 */

/** The grid of a page, upright. */
export const GRID_COLUMNS = 4;
export const GRID_ROWS = 6;

export type WidgetId =
  | "altitude"
  | "aboveTakeoff"
  | "vario"
  | "varioAvg"
  | "thermalAvg"
  | "thermalGain"
  | "groundSpeed"
  | "track"
  | "glide"
  | "wind"
  | "thermalAssistant"
  | "takeoff"
  | "flightTime"
  | "clock"
  | "gpsAccuracy"
  | "live"
  | "altitudeChart"
  // Part A1.
  | "aboveGround"
  | "map"
  // Part E2.
  | "nearestAirspace"
  // Part D2.
  | "nextTurnpoint"
  | "glideToGoal"
  | "startGate"
  | "taskDistance"
  // Part D3.
  | "glideToTurnpoint"
  | "nearestLanding";

/** Each widget's name on screen, in the user's words of 2026-11-21. */
export const WIDGET_NAME: Readonly<Record<WidgetId, string>> = {
  altitude: tLater("GPS altitude"),
  aboveTakeoff: tLater("Above takeoff"),
  vario: tLater("Vario"),
  varioAvg: tLater("Average vario"),
  thermalAvg: tLater("Thermal average"),
  thermalGain: tLater("Thermal gain"),
  groundSpeed: tLater("Ground speed"),
  track: tLater("Track"),
  glide: tLater("Glide ratio"),
  wind: tLater("Wind"),
  thermalAssistant: tLater("Thermal assistant"),
  takeoff: tLater("Takeoff"),
  flightTime: tLater("Flight time"),
  clock: tLater("Clock"),
  gpsAccuracy: tLater("GPS accuracy"),
  live: tLater("Live"),
  altitudeChart: tLater("Last 10 min"),
  aboveGround: tLater("Height above ground"),
  map: tLater("Map"),
  nearestAirspace: tLater("Nearest airspace"),
  nextTurnpoint: tLater("Next turnpoint"),
  glideToGoal: tLater("Glide to goal"),
  startGate: tLater("Start gate"),
  taskDistance: tLater("Task distance"),
  glideToTurnpoint: tLater("Glide to turnpoint"),
  nearestLanding: tLater("Nearest landing"),
};

export const WIDGETS: readonly WidgetId[] = Object.keys(WIDGET_NAME) as WidgetId[];

/** A unit a widget may show its number in. */
export type UnitChoice = AltitudeUnit | VarioUnit | SpeedUnit;
export type UnitKind = "altitude" | "vario" | "speed";

/** The widgets whose number has a unit the pilot may choose, one by one
 * (part B2); the others have none, or the app's distance unit. */
export const WIDGET_UNIT_KIND: Readonly<Partial<Record<WidgetId, UnitKind>>> = {
  altitude: "altitude",
  aboveTakeoff: "altitude",
  aboveGround: "altitude",
  thermalGain: "altitude",
  altitudeChart: "altitude",
  glideToGoal: "altitude",
  glideToTurnpoint: "altitude",
  vario: "vario",
  varioAvg: "vario",
  thermalAvg: "vario",
  groundSpeed: "speed",
  wind: "speed",
};

export const UNITS_OF_KIND: Readonly<Record<UnitKind, readonly UnitChoice[]>> = {
  altitude: ALTITUDE_UNITS,
  vario: VARIO_UNITS,
  speed: SPEED_UNITS,
};

/** A widget on a page: its corner and its size in grid cells; `unit` when
 * the pilot chose one for this widget alone, else the profile's. */
export type Cell = {
  widget: WidgetId;
  col: number;
  row: number;
  w: number;
  h: number;
  unit?: UnitChoice;
};

export type Page = readonly Cell[];

export type PresetId = "thermal" | "xc" | "competition" | "minimal";

export const PRESET_NAME: Readonly<Record<PresetId, string>> = {
  thermal: tLater("Thermal"),
  xc: tLater("XC"),
  competition: tLater("Competition"),
  minimal: tLater("Minimal"),
};

/** «Competition» last: part D2 brought it, after the others. */
export const PRESETS: readonly PresetId[] = ["thermal", "xc", "minimal", "competition"];

const cell = (widget: WidgetId, col: number, row: number, w = 2, h = 1): Cell => ({
  widget,
  col,
  row,
  w,
  h,
});

/**
 * The presets' pages. Where an approved widget is not here yet, its part
 * brings it: «XC» has «Track» and «Flight time» until the XC distance (F)
 * and the nearest landing (D). Part A1 brought the height above the ground
 * and the map: on «Thermal»'s second page and on a third page of «XC».
 */
export const PRESET_PAGES: Readonly<Record<PresetId, readonly Page[]>> = {
  thermal: [
    [
      cell("vario", 0, 0, 4, 2),
      cell("thermalAssistant", 0, 2, 4, 2),
      cell("varioAvg", 0, 4),
      cell("thermalGain", 2, 4),
      cell("altitude", 0, 5),
      cell("aboveGround", 2, 5),
    ],
    [
      cell("map", 0, 0, 4, 4),
      cell("wind", 0, 4, 2, 2),
      cell("flightTime", 2, 4),
      cell("aboveTakeoff", 2, 5),
    ],
  ],
  xc: [
    [
      cell("altitude", 0, 0, 2, 2),
      cell("varioAvg", 2, 0, 2, 2),
      cell("groundSpeed", 0, 2),
      cell("glide", 2, 2),
      cell("wind", 0, 3, 2, 2),
      cell("takeoff", 2, 3, 2, 2),
      // Part D3: the nearest landing where «Track» stood.
      cell("nearestLanding", 0, 5),
      cell("flightTime", 2, 5),
    ],
    [
      cell("altitudeChart", 0, 0, 4, 3),
      cell("thermalAvg", 0, 3),
      cell("thermalGain", 2, 3),
      cell("gpsAccuracy", 0, 4),
      cell("clock", 2, 4),
      cell("live", 0, 5, 4, 1),
    ],
    [
      cell("map", 0, 0, 4, 4),
      cell("altitude", 0, 4),
      cell("varioAvg", 2, 4),
      cell("aboveGround", 0, 5),
      cell("groundSpeed", 2, 5),
    ],
  ],
  // Parts D2 and D3: the task and its glide.
  competition: [
    [
      cell("nextTurnpoint", 0, 0, 4, 2),
      cell("glideToTurnpoint", 0, 2),
      cell("glideToGoal", 2, 2),
      cell("taskDistance", 0, 3),
      cell("startGate", 2, 3),
      cell("varioAvg", 0, 4, 2, 2),
      cell("altitude", 2, 4, 2, 2),
    ],
    [cell("map", 0, 0, 4, 5), cell("nearestAirspace", 0, 5, 4, 1)],
  ],
  minimal: [
    [
      cell("vario", 0, 0, 4, 2),
      cell("altitude", 0, 2, 4, 2),
      cell("flightTime", 0, 4, 4, 2),
    ],
  ],
};

/** Whether every cell of `page` is on the grid and none overlaps
 * another. */
export function pageFits(page: Page): boolean {
  const taken = new Set<string>();
  for (const one of page) {
    if (
      one.w < 1 ||
      one.h < 1 ||
      one.col < 0 ||
      one.row < 0 ||
      one.col + one.w > GRID_COLUMNS ||
      one.row + one.h > GRID_ROWS
    ) {
      return false;
    }
    for (let c = one.col; c < one.col + one.w; c += 1) {
      for (let r = one.row; r < one.row + one.h; r += 1) {
        const key = `${c},${r}`;
        if (taken.has(key)) {
          return false;
        }
        taken.add(key);
      }
    }
  }
  return true;
}

/** Whether `value` is a cell a page can hold. */
export function isCell(value: unknown): value is Cell {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  const whole = (n: unknown) => typeof n === "number" && Number.isInteger(n);
  if (
    !WIDGETS.includes(one.widget as WidgetId) ||
    !whole(one.col) ||
    !whole(one.row) ||
    !whole(one.w) ||
    !whole(one.h)
  ) {
    return false;
  }
  if (one.unit === undefined) {
    return true;
  }
  const kind = WIDGET_UNIT_KIND[one.widget as WidgetId];
  return kind !== undefined && UNITS_OF_KIND[kind].includes(one.unit as UnitChoice);
}

export function isPage(value: unknown): value is Page {
  return Array.isArray(value) && value.every(isCell) && pageFits(value);
}

/** At most this many pages in a profile, and this many profiles. */
export const MAX_PAGES = 5;
export const MAX_PROFILES = 8;

/** The pilot's own layout: a preset's copy, changed or not. `copy` tells
 * two copies of one preset apart («XC», «XC 2»). */
export type Profile = { from: PresetId; copy: number; pages: Page[] };

export function profileOf(preset: PresetId, copy = 1): Profile {
  return { from: preset, copy, pages: PRESET_PAGES[preset].map((page) => [...page]) };
}

export function isProfile(value: unknown): value is Profile {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  return (
    PRESETS.includes(one.from as PresetId) &&
    typeof one.copy === "number" &&
    Number.isInteger(one.copy) &&
    one.copy >= 1 &&
    Array.isArray(one.pages) &&
    one.pages.length >= 1 &&
    one.pages.length <= MAX_PAGES &&
    one.pages.every(isPage)
  );
}

/** «XC», «XC 2»: in the words of the app's language. */
export function profileName(profile: Profile): string {
  const name = t(PRESET_NAME[profile.from]);
  return profile.copy > 1 ? `${name} ${profile.copy}` : name;
}

/** The look of the flight screen: dark, or bright for the sun. */
export type FlightLook = "dark" | "sun";

export type FlightPrefs = {
  profiles: Profile[];
  /** The profile on screen, an index in `profiles`. */
  current: number;
  look: FlightLook;
  units: FlightUnits;
  /** «Competition» was put among the pilot's profiles (part D2), once:
   * one they delete stays deleted. */
  competitionAdded?: true;
};

export function defaultFlightPrefs(units: Units): FlightPrefs {
  return {
    profiles: PRESETS.map((preset) => profileOf(preset)),
    current: 0,
    look: "dark",
    units: defaultFlightUnits(units),
    competitionAdded: true,
  };
}

/** The pilot's profiles with «Competition» at the end, once, where there
 * is room (part D2). */
export function withCompetition(prefs: FlightPrefs): FlightPrefs {
  if (prefs.competitionAdded === true) {
    return prefs;
  }
  const has = prefs.profiles.some((profile) => profile.from === "competition");
  const room = prefs.profiles.length < MAX_PROFILES;
  return {
    ...prefs,
    profiles:
      has || !room ? prefs.profiles : [...prefs.profiles, profileOf("competition")],
    competitionAdded: true,
  };
}

function isLook(value: unknown): value is FlightLook {
  return value === "dark" || value === "sun";
}

export function isFlightPrefs(value: unknown): value is FlightPrefs {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prefs = value as Record<string, unknown>;
  return (
    Array.isArray(prefs.profiles) &&
    prefs.profiles.length >= 1 &&
    prefs.profiles.length <= MAX_PROFILES &&
    prefs.profiles.every(isProfile) &&
    typeof prefs.current === "number" &&
    Number.isInteger(prefs.current) &&
    prefs.current >= 0 &&
    prefs.current < prefs.profiles.length &&
    isLook(prefs.look) &&
    isFlightUnits(prefs.units)
  );
}

/** What part B1 kept: a preset, a look, the units. */
type KeptB1 = { preset: PresetId; look: FlightLook; units: FlightUnits };

function isKeptB1(value: unknown): value is KeptB1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prefs = value as Record<string, unknown>;
  return (
    PRESETS.includes(prefs.preset as PresetId) &&
    isLook(prefs.look) &&
    isFlightUnits(prefs.units)
  );
}

/** The prefs of B2 from what was kept: as they are, or B1's with its
 * preset on screen; null when neither. */
export function upgradeFlightPrefs(value: unknown): FlightPrefs | null {
  if (isFlightPrefs(value)) {
    return withCompetition(value);
  }
  if (isKeptB1(value)) {
    return {
      profiles: PRESETS.map((preset) => profileOf(preset)),
      current: PRESETS.indexOf(value.preset),
      look: value.look,
      units: value.units,
      competitionAdded: true,
    };
  }
  return null;
}

/** The pages of the profile on screen. */
export function pagesOf(prefs: FlightPrefs): readonly Page[] {
  return prefs.profiles[prefs.current].pages;
}

export const FLIGHT_SCREEN_FILE = "flight-screen.json";

const isKept = (value: unknown): value is unknown => upgradeFlightPrefs(value) !== null;

const kept: KeptList<unknown> = keptList(FLIGHT_SCREEN_FILE, isKept);

/** The pilot's choices on this phone, or the defaults. */
export function loadFlightPrefs(
  units: Units,
  list: KeptList<unknown> = kept,
): FlightPrefs {
  return upgradeFlightPrefs(list.load()[0]) ?? defaultFlightPrefs(units);
}

export function saveFlightPrefs(
  prefs: FlightPrefs,
  list: KeptList<unknown> = kept,
): boolean {
  return list.save([prefs]);
}
