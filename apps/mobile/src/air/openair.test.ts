/**
 * The pilot's airspace file (TASK-479 part E1): an OpenAir file made up
 * for the test (no real airspace anywhere in the repository), its limits,
 * points, circles and arcs, and the lines that cannot be read, counted.
 */
import {
  arcPoints,
  destination,
  METRES_PER_FOOT,
  readLimit,
  readOpenAir,
  readPoint,
} from "./openair";

// Invented: a made-up place, made-up names.
const FILE = `
* A test file, invented for MuW's tests.
AC R
AN TEST RESTRICTED ONE
AL GND
AH 2500ft MSL
DP 45:00:00 N 010:00:00 E
DP 45:00:00 N 010:06:00 E
DP 45:03:00 N 010:06:00 E
DP 45:03:00 N 010:00:00 E

AC D
AN TEST CIRCLE
AL 1000 ft AGL
AH FL95
V X=45:10:00 N 010:10:00 E
DC 2

AC C
AN TEST ARC
AL 1500m AMSL
AH UNL
V X=45:20:00 N 010:20:00 E
V D=-
DP 45:21:00 N 010:20:00 E
DA 1,0,90
DB 45:20:00 N 010:21:00 E, 45:19:00 N 010:20:00 E
AY something extended
SP 0,1,0,0,255

AC Q
AN TEST WITHOUT OUTLINE
AL GND
AH 3000ft
DP 45:30:00 N 010:30:00 E
XX not a line of OpenAir
`;

describe("readLimit", () => {
  it("reads the ground, heights, flight levels and no limit", () => {
    expect(readLimit("GND")).toEqual({ kind: "ground" });
    expect(readLimit("SFC")).toEqual({ kind: "ground" });
    expect(readLimit("UNL")).toEqual({ kind: "unlimited" });
    expect(readLimit("FL 95")).toEqual({ kind: "flightLevel", level: 95 });
    expect(readLimit("2500ft MSL")).toEqual({
      kind: "aboveSea",
      metres: 2500 * METRES_PER_FOOT,
    });
    expect(readLimit("2500")).toEqual({
      kind: "aboveSea",
      metres: 2500 * METRES_PER_FOOT,
    });
    expect(readLimit("1500m AMSL")).toEqual({ kind: "aboveSea", metres: 1500 });
    expect(readLimit("1000 ft AGL")).toEqual({
      kind: "aboveGround",
      metres: 1000 * METRES_PER_FOOT,
    });
    expect(readLimit("300m GND")).toEqual({ kind: "aboveGround", metres: 300 });
    expect(readLimit("0 AGL")).toEqual({ kind: "ground" });
    expect(readLimit("lots")).toBeNull();
  });
});

describe("readPoint", () => {
  it("reads degrees, minutes and seconds, or decimal minutes, either hemisphere", () => {
    expect(readPoint("45:30:00 N 010:15:00 E")).toEqual([45.5, 10.25]);
    expect(readPoint("45:30.5N 10:15.25E")).toEqual([45 + 30.5 / 60, 10 + 15.25 / 60]);
    expect(readPoint("33:00:00 S 070:30:00 W")).toEqual([-33, -70.5]);
    expect(readPoint("45:61:00 N 010:00:00 E")).toBeNull();
    expect(readPoint("nowhere")).toBeNull();
  });
});

describe("arcs", () => {
  it("puts a point at the distance asked", () => {
    const north = destination([45, 10], 0, 1852);
    expect(north[0]).toBeCloseTo(45 + 1 / 60, 3);
    expect(north[1]).toBeCloseTo(10, 6);
  });

  it("goes the way asked, a point every 5°", () => {
    const clockwise = arcPoints([45, 10], 1852, 0, 90, true);
    expect(clockwise).toHaveLength(19);
    const back = arcPoints([45, 10], 1852, 0, 90, false);
    // Counter-clockwise from north to east is the long way: 270°.
    expect(back).toHaveLength(55);
  });
});

describe("readOpenAir", () => {
  const { airspaces, unread } = readOpenAir(FILE);

  it("reads every volume with an outline and its limits", () => {
    expect(airspaces.map((one) => [one.class, one.name])).toEqual([
      ["R", "TEST RESTRICTED ONE"],
      ["D", "TEST CIRCLE"],
      ["C", "TEST ARC"],
    ]);
    expect(airspaces[0].points).toHaveLength(4);
    expect(airspaces[0].floor).toEqual({ kind: "ground" });
    expect(airspaces[1].ceiling).toEqual({ kind: "flightLevel", level: 95 });
    expect(airspaces[2].ceiling).toEqual({ kind: "unlimited" });
  });

  it("draws a circle of the radius asked around its centre", () => {
    const circle = airspaces[1].points;
    expect(circle).toHaveLength(72);
    for (const point of circle) {
      const north = (point[0] - (45 + 10 / 60)) * 111_195;
      const east =
        (point[1] - (10 + 10 / 60)) * 111_195 * Math.cos((45.17 * Math.PI) / 180);
      expect(Math.hypot(north, east)).toBeGreaterThan(2 * 1852 - 15);
      expect(Math.hypot(north, east)).toBeLessThan(2 * 1852 + 15);
    }
  });

  it("follows V D= for its arcs", () => {
    // DP, then DA 0→90 counter-clockwise (55 points), then DB east→south
    // counter-clockwise.
    const arc = airspaces[2].points;
    expect(arc.length).toBeGreaterThan(55);
  });

  it("counts the lines it could not read, and the volume left without an outline", () => {
    // «XX …» and the five lines (AC, AN, AL, AH, DP) of the volume with
    // one point.
    expect(unread).toBe(6);
  });

  it("reads nothing from a file that is not OpenAir", () => {
    expect(readOpenAir("hello\nworld")).toEqual({ airspaces: [], unread: 2 });
  });
});
