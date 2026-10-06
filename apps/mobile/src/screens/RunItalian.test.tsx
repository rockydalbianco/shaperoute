import type { Direction, LatLon } from "@shaperoute/shared-types";
import { act, render, screen } from "@testing-library/react-native";

import { IT } from "../i18n/it";
import { saveLanguageChoice } from "../i18n/language";
import { startNavigation } from "../navigation/navigator";
import { aboutMinutes, compassWords } from "../navigation/runStats";
import { emptyTrack } from "../navigation/trackRecorder";
import { durationLabel, FinishBanner } from "./FinishScreen";
import { FreeFinishBanner } from "./FreeRunScreen";
import { HoldButton } from "./HoldButton";
import { NavigationBanner } from "./NavigateScreen";
import { RunStrip, useRunNumbers } from "./RunPanel";

// The run's screens in the app's language (TASK-210): what the banner, the
// numbers and the buttons say in Italian, with the turn written by the
// voice's phrasebook.

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

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
const north = (m: number): LatLon => [START[0] + m * METRE, START[1]];
const ROUTE: LatLon[] = [north(0), north(500), north(1000)];
function direction(
  turn: Direction["turn"],
  distance_m: number,
  street: string,
): Direction {
  return {
    node: 0,
    point: north(distance_m),
    distance_m,
    turn,
    angle_deg: 0,
    street,
    road_type: "residential",
    branches: 3,
    joined: false,
  };
}
const DIRECTIONS = [
  direction("depart", 0, "Via Roma"),
  direction("left", 500, "Via Verdi"),
  direction("right", 520, "Via Bianchi"),
];
DIRECTIONS[2].joined = true;

beforeEach(async () => {
  await act(async () => saveLanguageChoice("it"));
});

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("the next turn is written in Italian, with the ones joined to it", async () => {
  const { navigation } = startNavigation(ROUTE, DIRECTIONS);
  await render(
    <NavigationBanner
      state={{ status: "following", navigation, position: null, track: emptyTrack() }}
    />,
  );
  // The next turn is the left onto Via Verdi, with the right joined to it.
  expect(screen.getByText(/Via Verdi/)).toBeOnTheScreen();
  expect(screen.getByText(/^Poi .*Via Bianchi/)).toBeOnTheScreen();
  expect(screen.queryByText(/Turn left|Then /)).toBeNull();
});

test("the finish and the free run speak Italian", async () => {
  await render(<FinishBanner />);
  expect(screen.getByText("La tua corsa")).toBeOnTheScreen();
  // The two lines of the map's legend were translated with the share
  // picture already: the same words here.
  expect(
    screen.getByText(IT["Yellow: the route. White: what you ran."]),
  ).toBeOnTheScreen();
  await render(<FreeFinishBanner />);
  expect(screen.getByText(IT["White: what you ran."])).toBeOnTheScreen();
});

test("the numbers under the map, the hold button and the times", async () => {
  const Strip = () => <RunStrip numbers={useRunNumbers(emptyTrack(), false)} />;
  await render(<Strip />);
  expect(screen.getByText("Distanza")).toBeOnTheScreen();
  expect(screen.getByText("Passo ora")).toBeOnTheScreen();
  expect(screen.getByText("Tempo")).toBeOnTheScreen();
  await render(<HoldButton onHeld={() => {}} />);
  expect(screen.getByLabelText("Stop")).toBeOnTheScreen();
  expect(durationLabel(32 * 60_000)).toBe("32 min");
  expect(aboutMinutes(17 * 60_000)).toBe("circa 17 min");
  expect(compassWords(90)).toBe("east");
});
