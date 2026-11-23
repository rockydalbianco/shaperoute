/**
 * The vario's sound while a flight is recorded (TASK-479 part C): the tone
 * of the climb in the air, silence on the ground, when paused, muted or
 * without fresh fixes, and silence when the recording's screen goes.
 */
import { act, renderHook } from "@testing-library/react-native";

import type { Track } from "../navigation/trackRecorder";
import { flightOf, T0 } from "./syntheticFlight";
import { useVarioSound } from "./useVarioSound";
import { DEFAULT_VARIO_PREFS, resetVarioPrefs, setVarioPrefs } from "./varioPrefs";
import { playTone, stopTones } from "./varioSound";

jest.mock("./varioSound", () => ({
  playTone: jest.fn(),
  stopTones: jest.fn(),
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

const played = jest.mocked(playTone);

const climbing: Track = flightOf([
  { kind: "glide", seconds: 30, airspeedMps: 10, headingDeg: 90, varioMps: 2.2 },
]);
const sinking: Track = flightOf([
  { kind: "glide", seconds: 30, airspeedMps: 10, headingDeg: 90, varioMps: -3.4 },
]);
const END = T0 + 30_000;

type Props = { track: Track; nowMs: number; sounding: boolean };

function lastTone() {
  return played.mock.calls[played.mock.calls.length - 1];
}

beforeEach(() => {
  played.mockClear();
  jest.mocked(stopTones).mockClear();
  resetVarioPrefs();
  setVarioPrefs(DEFAULT_VARIO_PREFS);
  played.mockClear();
});

it("beeps a climb and sinks a sink, loud by default", async () => {
  const { rerender } = await renderHook((props: Props) => useVarioSound(props), {
    initialProps: { track: climbing, nowMs: END, sounding: true },
  });
  expect(lastTone()).toEqual([{ kind: "climb", level: 4 }, 1]);
  await rerender({ track: sinking, nowMs: END + 1000, sounding: true });
  expect(lastTone()).toEqual([{ kind: "sink", level: 1 }, 1]);
});

it("is silent on the ground or paused, and once the fixes stop", async () => {
  const { rerender } = await renderHook((props: Props) => useVarioSound(props), {
    initialProps: { track: climbing, nowMs: END, sounding: false },
  });
  expect(lastTone()).toEqual([null, 1]);
  await rerender({ track: climbing, nowMs: END, sounding: true });
  expect(lastTone()?.[0]).not.toBeNull();
  await rerender({ track: climbing, nowMs: END + 60_000, sounding: true });
  expect(lastTone()).toEqual([null, 1]);
});

it("follows the pilot's mute and volume at once", async () => {
  await renderHook((props: Props) => useVarioSound(props), {
    initialProps: { track: climbing, nowMs: END, sounding: true },
  });
  await act(async () => {
    setVarioPrefs({ ...DEFAULT_VARIO_PREFS, volume: "low" });
  });
  expect(lastTone()).toEqual([{ kind: "climb", level: 4 }, 0.35]);
  await act(async () => {
    setVarioPrefs({ ...DEFAULT_VARIO_PREFS, on: false });
  });
  expect(lastTone()?.[0]).toBeNull();
});

it("goes quiet when the recording's screen goes", async () => {
  const { unmount } = await renderHook((props: Props) => useVarioSound(props), {
    initialProps: { track: climbing, nowMs: END, sounding: true },
  });
  await unmount();
  expect(stopTones).toHaveBeenCalled();
});
