/**
 * The pilot's waypoint files (TASK-479 part D1): SeeYou, CompeGPS, Ozi and
 * GEO, from invented files only.
 */
import {
  csvFields,
  cupAngle,
  cupElevation,
  readCompeGps,
  readCup,
  readGeo,
  readOzi,
  readWaypoints,
  waypointFormat,
} from "./waypoints";

const CUP = [
  "name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc",
  '"Test Launch",TL01,IT,4544.130N,01050.100E,1750.0m,1,,,,"An, invented launch"',
  '"Test Field",TF02,IT,4542.000N,01048.000E,300ft,3,,,,',
  '"Broken",BR,IT,45xx.000N,01048.000E,300m,1,,,,',
  "-----Related Tasks-----",
  '"Task",TL01,TF02',
].join("\n");

describe("readCup", () => {
  it("reads names, codes, places, heights and landings", () => {
    const { waypoints, unread } = readCup(CUP);
    expect(unread).toBe(1);
    expect(waypoints).toHaveLength(2);
    const [launch, field] = waypoints;
    expect(launch.name).toBe("Test Launch");
    expect(launch.code).toBe("TL01");
    expect(launch.point[0]).toBeCloseTo(45 + 44.13 / 60, 6);
    expect(launch.point[1]).toBeCloseTo(10 + 50.1 / 60, 6);
    expect(launch.altM).toBe(1750);
    expect(launch.landing).toBe(false);
    expect(launch.description).toBe("An, invented launch");
    expect(field.altM).toBeCloseTo(91.44, 2);
    expect(field.landing).toBe(true);
    expect(field.description).toBeNull();
  });

  it("reads the angles and heights of SeeYou", () => {
    expect(cupAngle("4530.000S")).toBeCloseTo(-45.5, 6);
    expect(cupAngle("01030.000W")).toBeCloseTo(-10.5, 6);
    expect(cupAngle("45.5")).toBeNull();
    expect(cupElevation("100ft")).toBeCloseTo(30.48, 2);
    expect(cupElevation("")).toBeNull();
  });

  it("splits quoted fields with commas and doubled quotes", () => {
    expect(csvFields('a,"b, c","say ""hi"""')).toEqual(["a", "b, c", 'say "hi"']);
  });
});

describe("readCompeGps", () => {
  const TEXT = [
    "G  WGS 84",
    "U  1",
    "W  LAUNCH A 45.7355000000ºN 10.8350000000ºE 27-MAR-62 00:00:00 1750.000000 Invented launch",
    "w Waypoint,0,-1.0,16777215,255,1,7,,0.0,",
    "W  BAD A north east 27-MAR-62 00:00:00 0",
  ].join("\n");

  it("reads waypoints in degrees and counts what it cannot", () => {
    const { waypoints, unread } = readCompeGps(TEXT);
    expect(unread).toBe(1);
    expect(waypoints).toEqual([
      {
        name: "LAUNCH",
        code: null,
        point: [45.7355, 10.835],
        altM: 1750,
        landing: false,
        description: "Invented launch",
      },
    ]);
  });

  it("does not read a file in UTM", () => {
    const utm = TEXT.replace("U  1", "U  0");
    expect(readCompeGps(utm).waypoints).toEqual([]);
  });
});

describe("readOzi", () => {
  const TEXT = [
    "OziExplorer Waypoint File Version 1.1",
    "WGS 84",
    "Reserved 2",
    "Reserved 3",
    "1,LAUNCH,45.735500,10.835000,,0,1,3,0,65535,Invented,0,0,0,5741",
    "2,NOALT,45.700000,10.800000,,0,1,3,0,65535,,0,0,0,-777",
    "3,BAD,,,",
  ].join("\n");

  it("reads waypoints and their height in feet", () => {
    const { waypoints, unread } = readOzi(TEXT);
    expect(unread).toBe(1);
    expect(waypoints[0].point).toEqual([45.7355, 10.835]);
    expect(waypoints[0].altM).toBeCloseTo(1749.9, 1);
    expect(waypoints[0].description).toBe("Invented");
    expect(waypoints[1].altM).toBeNull();
  });
});

describe("readGeo", () => {
  const TEXT = [
    "$FormatGEO",
    "LAUNCH    N 45 44 07.80    E 010 50 06.00  1750  Invented launch",
    "FIELD     S 45 30 00.00    W 010 30 00.00",
    "nonsense",
  ].join("\n");

  it("reads degrees, minutes and seconds, the height and the description", () => {
    const { waypoints, unread } = readGeo(TEXT);
    expect(unread).toBe(1);
    expect(waypoints[0].name).toBe("LAUNCH");
    expect(waypoints[0].point[0]).toBeCloseTo(45.7355, 4);
    expect(waypoints[0].point[1]).toBeCloseTo(10.835, 4);
    expect(waypoints[0].altM).toBe(1750);
    expect(waypoints[0].description).toBe("Invented launch");
    expect(waypoints[1].point).toEqual([-45.5, -10.5]);
    expect(waypoints[1].altM).toBeNull();
  });
});

describe("readWaypoints", () => {
  it("tells the format from the text or the name", () => {
    expect(waypointFormat("$FormatGEO\n", "a.wpt")).toBe("geo");
    expect(waypointFormat("OziExplorer Waypoint File Version 1.1\n", "a.wpt")).toBe(
      "ozi",
    );
    expect(waypointFormat("G  WGS 84\nU  1\n", "a.wpt")).toBe("compegps");
    expect(waypointFormat(CUP, "points.cup")).toBe("cup");
    expect(waypointFormat("hello", "a.txt")).toBeNull();
  });

  it("reads each format, and nothing from a file it does not know", () => {
    expect(readWaypoints(CUP, "points.cup").waypoints).toHaveLength(2);
    expect(readWaypoints("one\ntwo\n", "a.txt")).toEqual({ waypoints: [], unread: 2 });
  });
});
