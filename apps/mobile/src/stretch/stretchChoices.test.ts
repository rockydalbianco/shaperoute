import { category, defaultChoice } from "./compose";
import {
  choiceFor,
  CHOICES_FILE,
  choicesOf,
  rememberChoice,
  resetChoicesForTests,
} from "./stretchChoices";

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
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const PATH = `file:///documents/${CHOICES_FILE}`;

beforeEach(() => {
  files.clear();
  resetChoicesForTests();
});

describe("the last choice of a stretching category", () => {
  it("is five minutes, gentle, with a mat for one never opened", () => {
    expect(choiceFor(category("neck"))).toEqual({
      minutes: 5,
      level: "gentle",
      where: "any",
    });
    expect(choiceFor(category("splits"))).toEqual(defaultChoice(category("splits")));
    expect(files.has(PATH)).toBe(false);
  });

  it("is kept on the phone by the category's key, and read back at the next opening", () => {
    const hips = category("hips");
    rememberChoice(hips, { minutes: 15, level: "intense", where: "any" });
    expect(choiceFor(hips)).toEqual({ minutes: 15, level: "intense", where: "any" });
    expect(JSON.parse(files.get(PATH) as string)).toEqual({
      hips: { minutes: 15, level: "intense", where: "any" },
    });
    // Another category keeps its own; the app opened again reads both.
    rememberChoice(category("desk"), {
      minutes: 3,
      level: "gentle",
      where: "standing",
    });
    resetChoicesForTests();
    expect(choiceFor(hips).minutes).toBe(15);
    expect(choiceFor(category("desk"))).toEqual({
      minutes: 3,
      level: "gentle",
      where: "standing",
    });
    expect(choiceFor(category("neck")).minutes).toBe(5);
  });

  it("is settled on what the category offers, when kept and when read", () => {
    const relax = category("relax");
    // Relax has no standing version and nothing intense.
    rememberChoice(relax, { minutes: 10, level: "intense", where: "standing" });
    expect(choiceFor(relax)).toEqual({ minutes: 10, level: "gentle", where: "any" });
    // A file from a version that offered something else.
    files.set(
      PATH,
      JSON.stringify({ desk: { minutes: 20, level: "gentle", where: "any" } }),
    );
    resetChoicesForTests();
    expect(choiceFor(category("desk")).minutes).toBe(5);
  });

  it("reads a file that is not what it wrote as no choice at all", () => {
    files.set(PATH, "not json");
    expect(choiceFor(category("neck")).minutes).toBe(5);
    expect(choicesOf(null)).toEqual({});
    expect(choicesOf([1, 2])).toEqual({});
    expect(
      choicesOf({
        neck: { minutes: 10, level: "gentle", where: "any" },
        legs: { minutes: "10", level: "gentle", where: "any" },
        hips: { minutes: 10, level: "hard", where: "any" },
        desk: { minutes: 3, level: "gentle", where: "sofa" },
        feet: 7,
      }),
    ).toEqual({ neck: { minutes: 10, level: "gentle", where: "any" } });
  });
});
