import { setCurrentOwner } from "../account/currentOwner";
import { newWorkout } from "./workout";
import { forgetWorkoutOf, loadWorkout, saveWorkout } from "./workoutStore";

// A workout under way belongs to the account that began it (TASK-507 part
// B, «Nascosta finché rientra»): hidden from another, back with its own.

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

const NOW = Date.UTC(2026, 10, 24, 17, 0, 0);

beforeEach(() => {
  files.clear();
  setCurrentOwner(null);
});

test("A's workout waits hidden while B trains, and is A's again", () => {
  setCurrentOwner(11);
  const mine = newWorkout("a-key", NOW);
  saveWorkout(mine);
  setCurrentOwner(22);
  expect(loadWorkout()).toBeNull();
  const theirs = newWorkout("b-key", NOW + 3_600_000);
  saveWorkout(theirs);
  expect(loadWorkout()?.key).toBe("b-key");
  saveWorkout(null);
  expect(loadWorkout()).toBeNull();
  setCurrentOwner(11);
  expect(loadWorkout()).toEqual(mine);
  setCurrentOwner(null);
  expect(loadWorkout()).toBeNull();
});

test("one of nobody's, from before TASK-507, is anyone's and becomes the account's", () => {
  saveWorkout(newWorkout("old", NOW));
  setCurrentOwner(22);
  expect(loadWorkout()?.key).toBe("old");
  saveWorkout(loadWorkout());
  setCurrentOwner(11);
  expect(loadWorkout()).toBeNull();
});

test("an account deleted takes its workout, not another's", () => {
  setCurrentOwner(11);
  saveWorkout(newWorkout("a-key", NOW));
  setCurrentOwner(22);
  saveWorkout(newWorkout("b-key", NOW));
  forgetWorkoutOf(11);
  expect(loadWorkout()?.key).toBe("b-key");
  setCurrentOwner(11);
  expect(loadWorkout()).toBeNull();
});
