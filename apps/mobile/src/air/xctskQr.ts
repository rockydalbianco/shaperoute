import type { FlightTask } from "./flightTask";
import { typesOf } from "./xctskFile";

/**
 * The pilot's task for XCTrack's QR code (TASK-479 part D4, ADR-0388):
 * «XCTSK:» and the JSON of the task format 2, the short one for QR codes.
 * Each turnpoint's place is Google's polyline encoding of its longitude
 * and latitude (× 1e5, rounded), its altitude and its radius (whole
 * metres), in that order, as XCTrack's own code does: within a metre.
 */

export const XCTSK_PREFIX = "XCTSK:";

/** One number of Google's encoded polyline algorithm. */
export function encodeNumber(value: number): string {
  let rest = value < 0 ? ~(value << 1) : value << 1;
  let out = "";
  while (rest >= 0x20) {
    out += String.fromCharCode((0x20 | (rest & 0x1f)) + 63);
    rest >>>= 5;
  }
  return out + String.fromCharCode(rest + 63);
}

/** The numbers of `text`, back. */
export function decodeNumbers(text: string): number[] {
  const numbers: number[] = [];
  let index = 0;
  while (index < text.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = text.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < text.length);
    numbers.push(result & 1 ? ~(result >> 1) : result >> 1);
  }
  return numbers;
}

/** The «z» of a turnpoint. */
export function placeOf(
  lat: number,
  lon: number,
  altM: number,
  radiusM: number,
): string {
  return [
    Math.round(lon * 1e5),
    Math.round(lat * 1e5),
    Math.round(altM),
    Math.round(radiusM),
  ]
    .map(encodeNumber)
    .join("");
}

const TYPE_NUMBER = { SSS: 2, ESS: 3 } as const;

/** The text of the QR code of `task`. */
export function xctskQrOf(task: FlightTask): string {
  const types = typesOf(task);
  const qr: Record<string, unknown> = {
    taskType: "CLASSIC",
    version: 2,
    t: task.turnpoints.map((one, index) => {
      const { waypoint } = one;
      const type = types[index];
      return {
        z: placeOf(
          waypoint.point[0],
          waypoint.point[1],
          waypoint.altM ?? 0,
          one.radiusM,
        ),
        n: waypoint.name,
        ...(waypoint.description === null ? {} : { d: waypoint.description }),
        ...(type === "SSS" || type === "ESS" ? { t: TYPE_NUMBER[type] } : {}),
      };
    }),
  };
  if (task.start !== null) {
    qr.s = {
      g: task.start.gates,
      d: task.start.direction === "exit" ? 2 : 1,
      t: task.start.race ? 1 : 2,
    };
  }
  qr.g = {
    ...(task.goal.deadline === null ? {} : { d: task.goal.deadline }),
    t: task.goal.type === "line" ? 1 : 2,
  };
  qr.e = task.earth === "faiSphere" ? 1 : 0;
  return XCTSK_PREFIX + JSON.stringify(qr);
}
