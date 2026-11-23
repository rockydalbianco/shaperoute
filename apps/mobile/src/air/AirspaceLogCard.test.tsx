/**
 * The airspace log on the finish card (TASK-479 part E3): nothing without
 * a file; with one, a line that opens the times inside, with the notice
 * of the file and that the log stays on the phone.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";

import {
  AirspaceLogCard,
  INSIDE_COUNT,
  logLines,
  NONE_INSIDE,
  PHONE_ONLY,
} from "./AirspaceLogCard";
import type { LogEntry } from "./airspaceLog";
import { resetAirspace, setAirspace } from "./airspaceStore";
import type { Airspace } from "./openair";
import { flightOf, pointAt, T0 } from "./syntheticFlight";

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

// Invented: no real airspace in the repository.
const BOX: Airspace = {
  class: "R",
  name: "TEST BOX",
  floor: { kind: "ground" },
  ceiling: { kind: "aboveSea", metres: 1800 },
  points: [
    pointAt(1000, -500),
    pointAt(2000, -500),
    pointAt(2000, 500),
    pointAt(1000, 500),
  ],
};
const FAR: Airspace = {
  ...BOX,
  name: "FAR BOX",
  points: BOX.points.map(([lat, lon]) => [lat + 1, lon] as [number, number]),
};

const track = flightOf(
  [{ kind: "glide", seconds: 300, airspeedMps: 10, headingDeg: 90, varioMps: 0 }],
  { fromAltM: 1500 },
);

function load(airspaces: Airspace[]) {
  setAirspace({ fileName: "test.txt", loadedAtMs: T0, airspaces, unread: 0 });
}

beforeEach(() => {
  setAirspace(null);
  resetAirspace();
});

describe("AirspaceLogCard", () => {
  it("shows nothing without a file", async () => {
    await render(<AirspaceLogCard track={track} windows={null} units="km" />);
    expect(screen.queryByTestId("airspace-log-row")).toBeNull();
  });

  it("counts the times inside and opens them, with the notices", async () => {
    load([BOX]);
    await render(<AirspaceLogCard track={track} windows={null} units="km" />);
    expect(screen.getByText(`${INSIDE_COUNT.replace("{count}", "1")} ›`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("airspace-log-row"));
    expect(screen.getAllByTestId("airspace-log-entry")).toHaveLength(1);
    expect(screen.getByText(/TEST BOX \(R\) · 2 min/)).toBeTruthy();
    expect(screen.getByText(PHONE_ONLY)).toBeTruthy();
    expect(screen.getByTestId("airspace-log-notice")).toHaveTextContent(/test\.txt/);
  });

  it("says when no fix was inside", async () => {
    load([FAR]);
    await render(<AirspaceLogCard track={track} windows={null} units="km" />);
    expect(screen.getByText(`${NONE_INSIDE} ›`)).toBeTruthy();
  });

  it("looks only within the windows in the air", async () => {
    load([BOX]);
    await render(
      <AirspaceLogCard
        track={track}
        windows={[{ startMs: T0, endMs: T0 + 50_000 }]}
        units="km"
      />,
    );
    expect(screen.getByText(`${NONE_INSIDE} ›`)).toBeTruthy();
  });
});

describe("logLines", () => {
  const entry: LogEntry = {
    airspace: BOX,
    fromMs: T0,
    toMs: T0 + 90_000,
    edgeM: 450,
    limitM: 299.6,
    approx: false,
  };

  it("says how long, how deep across and up or down", () => {
    const [first, second] = logLines(entry, "km");
    expect(first).toMatch(/· TEST BOX \(R\) · 2 min$/);
    expect(second).toBe("Deepest: 450 m from the edge, 300 m from floor or ceiling");
  });

  it("marks an approximate time, and a limit not known", () => {
    const [, second] = logLines({ ...entry, limitM: null, approx: true }, "km");
    expect(second).toBe("Deepest: 450 m from the edge, — from floor or ceiling ≈");
  });
});
