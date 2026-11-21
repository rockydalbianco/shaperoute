import { tLater } from "../i18n";
import { type KeptList, keptList } from "../storage/keptList";
import type { Units } from "../units/units";
import { defaultFlightUnits, type FlightUnits, isFlightUnits } from "./flightUnits";

/**
 * The flight screen's layout (TASK-479 part B1, ADR-0388): pages of
 * widgets on a grid, the presets the user approved on 2026-11-21, and the
 * pilot's choices kept on the phone, never on the server. Part B1 has the
 * widgets of the numbers; the map (A1), the airspace (E), the turnpoints
 * and the task (D) come with their parts, and with them the «Map» and
 * «Competition» presets. The editor is part B2.
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
  | "altitudeChart";

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
};

export const WIDGETS: readonly WidgetId[] = Object.keys(WIDGET_NAME) as WidgetId[];

/** A widget on a page: its corner and its size in grid cells. */
export type Cell = { widget: WidgetId; col: number; row: number; w: number; h: number };

export type Page = readonly Cell[];

export type PresetId = "thermal" | "xc" | "minimal";

export const PRESET_NAME: Readonly<Record<PresetId, string>> = {
  thermal: tLater("Thermal"),
  xc: tLater("XC"),
  minimal: tLater("Minimal"),
};

export const PRESETS: readonly PresetId[] = ["thermal", "xc", "minimal"];

const cell = (widget: WidgetId, col: number, row: number, w = 2, h = 1): Cell => ({
  widget,
  col,
  row,
  w,
  h,
});

/**
 * The presets' pages. Where an approved widget is not here yet, its part
 * brings it: «Thermal» has «Above takeoff» until the height above the
 * ground (A1) and its second page's map; «XC» has «Track» and «Flight
 * time» until the XC distance (F) and the nearest landing (D).
 */
export const PRESET_PAGES: Readonly<Record<PresetId, readonly Page[]>> = {
  thermal: [
    [
      cell("vario", 0, 0, 4, 2),
      cell("thermalAssistant", 0, 2, 4, 2),
      cell("varioAvg", 0, 4),
      cell("thermalGain", 2, 4),
      cell("altitude", 0, 5),
      cell("aboveTakeoff", 2, 5),
    ],
    [
      cell("wind", 0, 0, 4, 2),
      cell("flightTime", 0, 2, 4, 1),
      cell("altitudeChart", 0, 3, 4, 3),
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
      cell("track", 0, 5),
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
  ],
  minimal: [[cell("vario", 0, 0, 4, 2), cell("altitude", 0, 2, 4, 2), cell("flightTime", 0, 4, 4, 2)]],
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

/** The look of the flight screen: dark, or bright for the sun. */
export type FlightLook = "dark" | "sun";

export type FlightPrefs = {
  preset: PresetId;
  look: FlightLook;
  units: FlightUnits;
};

export function defaultFlightPrefs(units: Units): FlightPrefs {
  return { preset: "thermal", look: "dark", units: defaultFlightUnits(units) };
}

export function isFlightPrefs(value: unknown): value is FlightPrefs {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prefs = value as Record<string, unknown>;
  return (
    PRESETS.includes(prefs.preset as PresetId) &&
    (prefs.look === "dark" || prefs.look === "sun") &&
    isFlightUnits(prefs.units)
  );
}

export const FLIGHT_SCREEN_FILE = "flight-screen.json";

const kept: KeptList<FlightPrefs> = keptList(FLIGHT_SCREEN_FILE, isFlightPrefs);

/** The pilot's choices on this phone, or the defaults. */
export function loadFlightPrefs(units: Units, list: KeptList<FlightPrefs> = kept): FlightPrefs {
  return list.load()[0] ?? defaultFlightPrefs(units);
}

export function saveFlightPrefs(prefs: FlightPrefs, list: KeptList<FlightPrefs> = kept): boolean {
  return list.save([prefs]);
}
