import { setCurrentOwner } from "../account/currentOwner";
import { forgetPoolSwimOf, loadPoolSwim, savePoolSwim } from "./poolStore";
import { newPoolSwim } from "./poolSwim";

// A swim under way belongs to the account that began it (TASK-507 part B,
// «Nascosta finché rientra»), as the workout at the gym.

// The phone's documents folder, in memory.
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
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const NOW = Date.UTC(2026, 10, 24, 7, 0, 0);

beforeEach(() => {
  files.clear();
  setCurrentOwner(null);
});

test("A's swim waits hidden while B swims, and is A's again", () => {
  setCurrentOwner(11);
  const mine = newPoolSwim("a-key", 25, NOW);
  savePoolSwim(mine);
  setCurrentOwner(22);
  expect(loadPoolSwim()).toBeNull();
  savePoolSwim(newPoolSwim("b-key", 50, NOW));
  savePoolSwim(null);
  setCurrentOwner(11);
  expect(loadPoolSwim()).toEqual(mine);
});

test("an account deleted takes its swim, not another's", () => {
  setCurrentOwner(11);
  savePoolSwim(newPoolSwim("a-key", 25, NOW));
  setCurrentOwner(22);
  savePoolSwim(newPoolSwim("b-key", 25, NOW));
  forgetPoolSwimOf(11);
  expect(loadPoolSwim()?.key).toBe("b-key");
  setCurrentOwner(11);
  expect(loadPoolSwim()).toBeNull();
});
