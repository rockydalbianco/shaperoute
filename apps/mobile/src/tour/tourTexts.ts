import { appLanguage } from "../i18n/language";
import type { Language } from "../i18n/languages";
import type { TourStepId } from "./tourSteps";

/**
 * The words of the tour and of «Guide» (TASK-266), in the five languages.
 * Kept here, not in `i18n/`: they are new texts of one part of the app, and
 * the names of the buttons they quote are the ones `i18n/` gives them.
 */
export type TourTexts = {
  readonly steps: Readonly<Record<TourStepId, { title: string; body: string }>>;
  /** The shapes' words with «Paddle»: on the water «Draw» has only them. */
  readonly shapeOnWater: string;
  readonly next: string;
  /** The last step's button. */
  readonly done: string;
  readonly skip: string;
  /** For the screen reader: where the tour is, `{n}` of `{total}`. */
  readonly stepOf: string;
  /** The row of «Profile» that opens the guide. */
  readonly guide: string;
  /** In the guide: the tour again. */
  readonly watch: string;
};

const EN: TourTexts = {
  steps: {
    welcome: {
      title: "Welcome to MuW",
      body: "Your route draws a shape on the map: a heart, a star, a word. Here is how it works.",
    },
    start: {
      title: "Where you start",
      body: "From where you are, or from any place you search.",
    },
    shape: {
      title: "What you draw",
      body: "Pick a shape here. Above, «Word» and «Image» draw a word or the outline of a photo of yours.",
    },
    distance: {
      title: "How far",
      body: "Set the distance with − and +, or type it.",
    },
    draw: {
      title: "Draw route",
      body: "MuW finds real streets that draw your shape. Then «Start»: a voice tells you every turn.",
    },
    header: {
      title: "Sport and profile",
      body: "Run, bike or paddle: choose it here. In your profile: your activities, favorites, settings and the guide.",
    },
    explore: {
      title: "Explore",
      body: "Routes already drawn near you, ready to go: pick one and start.",
    },
    feed: {
      title: "Feed",
      body: "The drawings other people publish, and yours when you publish an activity.",
    },
  },
  shapeOnWater: "Pick a shape here: on the water, the shapes of the catalogue.",
  next: "Next",
  done: "Let's go",
  skip: "Skip",
  stepOf: "{n} of {total}",
  guide: "Guide",
  watch: "Watch the tour",
};

const IT: TourTexts = {
  steps: {
    welcome: {
      title: "Ciao, questo è MuW",
      body: "Il tuo percorso disegna una forma sulla mappa: un cuore, una stella, una parola. Ti mostriamo come funziona.",
    },
    start: {
      title: "Da dove parti",
      body: "Da dove sei, o da qualsiasi posto che cerchi.",
    },
    shape: {
      title: "Cosa disegni",
      body: "Scegli qui una forma. Più in alto, «Parola» e «Immagine» disegnano una parola o il contorno di una tua foto.",
    },
    distance: {
      title: "Quanto lontano",
      body: "Imposta la distanza con − e +, oppure scrivila.",
    },
    draw: {
      title: "Disegna il percorso",
      body: "MuW trova strade vere che disegnano la tua forma. Poi «Parti»: una voce ti dice ogni svolta.",
    },
    header: {
      title: "Sport e profilo",
      body: "Corsa, bici o pagaia: lo scegli qui. Nel profilo trovi le tue attività, i preferiti, le impostazioni e la guida.",
    },
    explore: {
      title: "Esplora",
      body: "Percorsi già disegnati vicino a te, pronti da fare: scegline uno e parti.",
    },
    feed: {
      title: "Feed",
      body: "I disegni che pubblicano gli altri, e i tuoi quando pubblichi un'attività.",
    },
  },
  shapeOnWater: "Scegli qui una forma: sull'acqua, quelle del catalogo.",
  next: "Avanti",
  done: "Iniziamo",
  skip: "Salta",
  stepOf: "{n} di {total}",
  guide: "Guida",
  watch: "Rivedi il tour",
};

const DE: TourTexts = {
  steps: {
    welcome: {
      title: "Willkommen bei MuW",
      body: "Deine Route zeichnet eine Form auf die Karte: ein Herz, einen Stern, ein Wort. So funktioniert es.",
    },
    start: {
      title: "Wo du startest",
      body: "Dort, wo du bist, oder an jedem Ort, den du suchst.",
    },
    shape: {
      title: "Was du zeichnest",
      body: "Wähle hier eine Form. Darüber zeichnen «Wort» und «Bild» ein Wort oder den Umriss eines deiner Fotos.",
    },
    distance: {
      title: "Wie weit",
      body: "Stell die Distanz mit − und + ein oder tippe sie ein.",
    },
    draw: {
      title: "Route zeichnen",
      body: "MuW findet echte Straßen, die deine Form zeichnen. Dann «Start»: Eine Stimme sagt dir jede Abbiegung an.",
    },
    header: {
      title: "Sport und Profil",
      body: "Laufen, Rad oder Paddeln: Hier wählst du es. In deinem Profil: deine Aktivitäten, Favoriten, Einstellungen und die Anleitung.",
    },
    explore: {
      title: "Entdecken",
      body: "Schon gezeichnete Routen in deiner Nähe, startklar: Wähl eine aus und los.",
    },
    feed: {
      title: "Feed",
      body: "Die Zeichnungen, die andere veröffentlichen, und deine, wenn du eine Aktivität veröffentlichst.",
    },
  },
  shapeOnWater: "Wähle hier eine Form: auf dem Wasser die Formen aus dem Katalog.",
  next: "Weiter",
  done: "Los geht's",
  skip: "Überspringen",
  stepOf: "{n} von {total}",
  guide: "Anleitung",
  watch: "Tour ansehen",
};

const ES: TourTexts = {
  steps: {
    welcome: {
      title: "Te damos la bienvenida a MuW",
      body: "Tu ruta dibuja una forma en el mapa: un corazón, una estrella, una palabra. Así funciona.",
    },
    start: {
      title: "Dónde empiezas",
      body: "Desde donde estás, o desde cualquier lugar que busques.",
    },
    shape: {
      title: "Qué dibujas",
      body: "Elige aquí una forma. Más arriba, «Palabra» e «Imagen» dibujan una palabra o el contorno de una foto tuya.",
    },
    distance: {
      title: "Qué distancia",
      body: "Ajusta la distancia con − y +, o escríbela.",
    },
    draw: {
      title: "Dibujar la ruta",
      body: "MuW encuentra calles reales que dibujan tu forma. Luego «Empezar»: una voz te indica cada giro.",
    },
    header: {
      title: "Deporte y perfil",
      body: "Correr, bici o remo: lo eliges aquí. En tu perfil: tus actividades, favoritos, ajustes y la guía.",
    },
    explore: {
      title: "Explora",
      body: "Rutas ya dibujadas cerca de ti, listas para salir: elige una y empieza.",
    },
    feed: {
      title: "Feed",
      body: "Los dibujos que publican los demás, y los tuyos cuando publicas una actividad.",
    },
  },
  shapeOnWater: "Elige aquí una forma: en el agua, las del catálogo.",
  next: "Siguiente",
  done: "Vamos",
  skip: "Saltar",
  stepOf: "{n} de {total}",
  guide: "Guía",
  watch: "Ver el tour",
};

const FR: TourTexts = {
  steps: {
    welcome: {
      title: "Bienvenue sur MuW",
      body: "Ton parcours dessine une forme sur la carte : un cœur, une étoile, un mot. Voici comment ça marche.",
    },
    start: {
      title: "D'où tu pars",
      body: "D'où tu es, ou de n'importe quel lieu que tu cherches.",
    },
    shape: {
      title: "Ce que tu dessines",
      body: "Choisis une forme ici. Au-dessus, « Mot » et « Image » dessinent un mot ou le contour d'une de tes photos.",
    },
    distance: {
      title: "Quelle distance",
      body: "Règle la distance avec − et +, ou tape-la.",
    },
    draw: {
      title: "Dessiner le parcours",
      body: "MuW trouve de vraies rues qui dessinent ta forme. Puis « Démarrer » : une voix t'annonce chaque virage.",
    },
    header: {
      title: "Sport et profil",
      body: "Course, vélo ou pagaie : tu le choisis ici. Dans ton profil : tes activités, tes favoris, les réglages et le guide.",
    },
    explore: {
      title: "Explorer",
      body: "Des parcours déjà dessinés près de toi, prêts à partir : choisis-en un et c'est parti.",
    },
    feed: {
      title: "Fil",
      body: "Les dessins que publient les autres, et les tiens quand tu publies une activité.",
    },
  },
  shapeOnWater: "Choisis une forme ici : sur l'eau, celles du catalogue.",
  next: "Suivant",
  done: "C'est parti",
  skip: "Passer",
  stepOf: "{n} sur {total}",
  guide: "Guide",
  watch: "Revoir le tour",
};

export const TOUR_TEXTS: Readonly<Record<Language, TourTexts>> = {
  en: EN,
  it: IT,
  de: DE,
  es: ES,
  fr: FR,
};

/** The tour's words in the app's language. */
export function tourTexts(language: Language = appLanguage()): TourTexts {
  return TOUR_TEXTS[language];
}

/** «2 of 8», in the app's language. */
export function stepOf(texts: TourTexts, n: number, total: number): string {
  return texts.stepOf.replace("{n}", String(n)).replace("{total}", String(total));
}
