import type { FlightFix } from "./flightArchive";

/**
 * A flight as a GPX 1.1 file (TASK-479 part F1, docs/GPX.md): one track of
 * the kept fixes, each with its time and, when known, its height. Written
 * on the phone; a route's GPX instead comes from the API.
 */

const xmlText = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function point(fix: FlightFix): string {
  const ele = fix.altM === null ? "" : `<ele>${fix.altM.toFixed(1)}</ele>`;
  return (
    `<trkpt lat="${fix.point[0].toFixed(6)}" lon="${fix.point[1].toFixed(6)}">` +
    `${ele}<time>${new Date(fix.timeMs).toISOString()}</time></trkpt>`
  );
}

export function flightGpxOf(fixes: FlightFix[], name: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="MuW" xmlns="http://www.topografix.com/GPX/1/1">',
    `<trk><name>${xmlText(name)}</name><type>paragliding</type><trkseg>`,
    ...fixes.map(point),
    "</trkseg></trk>",
    "</gpx>",
    "",
  ].join("\n");
}

/** The file's name: the day of the flight (2026-07-14-flight.gpx). */
export function flightGpxFileName(fixes: FlightFix[]): string {
  const first = fixes[0];
  const day = (first === undefined ? new Date(0) : new Date(first.timeMs))
    .toISOString()
    .slice(0, 10);
  return `${day}-flight.gpx`;
}
