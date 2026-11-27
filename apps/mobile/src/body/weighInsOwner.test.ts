import { setCurrentOwner } from "../account/currentOwner";
import { forgetPhoneDataOf } from "../account/phoneOwners";
import { forgetWeighIns, loadWeighIns, NO_WEIGH_INS, saveWeighIns } from "./weighIns";

// The weigh-ins belong to an account (TASK-489 K1, as the body since
// TASK-507 D): an account deleted, or a number now somebody else's, takes
// its own and nobody else's.

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

beforeEach(() => {
  files.clear();
  setCurrentOwner(null);
  forgetWeighIns();
});

test("an account let go takes its weigh-ins, not another's", () => {
  setCurrentOwner(11);
  saveWeighIns({ ...NO_WEIGH_INS, entries: [{ day: "2026-11-27", kg: 80 }] });
  setCurrentOwner(22);
  saveWeighIns({ ...NO_WEIGH_INS, entries: [{ day: "2026-11-27", kg: 60 }] });
  forgetPhoneDataOf(11);
  expect(loadWeighIns().entries).toEqual([{ day: "2026-11-27", kg: 60 }]);
  setCurrentOwner(11);
  expect(loadWeighIns()).toEqual(NO_WEIGH_INS);
});
