import { fireEvent, render, screen } from "@testing-library/react-native";

import type { FlightFix } from "./flightArchive";
import { FlightExport } from "./FlightExport";

jest.mock("expo-file-system", () => ({
  File: class {},
  Directory: class {},
  Paths: { cache: { uri: "file:///cache/" }, document: { uri: "file:///documents/" } },
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: async () => true,
  shareAsync: async () => {},
}));

const T0 = Date.UTC(2026, 6, 14, 9, 5, 7);
const FIXES: FlightFix[] = [
  { timeMs: T0, point: [45.72, 10.84], altM: 1700 },
  { timeMs: T0 + 1000, point: [45.7201, 10.84], altM: 1702 },
];

describe("FlightExport", () => {
  it("shares the IGC, not signed, and says so under the buttons", async () => {
    const igc = jest.fn(async () => true);
    const gpx = jest.fn(async () => true);
    await render(
      <FlightExport
        fixes={FIXES}
        shareIgcFile={igc}
        shareGpxFile={gpx}
        version="1.2.0"
      />,
    );
    expect(
      screen.getByText(
        "Not signed: competitions and online contests may not accept it.",
      ),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText("Export IGC"));
    expect(igc).toHaveBeenCalledTimes(1);
    const [text, name] = igc.mock.calls[0] as unknown as [string, string];
    expect(text).toContain("HFFTYFRTYPE:MuW,1.2.0");
    expect(text).not.toMatch(/\r\nG/);
    expect(name).toBe("2026-07-14-XXX-MUW-01.igc");
    expect(gpx).not.toHaveBeenCalled();
    expect(screen.queryByText("Something went wrong.")).toBeNull();
  });

  it("shares the GPX", async () => {
    const gpx = jest.fn(async () => true);
    await render(
      <FlightExport fixes={FIXES} shareIgcFile={jest.fn()} shareGpxFile={gpx} />,
    );
    await fireEvent.press(screen.getByText("Export GPX"));
    const [text, name] = gpx.mock.calls[0] as unknown as [string, string];
    expect(text).toContain("<ele>1700.0</ele>");
    expect(name).toBe("2026-07-14-flight.gpx");
  });

  it("says when the phone could not share", async () => {
    await render(
      <FlightExport
        fixes={FIXES}
        shareIgcFile={async () => {
          throw new Error("no room");
        }}
        shareGpxFile={async () => false}
      />,
    );
    await fireEvent.press(screen.getByText("Export IGC"));
    expect(screen.getByText("Something went wrong.")).toBeTruthy();
  });

  it("shows nothing for a flight of one fix", async () => {
    await render(<FlightExport fixes={FIXES.slice(0, 1)} />);
    expect(screen.queryByTestId("flight-export")).toBeNull();
  });
});
