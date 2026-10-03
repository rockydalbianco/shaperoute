import { capital, type Phrasebook, type Place } from "./phrasebook";

/** "sur le sentier" after a turn, "par le sentier" at the start. */
function place(words: string): Place {
  return { onto: `sur ${words}`, on: `par ${words}` };
}

/** "une minute", "5 minutes": one is said as a word, which agrees with its unit. */
function units(count: number, one: string, many: string): string {
  return count === 1 ? one : `${count} ${many}`;
}

/** "de Via Roma", "d'Avenue Foch": `de` loses its vowel before one. */
function of(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöûüœæ]/i.test(name) ? `d'${name}` : `de ${name}`;
}

/**
 * The voice in French (TASK-209): written by the agent, to be confirmed by
 * someone who speaks it (`docs/UI.md`, «La voce della corsa»). A letter is
 * masculine: «le A», «jusqu'au A».
 */
export const FR: Phrasebook = {
  turns: {
    depart: "Partez",
    left: "Tournez à gauche",
    right: "Tournez à droite",
    "sharp-left": "Tournez fortement à gauche",
    "sharp-right": "Tournez fortement à droite",
    straight: "Continuez tout droit",
    "u-turn": "Faites demi-tour",
  },
  kinds: {
    footway: place("le chemin piéton"),
    pedestrian: place("la rue piétonne"),
    path: place("le sentier"),
    cycleway: place("la piste cyclable"),
    track: place("le chemin de terre"),
    steps: place("les escaliers"),
    service: place("la voie de service"),
    living_street: place("la rue"),
    residential: place("la rue"),
  },
  road: place("la route"),
  street: place,
  beside: (name) => `à côté ${of(name)}`,
  inMetres: (metres, words) => `Dans ${metres} mètres, ${words}`,
  then: "puis",
  offRoute: "Vous avez quitté le parcours. Revenez-y.",
  backOnRoute: "De retour sur le parcours.",
  arrived: "Vous êtes à l'arrivée.",
  paused: "En pause.",
  resumed: "Reprise.",
  penUp: (letter) =>
    `Lettre terminée. Marchez jusqu'${letter === null ? "à la lettre suivante" : `au ${letter}`} : le dessin est en pause.`,
  penDown: (letter) =>
    `Stylo baissé : dessinez ${letter === null ? "la lettre suivante" : `le ${letter}`}.`,
  hours: (count) => units(count, "une heure", "heures"),
  minutes: (count) => units(count, "une minute", "minutes"),
  seconds: (count) => units(count, "une seconde", "secondes"),
  and: " ",
  kilometre: (km, time, pace) =>
    `${capital(units(km, "un kilomètre", "kilomètres"))}. Temps : ${time}. Allure moyenne : ${pace} au kilomètre.`,
  cheer: "Allez, en avant toute !",
};
