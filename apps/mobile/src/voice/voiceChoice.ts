import { File, Paths } from "expo-file-system";
import * as Speech from "expo-speech";
import { useSyncExternalStore } from "react";

import { appLanguage } from "../i18n/language";
import { BASE_LANGUAGE, isLanguage, type Language, LANGUAGES } from "../i18n/languages";
import type { VoiceWords } from "./phrasebook";
import { wordsOf } from "./words";

/**
 * The language and the voice the run speaks in (TASK-209, ADR-0171),
 * chosen on «Data» and kept on the phone between runs and openings of the
 * app, as the sport is (TASK-189). The voice follows the app's language
 * (TASK-210) unless one is chosen for the voice alone.
 */
export type VoiceChoice = {
  /** "app": the app's language, whatever it is when the voice speaks. */
  language: Language | "app";
  /** The phone's voice chosen for a language, by its identifier; a
   * language with none speaks with the phone's own voice for it. */
  voices: Partial<Record<Language, string>>;
};

export const DEFAULT_VOICE_CHOICE: VoiceChoice = { language: "app", voices: {} };
export const VOICE_FILE = "voice.json";

/** The choice in the file; the default when there is none or it does not read. */
export function loadVoiceChoice(): VoiceChoice {
  try {
    const file = new File(Paths.document, VOICE_FILE);
    if (!file.exists) {
      return DEFAULT_VOICE_CHOICE;
    }
    const data: unknown = JSON.parse(file.textSync());
    if (typeof data !== "object" || data === null) {
      return DEFAULT_VOICE_CHOICE;
    }
    const language = "language" in data ? data.language : null;
    const voices = "voices" in data ? data.voices : null;
    return {
      language: isLanguage(language) ? language : "app",
      voices: voicesIn(voices),
    };
  } catch {
    return DEFAULT_VOICE_CHOICE;
  }
}

/** The voices of a file that reads: only those of a language, by a name. */
function voicesIn(data: unknown): VoiceChoice["voices"] {
  const voices: VoiceChoice["voices"] = {};
  if (typeof data !== "object" || data === null) {
    return voices;
  }
  for (const [language, voice] of Object.entries(data)) {
    if (isLanguage(language) && typeof voice === "string" && voice !== "") {
      voices[language] = voice;
    }
  }
  return voices;
}

/** The choice now; read from the phone on first use. */
let current: VoiceChoice | null = null;
const listeners = new Set<() => void>();

export function voiceChoice(): VoiceChoice {
  if (current === null) {
    current = loadVoiceChoice();
  }
  return current;
}

export function subscribeVoiceChoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Keeps the choice for the next opening and speaks with it at once; a
 * phone that refuses to keep it still has it until the app closes. */
export function saveVoiceChoice(choice: VoiceChoice): void {
  try {
    const file = new File(Paths.document, VOICE_FILE);
    file.create({ overwrite: true });
    file.write(JSON.stringify(choice));
  } catch {
    // The choice still holds while the app is open.
  }
  current = choice;
  for (const listener of listeners) {
    listener();
  }
}

/** The choice, for a screen: drawn again when it changes. */
export function useVoiceChoice(): VoiceChoice {
  return useSyncExternalStore(subscribeVoiceChoice, voiceChoice, voiceChoice);
}

/** The phone's voices, once read: null before. */
let phoneVoices: readonly Speech.Voice[] | null = null;
let reading: Promise<readonly Speech.Voice[]> | null = null;

/**
 * How long a screen or a run waits for the phone to list its voices. The
 * iOS 27 simulator answered only minutes later (TASK-209): without a limit
 * the list would not show, and a chosen voice would not be asked for.
 */
export const VOICES_WAIT_MS = 3000;

/**
 * The voices installed on the phone (`expo-speech`), asked once per opening
 * of the app. A phone that fails, or does not answer within
 * VOICES_WAIT_MS, gives none for now: nothing is known of them and the
 * voice speaks as before. A late answer is kept for the next call.
 */
export function loadVoices(): Promise<readonly Speech.Voice[]> {
  reading ??= (async () => {
    try {
      const read: unknown = await Speech.getAvailableVoicesAsync();
      phoneVoices = Array.isArray(read) ? (read as Speech.Voice[]) : [];
    } catch {
      phoneVoices = [];
    }
    return phoneVoices;
  })();
  const asked = reading;
  return new Promise((resolve) => {
    const late = setTimeout(() => resolve(phoneVoices ?? []), VOICES_WAIT_MS);
    void asked.then((voices) => {
      clearTimeout(late);
      resolve(voices);
    });
  });
}

/** The voices read so far: null until `loadVoices` has an answer. */
export function knownVoices(): readonly Speech.Voice[] | null {
  return phoneVoices;
}

/** The phone's voices that speak `language`, any country ("en-GB" too),
 * by name. */
export function voicesOf(
  language: Language,
  voices: readonly Speech.Voice[],
): Speech.Voice[] {
  return voices
    .filter((voice) => voice.language.split(/[-_]/)[0].toLowerCase() === language)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** What the phone's speech is asked for `language`: "it-IT". */
export function speechTag(language: Language): string {
  return LANGUAGES.find((option) => option.id === language)?.speech ?? "en-US";
}

/** How the voice speaks now. */
export type Speaking = {
  /** The language of the words. */
  language: Language;
  /** What `Speech.speak` is asked: the language, and the voice when one is
   * chosen and on the phone. */
  options: { language: string; voice?: string };
};

/**
 * The language and the voice the run speaks in. The choice's language, or
 * the app's; English when the phone is known to have no voice for it
 * (words in a language spoken by a voice of another are not understood).
 * A chosen voice is asked for only when the phone has it: one that is gone
 * leaves the phone's own voice for the language, without an error (iOS
 * says nothing at all for a voice it does not find).
 */
export function speaking(
  choice: VoiceChoice = voiceChoice(),
  app: Language = appLanguage(),
  voices: readonly Speech.Voice[] | null = phoneVoices,
): Speaking {
  const wanted = choice.language === "app" ? app : choice.language;
  // A phone that gave no voices at all says nothing about any language.
  const known = voices !== null && voices.length > 0 ? voices : null;
  const language =
    known !== null && voicesOf(wanted, known).length === 0 ? BASE_LANGUAGE : wanted;
  const voice = choice.voices[language];
  const found =
    voice !== undefined &&
    known !== null &&
    voicesOf(language, known).some((each) => each.identifier === voice);
  return {
    language,
    options: found
      ? { language: speechTag(language), voice }
      : { language: speechTag(language) },
  };
}

/** The voice's words in the language it speaks now. */
export function spokenWords(): VoiceWords {
  return wordsOf(speaking().language);
}
