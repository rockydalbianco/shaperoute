import { type Shape, SHAPES } from "@shaperoute/shared-types";

import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import { shapeWord } from "../i18n/shapeNames";

/**
 * The words that name each shape of the catalogue (ADR-0036), in the
 * app's five languages (TASK-210 F), singular and plural, written as each
 * language writes them: accents and capitals do not count when the field
 * is read. Every language's words are known whatever the app's language.
 * Any other word is for the AI to read, later (TASK-030).
 */
export const SHAPE_WORDS: Record<
  Shape,
  Readonly<Record<Language, readonly string[]>>
> = {
  circle: {
    en: ["circle", "circles", "ring", "round"],
    de: ["Kreis", "Kreise", "Ring", "rund"],
    it: ["cerchio", "cerchi", "anello", "tondo"],
    es: ["círculo", "círculos", "anillo", "redondo", "redondel"],
    fr: ["cercle", "cercles", "anneau", "rond"],
  },
  heart: {
    en: ["heart", "hearts", "love"],
    de: ["Herz", "Herzen", "Herzchen", "Liebe"],
    it: ["cuore", "cuori", "cuoricino", "amore"],
    es: ["corazón", "corazones", "corazoncito", "amor"],
    fr: ["cœur", "cœurs", "amour"],
  },
  star: {
    en: ["star", "stars"],
    de: ["Stern", "Sterne", "Sternchen"],
    it: ["stella", "stelle", "stellina"],
    es: ["estrella", "estrellas", "estrellita"],
    fr: ["étoile", "étoiles"],
  },
  horse: {
    en: ["horse", "horses", "pony", "stallion"],
    de: ["Pferd", "Pferde", "Pony", "Ross", "Hengst", "Fohlen"],
    it: ["cavallo", "cavalli", "cavallino", "stallone", "puledro"],
    es: ["caballo", "caballos", "caballito", "poni", "potro", "semental"],
    fr: ["cheval", "chevaux", "poney", "étalon", "poulain"],
  },
  moon: {
    en: ["moon", "moons", "crescent", "crescent moon"],
    de: ["Mond", "Monde", "Halbmond", "Mondsichel"],
    it: ["luna", "lune", "mezzaluna", "falce di luna"],
    es: ["luna", "lunas", "media luna", "luna creciente"],
    fr: ["lune", "lunes", "croissant de lune", "demi-lune"],
  },
  cat: {
    en: ["cat", "cats", "kitty", "kitten"],
    de: ["Katze", "Katzen", "Kater", "Kätzchen", "Mieze"],
    it: ["gatto", "gatti", "gatta", "gatte", "gattino", "micio"],
    es: ["gato", "gatos", "gata", "gatito", "gatita", "minino"],
    fr: ["chat", "chats", "chaton", "minou"],
  },
  fish: {
    en: ["fish", "fishes"],
    de: ["Fisch", "Fische"],
    it: ["pesce", "pesci", "pesciolino"],
    es: ["pez", "peces", "pececito"],
    fr: ["poisson", "poissons"],
  },
  butterfly: {
    en: ["butterfly", "butterflies"],
    de: ["Schmetterling", "Schmetterlinge", "Falter"],
    it: ["farfalla", "farfalle", "farfallina"],
    es: ["mariposa", "mariposas", "mariposita"],
    fr: ["papillon", "papillons"],
  },
  snail: {
    en: ["snail", "snails"],
    de: ["Schnecke", "Schnecken"],
    it: ["lumaca", "lumache", "lumachina", "chiocciola", "chiocciole"],
    es: ["caracol", "caracoles", "caracolito"],
    fr: ["escargot", "escargots"],
  },
  // Only the head is drawn, but a dog is what the runner asks for (ADR-0061).
  dog_head: {
    en: ["dog", "dogs", "dog head", "dog's head", "doggy", "puppy"],
    de: ["Hund", "Hunde", "Hündchen", "Welpe", "Hundekopf"],
    it: ["cane", "cani", "cagnolino", "testa di cane"],
    es: ["perro", "perros", "perrito", "cachorro", "cabeza de perro"],
    fr: ["chien", "chiens", "chiot", "toutou", "tête de chien"],
  },
  // The same for the rabbit: its head is the rabbit (ADR-0061).
  rabbit_head: {
    en: ["rabbit", "rabbits", "rabbit head", "rabbit's head", "bunny"],
    de: ["Hase", "Hasen", "Häschen", "Kaninchen", "Karnickel", "Hasenkopf"],
    it: ["coniglio", "conigli", "coniglietto", "testa di coniglio"],
    es: ["conejo", "conejos", "conejito", "cabeza de conejo"],
    fr: ["lapin", "lapins", "lapereau", "tête de lapin"],
  },
  pumpkin: {
    en: ["pumpkin", "pumpkins", "halloween pumpkin", "jack-o'-lantern"],
    de: ["Kürbis", "Kürbisse", "Halloweenkürbis", "Halloween-Kürbis"],
    it: ["zucca", "zucche", "zucca di halloween"],
    es: ["calabaza", "calabazas", "calabaza de Halloween"],
    fr: ["citrouille", "citrouilles", "citrouille d'Halloween"],
  },
  // Never "tree" or "albero" alone: a plain tree is another drawing, not in
  // the catalogue (ADR-0084). «Tannenbaum» and «sapin» are a fir as well.
  christmas_tree: {
    en: ["christmas tree", "christmas trees", "xmas tree"],
    de: ["Weihnachtsbaum", "Weihnachtsbäume", "Christbaum"],
    it: ["albero di natale", "alberi di natale", "alberello di natale"],
    es: ["árbol de Navidad", "árboles de Navidad", "arbolito de Navidad"],
    fr: ["sapin de Noël", "sapins de Noël", "arbre de Noël"],
  },
  // The simple shapes of TASK-223. The ring and the round are the circle's.
  smiley: {
    en: ["smiley", "smileys", "smiley face", "smiling face", "happy face", "smile"],
    de: ["Smiley", "Smileys", "Lächeln", "lachendes Gesicht"],
    it: ["faccina", "faccine", "faccina sorridente", "sorriso", "sorrisino"],
    es: [
      "carita sonriente",
      "caritas sonrientes",
      "cara sonriente",
      "carita feliz",
      "carita",
      "sonrisa",
    ],
    fr: ["smiley", "smileys", "visage souriant", "sourire"],
  },
  ghost: {
    en: ["ghost", "ghosts", "spook"],
    de: ["Gespenst", "Gespenster", "Geist", "Geister"],
    it: ["fantasma", "fantasmi", "fantasmino", "spettro"],
    es: ["fantasma", "fantasmas", "fantasmita", "espectro"],
    fr: ["fantôme", "fantômes", "spectre"],
  },
  donut: {
    en: ["donut", "donuts", "doughnut", "doughnuts"],
    de: ["Donut", "Donuts"],
    it: ["ciambella", "ciambelle", "ciambellina"],
    es: ["dónut", "dónuts", "rosquilla"],
    fr: ["donut", "donuts"],
  },
  sun: {
    en: ["sun", "suns", "sunshine"],
    de: ["Sonne", "Sonnen", "Sonnenschein"],
    it: ["sole", "solicello", "sole splendente"],
    es: ["sol", "soles", "solecito"],
    fr: ["soleil", "soleils"],
  },
  airplane: {
    en: ["airplane", "airplanes", "plane", "aeroplane"],
    de: ["Flugzeug", "Flugzeuge", "Flieger"],
    it: ["aereo", "aerei", "aeroplano"],
    es: ["avión", "aviones", "avioneta"],
    fr: ["avion", "avions"],
  },
  anchor: {
    en: ["anchor", "anchors"],
    de: ["Anker"],
    it: ["ancora", "ancore"],
    es: ["ancla", "anclas"],
    fr: ["ancre", "ancres"],
  },
  bear_head: {
    en: ["bear head", "bear", "bears", "teddy bear", "teddy"],
    de: ["Bärenkopf", "Bär", "Bären", "Teddybär", "Teddy"],
    it: ["testa d'orso", "orso", "orsi", "orsetto", "orsacchiotto"],
    es: ["cabeza de oso", "oso", "osos", "osito", "osito de peluche"],
    fr: ["tête d'ours", "ours", "ourson", "nounours"],
  },
  bicycle: {
    en: ["bicycle", "bicycles", "bike", "bikes"],
    de: ["Fahrrad", "Fahrräder", "Rad"],
    it: ["bicicletta", "biciclette", "bici"],
    es: ["bicicleta", "bicicletas", "bici"],
    fr: ["vélo", "vélos", "bicyclette"],
  },
  cherries: {
    en: ["cherries", "cherry"],
    de: ["Kirschen", "Kirsche"],
    it: ["ciliegie", "ciliegia", "ciliege"],
    es: ["cerezas", "cereza"],
    fr: ["cerises", "cerise"],
  },
  espresso_cup: {
    en: ["espresso cup", "espresso", "coffee cup", "coffee", "cup of coffee"],
    de: ["Espressotasse", "Espresso", "Kaffeetasse", "Kaffee"],
    it: ["tazzina di caffè", "tazzina", "caffè", "tazza di caffè", "espresso"],
    es: ["taza de café", "café", "tacita", "taza"],
    fr: ["tasse d'espresso", "tasse de café", "café", "tasse"],
  },
  four_leaf_clover: {
    en: ["four-leaf clover", "four leaf clover", "clover", "shamrock"],
    de: ["vierblättriges Kleeblatt", "Kleeblatt", "Klee", "Glücksklee"],
    it: ["quadrifoglio", "quadrifogli", "trifoglio"],
    es: ["trébol de cuatro hojas", "trébol", "tréboles"],
    fr: ["trèfle à quatre feuilles", "trèfle", "trèfles"],
  },
  leaning_tower: {
    en: ["leaning tower", "leaning tower of pisa", "tower of pisa", "pisa"],
    de: ["schiefer Turm", "schiefer Turm von Pisa", "Turm von Pisa"],
    it: ["torre di pisa", "torre pendente", "torre"],
    es: ["torre inclinada", "torre de pisa", "torre"],
    fr: ["tour penchée", "tour de pise", "tour"],
  },
  music_note: {
    en: ["music note", "musical note", "note", "notes"],
    de: ["Musiknote", "Note", "Noten"],
    it: ["nota musicale", "nota", "note musicali"],
    es: ["nota musical", "nota", "notas"],
    fr: ["note de musique", "note", "notes de musique"],
  },
  pear: {
    en: ["pear", "pears"],
    de: ["Birne", "Birnen"],
    it: ["pera", "pere"],
    es: ["pera", "peras"],
    fr: ["poire", "poires"],
  },
  sailboat: {
    en: ["sailboat", "sailboats", "sailing boat", "boat", "yacht"],
    de: ["Segelboot", "Segelboote", "Boot", "Segler"],
    it: ["barca a vela", "barca", "barche", "veliero"],
    es: ["velero", "veleros", "barco de vela", "barco"],
    fr: ["voilier", "voiliers", "bateau"],
  },
  swan: {
    en: ["swan", "swans"],
    de: ["Schwan", "Schwäne"],
    it: ["cigno", "cigni"],
    es: ["cisne", "cisnes"],
    fr: ["cygne", "cygnes"],
  },
  windmill: {
    en: ["windmill", "windmills", "mill"],
    de: ["Windmühle", "Windmühlen", "Mühle"],
    it: ["mulino a vento", "mulino", "mulini"],
    es: ["molino de viento", "molino", "molinos"],
    fr: ["moulin à vent", "moulin", "moulins"],
  },
  wine_glass: {
    en: ["wine glass", "wine glasses", "glass of wine", "wine"],
    de: ["Weinglas", "Weingläser", "Wein"],
    it: ["calice", "calici", "bicchiere di vino", "vino"],
    es: ["copa de vino", "copa", "copas", "vino"],
    fr: ["verre à vin", "verre de vin", "vin"],
  },
  // TASK-516 (ADR-0411)
  ball: {
    en: ["ball", "balls", "football", "soccer ball"],
    de: ["Fußball", "Fußbälle", "Ball", "Bälle"],
    it: ["pallone", "palloni", "palla", "pallone da calcio"],
    es: ["balón", "balones", "pelota", "pelotas", "balón de fútbol"],
    fr: ["ballon", "ballons", "ballon de foot", "balle"],
  },
  bell: {
    en: ["bell", "bells", "christmas bell"],
    de: ["Glocke", "Glocken", "Weihnachtsglocke"],
    it: ["campana", "campane", "campanella"],
    es: ["campana", "campanas"],
    fr: ["cloche", "cloches", "clochette"],
  },
  candy_cane: {
    en: ["candy cane", "candy canes"],
    de: ["Zuckerstange", "Zuckerstangen"],
    it: ["bastoncino di zucchero", "bastoncini di zucchero", "bastoncino"],
    es: ["bastón de caramelo", "bastones de caramelo", "bastón de dulce"],
    fr: ["sucre d'orge", "sucres d'orge", "canne en sucre"],
  },
  colosseum: {
    en: ["colosseum", "coliseum"],
    de: ["Kolosseum"],
    it: ["colosseo", "anfiteatro"],
    es: ["coliseo", "anfiteatro romano"],
    fr: ["colisée"],
  },
  croissant: {
    en: ["croissant", "croissants"],
    de: ["Croissant", "Croissants", "Hörnchen"],
    it: ["cornetto", "cornetti", "brioche"],
    es: ["cruasán", "cruasanes", "cuerno"],
    fr: ["croissant", "croissants"],
  },
  dolphin: {
    en: ["dolphin", "dolphins"],
    de: ["Delfin", "Delfine"],
    it: ["delfino", "delfini"],
    es: ["delfín", "delfines"],
    fr: ["dauphin", "dauphins"],
  },
  dome: {
    en: ["dome", "domes", "cupola"],
    de: ["Kuppel", "Kuppeln"],
    it: ["cupola", "cupole"],
    es: ["cúpula", "cúpulas"],
    fr: ["dôme", "dômes", "coupole"],
  },
  easter_egg: {
    en: ["easter egg", "easter eggs", "egg"],
    de: ["Osterei", "Ostereier", "Ei"],
    it: ["uovo di pasqua", "uova di pasqua", "uovo"],
    es: ["huevo de pascua", "huevos de pascua", "huevo"],
    fr: ["œuf de Pâques", "œufs de Pâques", "œuf"],
  },
  eiffel_tower: {
    en: ["eiffel tower", "eiffel"],
    de: ["Eiffelturm"],
    it: ["torre eiffel"],
    es: ["torre eiffel"],
    fr: ["tour eiffel"],
  },
  flower: {
    en: ["flower", "flowers"],
    de: ["Blume", "Blumen"],
    it: ["fiore", "fiori"],
    es: ["flor", "flores"],
    fr: ["fleur", "fleurs"],
  },
  fox_head: {
    en: ["fox head", "fox", "foxes", "fox's head"],
    de: ["Fuchskopf", "Fuchs", "Füchse"],
    it: ["testa di volpe", "volpe", "volpi"],
    es: ["cabeza de zorro", "zorro", "zorros"],
    fr: ["tête de renard", "renard", "renards"],
  },
  gift: {
    en: ["gift", "gifts", "present", "presents"],
    de: ["Geschenk", "Geschenke"],
    it: ["regalo", "regali", "pacco regalo"],
    es: ["regalo", "regalos"],
    fr: ["cadeau", "cadeaux"],
  },
  infinity: {
    en: ["infinity", "infinity sign", "infinite"],
    de: ["Unendlichkeit", "unendlich"],
    it: ["infinito", "simbolo dell'infinito"],
    es: ["infinito", "símbolo del infinito"],
    fr: ["infini", "symbole de l'infini"],
  },
  leaf: {
    en: ["leaf", "leaves"],
    de: ["Blatt", "Blätter"],
    it: ["foglia", "foglie"],
    es: ["hoja", "hojas"],
    fr: ["feuille", "feuilles"],
  },
  light_bulb: {
    en: ["light bulb", "light bulbs", "lightbulb", "bulb"],
    de: ["Glühbirne", "Glühbirnen"],
    it: ["lampadina", "lampadine"],
    es: ["bombilla", "bombillas", "foco"],
    fr: ["ampoule", "ampoules"],
  },
  medal: {
    en: ["medal", "medals"],
    de: ["Medaille", "Medaillen"],
    it: ["medaglia", "medaglie"],
    es: ["medalla", "medallas"],
    fr: ["médaille", "médailles"],
  },
  mountain: {
    en: ["mountain", "mountains", "peaks"],
    de: ["Berg", "Berge", "Gipfel"],
    it: ["montagna", "montagne", "monte", "monti"],
    es: ["montaña", "montañas", "monte"],
    fr: ["montagne", "montagnes", "mont"],
  },
  owl: {
    en: ["owl", "owls"],
    de: ["Eule", "Eulen"],
    it: ["gufo", "gufi", "civetta"],
    es: ["búho", "búhos", "lechuza"],
    fr: ["hibou", "hiboux", "chouette"],
  },
  padlock: {
    en: ["padlock", "padlocks", "lock", "love lock"],
    de: ["Vorhängeschloss", "Liebesschloss", "Schloss"],
    it: ["lucchetto", "lucchetti"],
    es: ["candado", "candados"],
    fr: ["cadenas"],
  },
  peace: {
    en: ["peace", "peace sign", "peace symbol"],
    de: ["Friedenszeichen", "Frieden"],
    it: ["simbolo della pace", "pace"],
    es: ["símbolo de la paz", "paz"],
    fr: ["symbole de la paix", "paix"],
  },
  penguin: {
    en: ["penguin", "penguins"],
    de: ["Pinguin", "Pinguine"],
    it: ["pinguino", "pinguini"],
    es: ["pingüino", "pingüinos"],
    fr: ["manchot", "manchots", "pingouin"],
  },
  pizza_slice: {
    en: ["pizza slice", "slice of pizza", "pizza"],
    de: ["Pizzastück", "Pizza"],
    it: ["fetta di pizza", "trancio di pizza"],
    es: ["porción de pizza", "trozo de pizza"],
    fr: ["part de pizza", "pizza"],
  },
  racket: {
    en: ["racket", "rackets", "tennis racket", "racquet"],
    de: ["Tennisschläger", "Schläger"],
    it: ["racchetta", "racchette", "racchetta da tennis"],
    es: ["raqueta", "raquetas"],
    fr: ["raquette", "raquettes"],
  },
  reindeer: {
    en: ["reindeer"],
    de: ["Rentier", "Rentiere"],
    it: ["renna", "renne"],
    es: ["reno", "renos"],
    fr: ["renne", "rennes"],
  },
  santa_hat: {
    en: ["santa hat", "santa claus hat", "christmas hat"],
    de: ["Weihnachtsmütze", "Nikolausmütze"],
    it: ["cappello di babbo natale", "cappello da babbo natale"],
    es: ["gorro de papá noel", "gorro navideño"],
    fr: ["bonnet de Père Noël", "bonnet de Noël"],
  },
  scooter: {
    en: ["scooter", "scooters"],
    de: ["Motorroller", "Roller"],
    it: ["scooter", "motorino", "motorini"],
    es: ["escúter", "scooter", "motoneta"],
    fr: ["scooter", "scooters"],
  },
  skis: {
    en: ["skis"],
    de: ["Ski", "Skier"],
    it: ["sci", "paio di sci"],
    es: ["esquís", "esquí"],
    fr: ["skis", "ski"],
  },
  snowflake: {
    en: ["snowflake", "snowflakes"],
    de: ["Schneeflocke", "Schneeflocken"],
    it: ["fiocco di neve", "fiocchi di neve"],
    es: ["copo de nieve", "copos de nieve"],
    fr: ["flocon de neige", "flocons de neige", "flocon"],
  },
  snowman: {
    en: ["snowman", "snowmen"],
    de: ["Schneemann", "Schneemänner"],
    it: ["pupazzo di neve", "pupazzi di neve"],
    es: ["muñeco de nieve", "muñecos de nieve"],
    fr: ["bonhomme de neige", "bonshommes de neige"],
  },
  stocking: {
    en: ["stocking", "stockings", "christmas stocking"],
    de: ["Weihnachtsstrumpf", "Strumpf"],
    it: ["calza di natale", "calza", "calze", "calza della befana"],
    es: ["calcetín navideño", "calcetín de navidad", "calcetín"],
    fr: ["chaussette de Noël", "chaussette"],
  },
  strawberry: {
    en: ["strawberry", "strawberries"],
    de: ["Erdbeere", "Erdbeeren"],
    it: ["fragola", "fragole"],
    es: ["fresa", "fresas", "frutilla"],
    fr: ["fraise", "fraises"],
  },
  triumphal_arch: {
    en: ["triumphal arch", "arch of triumph"],
    de: ["Triumphbogen"],
    it: ["arco di trionfo", "arco"],
    es: ["arco de triunfo"],
    fr: ["arc de triomphe"],
  },
  trophy: {
    en: ["trophy", "trophies", "trophy cup"],
    de: ["Pokal", "Pokale", "Trophäe"],
    it: ["coppa", "coppe", "trofeo"],
    es: ["trofeo", "trofeos"],
    fr: ["trophée", "trophées", "coupe"],
  },
  turtle: {
    en: ["turtle", "turtles", "tortoise"],
    de: ["Schildkröte", "Schildkröten"],
    it: ["tartaruga", "tartarughe"],
    es: ["tortuga", "tortugas"],
    fr: ["tortue", "tortues"],
  },
  umbrella: {
    en: ["umbrella", "umbrellas"],
    de: ["Regenschirm", "Schirm"],
    it: ["ombrello", "ombrelli"],
    es: ["paraguas"],
    fr: ["parapluie", "parapluies"],
  },
};

/**
 * Lower case, no accents, «œ» as «oe», curly apostrophes made straight,
 * underscores as spaces (so the contract's "dog_head" reads too), single
 * spaces.
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/\s+/g, " ")
    .trim();
}

const WORD_TO_SHAPE = new Map<string, Shape>(
  SHAPES.flatMap((shape) =>
    Object.values(SHAPE_WORDS[shape])
      .flat()
      .map((word) => [normalize(word), shape] as const),
  ),
);

/** The articles before a shape, in the five languages: «ein Herz», «une étoile». */
const ARTICLES = new Set([
  "a",
  "an",
  "the",
  "der",
  "die",
  "das",
  "ein",
  "eine",
  "einen",
  "un",
  "uno",
  "una",
  "il",
  "lo",
  "la",
  "el",
  "los",
  "las",
  "le",
  "les",
  "une",
]);

/**
 * The shape a word names: "cavallo", "Una Stella", "l'amore", "Hearts",
 * «ein Herz», «l'étoile». Null for an empty or unknown word.
 */
export function toShape(text: string): Shape | null {
  const words = normalize(text)
    .replace(/^(l|un)'\s*/, "")
    .split(" ");
  if (words.length > 1 && ARTICLES.has(words[0])) {
    words.shift();
  }
  return WORD_TO_SHAPE.get(words.join(" ")) ?? null;
}

/**
 * A shape as the runner reads it, in the app's language: "dog head" for
 * `dog_head`, «Hundekopf» in German (TASK-210 F). The contract keeps its
 * name; the table knows this one too, so it can go in the field.
 */
export function shapeName(shape: Shape): string {
  return shapeWord(shape);
}

/** "circle, heart, star, …, donut or sun": the shapes to suggest. */
export function shapeList(): string {
  const names = SHAPES.map(shapeName);
  return t("{list} or {last}", {
    list: names.slice(0, -1).join(", "),
    last: names[names.length - 1],
  });
}
