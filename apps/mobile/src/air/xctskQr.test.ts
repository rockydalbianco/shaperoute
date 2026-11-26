import type { FlightTask, Turnpoint } from "./flightTask";
import {
  decodeNumbers,
  encodeNumber,
  placeOf,
  XCTSK_PREFIX,
  xctskQrOf,
} from "./xctskQr";

function tp(
  name: string,
  lat: number,
  lon: number,
  r: number,
  kind: Turnpoint["kind"],
): Turnpoint {
  return {
    waypoint: {
      name,
      code: null,
      point: [lat, lon],
      altM: 912.4,
      landing: false,
      description: null,
    },
    radiusM: r,
    kind,
  };
}

// An invented task.
const TASK: FlightTask = {
  earth: "wgs84",
  turnpoints: [
    tp("TEST TO", 45.7355, 10.835, 400, "takeoff"),
    tp("TEST SS", 45.7355, 10.835, 1500, "start"),
    tp("TEST B1", 45.74451, -10.91189, 1000, "turnpoint"),
    tp("TEST GO", 45.8255, 10.8607, 400, "goal"),
  ],
  start: { direction: "exit", gates: ["12:00:00Z", "12:15:00Z"], race: true },
  goal: { type: "line", deadline: "17:00:00Z" },
};

describe("the polyline numbers", () => {
  it("encodes as Google's algorithm does", () => {
    // Google's own example: −179.9832104 at five decimals.
    expect(encodeNumber(Math.round(-179.9832104 * 1e5))).toBe("`~oia@");
    expect(encodeNumber(0)).toBe("?");
  });

  it("reads back longitude, latitude, altitude and radius, in that order", () => {
    expect(decodeNumbers(placeOf(45.74451, -10.91189, 912.4, 1000))).toEqual([
      -1091189, 4574451, 912, 1000,
    ]);
  });
});

describe("xctskQrOf", () => {
  it("writes XCTrack's format 2 behind «XCTSK:»", () => {
    const text = xctskQrOf(TASK);
    expect(text.startsWith(XCTSK_PREFIX)).toBe(true);
    const qr = JSON.parse(text.slice(XCTSK_PREFIX.length));
    expect(qr.taskType).toBe("CLASSIC");
    expect(qr.version).toBe(2);
    expect(qr.t.map((one: { n: string; t?: number }) => [one.n, one.t])).toEqual([
      ["TEST TO", undefined],
      ["TEST SS", 2],
      ["TEST B1", undefined],
      // No end of speed section in the task: the goal is it.
      ["TEST GO", 3],
    ]);
    expect(qr.s).toEqual({ g: ["12:00:00Z", "12:15:00Z"], d: 2, t: 1 });
    expect(qr.g).toEqual({ d: "17:00:00Z", t: 1 });
    expect(qr.e).toBe(0);
    expect(decodeNumbers(qr.t[2].z)).toEqual([-1091189, 4574451, 912, 1000]);
  });

  it("says the FAI sphere and an elapsed-time start", () => {
    const qr = JSON.parse(
      xctskQrOf({
        ...TASK,
        earth: "faiSphere",
        start: { direction: "enter", gates: [], race: false },
        goal: { type: "cylinder", deadline: null },
      }).slice(XCTSK_PREFIX.length),
    );
    expect(qr.e).toBe(1);
    expect(qr.s).toEqual({ g: [], d: 1, t: 2 });
    expect(qr.g).toEqual({ t: 2 });
  });
});
