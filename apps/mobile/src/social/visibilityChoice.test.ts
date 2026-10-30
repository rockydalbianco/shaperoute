import { File, Paths } from "expo-file-system";

import {
  forgetVisibilityOf,
  loadVisibility,
  saveVisibility,
  VISIBILITY_CHOICE_FILE,
} from "./visibilityChoice";

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
  return {
    File,
    Paths: {
      document: { uri: "file:///documents/" },
      cache: { uri: "file:///cache/" },
    },
  };
});

function write(text: string) {
  const file = new File(Paths.document, VISIBILITY_CHOICE_FILE);
  file.create({ overwrite: true });
  file.write(text);
}

beforeEach(() => {
  const file = new File(Paths.document, VISIBILITY_CHOICE_FILE);
  if (file.exists) {
    file.delete();
  }
});

test("«Only me» until the account has chosen, then the last choice", () => {
  expect(loadVisibility(7)).toBe("only_me");
  saveVisibility(7, "everyone");
  expect(loadVisibility(7)).toBe("everyone");
  saveVisibility(7, "only_me");
  expect(loadVisibility(7)).toBe("only_me");
});

test("one account never starts from another's choice", () => {
  saveVisibility(7, "everyone");
  expect(loadVisibility(8)).toBe("only_me");
  expect(loadVisibility(null)).toBe("only_me");
  saveVisibility(8, "followers");
  expect(loadVisibility(7)).toBe("everyone");
});

test("a file that cannot say is «Only me»", () => {
  write("not json");
  expect(loadVisibility(7)).toBe("only_me");
  write(JSON.stringify({ "7": "the whole world" }));
  expect(loadVisibility(7)).toBe("only_me");
  write("null");
  expect(loadVisibility(7)).toBe("only_me");
});

test("a deleted account leaves only the others' choices", () => {
  saveVisibility(7, "everyone");
  saveVisibility(8, "followers");
  forgetVisibilityOf(7);
  expect(loadVisibility(7)).toBe("only_me");
  expect(loadVisibility(8)).toBe("followers");
});
