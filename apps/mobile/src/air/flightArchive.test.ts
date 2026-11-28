import type { LatLon } from "@shaperoute/shared-types";

import { activityKey } from "../activities/activityKey";
import type { KeptList } from "../storage/keptList";
import {
  type FlightFix,
  type FlightShelf,
  type KeptFlightEntry,
  MAX_FLIGHTS,
  fixesOfText,
  flightFixesOf,
  flightText,
  keepFlight,
  keptFlight,
  keptFlights,
} from "./flightArchive";

const T0 = Date.UTC(2026, 6, 14, 10, 0, 0);
const BALDO: LatLon = [45.72, 10.84];

function flight(startMs: number, from: LatLon = BALDO, n = 3): FlightFix[] {
  return Array.from({ length: n }, (_, i) => ({
    timeMs: startMs + i * 1000,
    point: [from[0] + i * 0.0001, from[1]] as LatLon,
    altM: i === 1 ? null : 1700 + i,
  }));
}

/** The documents, in memory; the list or a write can be made to fail. */
function memoryShelf() {
  const files = new Map<string, string>();
  let list: KeptFlightEntry[] = [];
  const state = { failWrite: false, failList: false };
  const kept: KeptList<KeptFlightEntry> = {
    load: () => list,
    save: (next) => {
      if (state.failList) {
        return false;
      }
      list = next;
      return true;
    },
  };
  const shelf: FlightShelf = {
    list: kept,
    read: (key) => files.get(key) ?? null,
    write: (key, text) => {
      if (state.failWrite) {
        return false;
      }
      files.set(key, text);
      return true;
    },
    remove: (key) => {
      files.delete(key);
    },
  };
  return { shelf, files, state };
}

describe("flightArchive", () => {
  it("keeps a flight under the key of «My activities» and reads it back", () => {
    const { shelf } = memoryShelf();
    const fixes = flight(T0);
    expect(keepFlight("muw", fixes, shelf)).toBe(true);
    const key = activityKey(fixes[0]);
    expect(keptFlights(shelf)).toEqual([
      { key, source: "muw", startMs: T0, takeoff: BALDO },
    ]);
    expect(keptFlight(key, shelf)).toEqual(fixes);
  });

  it("takes the place of the same flight kept again", () => {
    const { shelf } = memoryShelf();
    keepFlight("muw", flight(T0), shelf);
    keepFlight("igc", flight(T0), shelf);
    expect(keptFlights(shelf).map((one) => one.source)).toEqual(["igc"]);
  });

  it("keeps nothing of a flight with fewer than two fixes", () => {
    const { shelf, files } = memoryShelf();
    expect(keepFlight("muw", flight(T0, BALDO, 1), shelf)).toBe(false);
    expect(files.size).toBe(0);
    expect(keptFlights(shelf)).toEqual([]);
  });

  it("drops the flight that began first past the most kept", () => {
    const { shelf, files } = memoryShelf();
    for (let i = MAX_FLIGHTS; i >= 0; i -= 1) {
      // Kept newest first: the order of the list is by start, not by keeping.
      expect(keepFlight("muw", flight(T0 + i * 86_400_000), shelf)).toBe(true);
    }
    const list = keptFlights(shelf);
    expect(list).toHaveLength(MAX_FLIGHTS);
    expect(list[0].startMs).toBe(T0 + 86_400_000);
    expect(files.has(activityKey(flight(T0)[0]))).toBe(false);
    expect(files.size).toBe(MAX_FLIGHTS);
  });

  it("leaves the list as it was when the phone refuses", () => {
    const { shelf, files, state } = memoryShelf();
    keepFlight("muw", flight(T0), shelf);
    state.failWrite = true;
    expect(keepFlight("muw", flight(T0 + 5000), shelf)).toBe(false);
    state.failWrite = false;
    state.failList = true;
    expect(keepFlight("muw", flight(T0 + 9000), shelf)).toBe(false);
    expect(keptFlights(shelf)).toHaveLength(1);
    expect(files.size).toBe(1);
  });

  it("reads no flight the list does not name, nor a broken file", () => {
    const { shelf, files } = memoryShelf();
    expect(keptFlight("0123456789abcdef", shelf)).toBeNull();
    keepFlight("muw", flight(T0), shelf);
    const key = activityKey(flight(T0)[0]);
    files.set(key, "{not json");
    expect(keptFlight(key, shelf)).toBeNull();
  });

  it("writes positions to six places and heights to a tenth", () => {
    const text = flightText("muw", [
      { timeMs: T0 + 0.4, point: [45.123456789, 10.987654321], altM: 1234.56 },
    ]);
    expect(fixesOfText(text)).toEqual([
      { timeMs: T0, point: [45.123457, 10.987654], altM: 1234.6 },
    ]);
    expect(fixesOfText('{"version":2,"fixes":[]}')).toBeNull();
    expect(fixesOfText('{"version":1,"fixes":[[1,2,3]]}')).toBeNull();
  });

  it("takes the fixes of a recorded track, without a height the phone did not give", () => {
    expect(
      flightFixesOf({
        distanceM: 10,
        fixes: [
          { point: BALDO, timeMs: T0, accuracyM: 5, altitudeM: 1700 },
          { point: BALDO, timeMs: T0 + 1000, accuracyM: 5, altitudeM: null },
          { point: BALDO, timeMs: T0 + 2000, accuracyM: 5 },
          { point: BALDO, timeMs: T0 + 3000, accuracyM: 5, altitudeM: Number.NaN },
        ],
      }).map((fix) => fix.altM),
    ).toEqual([1700, null, null, null]);
  });
});
