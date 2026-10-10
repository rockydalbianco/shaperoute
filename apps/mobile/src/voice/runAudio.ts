import { requireOptionalNativeModule } from "expo";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

/**
 * The phone's sound while a run is on (TASK-261 part B, ADR-0225): the
 * voice speaks with the phone locked or another app in front, speaks with
 * the silent switch on, and turns the music of another app down while it
 * speaks, then gives it back (the user's choices of 2026-10-10). Before
 * this the app had iOS's own sound, which goes quiet with the screen
 * locked.
 *
 * iOS only: on Android the voice is as it was. Through expo-audio's native
 * module, asked for only when it is there: an app built before expo-audio
 * speaks as before instead of failing.
 */

/** How the run's voice shares the phone's sound, from «Start» to the end. */
export const RUN_AUDIO = {
  // Over the silent switch: the voice is the runner's choice («Voice»).
  playsInSilentMode: true,
  // With the phone locked: the app has the "audio" background mode.
  shouldPlayInBackground: true,
  // Another app's music goes down while the voice speaks.
  interruptionMode: "duckOthers",
  allowsRecording: false,
} as const;

/** After the run: quiet with the silent switch, mixed with other apps. */
export const AFTER_RUN_AUDIO = {
  playsInSilentMode: false,
  shouldPlayInBackground: false,
  interruptionMode: "mixWithOthers",
  allowsRecording: false,
} as const;

/** While the voice has words to say, how often it is asked if it is done:
 * the music comes back up at most this long after the last word. */
export const QUIET_CHECK_MS = 1000;

type AudioMode = typeof RUN_AUDIO | typeof AFTER_RUN_AUDIO;

/** What is used of expo-audio's native module. */
type NativeAudio = {
  setAudioModeAsync(mode: AudioMode): Promise<void>;
  setIsAudioActiveAsync(active: boolean): Promise<void>;
};

let native: NativeAudio | null | undefined;

function audio(): NativeAudio | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  if (native === undefined) {
    native = requireOptionalNativeModule<NativeAudio>("ExpoAudio");
  }
  return native;
}

/** Asks the native module, and never fails the run: a sound that cannot be
 * set leaves the voice as it was. */
function ask(call: (module: NativeAudio) => Promise<void> | undefined): void {
  const module = audio();
  if (module === null) {
    return;
  }
  void Promise.resolve()
    .then(() => call(module))
    .catch(() => {});
}

/** The runs holding the sound: one at a time, but a run's screen may start
 * again before the one before has ended. */
let holders = 0;
let quietCheck: ReturnType<typeof setInterval> | null = null;

/** A run starts: its voice speaks over the silent switch, with the phone
 * locked, and over the music. */
export function startRunAudio(): void {
  holders += 1;
  ask((module) => module.setAudioModeAsync(RUN_AUDIO));
}

/** A run ends: the sound as outside a run, and the music back up. */
export function endRunAudio(): void {
  holders = Math.max(0, holders - 1);
  if (holders > 0) {
    return;
  }
  stopQuietCheck();
  ask((module) => module.setAudioModeAsync(AFTER_RUN_AUDIO));
  release();
}

/**
 * Says `text` as `Speech.speak` does. During a run, once the voice has no
 * more words the sound is let go, so the music it turned down comes back
 * up: iOS keeps it down for as long as the app holds the sound.
 */
export function say(text: string, options: Speech.SpeechOptions): void {
  Speech.speak(text, options);
  if (holders === 0 || quietCheck !== null || audio() === null) {
    return;
  }
  quietCheck = setInterval(() => void checkQuiet(), QUIET_CHECK_MS);
}

async function checkQuiet(): Promise<void> {
  let speaking = false;
  try {
    speaking = await Speech.isSpeakingAsync();
  } catch {
    // Not known: let the sound go, the next words take it again.
  }
  if (!speaking) {
    stopQuietCheck();
    release();
  }
}

function stopQuietCheck(): void {
  if (quietCheck !== null) {
    clearInterval(quietCheck);
    quietCheck = null;
  }
}

/** The app lets go of the sound, and other apps hear it back up. */
function release(): void {
  ask((module) => module.setIsAudioActiveAsync(false));
}

/** For tests: as when the app starts. */
export function resetRunAudio(): void {
  stopQuietCheck();
  holders = 0;
  native = undefined;
}
