import { isIgc, readIgc } from "./igc";

/** Degrees from an IGC's whole degrees and thousandths of a minute. */
const deg = (d: number, thousandths: number) => d + thousandths / 60_000;

// An invented flight: no real pilot, glider or place name.
const HEADER = [
  "AXCTabc123 Some Vario",
  "HFDTEDATE:310526,01",
  "HFPLTPILOTINCHARGE:Test Pilot",
  "HFGTYGLIDERTYPE:Test Wing",
  "HFCM2CREW2:Nobody",
];

const file = (lines: string[]) => [...HEADER, ...lines].join("\r\n");

describe("isIgc", () => {
  it("knows an IGC file by its A and H records", () => {
    expect(isIgc(file(["B1000004543200N01050400EA0123401300"]))).toBe(true);
    expect(isIgc("﻿\n" + file([]))).toBe(true);
  });

  it("does not take another file for one", () => {
    expect(isIgc('<?xml version="1.0"?><gpx></gpx>')).toBe(false);
    expect(isIgc("A line\nwith no header")).toBe(false);
    expect(isIgc("B1000004543200N01050400EA0123401300")).toBe(false);
  });
});

describe("readIgc", () => {
  it("reads the B records' times, positions and GPS heights", () => {
    const track = readIgc(
      file([
        "B1000004543200N01050400EA0123401300",
        "LXCT some comment",
        "B1000014543300N01050500EA0123501310",
        "E100002PEV",
      ]),
    );
    expect(track.sport).toBe("paragliding");
    expect(track.igc).toBe(true);
    expect(track.points).toEqual([
      {
        point: [deg(45, 43200), deg(10, 50400)],
        timeMs: Date.UTC(2026, 4, 31, 10, 0, 0),
        altitudeM: 1300,
      },
      {
        point: [deg(45, 43300), deg(10, 50500)],
        timeMs: Date.UTC(2026, 4, 31, 10, 0, 1),
        altitudeM: 1310,
      },
    ]);
  });

  it("never keeps the pilot's or the glider's name", () => {
    const text = JSON.stringify(readIgc(file(["B1000004543200N01050400EA0123401300"])));
    expect(text).not.toContain("Test Pilot");
    expect(text).not.toContain("Test Wing");
  });

  it("takes the pressure height when the file has no GPS height", () => {
    const track = readIgc(
      file([
        "B1000004543200N01050400EA0123400000",
        "B1000014543200N01050400EA0124000000",
      ]),
    );
    expect(track.points.map((p) => p.altitudeM)).toEqual([1234, 1240]);
  });

  it("gives no GPS height to a fix without a 3D fix", () => {
    const track = readIgc(
      file([
        "B1000004543200N01050400EA0000001300",
        "B1000014543200N01050400EV0000001290",
      ]),
    );
    expect(track.points.map((p) => p.altitudeM)).toEqual([1300, null]);
  });

  it("goes on into the next day over midnight, and starts again at a second date", () => {
    const track = readIgc(
      file([
        "B2359594543200N01050400EA0000001300",
        "B0000014543200N01050400EA0000001300",
        "HFDTE020626",
        "B1200004543200N01050400EA0000001300",
      ]),
    );
    expect(track.points.map((p) => p.timeMs)).toEqual([
      Date.UTC(2026, 4, 31, 23, 59, 59),
      Date.UTC(2026, 5, 1, 0, 0, 1),
      Date.UTC(2026, 5, 2, 12, 0, 0),
    ]);
  });

  it("skips broken B records and gives no time without a date", () => {
    const track = readIgc(
      [
        "AXXXabc",
        "HFFTYFRTYPE:Test",
        "B9900004543200N01050400EA0000001300",
        "B10000045432",
      ].join("\n"),
    );
    expect(track.points).toEqual([]);
    const noDate = readIgc(
      ["AXXXabc", "HFFTYFRTYPE:Test", "B1000004543200S01050400WA0000001300"].join("\n"),
    );
    expect(noDate.points).toEqual([
      { point: [-deg(45, 43200), -deg(10, 50400)], timeMs: null, altitudeM: 1300 },
    ]);
  });
});
