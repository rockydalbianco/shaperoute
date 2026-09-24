/**
 * The Sgrava look, in one place (`docs/UI.md`).
 *
 * Nothing here knows about React Native or MapLibre: both the app's styles and
 * the map style (`../map/mapStyle`) read these values, so a colour is decided
 * once and the map never drifts from the panel above it.
 *
 * Adding a token is cheap; hard-coding a colour somewhere else is not.
 */

export const color = {
  /**
   * The brand yellow. In the app it means one thing only: the route, and the
   * control that produces it. Anything else that needs attention uses
   * `warning` — a second meaning would make the colour say nothing.
   */
  accent: "#FFD02B",
  /**
   * Text and icons ON `accent`. White fails the contrast minimum on yellow and
   * becomes unreadable in sunlight, which is where this app is used.
   */
  onAccent: "#0A0A0B",

  /** The app background: neutral black, not blue-black. */
  background: "#0A0A0B",
  /** Cards, fields, the sheet over the map. */
  surface: "#141416",
  /** A surface that must sit above another one. */
  surfaceRaised: "#1A1A1D",

  border: "#26262A",
  /** Borders that carry a control, not just a division. */
  borderStrong: "#33333A",

  text: "#F5F5F4",
  /** Labels and secondary lines; 7:1 on `background`. */
  textMuted: "#9B9B9F",
  /** The faintest readable text; 5.6:1 on `background`. Not for body copy. */
  textFaint: "#8A8A90",

  /**
   * Something the user should know about the route that was produced — a
   * stretch without a pavement, a distance off target. Deliberately not
   * yellow, which already means "route".
   */
  warning: "#FF7A59",
  /** A request that failed. */
  error: "#FF6B6B",

  /** Where a moved route begins (ADR-0040). Cyan, so it never reads as route. */
  startHere: "#4DD2FF",

  map: {
    background: "#0D0E10",
    water: "#101F29",
    waterLine: "#1D3C4E",
    /** Parks, wood, grass: present but quiet. */
    green: "#121A13",
    /** Built-up land, a shade off the background. */
    builtUp: "#101012",
    building: "#17181B",
    /** Service roads and paths. */
    roadFaint: "#1C1D21",
    /** Residential streets: most of what a route runs on. */
    roadMinor: "#26272C",
    /** Secondary and tertiary. */
    roadMedium: "#303238",
    /** Trunk, primary, motorway. */
    roadMajor: "#3A3D45",
    label: "#8A8A90",
    labelHalo: "#0D0E10",
  },
} as const;

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

/** The route drawn on the map. */
export const route = {
  color: color.accent,
  width: 5,
  opacity: 0.95,
} as const;
