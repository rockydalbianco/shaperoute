/**
 * The words of the live page (TASK-424, ADR-0352), in the app's five
 * languages: the texts approved by the user on 2026-11-08, word for word
 * from docs/tasks/TASK-424.md «Testi». The language comes from the browser,
 * English when it is none of these. `{n}` and `{time}` are filled by `fill`.
 *
 * `privacy` is the title of the site's privacy page in that language.
 * `altitude`, `vario` and `maxAltitude` are the numbers of a flight
 * (TASK-305 R3, docs/tasks/TASK-305.md «Testi di R3»).
 */

export const LANGUAGES = ["en", "it", "de", "fr", "es"];

export const TEXTS = {
  en: {
    title: "Live activity",
    live: "Live",
    updated: "Updated {n} s ago",
    noUpdateSince: "No update since {time}",
    paused: "Paused",
    finishedAt: "Finished at {time}",
    stopped: "Sharing stopped",
    expired: "This link has expired",
    distance: "Distance",
    time: "Time",
    pace: "Pace",
    speed: "Speed",
    climb: "Elev. gain",
    calories: "Calories",
    heart: "Heart rate",
    lengths: "Lengths (est.)",
    exercise: "Exercise",
    altitude: "Altitude",
    vario: "Vario",
    maxAltitude: "Max altitude",
    footer: "Shared from MuW. The link stops working one hour after the activity ends.",
    privacy: "Privacy policy",
  },
  it: {
    title: "Attività dal vivo",
    live: "Dal vivo",
    updated: "Aggiornato {n} s fa",
    noUpdateSince: "Nessun aggiornamento dalle {time}",
    paused: "In pausa",
    finishedAt: "Finita alle {time}",
    stopped: "Condivisione interrotta",
    expired: "Questo link è scaduto",
    distance: "Distanza",
    time: "Tempo",
    pace: "Passo",
    speed: "Velocità",
    climb: "Dislivello",
    calories: "Calorie",
    heart: "Battito",
    lengths: "Vasche (stima)",
    exercise: "Esercizio",
    altitude: "Quota",
    vario: "Variometro",
    maxAltitude: "Quota massima",
    footer:
      "Condiviso da MuW. Il link smette di funzionare un'ora dopo la fine dell'attività.",
    privacy: "Informativa sulla privacy",
  },
  de: {
    title: "Live-Aktivität",
    live: "Live",
    updated: "Vor {n} s aktualisiert",
    noUpdateSince: "Keine Aktualisierung seit {time}",
    paused: "Pausiert",
    finishedAt: "Beendet um {time}",
    stopped: "Teilen beendet",
    expired: "Dieser Link ist abgelaufen",
    distance: "Distanz",
    time: "Zeit",
    pace: "Pace",
    speed: "Tempo",
    climb: "Höhenmeter",
    calories: "Kalorien",
    heart: "Puls",
    lengths: "Bahnen (geschätzt)",
    exercise: "Übung",
    altitude: "Höhe",
    vario: "Vario",
    maxAltitude: "Max. Höhe",
    footer:
      "Geteilt über MuW. Der Link funktioniert eine Stunde nach dem Ende der Aktivität nicht mehr.",
    privacy: "Datenschutzerklärung",
  },
  fr: {
    title: "Activité en direct",
    live: "En direct",
    updated: "Mis à jour il y a {n} s",
    noUpdateSince: "Aucune mise à jour depuis {time}",
    paused: "En pause",
    finishedAt: "Terminée à {time}",
    stopped: "Partage arrêté",
    expired: "Ce lien a expiré",
    distance: "Distance",
    time: "Temps",
    pace: "Allure",
    speed: "Vitesse",
    climb: "Dénivelé",
    calories: "Calories",
    heart: "Fréquence cardiaque",
    lengths: "Longueurs (estim.)",
    exercise: "Exercice",
    altitude: "Altitude",
    vario: "Vario",
    maxAltitude: "Altitude max.",
    footer:
      "Partagé depuis MuW. Le lien cesse de fonctionner une heure après la fin de l'activité.",
    privacy: "Politique de confidentialité",
  },
  es: {
    title: "Actividad en directo",
    live: "En directo",
    updated: "Actualizado hace {n} s",
    noUpdateSince: "Sin actualizaciones desde las {time}",
    paused: "En pausa",
    finishedAt: "Terminada a las {time}",
    stopped: "Se ha dejado de compartir",
    expired: "Este enlace ha caducado",
    distance: "Distancia",
    time: "Tiempo",
    pace: "Ritmo",
    speed: "Velocidad",
    climb: "Desnivel",
    calories: "Calorías",
    heart: "Pulso",
    lengths: "Largos (estim.)",
    exercise: "Ejercicio",
    altitude: "Altitud",
    vario: "Variómetro",
    maxAltitude: "Altitud máx.",
    footer:
      "Compartido desde MuW. El enlace deja de funcionar una hora después de que termine la actividad.",
    privacy: "Política de privacidad",
  },
};

/**
 * The first of the browser's languages («it-IT», «de») that the page has,
 * English otherwise.
 * @param {readonly string[] | undefined} languages navigator.languages
 * @returns {string}
 */
export function pickLanguage(languages) {
  for (const tag of languages ?? []) {
    const code = String(tag).toLowerCase().split(/[-_]/)[0];
    if (LANGUAGES.includes(code)) {
      return code;
    }
  }
  return "en";
}

/**
 * A text with its `{name}` parts filled.
 * @param {string} text
 * @param {Record<string, string | number>} values
 * @returns {string}
 */
export function fill(text, values) {
  return text.replace(/\{(\w+)\}/g, (whole, name) =>
    name in values ? String(values[name]) : whole,
  );
}
