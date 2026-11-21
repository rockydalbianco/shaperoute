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
import { loadFlightPrefs } from "./flightLayout";
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
    expect(loadFlightPrefs("km")).toEqual({
      preset: "xc",
      look: "sun",
      units: { altitude: "ft", vario: "mps", speed: "kmh" },
    });
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
