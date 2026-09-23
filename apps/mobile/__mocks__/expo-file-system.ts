/**
 * Stand-in for expo-file-system in tests: files live in `written`, by URI,
 * so tests can check what was saved and where.
 */
export const written = new Map<string, string>();

export class File {
  uri: string;

  constructor(directory: { uri: string }, name: string) {
    this.uri = `${directory.uri}${name}`;
  }

  create(): void {
    written.set(this.uri, "");
  }

  write(text: string): void {
    written.set(this.uri, text);
  }
}

export const Paths = { cache: { uri: "file:///cache/" } };
