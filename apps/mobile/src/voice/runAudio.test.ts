import * as Speech from "expo-speech";
import { Platform } from "react-native";

import {
  AFTER_RUN_AUDIO,
  endRunAudio,
  QUIET_CHECK_MS,
  resetRunAudio,
  RUN_AUDIO,
  say,
  startRunAudio,
} from "./runAudio";

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(async () => false),
}));

const mockExpoAudio = {
  setAudioModeAsync: jest.fn(async () => {}),
  setIsAudioActiveAsync: jest.fn(async () => {}),
};
let mockNativeThere = true;

jest.mock("expo", () => ({
  requireOptionalNativeModule: (name: string) =>
    name === "ExpoAudio" && mockNativeThere ? mockExpoAudio : null,
}));

/** The promises the module started have run. */
async function settled(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

const speaking = jest.mocked(Speech.isSpeakingAsync);

beforeEach(() => {
  jest.useFakeTimers();
  resetRunAudio();
  mockNativeThere = true;
  Platform.OS = "ios";
  mockExpoAudio.setAudioModeAsync.mockClear();
  mockExpoAudio.setIsAudioActiveAsync.mockClear();
  jest.mocked(Speech.speak).mockClear();
  speaking.mockReset();
  speaking.mockResolvedValue(false);
});

afterEach(() => {
  resetRunAudio();
  jest.useRealTimers();
});

test("a run speaks over the silent switch, with the phone locked, turning the music down", async () => {
  expect(RUN_AUDIO).toEqual({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "duckOthers",
    allowsRecording: false,
  });
  startRunAudio();
  await settled();
  expect(mockExpoAudio.setAudioModeAsync.mock.calls).toEqual([[RUN_AUDIO]]);
  // Only the mode: iOS takes the sound when the voice speaks.
  expect(mockExpoAudio.setIsAudioActiveAsync).not.toHaveBeenCalled();
});

test("the words are said as Speech says them, and the music comes back up after the last", async () => {
  startRunAudio();
  speaking.mockResolvedValue(true);
  say("In 50 metres, turn left onto Via Verdi", { language: "en-US" });
  say("Then turn right onto Via Roma", { language: "en-US" });
  expect(jest.mocked(Speech.speak).mock.calls).toEqual([
    ["In 50 metres, turn left onto Via Verdi", { language: "en-US" }],
    ["Then turn right onto Via Roma", { language: "en-US" }],
  ]);
  // Still speaking: the music stays down.
  await jest.advanceTimersByTimeAsync(QUIET_CHECK_MS * 3);
  expect(mockExpoAudio.setIsAudioActiveAsync).not.toHaveBeenCalled();

  // Done: the sound is let go once, and asked no more.
  speaking.mockResolvedValue(false);
  await jest.advanceTimersByTimeAsync(QUIET_CHECK_MS);
  expect(mockExpoAudio.setIsAudioActiveAsync.mock.calls).toEqual([[false]]);
  const asked = speaking.mock.calls.length;
  await jest.advanceTimersByTimeAsync(QUIET_CHECK_MS * 5);
  expect(speaking.mock.calls).toHaveLength(asked);

  // The next words take the sound again, and let it go after them.
  say("1 kilometre", { language: "en-US" });
  await jest.advanceTimersByTimeAsync(QUIET_CHECK_MS);
  expect(mockExpoAudio.setIsAudioActiveAsync.mock.calls).toEqual([[false], [false]]);
});

test("at the end of the run the sound is as outside a run, and the music back up", async () => {
  startRunAudio();
  speaking.mockResolvedValue(true);
  say("You have arrived.", { language: "en-US" });
  endRunAudio();
  await settled();
  expect(mockExpoAudio.setAudioModeAsync.mock.calls).toEqual([
    [RUN_AUDIO],
    [AFTER_RUN_AUDIO],
  ]);
  expect(AFTER_RUN_AUDIO).toMatchObject({
    playsInSilentMode: false,
    interruptionMode: "mixWithOthers",
  });
  expect(mockExpoAudio.setIsAudioActiveAsync.mock.calls).toEqual([[false]]);
  // Nothing is asked after the end.
  await jest.advanceTimersByTimeAsync(QUIET_CHECK_MS * 5);
  expect(speaking).not.toHaveBeenCalled();
});

test("a run's screen started again before the end keeps the run's sound", async () => {
  startRunAudio();
  startRunAudio();
  endRunAudio();
  await settled();
  expect(mockExpoAudio.setAudioModeAsync.mock.calls).toEqual([
    [RUN_AUDIO],
    [RUN_AUDIO],
  ]);
  endRunAudio();
  await settled();
  expect(mockExpoAudio.setAudioModeAsync.mock.calls.at(-1)).toEqual([AFTER_RUN_AUDIO]);
});

test("outside a run, «Listen» only speaks", async () => {
  say("In 50 metres, turn left onto Via Roma", { language: "en-US" });
  await jest.advanceTimersByTimeAsync(QUIET_CHECK_MS * 3);
  expect(Speech.speak).toHaveBeenCalledTimes(1);
  expect(speaking).not.toHaveBeenCalled();
  expect(mockExpoAudio.setIsAudioActiveAsync).not.toHaveBeenCalled();
});

test("a sound that cannot be set leaves the voice as it was", async () => {
  mockExpoAudio.setAudioModeAsync.mockRejectedValueOnce(new Error("busy"));
  startRunAudio();
  await settled();
  say("1 kilometre", { language: "en-US" });
  expect(Speech.speak).toHaveBeenCalledTimes(1);
});

test("an app built before expo-audio, and Android, speak as before", async () => {
  mockNativeThere = false;
  startRunAudio();
  say("1 kilometre", { language: "en-US" });
  endRunAudio();
  await jest.advanceTimersByTimeAsync(QUIET_CHECK_MS * 3);
  expect(Speech.speak).toHaveBeenCalledTimes(1);
  expect(speaking).not.toHaveBeenCalled();

  resetRunAudio();
  mockNativeThere = true;
  Platform.OS = "android";
  startRunAudio();
  say("1 kilometre", { language: "en-US" });
  endRunAudio();
  await jest.advanceTimersByTimeAsync(QUIET_CHECK_MS * 3);
  expect(mockExpoAudio.setAudioModeAsync).not.toHaveBeenCalled();
  expect(mockExpoAudio.setIsAudioActiveAsync).not.toHaveBeenCalled();
});
