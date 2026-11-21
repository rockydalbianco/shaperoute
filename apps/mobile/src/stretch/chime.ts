import type { AudioPlayer } from "expo-audio";

/**
 * The short sounds of the stretching (TASK-285 part B, TASK-466 part A, ADR-0378),
 * both ours, made by `tools/stretch_chime.py`:
 * - `chime()`, a bell between two exercises (`assets/stretch/ding.wav`);
 * - `tick()`, a soft tick when a hold starts and on its last seconds
 *   (`assets/stretch/tick.wav`).
 *
 * Best effort: a phone that cannot play them goes on in silence, the timer
 * says enough. expo-audio is loaded at the first sound, not with the app: a
 * build without it, or a test that never rings, never asks for it.
 */

type Sound = "ding" | "tick";

const players: Partial<Record<Sound, AudioPlayer | null>> = {};

function source(sound: Sound): number {
  // Literal requires: the bundler packs only the files it can see.
  return sound === "ding"
    ? require("../../assets/stretch/ding.wav")
    : require("../../assets/stretch/tick.wav");
}

function play(sound: Sound): void {
  try {
    if (players[sound] === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const audio = require("expo-audio") as typeof import("expo-audio");
      players[sound] = audio.createAudioPlayer(source(sound));
    }
    const player = players[sound];
    if (player === null || player === undefined) {
      return;
    }
    void player
      .seekTo(0)
      .catch(() => {})
      .then(() => player.play());
  } catch {
    players[sound] = null;
  }
}

/** The bell between two exercises. */
export function chime(): void {
  play("ding");
}

/** The tick of a hold's start and of its last seconds. */
export function tick(): void {
  play("tick");
}
