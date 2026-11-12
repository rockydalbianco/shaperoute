/**
 * The words of the page of a post's link (TASK-455, ADR-0382), in the app's
 * five languages. `by`, `get` and `gone` are the texts the user approved on
 * 2026-11-12 («{user} drew this on MuW», «Get MuW», «This drawing is no
 * longer available.»), the other languages translated from them. The names
 * of the sports are the app's own (apps/mobile/src/sports, src/i18n), so a
 * post is called here as the app calls it. The language comes from the
 * browser, English when it is none of these (../live/texts.js).
 */

export const TEXTS = {
  en: {
    by: "{user} drew this on MuW",
    get: "Get MuW",
    gone: "This drawing is no longer available.",
  },
  it: {
    by: "{user} ha disegnato questo con MuW",
    get: "Scarica MuW",
    gone: "Questo disegno non è più disponibile.",
  },
  de: {
    by: "{user} hat das mit MuW gezeichnet",
    get: "MuW laden",
    gone: "Diese Zeichnung ist nicht mehr verfügbar.",
  },
  fr: {
    by: "{user} a dessiné ceci avec MuW",
    get: "Obtenir MuW",
    gone: "Ce dessin n'est plus disponible.",
  },
  es: {
    by: "{user} dibujó esto con MuW",
    get: "Consigue MuW",
    gone: "Este dibujo ya no está disponible.",
  },
};

/** What a run was, as the app says it; a sport the page does not know is
 * left unsaid. */
export const SPORTS = {
  en: {
    running: "Run",
    cycling: "Bike",
    paddling: "Paddle",
    swimming: "Swim",
    hiking: "Hike",
    mountain_biking: "MTB",
    inline_skating: "Roller",
    snowshoeing: "Snowshoes",
    wheelchair: "Wheelchair & stroller",
    walking: "Walk",
    gravel_biking: "Gravel",
    skiing: "Ski",
    xc_skiing: "Cross-country ski",
    ski_touring: "Ski touring",
    paragliding: "Paragliding",
  },
  it: {
    running: "Corsa",
    cycling: "Bici",
    paddling: "Pagaia",
    swimming: "Nuoto",
    hiking: "Escursione",
    mountain_biking: "MTB",
    inline_skating: "Roller",
    snowshoeing: "Ciaspole",
    wheelchair: "Carrozzina e passeggino",
    walking: "Camminata",
    gravel_biking: "Gravel",
    skiing: "Sci",
    xc_skiing: "Sci di fondo",
    ski_touring: "Scialpinismo",
    paragliding: "Parapendio",
  },
  de: {
    running: "Lauf",
    cycling: "Rad",
    paddling: "Paddeln",
    swimming: "Schwimmen",
    hiking: "Wandern",
    mountain_biking: "MTB",
    inline_skating: "Inline",
    snowshoeing: "Schneeschuhe",
    wheelchair: "Rollstuhl & Kinderwagen",
    walking: "Gehen",
    gravel_biking: "Gravel",
    skiing: "Ski",
    xc_skiing: "Langlauf",
    ski_touring: "Skitour",
    paragliding: "Gleitschirmfliegen",
  },
  fr: {
    running: "Course",
    cycling: "Vélo",
    paddling: "Pagaie",
    swimming: "Natation",
    hiking: "Randonnée",
    mountain_biking: "VTT",
    inline_skating: "Roller",
    snowshoeing: "Raquettes",
    wheelchair: "Fauteuil et poussette",
    walking: "Marche",
    gravel_biking: "Gravel",
    skiing: "Ski",
    xc_skiing: "Ski de fond",
    ski_touring: "Ski de randonnée",
    paragliding: "Parapente",
  },
  es: {
    running: "Carrera",
    cycling: "Bici",
    paddling: "Remo",
    swimming: "Natación",
    hiking: "Senderismo",
    mountain_biking: "MTB",
    inline_skating: "Patines",
    snowshoeing: "Raquetas de nieve",
    wheelchair: "Silla y carrito",
    walking: "Caminata",
    gravel_biking: "Gravel",
    skiing: "Esquí",
    xc_skiing: "Esquí de fondo",
    ski_touring: "Esquí de travesía",
    paragliding: "Parapente",
  },
};
