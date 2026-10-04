/**
 * expo-file-system in memory, for the engine's tests only:
 * `jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"))`.
 * Files are text by URI; `files` lets a test look and clear.
 */
export const files = new Map<string, string>();

type Part = string | { uri: string };

function join(parts: Part[]): string {
  return parts
    .map((part) => (typeof part === "string" ? part : part.uri))
    .reduce((left, right) => (left.endsWith("/") ? left + right : `${left}/${right}`));
}

export class File {
  uri: string;

  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }

  get exists(): boolean {
    return files.has(this.uri);
  }

  get size(): number {
    return (files.get(this.uri) ?? "").length;
  }

  textSync(): string {
    const text = files.get(this.uri);
    if (text === undefined) {
      throw new Error(`no file ${this.uri}`);
    }
    return text;
  }

  create(): void {
    files.set(this.uri, "");
  }

  write(text: string): void {
    files.set(this.uri, text);
  }

  delete(): void {
    files.delete(this.uri);
  }

  moveSync(target: File): void {
    files.set(target.uri, this.textSync());
    files.delete(this.uri);
    this.uri = target.uri;
  }
}

export class Directory {
  uri: string;

  constructor(...parts: Part[]) {
    const uri = join(parts);
    this.uri = uri.endsWith("/") ? uri : `${uri}/`;
  }

  get exists(): boolean {
    return [...files.keys()].some((uri) => uri.startsWith(this.uri));
  }

  create(): void {}

  delete(): void {
    for (const uri of [...files.keys()]) {
      if (uri.startsWith(this.uri)) {
        files.delete(uri);
      }
    }
  }
}

export const Paths = {
  document: new Directory("file:///documents/"),
  cache: new Directory("file:///cache/"),
};
