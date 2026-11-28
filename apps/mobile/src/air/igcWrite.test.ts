import { readIgc } from "../imports/igc";
import type { FlightFix } from "./flightArchive";
import { bRecord, igcFileName, igcOf, NOT_SIGNED_LINE } from "./igcWrite";

const T0 = Date.UTC(2026, 6, 14, 9, 5, 7);

const FIXES: FlightFix[] = [
  { timeMs: T0, point: [45.72, 10.84], altM: 1710.4 },
  { timeMs: T0 + 1000, point: [45.7201, 10.8402], altM: null },
  { timeMs: T0 + 2000, point: [-33.5, -70.25], altM: -12 },
];

describe("igcOf", () => {
  it("writes the header of a recorder without a code, not signed, without a G record", () => {
    const text = igcOf(FIXES, { version: "1.2.0" });
    const lines = text.split("\r\n");
    expect(lines.slice(0, 8)).toEqual([
      "AXXXMUWMuW",
      "HFDTEDATE:140726,01",
      "HFFTYFRTYPE:MuW,1.2.0",
      "HFGPSRECEIVER:Phone GPS",
      "HFDTMGPSDATUM:WGS84",
      "HFALGALTGPS:GEO",
      NOT_SIGNED_LINE,
      "B0905074543200N01050400EA0000001710",
    ]);
    expect(text.endsWith("\r\n")).toBe(true);
    expect(lines.some((line) => line.startsWith("G"))).toBe(false);
    expect(lines.some((line) => line.startsWith("HFPLT"))).toBe(false);
  });

  it("names the pilot only when the pilot wrote a name, in plain ASCII", () => {
    const text = igcOf(FIXES, { version: "1.2.0", pilot: " Zoë\nRossi " });
    expect(text).toContain("\r\nHFPLTPILOTINCHARGE:ZoeRossi\r\n");
    expect(igcOf(FIXES, { version: "1", pilot: "  " })).not.toContain("HFPLT");
  });

  it("marks a fix without a height V, and writes heights below the sea", () => {
    expect(bRecord(FIXES[1])).toBe("B0905084543206N01050412EV0000000000");
    expect(bRecord(FIXES[2])).toBe("B0905093330000S07015000WA00000-0012");
  });

  it("carries a minute rounded up to 60", () => {
    expect(bRecord({ timeMs: T0, point: [45.9999999, 10], altM: 0 })).toContain(
      "4600000N01000000E",
    );
  });

  it("reads back as the flight it was written from", () => {
    const read = readIgc(igcOf(FIXES, { version: "1.2.0" }));
    expect(read.sport).toBe("paragliding");
    expect(read.points.map((p) => p.timeMs)).toEqual(FIXES.map((f) => f.timeMs));
    expect(read.points.map((p) => p.altitudeM)).toEqual([1710, null, -12]);
    read.points.forEach((p, i) => {
      expect(p.point?.[0]).toBeCloseTo(FIXES[i].point[0], 4);
      expect(p.point?.[1]).toBeCloseTo(FIXES[i].point[1], 4);
    });
  });

  it("names the file by the day of the flight", () => {
    expect(igcFileName(FIXES)).toBe("2026-07-14-XXX-MUW-01.igc");
  });
});
