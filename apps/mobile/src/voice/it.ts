import { capital, type Phrasebook, type Place } from "./phrasebook";

/** "sul sentiero" after a turn, "lungo il sentiero" at the start. */
function place(onto: string, on: string): Place {
  return { onto, on };
}

/** "un minuto", "5 minuti": one is said as a word, which agrees with its unit. */
function units(count: number, one: string, many: string): string {
  return count === 1 ? one : `${count} ${many}`;
}

/**
 * The voice in Italian (TASK-209): written by the agent, to be confirmed
 * by the user (`docs/UI.md`, «La voce della corsa»). A letter is feminine:
 * «la A».
 */
export const IT: Phrasebook = {
  turns: {
    depart: "Parti",
    left: "Svolta a sinistra",
    right: "Svolta a destra",
    "sharp-left": "Svolta decisamente a sinistra",
    "sharp-right": "Svolta decisamente a destra",
    straight: "Prosegui dritto",
    "u-turn": "Torna indietro",
  },
  kinds: {
    footway: place("sul percorso pedonale", "lungo il percorso pedonale"),
    pedestrian: place("sulla via pedonale", "lungo la via pedonale"),
    path: place("sul sentiero", "lungo il sentiero"),
    cycleway: place("sulla pista ciclabile", "lungo la pista ciclabile"),
    track: place("sulla strada sterrata", "lungo la strada sterrata"),
    steps: place("sulla scalinata", "lungo la scalinata"),
    service: place("sulla strada di servizio", "lungo la strada di servizio"),
    living_street: place("sulla via", "lungo la via"),
    residential: place("sulla via", "lungo la via"),
  },
  road: place("sulla strada", "lungo la strada"),
  street: (name) => place(`su ${name}`, `lungo ${name}`),
  beside: (name) => `accanto a ${name}`,
  inMetres: (metres, words) => `Tra ${metres} metri, ${words}`,
  then: "poi",
  offRoute: "Sei fuori percorso. Torna sul percorso.",
  backOnRoute: "Di nuovo sul percorso.",
  arrived: "Hai raggiunto l'arrivo.",
  paused: "In pausa.",
  resumed: "Si riparte.",
  penUp: (letter) =>
    `Lettera finita. Cammina fino ${letter === null ? "alla lettera successiva" : `alla ${letter}`}: il disegno è in pausa.`,
  penDown: (letter) =>
    `Giù la penna: disegna ${letter === null ? "la lettera successiva" : `la ${letter}`}.`,
  hours: (count) => units(count, "un'ora", "ore"),
  minutes: (count) => units(count, "un minuto", "minuti"),
  seconds: (count) => units(count, "un secondo", "secondi"),
  and: " e ",
  kilometre: (km, time, pace) =>
    `${capital(units(km, "un chilometro", "chilometri"))}. Tempo: ${time}. Passo medio: ${pace} al chilometro.`,
};
