import type { Direction, LatLon } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { BASE_LANGUAGE } from "../i18n/languages";
import { type Navigation, onFix, startNavigation } from "../navigation/navigator";
import { cumulative } from "../navigation/progress";
import { emptyTrack } from "../navigation/trackRecorder";
import { alongWay, wayShownOf } from "../navigation/wayBackShown";
import { saveUnitsChoice } from "../units/units";
import { NavigationBanner, NavigationCard } from "./NavigateScreen";

// Off the route with the way back on the streets (TASK-314): the banner
// shows the way's next turn as the route's turn is shown, under «Off the
// route»; without one, how far the route is (TASK-303).

jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
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

// A street due east: 0.001° of longitude here is about 77 m.
const LAT = 46.0;
function at(x: number, y: number): LatLon {
  return [LAT + y / 111_195, 11.0 + x / 77_243];
}
const STREET: LatLon[] = [0, 250, 500, 750, 1000].map((x) => at(x, 0));

function direction(
  turn: Direction["turn"],
  distanceM: number,
  street: string,
  point: LatLon,
): Direction {
  return {
    node: 0,
    point,
    distance_m: distanceM,
    turn,
    angle_deg: 0,
    street,
    road_type: "residential",
    branches: 3,
    joined: false,
    along: null,
  };
}

/** On the street to 300 m, then north of it, up to 118 m. */
function offTheRoute(): Navigation {
  let { navigation } = startNavigation(STREET, []);
  const fixes = [
    ...Array.from({ length: 51 }, (_, i) => at(6 * i, 0)),
    ...Array.from({ length: 20 }, (_, i) => at(300, 6 * (i + 1))),
  ];
  fixes.forEach((fix, i) => {
    navigation = onFix(navigation, fix, { accuracyM: 8, timeMs: i * 2000 }).navigation;
  });
  expect(navigation.offRoute).toBe(true);
  return navigation;
}

/** The way from there: on to Via Nord, then right onto it, east to Via Sud,
 * right onto it, and left onto the route. The runner 30 m short of Via Nord. */
function withWay(navigation: Navigation, hereY = 90): Navigation {
  const points: LatLon[] = [at(300, 120), at(300, 140), at(500, 140), at(500, 0)];
  const along = cumulative(points);
  const shown = wayShownOf(
    {
      points,
      distance_m: along[3],
      rejoin: points[3],
      rejoin_m: 200,
      directions: [
        direction("depart", 0, "Via Nord", points[0]),
        direction("right", along[1], "Via Est", points[1]),
        direction("right", along[2], "Via Sud", points[2]),
        direction("left", along[3], "Via Roma", points[3]),
      ],
    },
    300,
  );
  const on = alongWay(shown, at(300, hereY + 30), { accuracyM: 8 }, BASE_LANGUAGE);
  return { ...navigation, wayBack: on.shown };
}

function following(navigation: Navigation) {
  return {
    status: "following",
    navigation,
    position: null,
    track: emptyTrack(),
  } as const;
}

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    saveUnitsChoice("phone");
  });
});

test("off the route with a way back, the banner shows its next turn", async () => {
  await act(async () => saveUnitsChoice("km"));
  await render(<NavigationBanner state={following(withWay(offTheRoute()))} />);
  expect(screen.getByText("Off the route")).toBeOnTheScreen();
  expect(screen.getByText("20 m")).toBeOnTheScreen();
  expect(screen.getByText("Turn right onto Via Est")).toBeOnTheScreen();
  expect(screen.getByText("→", { includeHiddenElements: true })).toBeOnTheScreen();
  // The way, not the straight line.
  expect(screen.queryByText(/^\d+ m S$/)).toBeNull();
  expect(screen.queryByText("Follow the dotted line back to the route.")).toBeNull();
});

test("on «Data» too, in place of the turn", async () => {
  await act(async () => saveUnitsChoice("km"));
  await render(
    <NavigationCard navigation={withWay(offTheRoute())} onStop={jest.fn()} />,
  );
  await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
  expect(screen.getByText("Turn right onto Via Est")).toBeOnTheScreen();
});

test("in Italian, with miles in feet", async () => {
  await act(async () => {
    saveLanguageChoice("it");
    saveUnitsChoice("mi");
  });
  await render(<NavigationBanner state={following(withWay(offTheRoute()))} />);
  expect(screen.getByText("Fuori percorso")).toBeOnTheScreen();
  expect(screen.getByText(/^Svolta a destra .*Via Est$/)).toBeOnTheScreen();
  expect(screen.getByText(/ ft$/)).toBeOnTheScreen();
});

test("past the way's last turn, how far the route is, as before", async () => {
  await act(async () => saveUnitsChoice("km"));
  const navigation = withWay(offTheRoute());
  const done = {
    ...navigation,
    wayBack: { ...navigation.wayBack!, next: navigation.wayBack!.directions.length },
  };
  await render(<NavigationBanner state={following(done)} />);
  expect(screen.getByText("Off the route")).toBeOnTheScreen();
  expect(
    screen.getByText("Follow the dotted line back to the route."),
  ).toBeOnTheScreen();
});
