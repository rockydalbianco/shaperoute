import { OUTFIT_ITEMS, OUTFIT_TAG_REASONS } from "@shaperoute/shared-types";

import { LANGUAGES } from "../../i18n/languages";
import {
  countsLine,
  dotLabel,
  linkByLine,
  outfitShopLabel,
  outfitWords,
  taggedLabel,
  yourItemsLine,
} from "./outfitWords";

test("every language has the button, every item and every reason", () => {
  expect(LANGUAGES.map(({ id }) => outfitWords(id).tagButton)).toEqual([
    "Tag what you wear",
    "Markiere, was du trägst",
    "Segna cosa indossi",
    "Etiqueta lo que llevas",
    "Identifie ce que tu portes",
  ]);
  for (const { id } of LANGUAGES) {
    const words = outfitWords(id);
    for (const item of OUTFIT_ITEMS) {
      expect(words.items[item]).not.toBe("");
    }
    for (const reason of OUTFIT_TAG_REASONS) {
      expect(words.problems[reason]).not.toBe("");
    }
  }
});

test("the hanger says how many, with one apart", () => {
  expect(taggedLabel(3, "en")).toBe("3 items tagged");
  expect(taggedLabel(1, "en")).toBe("1 item tagged");
  expect(taggedLabel(2, "it")).toBe("2 capi segnati");
  expect(taggedLabel(1, "fr")).toBe("1 article identifié");
});

test("a dot says the item and the brand", () => {
  expect(dotLabel("shoes", "Nike", "en")).toBe("Shoes, Nike");
  expect(dotLabel("top", "Asics", "it")).toBe("Maglia, Asics");
});

test("«Shop on» is Style's, with the store or the domain", () => {
  expect(outfitShopLabel("nike.com", "en")).toBe("Shop on nike.com");
  expect(outfitShopLabel("Zalando", "it")).toBe("Compra su Zalando");
});

test("the line under «Shop» names who added the link", () => {
  expect(linkByLine("anna", "en")).toBe(
    "Link added by anna. MuW doesn't check the products or the shops.",
  );
  expect(linkByLine("anna", "it")).toBe(
    "Link aggiunto da anna. MuW non controlla i prodotti né i negozi.",
  );
});

test("the author's numbers, on the post and in the sheet", () => {
  expect(yourItemsLine(15, 3, "en")).toBe("Your items · Opens: 15 · To the shop: 3");
  expect(yourItemsLine(15, 3, "it")).toBe("I tuoi capi · Aperture: 15 · Al negozio: 3");
  expect(countsLine(2, 0, "fr")).toBe("Ouvertures : 2 · Vers la boutique : 0");
  expect(outfitWords("de").onlyYou).toBe("Diese Zahlen siehst nur du.");
});
