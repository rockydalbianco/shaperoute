/**
 * The airspace warning's sound while recording (TASK-479 part E2): once
 * when a volume comes within the warning, again after a minute while it
 * stays, never on the ground, muted or without a file.
 */
import { act, renderHook } from "@testing-library/react-native";

import type { Track } from "../navigation/trackRecorder";
import {
  DEFAULT_AIRSPACE_ALERTS,
  resetAirspaceAlerts,
  setAirspaceAlerts,
} from "./airspaceAlertPrefs";
import { playAirspaceAlert } from "./airspaceAlertSound";
import { resetAirspace, setAirspace } from "./airspaceStore";
import { ORIGIN, flightOf, T0 } from "./syntheticFlight";
import { ALERT_AGAIN_MS, useAirspaceAlert } from "./useAirspaceAlert";

jest.mock("./airspaceAlertSound", () => ({ playAirspaceAlert: jest.fn() }));

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

const played = jest.mocked(playAirspaceAlert);

// An invented box around the synthetic flight's start, from 1000 m to FL95.
const BOX = {
  class: "R",
  name: "TEST BOX",
  floor: { kind: "aboveSea", metres: 1000 } as const,
  ceiling: { kind: "flightLevel", level: 95 } as const,
  points: [
    [ORIGIN[0] - 0.01, ORIGIN[1] - 0.01],
    [ORIGIN[0] - 0.01, ORIGIN[1] + 0.01],
    [ORIGIN[0] + 0.01, ORIGIN[1] + 0.01],
    [ORIGIN[0] + 0.01, ORIGIN[1] - 0.01],
  ] as [number, number][],
};

const FLIGHT: Track = flightOf([
  { kind: "glide", seconds: 30, airspeedMps: 2, headingDeg: 90, varioMps: 0 },
]);
const END = T0 + 30_000;

type Props = { track: Track; nowMs: number; sounding: boolean };

beforeEach(() => {
  played.mockClear();
  resetAirspace();
  resetAirspaceAlerts();
  setAirspaceAlerts(DEFAULT_AIRSPACE_ALERTS);
  setAirspace({ fileName: "t.txt", loadedAtMs: 0, airspaces: [BOX], unread: 0 });
});

it("sounds once inside, again after a minute", async () => {
  const { rerender } = await renderHook((props: Props) => useAirspaceAlert(props), {
    initialProps: { track: FLIGHT, nowMs: END, sounding: true },
  });
  expect(played).toHaveBeenCalledTimes(1);
  await rerender({ track: FLIGHT, nowMs: END + 1000, sounding: true });
  expect(played).toHaveBeenCalledTimes(1);
  await rerender({ track: FLIGHT, nowMs: END + ALERT_AGAIN_MS, sounding: true });
  expect(played).toHaveBeenCalledTimes(2);
});

it("is silent on the ground, muted, or without a file", async () => {
  const { rerender } = await renderHook((props: Props) => useAirspaceAlert(props), {
    initialProps: { track: FLIGHT, nowMs: END, sounding: false },
  });
  expect(played).not.toHaveBeenCalled();
  await act(async () => {
    setAirspaceAlerts({ ...DEFAULT_AIRSPACE_ALERTS, sound: false });
  });
  await rerender({ track: FLIGHT, nowMs: END + 1000, sounding: true });
  expect(played).not.toHaveBeenCalled();
  await act(async () => {
    setAirspaceAlerts(DEFAULT_AIRSPACE_ALERTS);
    setAirspace(null);
  });
  await rerender({ track: FLIGHT, nowMs: END + 2000, sounding: true });
  expect(played).not.toHaveBeenCalled();
});
