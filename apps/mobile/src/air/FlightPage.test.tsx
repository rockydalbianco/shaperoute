/**
 * Under «Record your flight» (TASK-305 part R5b, the user's choices of
 * 2026-11-12): «Ready to fly» with the GPS and «Share live at start»;
 * «Your flights», the month, which opens the calendar on the flights; «Your
 * best flights», each opening its flight. In the words the user approved.
 */
import calendar from "@shaperoute/shared-types/fixtures/activity-calendar.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { ActivityCalendar, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { type FlightBests, isFlightBests } from "../api/flightBests";
import { translate } from "../i18n/translate";
import { DrawingsContext, type DrawingsDoor } from "../social/drawingsDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { bestRows } from "./FlightBests";
import { FlightPage } from "./FlightPage";
import { flightsLine } from "./FlightsMonth";
import { resetLiveAtStart } from "./liveAtStart";
import { gpsLine, type WatchAccuracy } from "./useGpsAccuracy";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const base = calendar as ActivityCalendar;
const flight = { ...base.days[0].activities[0], activity: "paragliding" as const };
const MONTH: ActivityCalendar = {
  ...base,
  sport: "paragliding",
  count: 2,
  distance_m: 30_000,
  duration_s: 9_000,
  days: [
    { day: 8, activities: [{ ...flight, id: "7c2e91a4b05d3f68" }] },
    { day: 9, activities: [{ ...flight, id: "e5d0a83f19c7b246" }] },
  ],
};
const BESTS: FlightBests = {
  highest: { id: "7c2e91a4b05d3f68", started_at: "2026-11-08T09:12:04Z", value: 2341 },
  longest: { id: "e5d0a83f19c7b246", started_at: "2026-11-09T10:40:00Z", value: 7512 },
  farthest: null,
  fastest: { id: "7c2e91a4b05d3f68", started_at: "2026-11-08T09:12:04Z", value: 16.94 },
};

const openRun = jest.fn();
// The grid is a picture for the screen reader: the line under it says it.
const HIDDEN = { includeHiddenElements: true };

function follows(signedIn: boolean): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: signedIn
        ? { status: "signedIn", session: session as Session }
        : { status: "signedOut" },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

/** The API by its path: the calendar and the bests, whatever their order. */
function api(bests: unknown = BESTS) {
  return jest.fn(async (url: string) => {
    if (url.includes("/me/flight-bests")) {
      return Response.json(bests, { status: 200 });
    }
    if (url.includes("/me/activity-calendar")) {
      return Response.json(MONTH, { status: 200 });
    }
    throw new Error(`Not asked here: ${url}`);
  });
}

/** A GPS that reads `metres` at once, or never. */
function gps(metres: number | null): WatchAccuracy {
  return async (onAccuracy) => {
    if (metres !== null) {
      onAccuracy(metres);
    }
    return () => {};
  };
}

async function shown(fetchFn: jest.Mock, watch: WatchAccuracy, signedIn = true) {
  await render(
    <FollowsContext.Provider value={follows(signedIn)}>
      <ActivitiesContext.Provider
        value={{ open: openRun, total: 2 } as unknown as ActivitiesDoor}
      >
        <DrawingsContext.Provider
          value={{ open: jest.fn() } as unknown as DrawingsDoor}
        >
          <FlightPage fetchFn={fetchFn} watch={watch} />
        </DrawingsContext.Provider>
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

beforeEach(() => {
  openRun.mockReset();
  resetLiveAtStart();
});

test("the month's flights, the bests and the GPS, for one signed in", async () => {
  const fetchFn = api();
  await shown(fetchFn, gps(4.6));
  expect(screen.getByText("Ready to fly")).toBeOnTheScreen();
  expect(screen.getByText("GPS ready · ±5 m")).toBeOnTheScreen();
  expect(screen.getByRole("switch", { name: "Share live at start" })).toBeOnTheScreen();
  expect(screen.getByText("Your flights")).toBeOnTheScreen();
  expect(screen.getByTestId("flights-line")).toHaveTextContent("2 flights · 2:30:00");
  expect(screen.getByTestId("flown-8", HIDDEN)).toBeOnTheScreen();
  expect(screen.getByTestId("flown-9", HIDDEN)).toBeOnTheScreen();
  expect(screen.queryByTestId("flown-10", HIDDEN)).toBeNull();
  // Asked for the flights alone.
  const urls = fetchFn.mock.calls.map((call) => String(call[0]));
  expect(urls.some((url) => url.includes("sport=paragliding"))).toBe(true);
  expect(screen.getByText("Your best flights")).toBeOnTheScreen();
  expect(screen.getByText("2341 m")).toBeOnTheScreen();
  expect(screen.queryByText("Farthest flight")).toBeNull();
  await fireEvent.press(screen.getByTestId("flight-best-longest"));
  expect(openRun).toHaveBeenCalledWith({ id: "e5d0a83f19c7b246" });
});

test("the month opens the calendar on the flights", async () => {
  const fetchFn = api();
  await shown(fetchFn, gps(null));
  const before = fetchFn.mock.calls.length;
  await fireEvent.press(screen.getByTestId("flights-month"));
  await act(async () => {});
  const asked = fetchFn.mock.calls.slice(before).map((call) => String(call[0]));
  expect(asked).toHaveLength(1);
  expect(asked[0]).toContain("/me/activity-calendar");
  expect(asked[0]).toContain("sport=paragliding");
});

test("a weak GPS says to wait; none yet says it waits", async () => {
  await shown(api(), gps(25.2));
  expect(screen.getByText("Weak GPS · ±25 m: wait in the open")).toBeOnTheScreen();
  expect(gpsLine({ kind: "waiting" })).toBe("Waiting for GPS…");
  expect(gpsLine({ kind: "fix", accuracyM: 10 })).toBe("GPS ready · ±10 m");
  expect(gpsLine({ kind: "off" })).toBeNull();
});

test("signed out: the GPS only, no switch, no month, no bests", async () => {
  const fetchFn = api();
  await shown(fetchFn, gps(6), false);
  expect(screen.getByText("GPS ready · ±6 m")).toBeOnTheScreen();
  expect(screen.queryByRole("switch")).toBeNull();
  expect(screen.queryByTestId("flights-month")).toBeNull();
  expect(screen.queryByTestId("flight-bests")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("no bests before the first flight; an answer that is not the bests shows none", async () => {
  const none = { highest: null, longest: null, farthest: null, fastest: null };
  await shown(api(none), gps(5));
  expect(screen.queryByTestId("flight-bests")).toBeNull();
  expect(isFlightBests(none)).toBe(true);
  expect(isFlightBests({ highest: { id: 1 } })).toBe(false);
});

test("the switch is kept for the next flights", async () => {
  await shown(api(), gps(5));
  const toggle = screen.getByRole("switch", { name: "Share live at start" });
  expect(toggle).not.toBeChecked();
  await fireEvent.press(toggle);
  expect(screen.getByRole("switch", { name: "Share live at start" })).toBeChecked();
});

test("the lines of the month and of the bests", () => {
  expect(flightsLine(0, 0)).toBe("No flights this month");
  expect(flightsLine(1, 3600)).toBe("1 flight · 1:00:00");
  expect(bestRows(BESTS, "km").map((row) => row.value)).toEqual([
    "2341 m",
    "2:05:12",
    "61.0 km/h",
  ]);
  expect(bestRows(BESTS, "mi")[2].value).toBe("37.9 mph");
});

test("the words, in each language", () => {
  const words = [
    "Your flights",
    "Ready to fly",
    "Share live at start",
    "Weak GPS · ±{m} m: wait in the open",
  ];
  expect(
    (["it", "de", "fr", "es"] as const).map((language) =>
      words.map((word) => translate(language, word)),
    ),
  ).toEqual([
    [
      "I tuoi voli",
      "Pronto al decollo",
      "Condividi dal vivo alla partenza",
      "GPS debole · ±{m} m: aspetta all'aperto",
    ],
    [
      "Deine Flüge",
      "Startbereit",
      "Beim Start live teilen",
      "Schwaches GPS · ±{m} m: warte im Freien",
    ],
    [
      "Vos vols",
      "Prêt à décoller",
      "Partager en direct au départ",
      "GPS faible · ±{m} m : attendez à découvert",
    ],
    [
      "Tus vuelos",
      "Listo para despegar",
      "Compartir en directo al empezar",
      "GPS débil · ±{m} m: espera al aire libre",
    ],
  ]);
});
