import type { Language } from "../i18n/languages";
import { appUnits, type Units } from "../units/units";
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

/** The words of every language, with the short distances in metres or,
 * with miles, in feet (TASK-182). */
function wordsIn(units: Units): Readonly<Record<Language, VoiceWords>> {
  return {
    en: voiceWords(EN, units),
    de: voiceWords(DE, units),
    it: voiceWords(IT, units),
    es: voiceWords(ES, units),
    fr: voiceWords(FR, units),
  };
}

const WORDS: Readonly<Record<Units, Readonly<Record<Language, VoiceWords>>>> = {
  km: wordsIn("km"),
  mi: wordsIn("mi"),
};

/**
 * What the voice says in `language` (TASK-209, ADR-0171), in the app's
 * units at the moment it is asked (TASK-182): with miles a turn is said in
 * feet. In kilometres, what it has always said.
 */
export function wordsOf(language: Language, units: Units = appUnits()): VoiceWords {
  return WORDS[units][language];
}
