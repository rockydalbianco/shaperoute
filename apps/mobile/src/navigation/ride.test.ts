import type { LatLon } from "@shaperoute/shared-types";

import { kmAnnouncement, wholeKm } from "./freeRun";
import { ANNOUNCE_M } from "./navigator";
import {
  announceMOf,
  isRide,
  kmh,
  RIDE_ANNOUNCE_M,
  RIDE_KM_EVERY,
  rideAnnouncement,
  saidKmOf,
  speedChange,
  speedNumber,
} from "./ride";
import type { Track, TrackFix } from "./trackRecorder";

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;

/** A fix `northM` metres north of the start, `seconds` into the ride. */
function fix(northM: number, seconds: number): TrackFix {
  return {
    point: [START[0] + northM * METRE, START[1]],
    timeMs: seconds * 1000,
    accuracyM: 5,
  };
}

function track(metres: number, seconds: number): Track {
  return { fixes: [fix(0, 0), fix(metres, seconds)], distanceM: metres };
}

test("only a bike route is ridden; a run and the rest as before", () => {
  expect(isRide("cycling")).toBe(true);
  expect(isRide("running")).toBe(false);
  expect(isRide("paddling")).toBe(false);
  expect(isRide(undefined)).toBe(false);
});

test("on a bike a turn is said 100 m ahead, on a run 50 m as before", () => {
  expect(RIDE_ANNOUNCE_M).toBe(100);
  expect(announceMOf("cycling")).toBe(100);
  expect(announceMOf("running")).toBe(ANNOUNCE_M);
  expect(announceMOf(undefined)).toBe(50);
  expect(announceMOf("paddling")).toBe(50);
});

test("a speed in km/h from the seconds of a kilometre, to a tenth", () => {
  // 2:30 a km is 24 km/h.
  expect(kmh(150)).toBe(24);
  expect(speedNumber(150)).toBe("24.0");
  expect(speedNumber(148)).toBe("24.3");
  expect(kmh(0)).toBe(0);
});

test("a kilometre's speed against the one before", () => {
  // 2:30 after 2:40: 24.0 after 22.5 km/h.
  expect(speedChange(150, 160)).toBe("+1.5");
  expect(speedChange(160, 150)).toBe("-1.5");
  expect(speedChange(150, 150)).toBe("0.0");
  expect(speedChange(150, 150.01)).toBe("0.0");
});

test("on a bike the kilometres are said every 10, on a run each one", () => {
  expect(RIDE_KM_EVERY).toBe(10);
  for (const metres of [0, 999, 1000, 9999, 10_000, 19_999, 20_000, 31_000]) {
    const ridden = track(metres, 60);
    expect(saidKmOf(ridden, "running")).toBe(wholeKm(ridden));
    expect(saidKmOf(ridden, undefined)).toBe(wholeKm(ridden));
  }
  expect(saidKmOf(track(9999, 60), "cycling")).toBe(0);
  expect(saidKmOf(track(10_000, 60), "cycling")).toBe(10);
  expect(saidKmOf(track(19_999, 60), "cycling")).toBe(10);
  expect(saidKmOf(track(20_000, 60), "cycling")).toBe(20);
  expect(saidKmOf(track(31_000, 60), "cycling")).toBe(30);
});

test("every 10 km the voice says the time and the average speed", () => {
  // 10 km in 25 minutes: 24 km/h.
  expect(rideAnnouncement(10, track(10_000, 1500))).toBe(
    "10 kilometres. Time: 25 minutes. Average speed: 24 kilometres per hour.",
  );
  // 20.01 km in 52 min 10 s: 23.01 km/h, said whole.
  expect(rideAnnouncement(20, track(20_010, 3130))).toBe(
    "20 kilometres. Time: 52 minutes 10 seconds. Average speed: 23 kilometres per hour.",
  );
  expect(rideAnnouncement(10, track(10_000, 1500), "it")).toBe(
    "10 chilometri. Tempo: 25 minuti. Velocità media: 24 chilometri orari.",
  );
  // A run's kilometre is said as before.
  expect(kmAnnouncement(1, track(1000, 342))).toBe(
    "1 kilometre. Time: 5 minutes 42 seconds. " +
      "Average pace: 5 minutes 42 seconds per kilometre.",
  );
});

test("a pause is in neither the time nor the speed", () => {
  // 10 km in 30 minutes, 5 of them paused: 25 minutes ridden.
  const paused: Track = {
    fixes: [fix(0, 0), fix(5000, 600), fix(5000, 900), fix(10_000, 1800)],
    distanceM: 10_000,
    pauses: [{ fromMs: 600_000, toMs: 900_000 }],
  };
  expect(rideAnnouncement(10, paused)).toBe(
    "10 kilometres. Time: 25 minutes. Average speed: 24 kilometres per hour.",
  );
});
