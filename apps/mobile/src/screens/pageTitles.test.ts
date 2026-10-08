import { saveLanguageChoice } from "../i18n/language";
import { pageTitle } from "./pageTitles";

// The names of the three pages in the header follow the app's language
// (TASK-210, part G); «Feed» keeps its name except in French.

// The phone's documents folder, in memory: the language.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

afterEach(() => {
  saveLanguageChoice("phone");
});

const titles = () => [pageTitle("feed"), pageTitle("draw"), pageTitle("explore")];

test("in English the pages are named as before", () => {
  expect(titles()).toEqual(["Feed", "Draw", "Explore"]);
});

test.each([
  ["it", ["Feed", "Disegna", "Esplora"]],
  ["de", ["Feed", "Zeichnen", "Entdecken"]],
  ["es", ["Feed", "Dibuja", "Explora"]],
  ["fr", ["Fil", "Dessiner", "Explorer"]],
] as const)("in «%s» the pages are named in the language", (language, expected) => {
  saveLanguageChoice(language);
  expect(titles()).toEqual([...expected]);
});
