/**
 * The phone's documents folder, in memory, for the tests of the items kept
 * beside the photos: `jest.mock("expo-file-system", () =>
 * jest.requireActual("./memoryFiles.testing").memoryFiles())`, then the
 * files are read and cleared through `files`.
 */
export function memoryFiles() {
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
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
}
