/**
 * What the voice counts and says with miles (TASK-182, part C): each mile
 * with its pace, the mile against the one before, on a bike every 5 miles
 * with the speed in miles per hour and, from the 10th, the last 5 against
 * the 5 before. Pure functions, the units given; with none given they are
 * the app's, kilometres in a test, and say what they said before.
 */
import type { LatLon } from "@shaperoute/shared-types";

import { METRES_PER_MILE } from "../units/format";
import { kmAnnouncement, wholeKm, wholeUnits } from "./freeRun";
import {
  comparisonOf,
  kmChangeS,
  kmComparison,
  rideChangeKmh,
  rideComparison,
  SAME_PACE_S,
  SAME_SPEED_KMH,
} from "./kmCompare";
import {
  RIDE_KM_EVERY,
  RIDE_MI_EVERY,
  rideAnnouncement,
  rideEveryOf,
  saidKmOf,
} from "./ride";
import { addFix, emptyTrack, type Track } from "./trackRecorder";

const START: LatLon = [46.067, 11.1215];
/** A metre north in degrees, a little over (the app's Earth is 6,371 km):
 * a fix at a mile has run the mile. */
const METRE = 1 / 111_194;
const MILE = METRES_PER_MILE;

/** `track` and a fix `northM` metres north of the start, at `seconds`. */
function fixAt(track: Track, northM: number, seconds: number): Track {
  return addFix(track, {
    point: [START[0] + northM * METRE, START[1]],
    timeMs: Math.round(seconds * 1000),
    accuracyM: 5,
  });
}

/** From the start to `metres` in `seconds`, in one step. */
function straight(metres: number, seconds: number): Track {
  return fixAt(fixAt(emptyTrack(), 0, 0), metres, seconds);
}

/** A run with twenty fixes a mile, each mile in its `mileSeconds`, and 100 m
 * more: the last mile has ended. */
function milesOf(mileSeconds: number[]): Track {
  let track = fixAt(emptyTrack(), 0, 0);
  let seconds = 0;
  mileSeconds.forEach((time, index) => {
    for (let step = 1; step <= 20; step += 1) {
      track = fixAt(track, (index + step / 20) * MILE, seconds + (time * step) / 20);
    }
    seconds += time;
  });
  const last = mileSeconds[mileSeconds.length - 1] ?? 480;
  return fixAt(track, mileSeconds.length * MILE + 100, seconds + (last * 100) / MILE);
}

/** A ride whose stretches of 5 miles go at `kmhs`, a fix every quarter of
 * a mile, and 200 m more at the last speed. */
function rideOf(kmhs: number[]): Track {
  let track = fixAt(emptyTrack(), 0, 0);
  let seconds = 0;
  kmhs.forEach((speed, index) => {
    const stretch = (5 * MILE) / (speed / 3.6);
    for (let step = 1; step <= 20; step += 1) {
      track = fixAt(
        track,
        (index + step / 20) * 5 * MILE,
        seconds + (stretch * step) / 20,
      );
    }
    seconds += stretch;
  });
  const last = kmhs[kmhs.length - 1] ?? 24;
  return fixAt(track, kmhs.length * 5 * MILE + 200, seconds + 200 / (last / 3.6));
}

test("the voice counts whole miles, or whole kilometres", () => {
  const short = straight(1600, 480);
  expect(wholeUnits(short, "km")).toBe(1);
  expect(wholeUnits(short, "mi")).toBe(0);
  const mile = straight(1610, 480);
  expect(wholeUnits(mile, "mi")).toBe(1);
  const five = straight(5000, 1500);
  expect(wholeUnits(five, "km")).toBe(5);
  expect(wholeUnits(five, "mi")).toBe(3);
  // With no unit given, the app's: kilometres, in a test.
  expect(wholeUnits(five)).toBe(wholeKm(five));
  expect(saidKmOf(five, "running", "mi")).toBe(3);
  expect(saidKmOf(five, undefined, "km")).toBe(5);
  expect(saidKmOf(five, undefined)).toBe(5);
});

test("by bike the miles are counted every 5, the kilometres every 10", () => {
  expect(RIDE_MI_EVERY).toBe(5);
  expect(rideEveryOf("mi")).toBe(5);
  expect(rideEveryOf("km")).toBe(RIDE_KM_EVERY);
  expect(rideEveryOf()).toBe(RIDE_KM_EVERY);
  const said = (miles: number) =>
    saidKmOf(straight(miles * MILE, miles * 240), "cycling", "mi");
  expect(said(4.9)).toBe(0);
  expect(said(5.01)).toBe(5);
  expect(said(9.9)).toBe(5);
  expect(said(10.2)).toBe(10);
  expect(said(15.5)).toBe(15);
  // The same ride in kilometres, as before: 16.4 km is one ten.
  const ride = straight(10.2 * MILE, 2448);
  expect(saidKmOf(ride, "cycling", "km")).toBe(10);
  expect(saidKmOf(ride, "cycling")).toBe(10);
});

test("each mile is said with the time so far and the pace for a mile", () => {
  // A mile and 16 m in 8:05.
  const track = straight(1625, 485);
  expect(kmAnnouncement(1, track, "en", "mi")).toBe(
    "1 mile. Time: 8 minutes 5 seconds. Average pace: 8 minutes per mile.",
  );
  expect(kmAnnouncement(1, track, "it", "mi")).toBe(
    "Un miglio. Tempo: 8 minuti e 5 secondi. Passo medio: 8 minuti al miglio.",
  );
  expect(kmAnnouncement(1, track, "de", "mi")).toBe(
    "Eine Meile. Zeit: 8 Minuten 5 Sekunden. Durchschnittstempo: 8 Minuten pro Meile.",
  );
  expect(kmAnnouncement(1, track, "es", "mi")).toBe(
    "Una milla. Tiempo: 8 minutos y 5 segundos. Ritmo medio: 8 minutos por milla.",
  );
  expect(kmAnnouncement(1, track, "fr", "mi")).toBe(
    "Un mile. Temps : 8 minutes 5 secondes. Allure moyenne : 8 minutes au mile.",
  );
  // The same run in kilometres, as before: its first kilometre.
  const km =
    "1 kilometre. Time: 8 minutes 5 seconds. Average pace: 4 minutes 58 seconds per kilometre.";
  expect(kmAnnouncement(1, track, "en", "km")).toBe(km);
  expect(kmAnnouncement(1, track)).toBe(km);
  // The third mile ends with the cheer.
  expect(kmAnnouncement(3, milesOf([480, 480, 480]), "en", "mi")).toMatch(
    /^3 miles\. Time: 24 minutes 30 seconds\. Average pace: 8 minutes per mile\. Come on, full speed ahead!$/,
  );
});

test("the first mile has none before: nothing is said", () => {
  expect(kmComparison(1, emptyTrack(), "en", "mi")).toBeNull();
  expect(kmComparison(1, milesOf([540]), "en", "mi")).toBeNull();
  expect(kmChangeS(milesOf([540]), 1, "mi")).toBeNull();
  // A mile the run has not ended yet.
  expect(kmComparison(2, milesOf([540]), "en", "mi")).toBeNull();
  // 1.06 miles are 1.7 km: one kilometre, and nothing to compare there either.
  expect(kmComparison(1, milesOf([540]), "en", "km")).toBeNull();
});

test("a faster mile says by how many seconds, in the five languages", () => {
  const track = milesOf([540, 528]);
  expect(kmChangeS(track, 2, "mi")).toBe(-12);
  expect(kmComparison(2, track, "en", "mi")).toBe(
    "12 seconds faster than the last mile.",
  );
  expect(kmComparison(2, track, "it", "mi")).toBe(
    "Questo miglio: 12 secondi meglio del precedente.",
  );
  expect(kmComparison(2, track, "de", "mi")).toBe(
    "12 Sekunden schneller als die letzte Meile.",
  );
  expect(kmComparison(2, track, "es", "mi")).toBe(
    "Esta milla: 12 segundos más rápida que la anterior.",
  );
  expect(kmComparison(2, track, "fr", "mi")).toBe(
    "Ce mile : 12 secondes plus rapide que le précédent.",
  );
});

test("a slower mile says by how many seconds, in the five languages", () => {
  const track = milesOf([540, 528, 536]);
  expect(kmChangeS(track, 3, "mi")).toBe(8);
  expect(kmComparison(3, track, "en", "mi")).toBe(
    "8 seconds slower than the last mile.",
  );
  expect(kmComparison(3, track, "it", "mi")).toBe(
    "Questo miglio: 8 secondi peggio del precedente.",
  );
  expect(kmComparison(3, track, "de", "mi")).toBe(
    "8 Sekunden langsamer als die letzte Meile.",
  );
  expect(kmComparison(3, track, "es", "mi")).toBe(
    "Esta milla: 8 segundos más lenta que la anterior.",
  );
  expect(kmComparison(3, track, "fr", "mi")).toBe(
    "Ce mile : 8 secondes plus lent que le précédent.",
  );
  // The second is still the second's.
  expect(kmComparison(2, track, "en", "mi")).toBe(
    "12 seconds faster than the last mile.",
  );
});

test("within 2 seconds, these too, it is the same pace as the last mile", () => {
  expect(SAME_PACE_S).toBe(2);
  for (const second of [480, 478, 482, 481.4, 478.6]) {
    expect(kmComparison(2, milesOf([480, second]), "en", "mi")).toBe(
      "Same pace as the last mile.",
    );
  }
  expect(kmComparison(2, milesOf([480, 480]), "it", "mi")).toBe(
    "Stesso passo del miglio precedente.",
  );
  expect(kmComparison(2, milesOf([480, 483]), "en", "mi")).toBe(
    "3 seconds slower than the last mile.",
  );
  expect(kmComparison(2, milesOf([480, 477]), "en", "mi")).toBe(
    "3 seconds faster than the last mile.",
  );
});

test("a run compared in kilometres says kilometres, as before", () => {
  // Two miles at 9:00 and 8:48: three whole kilometres.
  const track = milesOf([540, 528]);
  const km = kmComparison(3, track, "en", "km");
  expect(km).toMatch(/kilometre\.$/);
  expect(kmComparison(3, track)).toBe(km);
  expect(kmComparison(3, track, "en")).toBe(km);
  expect(comparisonOf(3, track, "running", "en")).toBe(km);
  expect(comparisonOf(2, track, "running", "en", "mi")).toBe(
    "12 seconds faster than the last mile.",
  );
});

test("by bike the miles are said with the average speed in miles per hour", () => {
  // Five miles and 20 m in 20 minutes: 15 mph.
  const track = straight(5 * MILE + 20, 1200);
  expect(rideAnnouncement(5, track, "en", "mi")).toBe(
    "5 miles. Time: 20 minutes. Average speed: 15 miles per hour.",
  );
  expect(rideAnnouncement(5, track, "it", "mi")).toBe(
    "5 miglia. Tempo: 20 minuti. Velocità media: 15 miglia orarie.",
  );
  expect(rideAnnouncement(5, track, "de", "mi")).toBe(
    "5 Meilen. Zeit: 20 Minuten. Durchschnittsgeschwindigkeit: 15 Meilen pro Stunde.",
  );
  expect(rideAnnouncement(5, track, "es", "mi")).toBe(
    "5 millas. Tiempo: 20 minutos. Velocidad media: 15 millas por hora.",
  );
  expect(rideAnnouncement(5, track, "fr", "mi")).toBe(
    "5 miles. Temps : 20 minutes. Vitesse moyenne : 15 miles par heure.",
  );
  // Ten kilometres and a little in 24 minutes, in kilometres as before.
  const ten = straight(10_020, 1440);
  const km = "10 kilometres. Time: 24 minutes. Average speed: 25 kilometres per hour.";
  expect(rideAnnouncement(10, ten, "en", "km")).toBe(km);
  expect(rideAnnouncement(10, ten)).toBe(km);
});

test("by bike the first 5 miles have none before: nothing is said", () => {
  expect(rideComparison(5, rideOf([24]), "en", "mi")).toBeNull();
  expect(rideChangeKmh(rideOf([24]), 5, "mi")).toBeNull();
  // Ten miles the ride has not ended yet.
  expect(rideComparison(10, rideOf([24]), "en", "mi")).toBeNull();
  // Not a multiple of 5 below 10 either.
  expect(rideComparison(7, rideOf([24, 26]), "en", "mi")).toBeNull();
});

test("by bike, from the 10th mile, the last 5 against the 5 before", () => {
  const track = rideOf([20, 26, 23]);
  expect(rideChangeKmh(track, 10, "mi")).toBeCloseTo(6, 1);
  expect(rideChangeKmh(track, 15, "mi")).toBeCloseTo(-3, 1);
  expect(rideComparison(10, track, "en", "mi")).toBe(
    "The last 5 miles were faster than the 5 before.",
  );
  expect(rideComparison(15, track, "en", "mi")).toBe(
    "The last 5 miles were slower than the 5 before.",
  );
  expect(rideComparison(10, track, "it", "mi")).toBe(
    "Ultime 5 miglia più veloci delle 5 precedenti.",
  );
  expect(rideComparison(15, track, "it", "mi")).toBe(
    "Ultime 5 miglia più lente delle 5 precedenti.",
  );
  expect(rideComparison(10, track, "de", "mi")).toBe(
    "Die letzten 5 Meilen waren schneller als die 5 davor.",
  );
  expect(rideComparison(10, track, "es", "mi")).toBe(
    "Las últimas 5 millas, más rápidas que las 5 anteriores.",
  );
  expect(rideComparison(10, track, "fr", "mi")).toBe(
    "Les 5 derniers miles ont été plus rapides que les 5 précédents.",
  );
  expect(comparisonOf(10, track, "cycling", "en", "mi")).toBe(
    "The last 5 miles were faster than the 5 before.",
  );
});

test("by bike, within half a km/h, these too, it is the same speed", () => {
  expect(SAME_SPEED_KMH).toBe(0.5);
  for (const speed of [24, 24.4, 23.6]) {
    expect(rideComparison(10, rideOf([24, speed]), "en", "mi")).toBe(
      "The last 5 miles were at the same speed as the 5 before.",
    );
  }
  expect(rideComparison(10, rideOf([24, 24]), "it", "mi")).toBe(
    "Ultime 5 miglia alla stessa velocità delle 5 precedenti.",
  );
  expect(rideComparison(10, rideOf([24, 24.7]), "en", "mi")).toBe(
    "The last 5 miles were faster than the 5 before.",
  );
  expect(rideComparison(10, rideOf([24, 23.3]), "en", "mi")).toBe(
    "The last 5 miles were slower than the 5 before.",
  );
});

test("a ride compared in kilometres says kilometres, as before", () => {
  // 15 miles are 24.1 km: at 20 km the last 10 against the first 10.
  const track = rideOf([20, 26, 23]);
  const km = rideComparison(20, track, "en", "km");
  expect(km).toBe("The last 10 kilometres were faster than the 10 before.");
  expect(rideComparison(20, track)).toBe(km);
  expect(comparisonOf(20, track, "cycling")).toBe(km);
  // Ten kilometres are no ten miles.
  expect(rideComparison(10, track, "en", "km")).toBeNull();
});
