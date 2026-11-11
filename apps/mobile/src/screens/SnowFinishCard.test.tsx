/**
 * The end of a day on the snow (TASK-375 part C, ADR-0319): the numbers of
 * a day of skiing or of cross-country skiing in place of a run's, no
 * calories, and «Your day» over the map.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { translate } from "../i18n/translate";
import type { FreeRun } from "../navigation/freeRun";
import { addFix, emptyTrack, type Track } from "../navigation/trackRecorder";
import type { Sport } from "../settings/sport";
import { saveUnitsChoice } from "../units/units";
import { FreeFinishBanner, FreeFinishCard } from "./FreeRunScreen";
import { speedOf } from "./SnowFinishCard";

let mockSport: Sport = "ski";
jest.mock("../settings/useSport", () => ({ useSport: () => mockSport }));

jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const START: LatLon = [46.4, 11.8];
const METRE = 1 / 111_195;

/** Two descents of 1.2 km and 300 m down at 10 m/s, a chairlift between
 * them: 300 m up in five minutes. */
function twoDescents(): Track {
  let track = emptyTrack();
  let north = 0;
  let height = 2000;
  let at = 0;
  const go = (seconds: number, every: number, northM: number, upM: number) => {
    for (let s = every; s <= seconds; s += every) {
      track = addFix(track, {
        point: [START[0] + (north + (northM * s) / seconds) * METRE, START[1]],
        timeMs: (at + s) * 1000,
        accuracyM: 5,
        altitudeM: height + (upM * s) / seconds,
      });
    }
    north += northM;
    height += upM;
    at += seconds;
  };
  track = addFix(track, {
    point: START,
    timeMs: 0,
    accuracyM: 5,
    altitudeM: height,
  });
  go(120, 5, 1200, -300);
  go(300, 10, -1200, 300);
  go(120, 5, 1200, -300);
  return track;
}

function dayOf(track: Track): FreeRun {
  return { version: 1, route: [], track, status: "stopped" };
}

afterEach(() => {
  mockSport = "ski";
  saveUnitsChoice("km");
});

test("a day of skiing has its descents, metres down, speeds and lifts", async () => {
  await render(<FreeFinishCard run={dayOf(twoDescents())} onDone={jest.fn()} />);
  // Only the descents' kilometres, not the lift's.
  expect(screen.getByLabelText("Skied: 2.40 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Descents: 2")).toBeOnTheScreen();
  expect(screen.getByLabelText("Vertical: 600 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Top speed: 36.0 km/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Avg speed: 36.0 km/h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Lifts: 1")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time: 9:00")).toBeOnTheScreen();
  // The whole day, the lift too (TASK-406 part D2), then the snow and gear.
  expect(screen.getByLabelText("Total: 3.60 km")).toBeOnTheScreen();
  expect(screen.getByText("How was the snow?")).toBeOnTheScreen();
  expect(screen.getByLabelText("Your gear")).toBeOnTheScreen();
  // Calories on the descents alone (TASK-424 part C2): 4 minutes at 5.3
  // MET for 70 kg, less the rest. No pace.
  expect(screen.getByLabelText("Calories: 21 kcal")).toBeOnTheScreen();
  expect(screen.queryByText("Avg pace")).toBeNull();
});

test("with miles the speeds are in mph and the kilometres in miles", async () => {
  saveUnitsChoice("mi");
  await render(<FreeFinishCard run={dayOf(twoDescents())} onDone={jest.fn()} />);
  expect(screen.getByLabelText("Skied: 1.49 mi")).toBeOnTheScreen();
  expect(screen.getByLabelText("Top speed: 22.4 mph")).toBeOnTheScreen();
  // The metres down stay metres, as the metres climbed of a run.
  expect(screen.getByLabelText("Vertical: 600 m")).toBeOnTheScreen();
});

test("a day of cross-country skiing has a run's distance, pace, climb and calories", async () => {
  mockSport = "xc_ski";
  await render(<FreeFinishCard run={dayOf(twoDescents())} onDone={jest.fn()} />);
  expect(screen.getByLabelText("Distance: 3.60 km")).toBeOnTheScreen();
  expect(screen.getByText("Avg pace")).toBeOnTheScreen();
  expect(screen.getByLabelText("Elev. gain: 300 m")).toBeOnTheScreen();
  expect(screen.getByLabelText("Time: 9:00")).toBeOnTheScreen();
  // Its own formula (TASK-424 part C2): 24 km/h, racing, 15 MET for 9 min.
  expect(screen.getByLabelText("Calories: 154 kcal")).toBeOnTheScreen();
  expect(screen.queryByText("Descents")).toBeNull();
  // The resort's snow and gear are a downhill day's.
  expect(screen.queryByText("Total")).toBeNull();
  expect(screen.queryByText("How was the snow?")).toBeNull();
});

test("the day keeps the ways out of a run", async () => {
  const onResume = jest.fn();
  const onDone = jest.fn();
  await render(
    <FreeFinishCard run={dayOf(twoDescents())} onResume={onResume} onDone={onDone} />,
  );
  await fireEvent.press(screen.getByText("Keep running"));
  await fireEvent.press(screen.getByText("Done"));
  expect(onResume).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("a run keeps its own end", async () => {
  mockSport = "run";
  await render(<FreeFinishCard run={dayOf(twoDescents())} onDone={jest.fn()} />);
  expect(screen.getByText("Calories")).toBeOnTheScreen();
  expect(screen.queryByText("Descents")).toBeNull();
});

test.each<[Sport, string, string]>([
  ["xc_ski", "Your day", "White: where you skied."],
  ["run", "Your run", "White: what you ran."],
])("over the map of %s: %s", async (sport, title, line) => {
  mockSport = sport;
  await render(<FreeFinishBanner />);
  expect(screen.getByText(title)).toBeOnTheScreen();
  expect(screen.getByText(line)).toBeOnTheScreen();
});

test("a speed not known yet is a dash", () => {
  expect(speedOf(null, "km")).toBe("–");
  expect(speedOf(10, "km")).toBe("36.0");
});

test("the approved texts, in Italian", () => {
  expect(translate("it", "Your day")).toBe("La tua giornata");
  expect(translate("it", "White: where you skied.")).toBe("Bianco: dove hai sciato.");
  expect(translate("it", "Skied: {distance}", { distance: "2,40 km" })).toBe(
    "Sciati: 2,40 km",
  );
  expect(translate("it", "Descents")).toBe("Discese");
  expect(translate("it", "Vertical")).toBe("Dislivello");
  expect(translate("it", "Top speed")).toBe("Vel. max");
  expect(translate("it", "Lifts")).toBe("Risalite");
});

// TASK-429 part B: over the map of a day of skiing the legend of its
// colours; on the card «Summary · Map · Runs».

test("over the map of a day of skiing: «Your day» and the legend", async () => {
  mockSport = "ski";
  await render(<FreeFinishBanner />);
  expect(screen.getByText("Your day")).toBeOnTheScreen();
  expect(screen.getByTestId("ski-legend")).toBeOnTheScreen();
  expect(screen.getByText("Descents · solid, numbered")).toBeOnTheScreen();
});

test("a day of skiing opens on «Summary»; «Map» leaves the map, «Runs» the parts", async () => {
  await render(<FreeFinishCard run={dayOf(twoDescents())} onDone={jest.fn()} />);
  expect(screen.getByRole("tab", { name: "Summary" })).toBeSelected();
  expect(screen.getByLabelText("Descents: 2")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("tab", { name: "Map" }));
  expect(screen.queryByLabelText("Descents: 2")).toBeNull();
  expect(screen.queryByTestId("ski-runs")).toBeNull();
  // The way out stays.
  expect(screen.getByRole("button", { name: "Done" })).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("tab", { name: "Runs" }));
  expect(screen.getByTestId("ski-runs")).toBeOnTheScreen();
  expect(screen.getByTestId("ski-run-1")).toBeOnTheScreen();
  expect(screen.getByTestId("ski-run-L1")).toBeOnTheScreen();
  expect(screen.getByTestId("ski-run-2")).toBeOnTheScreen();
  expect(screen.getAllByText("36.0 km/h top")).toHaveLength(2);
});

test("cross-country has no sections", async () => {
  mockSport = "xc_ski";
  await render(<FreeFinishCard run={dayOf(twoDescents())} onDone={jest.fn()} />);
  expect(screen.queryByRole("tab")).toBeNull();
});
