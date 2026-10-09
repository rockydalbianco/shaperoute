/**
 * The Sgrava look, in one place (`docs/UI.md`).
 *
 * Nothing here knows about React Native or MapLibre: both the app's styles and
 * the map style (`../map/mapStyle`) read these values, so a colour is decided
 * once and the map never drifts from the panel above it.
 *
 * Adding a token is cheap; hard-coding a colour somewhere else is not.
 */

import {
  BRIGHTNESS_STEPS,
  loadToneChoice,
  stepOf,
  type Tone,
  type ToneChoice,
} from "./tone";

/** The colours that stay the same in every tone (TASK-263, ADR-0231). */
const FIXED = {
  /**
   * The brand yellow. In the app it means one thing only: the route, and the
   * control that produces it. Anything else that needs attention uses
   * `warning` — a second meaning would make the colour say nothing. One
   * exception, the user's choice: «Run without a route» (ADR-0183).
   */
  accent: "#FFD02B",
  /**
   * Text and icons ON `accent`. White fails the contrast minimum on yellow and
   * becomes unreadable in sunlight, which is where this app is used.
   */
  onAccent: "#0A0A0B",

  /**
   * Someone waits for the user's answer: the number on the way to «Profile»
   * and on «Requests» (TASK-239). Red by the user's choice; nothing else is.
   */
  badge: "#E02D2D",
  /** The number on `badge`: 4.6:1. */
  onBadge: "#FFFFFF",

  /**
   * Strava's orange, for «Connect with Strava» only (TASK-187): Strava's
   * brand rules ask for it, and the user chose it. Nothing else of the app
   * is orange-filled.
   */
  strava: "#FC5200",
  /** Text on `strava`: white, as Strava's own button; semibold, 3:1. */
  onStrava: "#FFFFFF",
} as const;

/**
 * The colours a tone gives, and its brightness moves. The contrasts written
 * here are the dark tone's at its darkest; every tone at every step keeps
 * the minimums `palettes.test.ts` checks.
 */
export type Shade = {
  /** The app background: neutral, not blue. */
  readonly background: string;
  /** Cards, fields, the sheet over the map. */
  readonly surface: string;
  /** A surface that must sit above another one: the fill of a control. */
  readonly surfaceRaised: string;

  readonly border: string;
  /**
   * Borders that carry a control, not just a division: 4.3:1 on
   * `background`, so a button is seen as one in sunlight (TASK-086).
   */
  readonly borderStrong: string;

  readonly text: string;
  /** Labels and secondary lines; 7:1 on `background`. */
  readonly textMuted: string;
  /** The faintest readable text; 5.6:1 on `background`. Not for body copy. */
  readonly textFaint: string;

  /**
   * Something the user should know about the route that was produced — a
   * stretch without a pavement, a distance off target. Deliberately not
   * yellow, which already means "route".
   */
  readonly warning: string;
  /** A request that failed. */
  readonly error: string;

  /** Where a moved route begins (ADR-0040). Cyan, so it never reads as route. */
  readonly startHere: string;

  readonly map: {
    readonly background: string;
    readonly water: string;
    readonly waterLine: string;
    /** Parks, wood, grass: present but quiet. */
    readonly green: string;
    /** Built-up land, a shade off the background. */
    readonly builtUp: string;
    readonly building: string;
    /** Service roads and paths. */
    readonly roadFaint: string;
    /** Residential streets: most of what a route runs on. */
    readonly roadMinor: string;
    /** Secondary and tertiary. */
    readonly roadMedium: string;
    /** Trunk, primary, motorway. */
    readonly roadMajor: string;
    readonly label: string;
    readonly labelHalo: string;
  };
};

/** Every colour of the app, in the tone chosen. */
export type Palette = typeof FIXED & Shade;

/**
 * Each tone at its darkest step and at its brightest (TASK-263, ADR-0231);
 * the steps between are mixed from the two, colour by colour. The dark
 * tone at its darkest is the app as it always was (ADR-0046); at its
 * brightest, anthracite. The light tone goes from a light grey to white;
 * its warnings, errors and «Start here» are darker, to read on it.
 */
export const SHADES: Readonly<
  Record<Tone, { readonly darkest: Shade; readonly brightest: Shade }>
> = {
  dark: {
    darkest: {
      background: "#0A0A0B",
      surface: "#141416",
      surfaceRaised: "#2B2B31",
      border: "#3D3D44",
      borderStrong: "#74747E",
      text: "#F5F5F4",
      textMuted: "#9B9B9F",
      textFaint: "#8A8A90",
      warning: "#FF7A59",
      error: "#FF6B6B",
      startHere: "#4DD2FF",
      map: {
        background: "#0D0E10",
        water: "#101F29",
        waterLine: "#1D3C4E",
        green: "#121A13",
        builtUp: "#101012",
        building: "#17181B",
        roadFaint: "#1C1D21",
        roadMinor: "#26272C",
        roadMedium: "#303238",
        roadMajor: "#3A3D45",
        label: "#8A8A90",
        labelHalo: "#0D0E10",
      },
    },
    brightest: {
      background: "#2C2D31",
      surface: "#37383D",
      surfaceRaised: "#4C4D55",
      border: "#5C5D66",
      borderStrong: "#9A9BA5",
      text: "#F5F5F4",
      textMuted: "#C4C4C8",
      textFaint: "#B6B6BB",
      warning: "#FF9478",
      error: "#FF8A8A",
      startHere: "#6EDBFF",
      map: {
        background: "#2A2B2F",
        water: "#1F3A4B",
        waterLine: "#30586E",
        green: "#26332A",
        builtUp: "#2D2E32",
        building: "#36373C",
        roadFaint: "#3B3C42",
        roadMinor: "#46484F",
        roadMedium: "#52555D",
        roadMajor: "#5E626C",
        label: "#B6B6BB",
        labelHalo: "#2A2B2F",
      },
    },
  },
  light: {
    darkest: {
      background: "#DCDCD8",
      surface: "#D0D0CC",
      surfaceRaised: "#C2C2C0",
      border: "#ABABAA",
      borderStrong: "#66666D",
      text: "#0A0A0B",
      textMuted: "#45454B",
      textFaint: "#505057",
      warning: "#9A330A",
      error: "#A1221B",
      startHere: "#006E94",
      map: {
        background: "#D9D7D0",
        water: "#9CC2D8",
        waterLine: "#6E9FBD",
        green: "#C6D6BC",
        builtUp: "#D2D0C9",
        building: "#C6C3BB",
        roadFaint: "#C9C7C0",
        roadMinor: "#BDBAB2",
        roadMedium: "#AFACA4",
        roadMajor: "#A19E95",
        label: "#55555B",
        labelHalo: "#D9D7D0",
      },
    },
    brightest: {
      background: "#FFFFFF",
      surface: "#F3F3F1",
      surfaceRaised: "#E6E6E8",
      border: "#D2D2D6",
      borderStrong: "#75757D",
      text: "#0A0A0B",
      textMuted: "#55555B",
      textFaint: "#626269",
      warning: "#B23C0B",
      error: "#B3261E",
      startHere: "#007BA3",
      map: {
        background: "#F5F4F0",
        water: "#B5D6E8",
        waterLine: "#86B6D2",
        green: "#DDE9D4",
        builtUp: "#EEEDE8",
        building: "#E2E0D9",
        roadFaint: "#E3E1DB",
        roadMinor: "#D6D4CD",
        roadMedium: "#C9C6BE",
        roadMajor: "#BBB8AF",
        label: "#626269",
        labelHalo: "#F5F4F0",
      },
    },
  },
};

/** `from` and `to` mixed: 0 is `from`, 1 is `to`. */
function mixHex(from: string, to: string, share: number): string {
  const channel = (at: number) =>
    Math.round(
      parseInt(from.slice(at, at + 2), 16) * (1 - share) +
        parseInt(to.slice(at, at + 2), 16) * share,
    )
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

function mixShade(from: Shade, to: Shade, share: number): Shade {
  const mixed = {} as Record<string, unknown>;
  for (const key of Object.keys(from) as (keyof Shade)[]) {
    const [a, b] = [from[key], to[key]];
    mixed[key] =
      typeof a === "string" && typeof b === "string"
        ? mixHex(a, b, share)
        : mixShade(a as unknown as Shade, b as unknown as Shade, share);
  }
  return mixed as Shade;
}

/** Every colour of the app in `choice`'s tone, at its step. */
export function paletteOf(choice: ToneChoice): Palette {
  const { darkest, brightest } = SHADES[choice.tone];
  const share = stepOf(choice) / (BRIGHTNESS_STEPS - 1);
  return { ...FIXED, ...mixShade(darkest, brightest, share) };
}

/**
 * The tone chosen in «Settings», read once as the app loads: the styles
 * take their colours when their files load, so a new choice shows when the
 * app is opened again (`../settings/ToneSetting`).
 */
export const tone: ToneChoice = loadToneChoice();

export const color: Palette = paletteOf(tone);

/**
 * The phone's status bar: light on the dark tone, dark on the light one, so
 * the clock and the battery read.
 */
export const statusBarStyle: "light" | "dark" = tone.tone === "dark" ? "light" : "dark";

/** Spacing, in the 4 px steps the layouts are built on. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  /** Sheets that rise from the bottom edge. */
  sheet: 26,
  pill: 999,
} as const;

export const fontSize = {
  /** Section labels, uppercase and letter-spaced. */
  label: 11,
  detail: 12,
  small: 13,
  body: 15,
  input: 16,
  title: 25,
  /** The distance on the result: the number people look for. */
  display: 40,
  /** The kilometres of a run in progress, read at arm's length while
   * running (TASK-169). */
  hero: 88,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

/**
 * The smallest a control may be. Anything the user taps while moving, with wet
 * fingers, is at least this tall.
 */
export const MIN_TAP_SIZE = 44;

/** The run drawn over its route (TASK-113): thin and light, so the yellow
 * of the plan shows on both sides where the run followed it. */
export const track = {
  color: color.text,
  width: 2,
  opacity: 0.9,
} as const;

/** The places a themed route passes by (TASK-129): light dots with their
 * name; those it does not reach, fainter and unnamed. */
export const stop = {
  passed: color.text,
  missed: color.textFaint,
  outline: color.map.background,
  radius: 6,
  label: color.text,
  halo: color.map.background,
} as const;

/** The other routes to choose from (TASK-093): thin and grey, under the
 * chosen one, so yellow still means the route that will be run. */
export const otherRoute = {
  color: color.textFaint,
  width: 2.5,
  opacity: 0.8,
} as const;

/** The route drawn on the map. */
export const route = {
  color: color.accent,
  width: 5,
  opacity: 0.95,
} as const;

/** A dark line under the route's, wider, so it shows as an edge. */
export type RouteCasing = {
  readonly color: string;
  readonly width: number;
  readonly opacity: number;
};

/**
 * The route's edge in a tone (TASK-263, ADR-0231): on the light map the
 * yellow is as light as the streets and does not read alone, so it runs
 * on a dark edge, the dark of text on yellow. The dark map needs none.
 */
export function routeCasingOf(shown: Tone): RouteCasing | null {
  return shown === "light"
    ? { color: color.onAccent, width: route.width + 3, opacity: 0.85 }
    : null;
}

/** The route's edge in the tone the app is shown in. */
export const routeCasing = routeCasingOf(tone.tone);

/** The route still to run while running it (TASK-224): the route's yellow
 * and width, dashed, blinking in steps between bright and dim. Never off,
 * so the way ahead reads in the dim beat too; the part run stays `route`.
 * Yellow and blinking, unlike the grey walks between letters (`walk`) and
 * the dark on-foot dashes (`onFoot`), which keep still. */
export const routeAhead = {
  color: route.color,
  width: route.width,
  opacity: route.opacity,
  /** The opacity of the dim beat. */
  dimOpacity: 0.3,
  /** Dash and gap, in line widths (MapLibre's `line-dasharray`). */
  dash: [2, 1.5],
  /** How long each beat lasts, bright or dim, in milliseconds. */
  beatMs: 700,
} as const;

/** The walks of a word with the pen up (TASK-198): the way from one letter
 * to the next, followed but not drawn. Dashed and grey, under the route, so
 * the letters alone are yellow and the word still reads. */
export const walk = {
  color: color.textMuted,
  width: 3,
  opacity: 0.9,
  /** Dash and gap, in line widths (MapLibre's `line-dasharray`). */
  dash: [2, 1.5],
} as const;

/** The stretches of a bike route walked with the bike on foot (TASK-206,
 * ADR-0167): dark dashes over the yellow route, which stays whole, since
 * they are part of the drawing. Dark as text on yellow (`onAccent`), and
 * not grey, the colour of the walks between letters. */
export const onFoot = {
  color: color.onAccent,
  width: 2,
  opacity: 0.9,
  /** Dash and gap, in line widths (MapLibre's `line-dasharray`). */
  dash: [1.5, 1.5],
} as const;
