/**
 * The flight screen (TASK-479 part B1, the user's choices of 2026-11-21):
 * pages of widgets in the chosen preset, «Map» back to the recording, the
 * lock held to undo, dark or bright, the pilot's units kept, the fixed
 * line always there; and it opens by itself at the take-off.
 */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react-native";

import { FIXED_LINE, FlightScreen } from "./FlightScreen";
import {
  defaultFlightPrefs,
  loadFlightPrefs,
  pagesOf,
  profileName,
  saveFlightPrefs,
} from "./flightLayout";
import { numberSize } from "./FlightWidget";
import { resetFlightNotice } from "./flightNotice";
import { flightOf, T0 } from "./syntheticFlight";
import { resetAirspace, setAirspace } from "./airspaceStore";
import { glidePrefsNow, resetGlidePrefs } from "./glidePrefs";
import { addManualWaypoint, resetManualWaypoints } from "./manualWaypoints";
import { refreshSiteLandings, resetSiteLandings } from "./siteLandings";
import { resetTaskProgress } from "./taskProgress";
import { destination } from "./taskRoute";
import { resetWaypointStore, setTask } from "./waypointStore";
import { useFlightScreen } from "./useFlightScreen";
import {
  DEFAULT_VARIO_PREFS,
  loadVarioPrefs,
  resetVarioPrefs,
  setVarioPrefs,
} from "./varioPrefs";

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

const glide = (seconds: number) =>
  ({
    kind: "glide",
    seconds,
    airspeedMps: 10,
    headingDeg: 90,
    varioMps: -1.2,
  }) as const;
const circle = (seconds: number) =>
  ({
    kind: "circle",
    seconds,
    airspeedMps: 10,
    turnSeconds: 20,
    direction: 1,
    varioMps: 2.4,
  }) as const;

const TRACK = flightOf([glide(60), circle(90)], {
  fromAltM: 1800,
  wind: { fromDeg: 270, mps: 4 },
});

async function showScreen(onClose = jest.fn()) {
  await render(
    <FlightScreen
      visible
      onClose={onClose}
      track={TRACK}
      live={false}
      takeoffMs={T0}
      sharingLive={false}
    />,
  );
  // The pages lay out once their area is measured.
  await fireEvent(screen.getByTestId("flight-pages"), "layout", {
    nativeEvent: { layout: { width: 390, height: 640 } },
  });
  return onClose;
}

describe("FlightScreen", () => {
  it("shows the «Thermal» preset's first page, with the numbers of now", async () => {
    await showScreen();
    expect(screen.getByTestId("widget-vario")).toBeTruthy();
    expect(screen.getByTestId("widget-thermalAssistant")).toBeTruthy();
    expect(screen.getByTestId("thermal-best")).toBeTruthy();
    // Climbing 2.4 m/s in a circling.
    expect(screen.getAllByText("+2.4").length).toBeGreaterThan(0);
    expect(screen.getByText(FIXED_LINE)).toBeTruthy();
  });

  it("goes back to the recording with «Map»", async () => {
    const onClose = await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-map"));
    expect(onClose).toHaveBeenCalled();
  });

  it("locks the touches; a press only tells to hold, a hold undoes it", async () => {
    const onClose = await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-lock"));
    expect(screen.getByTestId("flight-screen-locked")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("flight-screen-map"));
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("flight-screen-lock"));
    expect(screen.getAllByText("Hold to unlock").length).toBeGreaterThan(0);
    await fireEvent(screen.getByTestId("flight-screen-lock"), "longPress");
    expect(screen.queryByTestId("flight-screen-locked")).toBeNull();
  });

  it("changes the preset and the units, and keeps them", async () => {
    await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-layout"));
    await fireEvent.press(screen.getByText("XC"));
    await fireEvent.press(screen.getByText("ft"));
    await fireEvent.press(screen.getByText("Sunlight"));
    await fireEvent.press(screen.getByTestId("flight-options-done"));
    expect(screen.getByTestId("widget-glide")).toBeTruthy();
    const kept = loadFlightPrefs("km");
    expect(profileName(kept.profiles[kept.current])).toBe("XC");
    expect(kept.look).toBe("sun");
    expect(kept.units).toEqual({ altitude: "ft", vario: "mps", speed: "kmh" });
  });
});

describe("the map and the height above the ground (part A1)", () => {
  beforeEach(() => {
    saveFlightPrefs(defaultFlightPrefs("km"));
  });

  it("«Thermal» reads the ground and has the map on its second page", async () => {
    await showScreen();
    expect(screen.getByTestId("widget-aboveGround")).toBeTruthy();
    expect(screen.getByTestId("ground-probe")).toBeTruthy();
    expect(screen.getByTestId("flight-map")).toBeTruthy();
  });

  it("reads no ground for a profile that does not show it", async () => {
    const prefs = defaultFlightPrefs("km");
    saveFlightPrefs({ ...prefs, current: 2 });
    await showScreen();
    expect(screen.queryByTestId("ground-probe")).toBeNull();
  });
});

describe("the airspaces of the pilot's file (part E2)", () => {
  beforeEach(() => {
    resetAirspace();
    setAirspace(null);
  });

  it("warns on the screen when the pilot is inside one of their volumes", async () => {
    const [lat, lon] = TRACK.fixes[TRACK.fixes.length - 1].point;
    setAirspace({
      fileName: "test.txt",
      loadedAtMs: 0,
      unread: 0,
      airspaces: [
        {
          class: "R",
          name: "TEST BOX",
          floor: { kind: "aboveSea", metres: 500 },
          ceiling: { kind: "unlimited" },
          points: [
            [lat - 0.01, lon - 0.01],
            [lat - 0.01, lon + 0.01],
            [lat + 0.01, lon + 0.01],
            [lat + 0.01, lon - 0.01],
          ],
        },
      ],
    });
    await showScreen();
    expect(screen.getByTestId("airspace-alert")).toBeTruthy();
    expect(screen.getByText("TEST BOX (R) · inside · floor 500 m")).toBeTruthy();
  });

  it("warns of nothing without a file", async () => {
    await showScreen();
    expect(screen.queryByTestId("airspace-alert")).toBeNull();
  });

  it("bands the altitude chart where the pilot was over a volume (E3)", async () => {
    const [lat, lon] = TRACK.fixes[TRACK.fixes.length - 1].point;
    setAirspace({
      fileName: "test.txt",
      loadedAtMs: 0,
      unread: 0,
      airspaces: [
        {
          class: "D",
          name: "TEST BOX",
          floor: { kind: "ground" },
          ceiling: { kind: "aboveSea", metres: 3000 },
          points: [
            [lat - 0.01, lon - 0.01],
            [lat - 0.01, lon + 0.01],
            [lat + 0.01, lon + 0.01],
            [lat + 0.01, lon - 0.01],
          ],
        },
      ],
    });
    await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-layout"));
    await fireEvent.press(screen.getByText("XC"));
    await fireEvent.press(screen.getByTestId("flight-options-done"));
    expect(screen.getByTestId("widget-altitudeChart")).toBeTruthy();
    expect(screen.getAllByTestId("altitude-chart-band").length).toBeGreaterThan(0);
  });

  it("bands nothing without a file (E3)", async () => {
    await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-layout"));
    await fireEvent.press(screen.getByText("XC"));
    await fireEvent.press(screen.getByTestId("flight-options-done"));
    expect(screen.queryAllByTestId("altitude-chart-band")).toHaveLength(0);
  });
});

describe("the pilot's task (part D2)", () => {
  beforeEach(() => {
    resetTaskProgress();
    resetWaypointStore();
    resetGlidePrefs();
    setTask(null);
  });

  async function showCompetition() {
    await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-layout"));
    await fireEvent.press(screen.getByText("Competition"));
    await fireEvent.press(screen.getByTestId("flight-options-done"));
  }

  it("shows the next turnpoint, the glide to goal and the way left", async () => {
    const here = TRACK.fixes[TRACK.fixes.length - 1].point;
    const north = (km: number) => destination(here, 0, km * 1000);
    const point = (name: string, at: [number, number], radiusM: number) => ({
      waypoint: {
        name,
        code: null,
        point: at,
        altM: 500,
        landing: false,
        description: null,
      },
      radiusM,
      kind: "turnpoint" as const,
    });
    // An invented task: B1 5 km north of the pilot, the goal 10 km.
    setTask({
      fileName: "test.xctsk",
      loadedAtMs: T0,
      task: {
        earth: "wgs84",
        turnpoints: [
          { ...point("TO", here, 400), kind: "takeoff" },
          point("B1", north(5), 1000),
          { ...point("GO", north(10), 400), kind: "goal" },
        ],
        start: null,
        goal: { type: "cylinder", deadline: null },
      },
    });
    await showCompetition();
    expect(
      within(screen.getByTestId("widget-nextTurnpoint")).getByText("4.0"),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("widget-nextTurnpoint")).getByText(/^B1 · \d+°/),
    ).toBeTruthy();
    // The way left: to the goal's edge.
    expect(
      within(screen.getByTestId("widget-taskDistance")).getByText("9.6"),
    ).toBeTruthy();
    // Above or below the goal: a number with its sign, never a «yes».
    expect(
      within(screen.getByTestId("widget-glideToGoal")).getByText(/^[+-]?\d+$/),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("widget-glideToGoal")).getByText(/^L\/D 8 · /),
    ).toBeTruthy();
    // No start in this task.
    expect(within(screen.getByTestId("widget-startGate")).getByText("–")).toBeTruthy();
    // Over B1 at the end of the leg (D3): a number, with the glide used.
    expect(
      within(screen.getByTestId("widget-glideToTurnpoint")).getByText(/^[+-]?\d+$/),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("widget-glideToTurnpoint")).getByText("B1 · L/D 8"),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("widget-nextTurnpoint")).getByText(/needs \d+ m$/),
    ).toBeTruthy();
  });

  it("works the heights out with the glide ratio the pilot chose (D3)", async () => {
    await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-layout"));
    await fireEvent.press(screen.getByText("12"));
    await fireEvent.press(screen.getByText("No wind"));
    expect(glidePrefsNow()).toEqual({ ld: 12, wind: "none" });
  });

  it("tells when no task is loaded", async () => {
    await showCompetition();
    expect(
      within(screen.getByTestId("widget-nextTurnpoint")).getByText("No task loaded"),
    ).toBeTruthy();
  });
});

describe("the nearest landing of all the pilot has (parts D3, D5, D6)", () => {
  beforeEach(() => {
    resetWaypointStore();
    resetManualWaypoints();
    resetSiteLandings();
  });

  async function showXc() {
    await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-layout"));
    await fireEvent.press(screen.getByText("XC"));
    await fireEvent.press(screen.getByTestId("flight-options-done"));
  }

  it("says there is none without any landing", async () => {
    await showXc();
    expect(
      within(screen.getByTestId("widget-nearestLanding")).getByText("No landings"),
    ).toBeTruthy();
  });

  it("takes the pilot's own landing and OpenStreetMap's, without a file", async () => {
    const here = TRACK.fixes[TRACK.fixes.length - 1].point;
    // Invented: the pilot's own 3 km east, OpenStreetMap's 1 km north.
    addManualWaypoint(destination(here, 90, 3000), true);
    const [lat, lon] = destination(here, 0, 1000);
    await refreshSiteLandings(here, Date.now(), () =>
      Promise.resolve({
        kind: "ok",
        value: {
          sites: [
            {
              id: 1,
              kind: "landing",
              lat,
              lon,
              name: "Test field",
              ele_m: 300,
              orientation: [],
              official: null,
              osm_url: "https://www.openstreetmap.org/node/1",
              away_m: null,
            },
          ],
          more: false,
          attribution: "© OpenStreetMap contributors",
        },
      }),
    );
    await showXc();
    const widget = within(screen.getByTestId("widget-nearestLanding"));
    expect(widget.getByText("1000")).toBeTruthy();
    expect(widget.getByText(/Test field$/)).toBeTruthy();
  });
});

describe("the vario's sound (part C)", () => {
  beforeEach(() => {
    resetVarioPrefs();
    setVarioPrefs(DEFAULT_VARIO_PREFS);
  });

  it("mutes and turns on with the button beside the lock, the lock on too", async () => {
    await showScreen();
    const sound = screen.getByTestId("flight-screen-sound");
    expect(sound.props.accessibilityLabel).toBe("Mute the vario");
    await fireEvent.press(screen.getByTestId("flight-screen-lock"));
    await fireEvent.press(screen.getByTestId("flight-screen-sound"));
    expect(loadVarioPrefs().on).toBe(false);
    expect(screen.getByTestId("flight-screen-sound").props.accessibilityLabel).toBe(
      "Turn the vario sound on",
    );
    await fireEvent.press(screen.getByTestId("flight-screen-sound"));
    expect(loadVarioPrefs().on).toBe(true);
  });

  it("has its thresholds and volume among the options, in the pilot's unit, kept", async () => {
    await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-layout"));
    expect(
      screen.getByText("From GPS: the sound comes 1–2 s after the climb."),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText("+0.5 m/s"));
    // The second «Off»: the sink tone's.
    await fireEvent.press(screen.getAllByText("Off")[1]);
    await fireEvent.press(screen.getByText("35 %"));
    expect(loadVarioPrefs()).toEqual({
      on: true,
      climbFromMps: 0.5,
      sinkBelowMps: null,
      volume: "low",
    });
    await fireEvent.press(screen.getByText("ft/min"));
    expect(screen.getByText("+20 ft/min")).toBeTruthy();
  });

  it("hides its choices while off", async () => {
    await showScreen();
    await fireEvent.press(screen.getByTestId("flight-screen-layout"));
    await fireEvent.press(screen.getAllByText("Off")[0]);
    expect(screen.queryByText("Beeps from")).toBeNull();
    expect(loadVarioPrefs().on).toBe(false);
  });
});

describe("the editor (part B2)", () => {
  beforeEach(() => {
    saveFlightPrefs(defaultFlightPrefs("km"));
  });

  async function holdVario() {
    await showScreen();
    await fireEvent(screen.getByTestId("flight-hold-vario"), "longPress");
    await fireEvent(screen.getByTestId("flight-editor-grid"), "layout", {
      nativeEvent: { layout: { width: 390, height: 400 } },
    });
  }

  it("opens on the widget held", async () => {
    await holdVario();
    expect(screen.getByTestId("flight-editor")).toBeTruthy();
    expect(
      screen.getByTestId("flight-editor-cell-vario").props.accessibilityState,
    ).toEqual({
      selected: true,
    });
  });

  it("moves a widget, swapping it with one of its size, and keeps it", async () => {
    await holdVario();
    await fireEvent.press(screen.getByTestId("flight-editor-move-down"));
    const page = pagesOf(loadFlightPrefs("km"))[0];
    expect(page.find((cell) => cell.widget === "vario")).toMatchObject({
      col: 0,
      row: 2,
    });
    expect(page.find((cell) => cell.widget === "thermalAssistant")).toMatchObject({
      col: 0,
      row: 0,
    });
  });

  it("drags a widget onto another: the two change places (B3)", async () => {
    await holdVario();
    const view = screen.getByTestId("flight-editor-cell-varioAvg-drag");
    const touch = (x: number) => ({ nativeEvent: { pageX: x, pageY: 300 } });
    await fireEvent(view, "startShouldSetResponderCapture", touch(50));
    await fireEvent(view, "responderGrant", touch(50));
    // Two cells of 90 and their gaps to the right.
    await fireEvent(view, "responderMove", touch(242));
    await fireEvent(view, "responderRelease", touch(242));
    const page = pagesOf(loadFlightPrefs("km"))[0];
    expect(page.find((cell) => cell.widget === "varioAvg")).toMatchObject({
      col: 2,
      row: 4,
    });
    expect(page.find((cell) => cell.widget === "thermalGain")).toMatchObject({
      col: 0,
      row: 4,
    });
  });

  it("sizes the selected widget by its corner (B3)", async () => {
    await holdVario();
    const handle = screen.getByTestId("flight-editor-cell-vario-handle");
    const touch = (y: number) => ({ nativeEvent: { pageX: 380, pageY: y } });
    await fireEvent(handle, "startShouldSetResponderCapture", touch(120));
    await fireEvent(handle, "responderGrant", touch(120));
    // One row of about 66 points up.
    await fireEvent(handle, "responderMove", touch(54));
    await fireEvent(handle, "responderRelease", touch(54));
    expect(pagesOf(loadFlightPrefs("km"))[0][0]).toMatchObject({
      widget: "vario",
      w: 4,
      h: 1,
    });
  });

  it("says the widgets are dragged (B3)", async () => {
    await holdVario();
    await fireEvent.press(screen.getByTestId("flight-editor-cell-vario"));
    expect(
      screen.queryByText(
        "Drag a widget to move it, or its corner to size it. Touch it for more.",
      ),
    ).toBeNull();
  });

  it("gives a widget its own unit, shown on the flight screen", async () => {
    await holdVario();
    await fireEvent.press(screen.getByTestId("flight-editor-unit"));
    expect(screen.getByText("Unit: m/s")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("flight-editor-unit"));
    expect(screen.getByText("Unit: ft/min")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("flight-editor-done"));
    expect(pagesOf(loadFlightPrefs("km"))[0][0].unit).toBe("fpm");
    expect(screen.getAllByText("ft/min").length).toBeGreaterThan(0);
  });

  it("says when a page has no room for one more widget", async () => {
    await holdVario();
    await fireEvent.press(screen.getByTestId("flight-editor-add"));
    await fireEvent.press(screen.getByTestId("flight-editor-add-clock"));
    expect(screen.getByText("No room on this page.")).toBeTruthy();
  });

  it("adds a page and a widget on it", async () => {
    await holdVario();
    await fireEvent.press(screen.getByTestId("flight-editor-add-page"));
    expect(screen.getByText("Page 3 of 3")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("flight-editor-add"));
    await fireEvent.press(screen.getByTestId("flight-editor-add-clock"));
    expect(pagesOf(loadFlightPrefs("km"))[2]).toEqual([
      { widget: "clock", col: 0, row: 0, w: 2, h: 1 },
    ]);
  });

  it("duplicates the layout and puts the copy on screen", async () => {
    await holdVario();
    await fireEvent.press(screen.getByTestId("flight-editor-duplicate"));
    const kept = loadFlightPrefs("km");
    expect(kept.profiles.map(profileName)).toEqual([
      "Thermal",
      "XC",
      "Minimal",
      "Competition",
      "Thermal 2",
    ]);
    expect(screen.getByText("Thermal 2")).toBeTruthy();
  });
});

describe("useFlightScreen", () => {
  beforeEach(() => resetFlightNotice());

  it("opens by itself at the take-off, once, and closes with the recording", async () => {
    const { result, rerender } = await renderHook(
      ({ phase, live }: { phase: "foot" | "air"; live: boolean }) =>
        useFlightScreen(phase, live),
      { initialProps: { phase: "foot", live: true } },
    );
    expect(result.current.open).toBe(false);
    await rerender({ phase: "air", live: true });
    expect(result.current.open).toBe(true);
    await act(async () => result.current.hide());
    await rerender({ phase: "air", live: true });
    expect(result.current.open).toBe(false);
    await act(async () => result.current.show());
    expect(result.current.open).toBe(true);
    await rerender({ phase: "air", live: false });
    expect(result.current.open).toBe(false);
  });

  it("does not open for a recording already in the air when the screen mounts", async () => {
    const { result } = await renderHook(() => useFlightScreen("air", true));
    expect(result.current.open).toBe(false);
  });
});

describe("numberSize", () => {
  it("is as big as the height lets it in a wide cell", () => {
    expect(numberSize(380, 100, "+2.3", "m/s", 0, false)).toBeCloseTo(52, 6);
  });

  it("shrinks so the number, its unit and an arrow fit the width", () => {
    const size = numberSize(180, 230, "1860", "m", 0, false);
    // Four digits and a small unit in 160 points.
    expect(size * (4 * 0.64 + 0.62 * 0.3)).toBeLessThanOrEqual(160 - 8 + 1e-9);
    expect(numberSize(180, 230, "15", "km/h", 50, true)).toBeLessThan(
      numberSize(180, 230, "15", "km/h", 0, true),
    );
  });

  it("never goes under 16 points", () => {
    expect(numberSize(40, 40, "12345678", "km/h", 30, false)).toBe(16);
  });
});
