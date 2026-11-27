import { act, render, screen } from "@testing-library/react-native";

import type { Winds } from "../api/winds";
import { windSpeedText, WindCard } from "./WindCard";
import { refreshWinds, resetWinds } from "./windStore";

jest.mock("../location/useCurrentPosition", () => ({
  useCurrentPosition: () => ({
    position: { status: "ok", point: [45.74, 10.84] },
    refresh: () => {},
  }),
}));

jest.mock("expo-file-system", () => {
  const mockFiles = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return mockFiles.has(this.uri);
    }
    create(): void {
      mockFiles.set(this.uri, "");
    }
    write(text: string): void {
      mockFiles.set(this.uri, text);
    }
    textSync(): string {
      return mockFiles.get(this.uri) ?? "";
    }
    delete(): void {
      mockFiles.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const NOW = Date.UTC(2026, 10, 26, 7, 10);
const hour = (h: number) => new Date(Date.UTC(2026, 10, 26, h)).toISOString();

// Made-up winds from 05:00 to 16:00.
const WINDS: Winds = {
  source: "icon-d2",
  run: hour(6),
  attribution: "DWD ICON-D2, CC BY 4.0",
  lat: 45.74,
  lon: 10.84,
  levels: [850, 700, 600, 500],
  hours: Array.from({ length: 12 }, (_, i) => ({
    time: hour(5 + i),
    winds: [
      { hpa: 850, speed_ms: null, from_deg: null },
      { hpa: 700, speed_ms: 5, from_deg: 217 },
      { hpa: 600, speed_ms: 7.5, from_deg: 230 },
      { hpa: 500, speed_ms: 12, from_deg: 250 },
    ],
  })),
};

beforeEach(() => resetWinds());

it("says so when there is no wind", async () => {
  await render(<WindCard nowMs={NOW} />);
  expect(screen.getByText("Wind aloft not available")).toBeTruthy();
});

it("shows the next hours at four levels, numbers and arrows, with the run", async () => {
  await act(async () => {
    await refreshWinds([45.74, 10.84], Date.now(), () =>
      Promise.resolve({ kind: "ok", value: WINDS }),
    );
  });
  await render(<WindCard nowMs={NOW} />);
  // From the hour before now, six of them.
  expect(screen.getAllByTestId("wind-hour")).toHaveLength(6);
  expect(screen.getAllByText("18").length).toBeGreaterThan(0); // 5 m/s in km/h
  expect(screen.getAllByText("–").length).toBeGreaterThan(0); // under the ground
  expect(screen.getByText("850 hPa\n≈1500 m")).toBeTruthy();
  expect(screen.getByTestId("wind-run").props.children).toMatch(
    /^DWD ICON-D2, CC BY 4\.0 · run of /,
  );
  expect(screen.queryByText(/flyable|safe|good/i)).toBeNull();
});

it("gives the speed in km/h or mph", () => {
  expect(windSpeedText(10, "km")).toBe("36");
  expect(windSpeedText(10, "mi")).toBe("22");
  expect(windSpeedText(null, "km")).toBe("–");
});
