import type { FlightFix } from "./flightArchive";

/**
 * A flight as an IGC file (TASK-479 part F1, ADR-0388): the format of the
 * FAI's flight recorders, which every flight app reads. Written on the
 * phone from the kept fixes and shared; never sent anywhere by MuW.
 *
 * MuW is no approved recorder: the A record has the «XXX» of makers without
 * a code, `HFFTYFRTYPE` says MuW, an L record says the file is not signed,
 * and there is no G record (the security signature). The pilot's name goes
 * in `HFPLT` only when the pilot wrote one. Heights are from the GPS, over
 * the geoid (`HFALG:GEO`): the pressure height of every B record is 00000,
 * as a recorder without a barometer writes it.
 */

/** The IGC «manufacturer» of a recorder without a code. */
const MAKER = "XXX";
/** MuW's own three letters after it. */
const SERIAL = "MUW";
/** The L record that says the file has no signature. */
export const NOT_SIGNED_LINE = `L${MAKER}NOT SIGNED: no G record, MuW is not an approved flight recorder`;

const pad = (value: number, width: number) => String(value).padStart(width, "0");

/** DDMMmmmN: degrees, then minutes to a thousandth. */
function latitude(lat: number): string {
  const [deg, thousandths] = degreesAndMinutes(Math.abs(lat));
  return `${pad(deg, 2)}${pad(thousandths, 5)}${lat < 0 ? "S" : "N"}`;
}

/** DDDMMmmmE. */
function longitude(lon: number): string {
  const [deg, thousandths] = degreesAndMinutes(Math.abs(lon));
  return `${pad(deg, 3)}${pad(thousandths, 5)}${lon < 0 ? "W" : "E"}`;
}

/** Whole degrees and thousandths of a minute, carried at 60'. */
function degreesAndMinutes(value: number): [number, number] {
  let deg = Math.floor(value);
  let thousandths = Math.round((value - deg) * 60_000);
  if (thousandths >= 60_000) {
    deg += 1;
    thousandths -= 60_000;
  }
  return [deg, thousandths];
}

/** Five characters: 01234, or -0012 below the sea. */
function height(metres: number | null): string {
  if (metres === null) {
    return "00000";
  }
  const whole = Math.max(-9999, Math.min(99_999, Math.round(metres)));
  return whole < 0 ? `-${pad(-whole, 4)}` : pad(whole, 5);
}

function clock(ms: number): string {
  const at = new Date(ms);
  return `${pad(at.getUTCHours(), 2)}${pad(at.getUTCMinutes(), 2)}${pad(at.getUTCSeconds(), 2)}`;
}

/** One B record: time, position, A with a height (a 3D fix) or V, the
 * pressure height (none) and the GPS height. */
export function bRecord(fix: FlightFix): string {
  return (
    `B${clock(fix.timeMs)}${latitude(fix.point[0])}${longitude(fix.point[1])}` +
    `${fix.altM === null ? "V" : "A"}00000${height(fix.altM)}`
  );
}

export type IgcOptions = {
  /** MuW's version, for HFFTYFRTYPE. */
  version: string;
  /** The pilot's name, only when the pilot wrote one. */
  pilot?: string | null;
};

/** What a header value may hold: printable ASCII, no line breaks. */
function headerText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[^\x20-\x7e]/g, "")
    .trim();
}

/**
 * The IGC file of `fixes`, lines ending in CR LF as the format wants.
 * The date is the UTC day of the first fix; the B records follow over
 * midnight by their times alone, as recorders write them.
 */
export function igcOf(fixes: FlightFix[], options: IgcOptions): string {
  const first = fixes[0];
  const day = first === undefined ? new Date(0) : new Date(first.timeMs);
  const date = `${pad(day.getUTCDate(), 2)}${pad(day.getUTCMonth() + 1, 2)}${pad(day.getUTCFullYear() % 100, 2)}`;
  const pilot = options.pilot ? headerText(options.pilot) : "";
  const lines = [
    `A${MAKER}${SERIAL}MuW`,
    `HFDTEDATE:${date},01`,
    ...(pilot === "" ? [] : [`HFPLTPILOTINCHARGE:${pilot}`]),
    `HFFTYFRTYPE:MuW,${headerText(options.version)}`,
    "HFGPSRECEIVER:Phone GPS",
    "HFDTMGPSDATUM:WGS84",
    "HFALGALTGPS:GEO",
    NOT_SIGNED_LINE,
    ...fixes.map(bRecord),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** The file's name: the day of the flight, then the recorder, as IGC
 * names go (2026-07-14-XXX-MUW-01.igc). */
export function igcFileName(fixes: FlightFix[]): string {
  const first = fixes[0];
  const day = (first === undefined ? new Date(0) : new Date(first.timeMs))
    .toISOString()
    .slice(0, 10);
  return `${day}-${MAKER}-${SERIAL}-01.igc`;
}
