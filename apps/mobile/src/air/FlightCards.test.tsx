/**
 * A flight on the screens of the recording (TASK-305 part R2, ADR-0375):
 * over the numbers the altitude, the vario and the highest altitude; at
 * the end the distance, the time of the flight, the highest altitude, the
 * metres climbed, the top speed and the calories; «Your flight» over the
 * map.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { FreeRun } from "../navigation/freeRun";
import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import {
  FreeFinishBanner,
  FreeFinishCard,
  FreeRunCard,
} from "../screens/FreeRunScreen";
import type { Sport } from "../settings/sport";
import { saveUnitsChoice } from "../units/units";
import { resetAirspace, setAirspace } from "./airspaceStore";
import { FlightFinishCard } from "./FlightFinishCard";
import { FlightLive, varioText } from "./FlightLive";
import { resetFlightNotice } from "./flightNotice";

let mockSport: Sport = "paragliding";
jest.mock("../settings/useSport", () => ({ useSport: () => mockSport }));

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
jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const mockShown: string[] = [];
beforeEach(() => {
  jest.spyOn(Alert, "alert").mockImplementation((title: string) => {
    mockShown.push(title);
  });
});

const START: LatLon = [45.73, 10.83];
const METRE = 1 / 111_195;

/** Five minutes north at 10 m/s, up 1 m/s from 1500 m, then two minutes
 * down at 1.5 m/s and 12 m/s. */
function flight(): Track {
  let track = emptyTrack();
  for (let s = 0; s <= 300; s += 2) {
    track = addFix(track, {
      point: [START[0] + 10 * s * METRE, START[1]],
      timeMs: s * 1000,
      accuracyM: 5,
      altitudeM: 1500 + s,
    });
  }
  for (let s = 2; s <= 120; s += 2) {
    track = addFix(track, {
      point: [START[0] + (3000 + 12 * s) * METRE, START[1]],
      timeMs: (300 + s) * 1000,
      accuracyM: 5,
      altitudeM: 1800 - 1.5 * s,
    });
  }
  return track;
}

function flown(track: Track): FreeRun {
  return { version: 1, route: [], track, status: "stopped" };
}

afterEach(() => {
  mockSport = "paragliding";
  mockShown.length = 0;
  resetFlightNotice();
  saveUnitsChoice("km");
});

test("the vario with its sign", () => {
  expect(varioText(1.24)).toBe("+1.2");
  expect(varioText(-0.8)).toBe("-0.8");
  expect(varioText(0.02)).toBe("0.0");
  expect(varioText(null)).toBe("–");
});

test("in the air: the altitude, the vario and the highest altitude", async () => {
  await render(<FlightLive track={flight()} live={false} />);
  expect(screen.getByLabelText("Altitude: 1620 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Vario: -1.5 m/s")).toBeOnTheScreen();
  expect(screen.getByLabelText("Max altitude: 1800 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Elev. gain: 300 m")).toBeOnTheScreen();
});

test("the card of a flight has the flight's numbers over it, and the notice", async () => {
  await render(<FreeRunCard running={false} track={flight()} onStop={jest.fn()} />);
  expect(screen.getByTestId("flight-live")).toBeOnTheScreen();
  expect(mockShown).toEqual(["Before you fly"]);
});

test("a run has neither the flight's numbers nor the notice", async () => {
  mockSport = "run";
  await render(<FreeRunCard running={false} track={flight()} onStop={jest.fn()} />);
  expect(screen.queryByTestId("flight-live")).toBeNull();
  expect(mockShown).toEqual([]);
});

test("the end of a flight: distance, time, highest, climbed, top speed, calories", async () => {
  await render(
    <FlightFinishCard
      run={flown(flight())}
      activity="paragliding"
      onDone={jest.fn()}
    />,
  );
  expect(screen.getByLabelText("Distance: 4.44 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Flight time: 7:00")).toBeOnTheScreen();
  expect(screen.getByLabelText("Max altitude: 1800 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Top speed: 43.2 km/h")).toBeOnTheScreen();
  expect(screen.getByText("Elev. gain")).toBeOnTheScreen();
  expect(screen.getByLabelText("Calories: 21 kcal")).toBeOnTheScreen();
});

test("a flight ends on its own card and banner, from the sport of «Settings»", async () => {
  await render(<FreeFinishCard run={flown(flight())} onDone={jest.fn()} />);
  expect(screen.getByTestId("flight-finish")).toBeOnTheScreen();
  await render(<FreeFinishBanner />);
  expect(screen.getByText("Your flight")).toBeOnTheScreen();
  expect(screen.getByText("White: where you flew.")).toBeOnTheScreen();
});

test("the end of a flight has its airspace line only with a file (E3)", async () => {
  resetAirspace();
  setAirspace(null);
  const card = () => (
    <FlightFinishCard run={flown(flight())} activity="paragliding" onDone={jest.fn()} />
  );
  await render(card());
  expect(screen.queryByTestId("airspace-log-row")).toBeNull();
  // Invented: a box around the whole flight, from the ground up.
  setAirspace({
    fileName: "test.txt",
    loadedAtMs: 0,
    unread: 0,
    airspaces: [
      {
        class: "R",
        name: "TEST BOX",
        floor: { kind: "ground" },
        ceiling: { kind: "unlimited" },
        points: [
          [START[0] - 0.1, START[1] - 0.1],
          [START[0] - 0.1, START[1] + 0.1],
          [START[0] + 0.1, START[1] + 0.1],
          [START[0] + 0.1, START[1] - 0.1],
        ],
      },
    ],
  });
  await render(card());
  expect(screen.getByTestId("airspace-log-row")).toHaveTextContent(
    "Inside your airspaces: 1 ›",
    { exact: false },
  );
  setAirspace(null);
});
