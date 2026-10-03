import { capital, type Phrasebook, type Place } from "./phrasebook";

/** "hacia el sendero" after a turn, "por el sendero" at the start. */
function place(words: string): Place {
  return { onto: `hacia ${words}`, on: `por ${words}` };
}

/** "un minuto", "5 minutos": one is said as a word, which agrees with its unit. */
function units(count: number, one: string, many: string): string {
  return count === 1 ? one : `${count} ${many}`;
}

/**
 * The voice in Spanish (TASK-209): written by the agent, to be confirmed by
 * someone who speaks it (`docs/UI.md`, «La voce della corsa»). A letter is
 * feminine: «la A».
 */
export const ES: Phrasebook = {
  turns: {
    depart: "Sal",
    left: "Gira a la izquierda",
    right: "Gira a la derecha",
    "sharp-left": "Gira bruscamente a la izquierda",
    "sharp-right": "Gira bruscamente a la derecha",
    straight: "Sigue recto",
    "u-turn": "Da media vuelta",
  },
  kinds: {
    footway: place("el camino peatonal"),
    pedestrian: place("la calle peatonal"),
    path: place("el sendero"),
    cycleway: place("el carril bici"),
    track: place("el camino de tierra"),
    steps: place("las escaleras"),
    service: place("la vía de servicio"),
    living_street: place("la calle"),
    residential: place("la calle"),
  },
  road: place("la carretera"),
  street: place,
  beside: (name) => `junto a ${name}`,
  inMetres: (metres, words) => `En ${metres} metros, ${words}`,
  then: "luego",
  offRoute: "Te has salido de la ruta. Vuelve a ella.",
  backOnRoute: "De nuevo en la ruta.",
  arrived: "Has llegado.",
  paused: "En pausa.",
  resumed: "Reanudamos.",
  penUp: (letter) =>
    `Letra terminada. Camina hasta ${letter === null ? "la siguiente letra" : `la ${letter}`}: el dibujo está en pausa.`,
  penDown: (letter) =>
    `Baja el lápiz: dibuja ${letter === null ? "la siguiente letra" : `la ${letter}`}.`,
  hours: (count) => units(count, "una hora", "horas"),
  minutes: (count) => units(count, "un minuto", "minutos"),
  seconds: (count) => units(count, "un segundo", "segundos"),
  and: " y ",
  kilometre: (km, time, pace) =>
    `${capital(units(km, "un kilómetro", "kilómetros"))}. Tiempo: ${time}. Ritmo medio: ${pace} por kilómetro.`,
  cheer: "¡Vamos, a toda máquina!",
};
