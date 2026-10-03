import type { Direction, Turn } from "@shaperoute/shared-types";

import { roundMetres } from "../navigation/phrases";

/**
 * What the voice says along a run, in one language (TASK-209, ADR-0171).
 * Each language writes its words once (`en.ts`, `it.ts`, …) and
 * `voiceWords` puts them together the same way for all: the navigator
 * decides when to speak and what about, these say it. Only what is said:
 * what the screen writes, the banner too, is the app's (TASK-210).
 */

/** The kinds of road the voice names when OpenStreetMap gives no name
 * (ADR-0045): a runner meets these; any other is "the road". */
export const KINDS = [
  "footway",
  "pedestrian",
  "path",
  "cycleway",
  "track",
  "steps",
  "service",
  "living_street",
  "residential",
] as const;

export type Kind = (typeof KINDS)[number];

/** The kilometre after which the voice cheers the runner on (the user's
 * choice, 2026-10-03): «Daje, avanti tutta!» after the first 5 km. */
export const CHEER_KM = 5;

/** Where a direction goes, as said after a turn ("onto the footpath") and
 * at the start ("on the footpath"): some languages change the words. */
export type Place = { onto: string; on: string };

/** A language's words for the voice. */
export type Phrasebook = {
  /** "Turn left", "Continue straight"; the departure: "Head out". */
  turns: Record<Turn, string>;
  /** A road without a name, by its kind: never a name made up (ADR-0045). */
  kinds: Record<Kind, Place>;
  /** A road without a name of any other kind. */
  road: Place;
  /** A road by its own name, which is never translated (ADR-0057). */
  street(name: string): Place;
  /** The street a nameless road runs beside (ADR-0058): "beside Via Roma". */
  beside(name: string): string;
  /** "In 50 metres, turn left…": `metres` is rounded, `words` start in
   * lower case. */
  inMetres(metres: number, words: string): string;
  /** Before each direction said after the first: "then". */
  then: string;
  offRoute: string;
  backOnRoute: string;
  arrived: string;
  /** The pause by standing still, and the run going on (TASK-169). */
  paused: string;
  resumed: string;
  /** The end of a letter with the pen up, and the start of the next
   * (TASK-198); `letter` is null when the word does not say which. */
  penUp(letter: string | null): string;
  penDown(letter: string | null): string;
  /** A part of a time, with its unit: "1 hour", "5 minutes", "42 seconds". */
  hours(count: number): string;
  minutes(count: number): string;
  seconds(count: number): string;
  /** Between two parts of a time: " " in English, " e " in Italian. */
  and: string;
  /** Each kilometre, with the time so far and the average pace, both
   * already said as times. */
  kilometre(km: number, time: string, pace: string): string;
  /** Said after the kilometre CHEER_KM: «Daje, avanti tutta!». */
  cheer: string;
};

/** The voice's phrases in one language, ready to say. */
export type VoiceWords = {
  /** "Turn left onto Via Roma"; the departure says where it starts:
   * "Head out on Via Roma". */
  direction(direction: Direction): string;
  /**
   * The words said before a junction: "In 50 metres, turn left onto Via
   * Roma, then turn right onto the footpath". `chain` is the direction and
   * those joined to it (a street crossed in a few metres), said together;
   * with `inM` null, the first is said as it is.
   */
  announcement(chain: readonly Direction[], inM: number | null): string;
  /** "25 minutes 10 seconds", "1 hour 2 minutes": a time as said. */
  time(ms: number): string;
  /** "1 kilometre. Time: … Average pace: … per kilometre."; the kilometre
   * CHEER_KM ends with the cheer. */
  kilometre(km: number, ms: number, paceMs: number): string;
  offRoute: string;
  backOnRoute: string;
  arrived: string;
  paused: string;
  resumed: string;
  penUp(letter: string | null): string;
  penDown(letter: string | null): string;
};

function isKind(kind: string): kind is Kind {
  return (KINDS as readonly string[]).includes(kind);
}

function lower(words: string): string {
  return words.charAt(0).toLowerCase() + words.slice(1);
}

/** The phrases of `book`, put together as every language does. */
export function voiceWords(book: Phrasebook): VoiceWords {
  /** The road the direction goes onto, or null when OSM says nothing. */
  function place(direction: Direction): Place | null {
    if (direction.street) {
      return book.street(direction.street);
    }
    // A merged edge can be "footway / steps": the first kind is enough.
    const kind = direction.road_type?.split(" / ")[0];
    if (!kind) {
      return null;
    }
    return isKind(kind) ? book.kinds[kind] : book.road;
  }

  function direction(direction: Direction): string {
    const where = place(direction);
    const words =
      where === null ? "" : ` ${direction.turn === "depart" ? where.on : where.onto}`;
    // `street` always wins over `along`, which is missing from an API older
    // than TASK-060.
    const beside =
      !direction.street && direction.along ? ` ${book.beside(direction.along)}` : "";
    return `${book.turns[direction.turn]}${words}${beside}`;
  }

  function time(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) {
      return minutes > 0
        ? `${book.hours(hours)}${book.and}${book.minutes(minutes)}`
        : book.hours(hours);
    }
    if (minutes === 0) {
      return book.seconds(seconds);
    }
    return seconds > 0
      ? `${book.minutes(minutes)}${book.and}${book.seconds(seconds)}`
      : book.minutes(minutes);
  }

  return {
    direction,
    announcement(chain, inM) {
      const said = chain.map(direction);
      const first =
        inM === null ? said[0] : book.inMetres(roundMetres(inM), lower(said[0]));
      return [
        first,
        ...said.slice(1).map((words) => `${book.then} ${lower(words)}`),
      ].join(", ");
    },
    time,
    kilometre(km, ms, paceMs) {
      const said = book.kilometre(km, time(ms), time(paceMs));
      return km === CHEER_KM ? `${said} ${book.cheer}` : said;
    },
    offRoute: book.offRoute,
    backOnRoute: book.backOnRoute,
    arrived: book.arrived,
    paused: book.paused,
    resumed: book.resumed,
    penUp: book.penUp,
    penDown: book.penDown,
  };
}

/** `words` with a capital first letter: a phrase that opens a sentence. */
export function capital(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}
