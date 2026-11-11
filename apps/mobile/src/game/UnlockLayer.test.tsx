import catalog from "@shaperoute/shared-types/fixtures/game-catalog.json";
import type { GameCatalog } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { SAVED_TOTAL_MS } from "../intro/SavedLogo";
import { forgetGameCatalog, setGameCatalog } from "./gameCatalog";
import { UnlockLayer } from "./UnlockLayer";
import { onOpenPlay, showUnlocked } from "./unlocks";

// The phone's documents folder, in memory: the catalog and the language.
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

beforeEach(() => {
  jest.useFakeTimers();
  setGameCatalog(catalog as GameCatalog);
});

afterEach(() => {
  forgetGameCatalog();
  jest.useRealTimers();
});

function wait(ms: number) {
  return act(() => jest.advanceTimersByTimeAsync(ms));
}

test("a run sent later shows its shape at once, drawn stroke by stroke", async () => {
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  await render(<UnlockLayer />);
  expect(screen.queryByTestId("unlock-card")).toBeNull();
  await act(async () => showUnlocked(["triangle"]));
  expect(screen.getByTestId("unlock-card")).toBeTruthy();
  expect(screen.getByText("New shape unlocked")).toBeTruthy();
  expect(screen.getByText("Triangle")).toBeTruthy();
  expect(screen.getByTestId("unlock-drawing")).toBeTruthy();
  expect(announce).toHaveBeenCalledWith("New shape unlocked: Triangle");
  await fireEvent.press(screen.getByTestId("unlock-close"));
  expect(screen.queryByTestId("unlock-card")).toBeNull();
});

test("a run just saved waits for the logo after «Save» to go", async () => {
  await render(<UnlockLayer />);
  await act(async () => showUnlocked(["triangle"], Date.now()));
  expect(screen.queryByTestId("unlock-card")).toBeNull();
  await wait(SAVED_TOTAL_MS - 10);
  expect(screen.queryByTestId("unlock-card")).toBeNull();
  await wait(10);
  expect(screen.getByTestId("unlock-card")).toBeTruthy();
});

test("several shapes come one after the other; «See collection» opens «Play» and closes them", async () => {
  const opened = jest.fn();
  const stop = onOpenPlay(opened);
  await render(<UnlockLayer />);
  await act(async () => showUnlocked(["triangle", "hexagon"]));
  expect(screen.getByText("Triangle")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("unlock-close"));
  expect(screen.getByText("Hexagon")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("unlock-play"));
  expect(opened).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("unlock-card")).toBeNull();
  stop();
});

test("a shape the phone's catalog does not know is not shown", async () => {
  await render(<UnlockLayer />);
  await act(async () => showUnlocked(["crown"]));
  expect(screen.queryByTestId("unlock-card")).toBeNull();
  await act(async () => showUnlocked([]));
  expect(screen.queryByTestId("unlock-card")).toBeNull();
});

test("a touch outside the card closes it", async () => {
  await render(<UnlockLayer />);
  await act(async () => showUnlocked(["lightning"]));
  await fireEvent.press(screen.getByTestId("unlock-card"));
  expect(screen.queryByTestId("unlock-card")).toBeNull();
});

// --- Editions, collections, one card past three (TASK-423 part E) ---

test("a shape says its collection; an edition and a collection completed have their cards", async () => {
  await render(<UnlockLayer />);
  await act(async () =>
    showUnlocked(["triangle"], null, {
      editions: [{ shapeId: "lightning", edition: "silver" }],
      collectionsDone: ["geometry"],
    }),
  );
  expect(screen.getByText("In your Geometry collection.")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("unlock-close"));
  expect(screen.getByText("Silver edition")).toBeTruthy();
  expect(screen.getByText("Lightning")).toBeTruthy();
  expect(screen.getByText("You met its goal in 3 runs.")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("unlock-close"));
  expect(screen.getByText("Collection complete")).toBeTruthy();
  expect(screen.getByText("Geometry")).toBeTruthy();
  expect(screen.getByText("A new frame for your profile.")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("unlock-close"));
  expect(screen.queryByTestId("unlock-card")).toBeNull();
});

test("past three things from one run, one card says them all", async () => {
  await render(<UnlockLayer />);
  await act(async () =>
    showUnlocked(["triangle", "hexagon"], null, {
      editions: [{ shapeId: "lightning", edition: "gold" }],
      collectionsDone: ["geometry"],
    }),
  );
  expect(screen.getByText("New in Play")).toBeTruthy();
  expect(
    screen.getByText("2 new shapes · 1 new edition · Geometry complete"),
  ).toBeTruthy();
  await fireEvent.press(screen.getByTestId("unlock-close"));
  expect(screen.queryByTestId("unlock-card")).toBeNull();
});

test("an edition of a shape the phone does not know is not shown", async () => {
  await render(<UnlockLayer />);
  await act(async () =>
    showUnlocked([], null, {
      editions: [{ shapeId: "teapot", edition: "silver" }],
      collectionsDone: ["atlantis"],
    }),
  );
  expect(screen.queryByTestId("unlock-card")).toBeNull();
});
