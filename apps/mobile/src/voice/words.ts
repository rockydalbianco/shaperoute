import type { Language } from "../i18n/languages";
import { DE } from "./de";
import { EN } from "./en";
import { ES } from "./es";
import { FR } from "./fr";
import { IT } from "./it";
import { type Phrasebook, voiceWords, type VoiceWords } from "./phrasebook";

/** Each language's words for the voice, one per language of the app (TASK-210). */
export const PHRASEBOOKS: Readonly<Record<Language, Phrasebook>> = {
  en: EN,
  de: DE,
  it: IT,
  es: ES,
  fr: FR,
};

const WORDS: Readonly<Record<Language, VoiceWords>> = {
  en: voiceWords(EN),
  de: voiceWords(DE),
  it: voiceWords(IT),
  es: voiceWords(ES),
  fr: voiceWords(FR),
};

/** What the voice says in `language` (TASK-209, ADR-0171). */
export function wordsOf(language: Language): VoiceWords {
  return WORDS[language];
}
