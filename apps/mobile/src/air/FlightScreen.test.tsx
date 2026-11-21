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
import { useFlightScreen } from "./useFlightScreen";

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
