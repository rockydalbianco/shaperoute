import catalog from "@shaperoute/shared-types/fixtures/game-catalog.json";
import type { GameCatalog, GamePrizesShown } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";

import { forgetGameCatalog, setGameCatalog } from "../game/gameCatalog";
import { ProfileHeader } from "./ProfileHeader";

// The phone's documents folder, in memory: the catalog.
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

beforeEach(() => setGameCatalog(catalog as GameCatalog));
afterEach(forgetGameCatalog);

async function show(gamePrizes: unknown) {
  await render(
    <ProfileHeader
      username="runner_42"
      bio=""
      photo={null}
      detail="3 drawings"
      gamePrizes={gamePrizes as GamePrizesShown | null}
    />,
  );
}

// The prizes of the game on a profile (TASK-423 E2b): only what its owner chose.

test("the frame goes around the photo, the title and badges under the name", async () => {
  await show({
    frame: "geometry",
    title: "explorer",
    badges: ["streak_4", "medals_10"],
  });
  expect(screen.getByTestId("profile-frame")).toBeOnTheScreen();
  expect(screen.getByText("R")).toBeOnTheScreen();
  expect(screen.getByTestId("game-title")).toHaveTextContent("Explorer");
  expect(screen.getByTestId("game-badge-streak_4")).toHaveTextContent("4-week streak");
  expect(screen.getByTestId("game-badge-medals_10")).toHaveTextContent("10 medals");
});

test.each([
  ["nothing chosen", { frame: null, title: null, badges: [] }],
  ["an older API", undefined],
  ["no prizes", null],
  ["a broken answer", { frame: 3 }],
])("%s: nothing of the game", async (_, nothing) => {
  await show(nothing);
  expect(screen.getByText("R")).toBeOnTheScreen();
  expect(screen.queryByTestId("profile-frame")).toBeNull();
  expect(screen.queryByTestId("game-prizes")).toBeNull();
});

test("a frame the phone's catalog does not know is left out; the title stays", async () => {
  await show({ frame: "atlantis", title: "runner", badges: [] });
  expect(screen.queryByTestId("profile-frame")).toBeNull();
  expect(screen.getByTestId("game-title")).toHaveTextContent("Runner");
});
