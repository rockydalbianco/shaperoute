import type { AudioPlayer } from "expo-audio";

import type { VarioTone } from "./varioTone";

/**
 * The vario's sound on the phone (TASK-479 part C, ADR-0388): the tone of
 * the moment played as a loop, one player per tone file
 * (`assets/sounds/vario/`, made by `tools/vario_tones.py`). A loop goes on
 * by itself between two fixes, with the screen off too: the recording has
 * already set the phone's sound to play in the background
 * (`voice/runAudio.ts`).
 *
 * Best effort, as the stretching's chime: a phone that cannot play goes on
 * in silence, the numbers say enough. expo-audio is loaded at the first
 * tone, not with the app.
 */

/** What is used of a player. */
export type TonePlayer = Pick<AudioPlayer, "play" | "pause" | "seekTo"> & {
  loop: boolean;
  volume: number;
  readonly playing: boolean;
};

export type MakePlayer = (source: number) => TonePlayer;

// Literal requires: the bundler packs only the files it can see.
const CLIMB_FILES: readonly number[] = [
  require("../../assets/sounds/vario/climb-00.wav"),
  require("../../assets/sounds/vario/climb-01.wav"),
  require("../../assets/sounds/vario/climb-02.wav"),
  require("../../assets/sounds/vario/climb-03.wav"),
  require("../../assets/sounds/vario/climb-04.wav"),
  require("../../assets/sounds/vario/climb-05.wav"),
  require("../../assets/sounds/vario/climb-06.wav"),
  require("../../assets/sounds/vario/climb-07.wav"),
  require("../../assets/sounds/vario/climb-08.wav"),
  require("../../assets/sounds/vario/climb-09.wav"),
  require("../../assets/sounds/vario/climb-10.wav"),
];

const SINK_FILES: readonly number[] = [
  require("../../assets/sounds/vario/sink-0.wav"),
  require("../../assets/sounds/vario/sink-1.wav"),
  require("../../assets/sounds/vario/sink-2.wav"),
  require("../../assets/sounds/vario/sink-3.wav"),
];

export const TONE_FILE_COUNT = CLIMB_FILES.length + SINK_FILES.length;

function keyOf(tone: NonNullable<VarioTone>): string {
  return `${tone.kind}-${tone.level}`;
}

function sourceOf(tone: NonNullable<VarioTone>): number | undefined {
  return (tone.kind === "climb" ? CLIMB_FILES : SINK_FILES)[tone.level];
}

function expoPlayer(source: number): TonePlayer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const audio = require("expo-audio") as typeof import("expo-audio");
  return audio.createAudioPlayer(source);
}

let makePlayer: MakePlayer = expoPlayer;
const players = new Map<string, TonePlayer | null>();
let playingKey: string | null = null;
/** When the tone of the moment was last started. */
let startedAtMs = 0;

/** A player asked to play and still not playing after this long has been
 * stopped by the phone: it is started again. */
export const RESTART_AFTER_MS = 2_000;

function playerOf(tone: NonNullable<VarioTone>): TonePlayer | null {
  const key = keyOf(tone);
  if (!players.has(key)) {
    const source = sourceOf(tone);
    try {
      const player = source === undefined ? null : makePlayer(source);
      if (player !== null) {
        player.loop = true;
      }
      players.set(key, player);
    } catch {
      players.set(key, null);
    }
  }
  return players.get(key) ?? null;
}

function quiet(key: string | null): void {
  const player = key === null ? null : (players.get(key) ?? null);
  try {
    player?.pause();
  } catch {
    // A player that cannot pause is one that does not play.
  }
}

/**
 * The phone plays `tone` at `volume` (0 to 1) until told otherwise; null
 * is silence. The same tone again only sets the volume, and starts it
 * again if the phone has stopped it (a call, another app's sound).
 */
export function playTone(tone: VarioTone, volume: number): void {
  if (tone === null) {
    quiet(playingKey);
    playingKey = null;
    return;
  }
  const key = keyOf(tone);
  const fresh = key !== playingKey;
  if (fresh) {
    quiet(playingKey);
    playingKey = key;
  }
  const player = playerOf(tone);
  if (player === null) {
    return;
  }
  try {
    player.volume = volume;
    const nowMs = Date.now();
    if (fresh || (!player.playing && nowMs - startedAtMs > RESTART_AFTER_MS)) {
      startedAtMs = nowMs;
      void player
        .seekTo(0)
        .catch(() => {})
        .then(() => {
          // Still the tone of the moment once the seek is done.
          if (playingKey === key) {
            player.play();
          }
        });
    }
  } catch {
    players.set(key, null);
  }
}

/** Silence, and the players kept for the next flight. */
export function stopTones(): void {
  playTone(null, 0);
}

/** For tests: players of the test's own, and none made yet. */
export function resetTones(make: MakePlayer = expoPlayer): void {
  makePlayer = make;
  players.clear();
  playingKey = null;
  startedAtMs = 0;
}
