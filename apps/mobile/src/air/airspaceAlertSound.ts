import type { AudioPlayer } from "expo-audio";

/**
 * The airspace warning's sound (TASK-479 part E2): two falling notes
 * (`assets/sounds/airspace/alert.wav`, made by `tools/vario_tones.py`),
 * played once when a volume comes within the warning. Best effort, as the
 * vario: a phone that cannot play shows the line on the screen all the
 * same. expo-audio is loaded at the first warning, not with the app.
 */

export type AlertPlayer = Pick<AudioPlayer, "play" | "seekTo">;
export type MakeAlertPlayer = (source: number) => AlertPlayer;

function expoPlayer(source: number): AlertPlayer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const audio = require("expo-audio") as typeof import("expo-audio");
  return audio.createAudioPlayer(source);
}

let makePlayer: MakeAlertPlayer = expoPlayer;
let player: AlertPlayer | null | undefined;

export function playAirspaceAlert(): void {
  try {
    if (player === undefined) {
      // A literal require: the bundler packs only the files it can see.
      player = makePlayer(require("../../assets/sounds/airspace/alert.wav"));
    }
    const one = player;
    if (one === null) {
      return;
    }
    void one
      .seekTo(0)
      .catch(() => {})
      .then(() => one.play());
  } catch {
    player = null;
  }
}

/** For tests: a player of the test's own, none made yet. */
export function resetAirspaceAlertSound(make: MakeAlertPlayer = expoPlayer): void {
  makePlayer = make;
  player = undefined;
}
