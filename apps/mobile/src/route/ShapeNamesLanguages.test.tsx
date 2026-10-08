import { type Shape, SHAPES } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import type { Language } from "../i18n/languages";
import { RouteChoice } from "./RoutePanel";
import { shapeList, shapeName, toShape } from "./shapeWords";
import { ShapeTiles } from "./ShapeTiles";
import { checkWord } from "./wordInput";

// The shapes' names in «Draw» in the app's language (TASK-210, part F): on
// the tiles, in the field and in the list of the unknown shape; the field
// reads them back. English is in `shapeWords.test.ts`.

afterEach(() => saveLanguageChoice("phone"));

const DOG_HEAD: [Language, string][] = [
  ["en", "dog head"],
  ["de", "Hundekopf"],
  ["it", "testa di cane"],
  ["es", "cabeza de perro"],
  ["fr", "tête de chien"],
];

test.each(DOG_HEAD)("in «%s» the dog head is «%s»", (language, name) => {
  saveLanguageChoice(language);
  expect(shapeName("dog_head")).toBe(name);
});

test.each(DOG_HEAD)("in «%s» the field reads every shape's name back", (language) => {
  saveLanguageChoice(language);
  for (const shape of SHAPES) {
    expect(toShape(shapeName(shape))).toBe(shape);
  }
});

test.each([
  ["de", "Kreis, Herz, Stern, ", ", Donut oder Sonne"],
  [
    "it",
    "cerchio, cuore, stella, ",
    ", albero di Natale, faccina, fantasmino, ciambella o sole",
  ],
  ["es", "círculo, corazón, estrella, ", ", dónut o sol"],
  ["fr", "cercle, cœur, étoile, ", ", donut ou soleil"],
] as const)("in «%s» the shapes to suggest are in it", (language, first, last) => {
  saveLanguageChoice(language);
  expect(shapeList().startsWith(first)).toBe(true);
  expect(shapeList().endsWith(last)).toBe(true);
});

test("the placeholder's shapes are known in every language", () => {
  // «heart, star, horse…» as the four tables write it (TASK-210 D).
  for (const words of [
    "Herz, Stern, Pferd",
    "cuore, stella, cavallo",
    "corazón, estrella, caballo",
    "cœur, étoile, cheval",
  ]) {
    expect(words.split(", ").map(toShape)).toEqual(["heart", "star", "horse"]);
  }
});

test("the tiles are in German, and a tap writes the German name in the field", async () => {
  saveLanguageChoice("de");
  const onPick = jest.fn();
  await render(<ShapeTiles chosen={null} onPick={onPick} />);
  expect(screen.getByText("Herz")).toBeTruthy();
  expect(screen.getByText("Weihnachtsbaum")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Hundekopf"));
  expect(onPick).toHaveBeenCalledWith("Hundekopf");
});

function field(shapeText: string, shape: Shape | null) {
  return (
    <RouteChoice
      kind="shape"
      onKind={jest.fn()}
      shapeText={shapeText}
      shape={shape}
      onShapeText={jest.fn()}
      reading={null}
      onShapeDone={jest.fn()}
      wordText=""
      onWordText={jest.fn()}
      wordCheck={checkWord("", 5000)}
      letterStyle="block"
      onLetterStyle={jest.fn()}
      distanceText="5"
      distanceM={5000}
      image={{ status: "none" }}
      onChooseImage={jest.fn()}
      onDistanceText={jest.fn()}
    />
  );
}

test("a German name with its capital needs no note under the field", async () => {
  saveLanguageChoice("de");
  await render(field("Herz", "heart"));
  expect(screen.queryByText("→ Herz")).toBeNull();
  // Another word for it still says which shape it is.
  await render(field("Liebe", "heart"));
  expect(screen.getByText("→ Herz")).toBeTruthy();
});

test("an unknown shape suggests the shapes in French", async () => {
  saveLanguageChoice("fr");
  await render(field("dragon", null));
  expect(
    screen.getByText(/^Forme inconnue\. Essaie : cercle, cœur, étoile, /),
  ).toBeTruthy();
});
