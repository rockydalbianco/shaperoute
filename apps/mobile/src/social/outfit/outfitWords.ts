import type { OutfitItem, OutfitTagReason } from "@shaperoute/shared-types";

import { styleWords } from "../../feed/styleWords";
import { appLanguage } from "../../i18n/language";
import type { Language } from "../../i18n/languages";

/**
 * The words of the items members tag on their photos (TASK-394 part B,
 * ADR-0333), as the user approved them on 2026-11-05 in five languages
 * (`docs/tasks/TASK-394.md`, «I testi», A). Kept here, as the words of
 * Style (`feed/styleWords.ts`), not in the tables of `t`: those go by the
 * English text, and «Top», «Cap», «Watch» or «Other» are already other words
 * there. «Shop on {store}» is Style's.
 */
type Words = {
  tagButton: string;
  hint: string;
  item: string;
  brand: string;
  model: string;
  link: string;
  add: string;
  remove: string;
  items: Readonly<Record<OutfitItem, string>>;
  /** What the app says when an item cannot be kept, by its reason. */
  problems: Readonly<Record<OutfitTagReason, string>>;
  /** `{n}`: how many, on the hanger, for VoiceOver. */
  tagged: string;
  taggedOne: string;
  /** `{name}`: who added the link. */
  linkBy: string;
  unavailable: string;
  yourItems: string;
  /** `{opens}` and `{shops}`. */
  counts: string;
  onlyYou: string;
};

const WORDS: Readonly<Record<Language, Words>> = {
  en: {
    tagButton: "Tag what you wear",
    hint: "Tap what you're wearing on the photo.",
    item: "Item",
    brand: "Brand",
    model: "Model (optional)",
    link: "Link to the shop (optional)",
    add: "Add",
    remove: "Remove",
    items: {
      shoes: "Shoes",
      top: "Top",
      jacket: "Jacket",
      shorts: "Shorts",
      tights: "Tights",
      socks: "Socks",
      cap: "Cap",
      glasses: "Glasses",
      watch: "Watch",
      backpack: "Backpack",
      other: "Other",
    },
    problems: {
      not_https: "Use a link that starts with https://",
      shortened: "Short links can't be used: paste the shop's full link.",
      blocked: "MuW can't open this link.",
      link_in_text: "Put the link in the link box.",
      too_many_on_photo: "Up to 5 items on a photo.",
      too_many_in_post: "Up to 10 items in a post.",
      words: "These words can't be used. Try other words.",
    },
    tagged: "{n} items tagged",
    taggedOne: "1 item tagged",
    linkBy: "Link added by {name}. MuW doesn't check the products or the shops.",
    unavailable: "This link isn't available.",
    yourItems: "Your items",
    counts: "Opens: {opens} · To the shop: {shops}",
    onlyYou: "Only you see these numbers.",
  },
  it: {
    tagButton: "Segna cosa indossi",
    hint: "Tocca sulla foto quello che indossi.",
    item: "Capo",
    brand: "Marca",
    model: "Modello (facoltativo)",
    link: "Link al negozio (facoltativo)",
    add: "Aggiungi",
    remove: "Togli",
    items: {
      shoes: "Scarpe",
      top: "Maglia",
      jacket: "Giacca",
      shorts: "Pantaloncini",
      tights: "Tight",
      socks: "Calze",
      cap: "Cappello",
      glasses: "Occhiali",
      watch: "Orologio",
      backpack: "Zaino",
      other: "Altro",
    },
    problems: {
      not_https: "Usa un link che inizia con https://",
      shortened:
        "I link accorciati non si possono usare: incolla il link intero del negozio.",
      blocked: "MuW non può aprire questo link.",
      link_in_text: "Il link va nel riquadro del link.",
      too_many_on_photo: "Al massimo 5 capi su una foto.",
      too_many_in_post: "Al massimo 10 capi in un post.",
      words: "Queste parole non si possono usare. Prova con altre.",
    },
    tagged: "{n} capi segnati",
    taggedOne: "1 capo segnato",
    linkBy: "Link aggiunto da {name}. MuW non controlla i prodotti né i negozi.",
    unavailable: "Questo link non è disponibile.",
    yourItems: "I tuoi capi",
    counts: "Aperture: {opens} · Al negozio: {shops}",
    onlyYou: "Questi numeri li vedi solo tu.",
  },
  de: {
    tagButton: "Markiere, was du trägst",
    hint: "Tippe auf dem Foto auf das, was du trägst.",
    item: "Teil",
    brand: "Marke",
    model: "Modell (optional)",
    link: "Link zum Shop (optional)",
    add: "Hinzufügen",
    remove: "Entfernen",
    items: {
      shoes: "Schuhe",
      top: "Shirt",
      jacket: "Jacke",
      shorts: "Shorts",
      tights: "Tights",
      socks: "Socken",
      cap: "Kappe",
      glasses: "Brille",
      watch: "Uhr",
      backpack: "Rucksack",
      other: "Sonstiges",
    },
    problems: {
      not_https: "Verwende einen Link, der mit https:// beginnt",
      shortened: "Kurzlinks gehen nicht: Füge den vollständigen Link des Shops ein.",
      blocked: "MuW kann diesen Link nicht öffnen.",
      link_in_text: "Der Link gehört ins Link-Feld.",
      too_many_on_photo: "Höchstens 5 Teile auf einem Foto.",
      too_many_in_post: "Höchstens 10 Teile in einem Beitrag.",
      words: "Diese Wörter gehen nicht. Versuch es mit anderen.",
    },
    tagged: "{n} Teile markiert",
    taggedOne: "1 Teil markiert",
    linkBy: "Link hinzugefügt von {name}. MuW prüft weder die Produkte noch die Shops.",
    unavailable: "Dieser Link ist nicht verfügbar.",
    yourItems: "Deine Teile",
    counts: "Geöffnet: {opens} · Zum Shop: {shops}",
    onlyYou: "Diese Zahlen siehst nur du.",
  },
  fr: {
    tagButton: "Identifie ce que tu portes",
    hint: "Touche sur la photo ce que tu portes.",
    item: "Article",
    brand: "Marque",
    model: "Modèle (facultatif)",
    link: "Lien vers la boutique (facultatif)",
    add: "Ajouter",
    remove: "Retirer",
    items: {
      shoes: "Chaussures",
      top: "Haut",
      jacket: "Veste",
      shorts: "Short",
      tights: "Collant",
      socks: "Chaussettes",
      cap: "Casquette",
      glasses: "Lunettes",
      watch: "Montre",
      backpack: "Sac à dos",
      other: "Autre",
    },
    problems: {
      not_https: "Utilise un lien qui commence par https://",
      shortened:
        "Les liens raccourcis ne sont pas acceptés : colle le lien complet de la boutique.",
      blocked: "MuW ne peut pas ouvrir ce lien.",
      link_in_text: "Le lien va dans le champ du lien.",
      too_many_on_photo: "5 articles au maximum sur une photo.",
      too_many_in_post: "10 articles au maximum dans un post.",
      words: "Ces mots ne sont pas acceptés. Essaie d'autres mots.",
    },
    tagged: "{n} articles identifiés",
    taggedOne: "1 article identifié",
    linkBy: "Lien ajouté par {name}. MuW ne vérifie ni les produits ni les boutiques.",
    unavailable: "Ce lien n'est pas disponible.",
    yourItems: "Tes articles",
    counts: "Ouvertures : {opens} · Vers la boutique : {shops}",
    onlyYou: "Toi seul vois ces chiffres.",
  },
  es: {
    tagButton: "Etiqueta lo que llevas",
    hint: "Toca en la foto lo que llevas.",
    item: "Prenda",
    brand: "Marca",
    model: "Modelo (opcional)",
    link: "Enlace a la tienda (opcional)",
    add: "Añadir",
    remove: "Quitar",
    items: {
      shoes: "Zapatillas",
      top: "Camiseta",
      jacket: "Chaqueta",
      shorts: "Pantalón corto",
      tights: "Mallas",
      socks: "Calcetines",
      cap: "Gorra",
      glasses: "Gafas",
      watch: "Reloj",
      backpack: "Mochila",
      other: "Otro",
    },
    problems: {
      not_https: "Usa un enlace que empiece por https://",
      shortened:
        "No se pueden usar enlaces acortados: pega el enlace completo de la tienda.",
      blocked: "MuW no puede abrir este enlace.",
      link_in_text: "El enlace va en la casilla del enlace.",
      too_many_on_photo: "Como máximo 5 prendas en una foto.",
      too_many_in_post: "Como máximo 10 prendas en una publicación.",
      words: "Estas palabras no se pueden usar. Prueba con otras.",
    },
    tagged: "{n} prendas etiquetadas",
    taggedOne: "1 prenda etiquetada",
    linkBy: "Enlace añadido por {name}. MuW no comprueba los productos ni las tiendas.",
    unavailable: "Este enlace no está disponible.",
    yourItems: "Tus prendas",
    counts: "Aperturas: {opens} · A la tienda: {shops}",
    onlyYou: "Estos números solo los ves tú.",
  },
};

export function outfitWords(language: Language = appLanguage()): Words {
  return WORDS[language];
}

/** «{marks}» of `text` filled from `values`. */
function filled(
  text: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return text.replace(/\{(\w+)\}/g, (mark, name: string) =>
    values[name] === undefined ? mark : String(values[name]),
  );
}

/** What the hanger says to VoiceOver: how many items the photo has. */
export function taggedLabel(count: number, language: Language = appLanguage()): string {
  const words = WORDS[language];
  return count === 1 ? words.taggedOne : filled(words.tagged, { n: count });
}

/** What VoiceOver says of a dot: «Shoes, Nike». */
export function dotLabel(
  item: OutfitItem,
  brand: string,
  language: Language = appLanguage(),
): string {
  return `${WORDS[language].items[item]}, ${brand}`;
}

/** «Shop on nike.com», as Style says «Shop on Zalando». */
export function outfitShopLabel(
  store: string,
  language: Language = appLanguage(),
): string {
  return filled(styleWords(language).shop, { store });
}

/** The line under «Shop»: who put the link there. */
export function linkByLine(name: string, language: Language = appLanguage()): string {
  return filled(WORDS[language].linkBy, { name });
}

/** «Opens: 15 · To the shop: 3», in the sheet of one of the author's items. */
export function countsLine(
  opens: number,
  shops: number,
  language: Language = appLanguage(),
): string {
  return filled(WORDS[language].counts, { opens, shops });
}

/** «Your items · Opens: 15 · To the shop: 3», under the author's photos. */
export function yourItemsLine(
  opens: number,
  shops: number,
  language: Language = appLanguage(),
): string {
  return `${WORDS[language].yourItems} · ${countsLine(opens, shops, language)}`;
}
