import type { AudioPlayer } from "expo-audio";

import { t, tLater } from "../i18n";
import { appLanguage } from "../i18n/language";
import { say } from "../voice/runAudio";
import { speaking, speechTag } from "../voice/voiceChoice";
import type { FlightTask } from "./flightTask";

/**
 * A turnpoint of the pilot's task taken, said aloud (TASK-479 part D2,
 * ADR-0388): three rising notes (`assets/sounds/task/turnpoint.wav`, made
 * by `tools/vario_tones.py`), then the voice says which turnpoint was
 * taken and the name of the next. Nothing else: no way to go, no advice.
 * Best effort, as the airspace warning: a phone that cannot play or speak
 * shows the turnpoint taken on the screen all the same.
 */

export const TURNPOINT_TAKEN = tLater("Turnpoint {name} taken. Next: {next}.");
export const GOAL_TAKEN = tLater("Goal {name} taken.");

/** What the voice says when turnpoint `index` of `task` is taken. */
export function callText(task: FlightTask, index: number): string {
  const name = task.turnpoints[index]?.waypoint.name ?? "";
  const next = task.turnpoints[index + 1];
  return next === undefined
    ? t(GOAL_TAKEN, { name })
    : t(TURNPOINT_TAKEN, { name, next: next.waypoint.name });
}

export type CallPlayer = Pick<AudioPlayer, "play" | "seekTo">;
export type MakeCallPlayer = (source: number) => CallPlayer;

function expoPlayer(source: number): CallPlayer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const audio = require("expo-audio") as typeof import("expo-audio");
  return audio.createAudioPlayer(source);
}

let makePlayer: MakeCallPlayer = expoPlayer;
let player: CallPlayer | null | undefined;

function playTone(): void {
  try {
    if (player === undefined) {
      // A literal require: the bundler packs only the files it can see.
      player = makePlayer(require("../../assets/sounds/task/turnpoint.wav"));
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

/** The voice of the app's language: the words are the app's. The pilot's
 * chosen voice when it speaks that language. */
function voiceOptions(): { language: string; voice?: string } {
  const language = appLanguage();
  const chosen = speaking();
  return chosen.language === language
    ? chosen.options
    : { language: speechTag(language) };
}

/** The tone, then the words: turnpoint `index` of `task` is taken. */
export function callTurnpoint(task: FlightTask, index: number): void {
  playTone();
  try {
    say(callText(task, index), voiceOptions());
  } catch {
    // No voice on this phone: the tone and the screen say it.
  }
}

/** For tests: a player of the test's own, none made yet. */
export function resetTurnpointCall(make: MakeCallPlayer = expoPlayer): void {
  makePlayer = make;
  player = undefined;
}
