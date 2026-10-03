import type { Phrasebook, Place } from "./phrasebook";

/** "auf den Fußweg" after a turn, "auf dem Fußweg" at the start: German
 * changes the article. */
function place(onto: string, on: string): Place {
  return { onto, on };
}

/** "eine Minute", "5 Minuten": one is said as a word, which agrees with its unit. */
function units(count: number, one: string, many: string): string {
  return count === 1 ? one : `${count} ${many}`;
}

/**
 * The voice in German (TASK-209): written by the agent, listened to and
 * confirmed by the user on 2026-10-03; the bike on foot (TASK-206) is still
 * to be confirmed (`docs/UI.md`, «La voce della corsa»). Directions
 * as German navigation says them, verb last ("Links abbiegen auf …"); a
 * letter is neuter: «das A», «zum A».
 */
export const DE: Phrasebook = {
  turns: {
    depart: "Loslaufen",
    left: "Links abbiegen",
    right: "Rechts abbiegen",
    "sharp-left": "Scharf links abbiegen",
    "sharp-right": "Scharf rechts abbiegen",
    straight: "Geradeaus weiter",
    "u-turn": "Wenden",
  },
  kinds: {
    footway: place("auf den Fußweg", "auf dem Fußweg"),
    pedestrian: place("in die Fußgängerzone", "in der Fußgängerzone"),
    path: place("auf den Pfad", "auf dem Pfad"),
    cycleway: place("auf den Radweg", "auf dem Radweg"),
    track: place("auf den Feldweg", "auf dem Feldweg"),
    steps: place("auf die Treppe", "auf der Treppe"),
    service: place("auf die Zufahrtsstraße", "auf der Zufahrtsstraße"),
    living_street: place("in die Straße", "in der Straße"),
    residential: place("in die Straße", "in der Straße"),
  },
  road: place("auf die Straße", "auf der Straße"),
  street: (name) => place(`auf ${name}`, `auf ${name}`),
  beside: (name) => `neben ${name}`,
  inMetres: (metres, words) => `In ${metres} Metern ${words}`,
  then: "dann",
  offRoute: "Abseits der Route. Bitte zur Route zurückkehren.",
  backOnRoute: "Wieder auf der Route.",
  arrived: "Ziel erreicht.",
  paused: "Pausiert.",
  resumed: "Weiter geht's.",
  penUp: (letter) =>
    `Buchstabe fertig. ${letter === null ? "Zum nächsten Buchstaben" : `Zum ${letter}`} gehen: die Zeichnung ist pausiert.`,
  penDown: (letter) =>
    `Stift aufsetzen: ${letter === null ? "den nächsten Buchstaben" : `das ${letter}`} zeichnen.`,
  // On a bike (TASK-216).
  rideTo: (letter) =>
    `Buchstabe fertig. ${letter === null ? "Zum nächsten Buchstaben" : `Zum ${letter}`} fahren: die Zeichnung ist pausiert.`,
  hours: (count) => units(count, "eine Stunde", "Stunden"),
  minutes: (count) => units(count, "eine Minute", "Minuten"),
  seconds: (count) => units(count, "eine Sekunde", "Sekunden"),
  and: " ",
  kilometre: (km, time, pace) =>
    `${units(km, "Ein Kilometer", "Kilometer")}. Zeit: ${time}. Durchschnittstempo: ${pace} pro Kilometer.`,
  cheer: "Los, volle Kraft voraus!",
  rideKilometres: (km, time, speed) =>
    `${units(km, "Ein Kilometer", "Kilometer")}. Zeit: ${time}. Durchschnittsgeschwindigkeit: ${speed} Kilometer pro Stunde.`,
  // The bike on foot (TASK-206).
  walkTheBike: (metres) => `absteigen und das Rad ${metres} Meter schieben`,
  backOnTheBike: "Wieder aufsteigen.",
};
