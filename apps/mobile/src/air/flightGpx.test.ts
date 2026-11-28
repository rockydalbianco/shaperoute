import { readGpx } from "../imports/gpx";
import { flightGpxFileName, flightGpxOf } from "./flightGpx";

const T0 = Date.UTC(2026, 6, 14, 9, 5, 7);

describe("flightGpxOf", () => {
  const fixes = [
    { timeMs: T0, point: [45.72, 10.84] as [number, number], altM: 1710.44 },
    { timeMs: T0 + 1000, point: [45.7201, 10.8402] as [number, number], altM: null },
  ];

  it("writes one track of the fixes, with heights when known", () => {
    const text = flightGpxOf(fixes, "A & B");
    expect(text).toContain("<name>A &amp; B</name><type>paragliding</type>");
    expect(text).toContain(
      '<trkpt lat="45.720000" lon="10.840000"><ele>1710.4</ele><time>2026-07-14T09:05:07.000Z</time></trkpt>',
    );
    expect(text).toContain(
      '<trkpt lat="45.720100" lon="10.840200"><time>2026-07-14T09:05:08.000Z</time></trkpt>',
    );
  });

  it("reads back with the app's own GPX reader", () => {
    const read = readGpx(flightGpxOf(fixes, "MuW"));
    expect(read.points.map((p) => p.timeMs)).toEqual([T0, T0 + 1000]);
  });

  it("names the file by the day of the flight", () => {
    expect(flightGpxFileName(fixes)).toBe("2026-07-14-flight.gpx");
  });
});
