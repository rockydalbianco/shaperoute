/**
 * The GPS altitude above mean sea level on Android (TASK-479 part E2b,
 * ADR-0388).
 *
 * Android gives the height above the WGS84 ellipsoid; iOS already gives it
 * above mean sea level. The flight numbers, the airspace limits (MSL and FL)
 * and the GPX want the sea: on Android the geoid height N of EGM96 comes
 * off (MSL = ellipsoid height − N), about 47–51 m in the Alps.
 *
 * N comes from a 1° table of NGA's grid (`egm96Grid.ts`, made by
 * `tools/egm96_grid.py`), interpolated bilinearly. Against NGA's 15' grid
 * the table is off by at most 2.4 m in the Alps (0.65 m rms) and 1.9 m in
 * 99 places out of 100 in the world, up to 14 m by the steepest mountain
 * fronts: well under what a phone's GPS altitude is off by anyway.
 */
import { EGM96_CM_BASE64, EGM96_COLS, EGM96_ROWS, EGM96_STEP_DEG } from "./egm96Grid";

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** The table in whole centimetres, read once at the first use. */
let table: Int16Array | null = null;

/** Base64 to bytes, without `atob`, which not every engine has. */
export function base64Bytes(text: string): Uint8Array {
  const clean = text.replace(/=+$/, "");
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let bits = 0;
  let buffer = 0;
  let at = 0;
  for (let i = 0; i < clean.length; i += 1) {
    const value = BASE64.indexOf(clean[i]);
    if (value < 0) {
      throw new Error(`not base64 at ${i}`);
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[at] = (buffer >> bits) & 0xff;
      at += 1;
    }
  }
  return bytes;
}

function centimetres(): Int16Array {
  if (table === null) {
    const bytes = base64Bytes(EGM96_CM_BASE64);
    const values = new Int16Array(EGM96_ROWS * EGM96_COLS);
    for (let i = 0; i < values.length; i += 1) {
      // Little-endian int16, read by hand: the phone's order does not count.
      const word = bytes[2 * i] | (bytes[2 * i + 1] << 8);
      values[i] = word >= 0x8000 ? word - 0x10000 : word;
    }
    table = values;
  }
  return table;
}

function node(row: number, col: number): number {
  const wrapped = ((col % EGM96_COLS) + EGM96_COLS) % EGM96_COLS;
  return centimetres()[row * EGM96_COLS + wrapped] / 100;
}

/** EGM96's geoid height over the WGS84 ellipsoid at (lat, lon), metres. */
export function geoidHeightM(lat: number, lon: number): number {
  const y = (90 - Math.min(Math.max(lat, -90), 90)) / EGM96_STEP_DEG;
  const x = (lon + 180) / EGM96_STEP_DEG;
  const row = Math.min(Math.floor(y), EGM96_ROWS - 2);
  const col = Math.floor(x);
  const fy = y - row;
  const fx = x - col;
  const top = node(row, col) * (1 - fx) + node(row, col + 1) * fx;
  const bottom = node(row + 1, col) * (1 - fx) + node(row + 1, col + 1) * fx;
  return top * (1 - fy) + bottom * fy;
}

/**
 * The fix's altitude above mean sea level: on Android the ellipsoid height
 * less the geoid, elsewhere as the phone gives it. Null (or a number that is
 * not one) stays as it is: no height is never made up.
 */
export function seaLevelAltitudeM(
  altitudeM: number | null | undefined,
  lat: number,
  lon: number,
  os: string,
): number | null | undefined {
  if (
    os !== "android" ||
    altitudeM === null ||
    altitudeM === undefined ||
    !Number.isFinite(altitudeM) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return altitudeM;
  }
  return Math.round((altitudeM - geoidHeightM(lat, lon)) * 100) / 100;
}
