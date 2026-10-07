import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { drawingProblem } from "../api/drawings";
import { t } from "../i18n";
import { saveLanguageChoice } from "../i18n/language";
import { loadSport, saveSport, SPORTS, type SportOption } from "./sport";
import { SportButton } from "./SportButton";
import { SportSetting } from "./SportSetting";

// «Sport», the sport's button, the titles of the pages and the words of a
// drawing call that did not go, in the app's language (TASK-210).

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
// The phone's documents folder, in memory: the language and the sport.
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
jest.mock("./sport", () => {
  const actual = jest.requireActual<typeof import("./sport")>("./sport");
  return { ...actual, loadSport: jest.fn(), saveSport: jest.fn(actual.saveSport) };
});

/** Three sports, the last not ready: the rows whatever `SPORTS` turns on. */
const SOME: SportOption[] = SPORTS.map((option) =>
  option.id === "paddle" ? { ...option, ready: false } : option,
);

beforeEach(async () => {
  jest.mocked(loadSport).mockReturnValue("run");
  jest.mocked(saveSport).mockClear();
  await act(async () => saveLanguageChoice("it"));
});

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("«Sport» in «Settings» names the sports in Italian, and «Soon» too", async () => {
  await render(<SportSetting sports={SOME} />);
  expect(screen.getByText("SPORT")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Corsa" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Bici" })).not.toBeChecked();
  expect(screen.getByLabelText("Pagaia, in arrivo")).toBeOnTheScreen();
  expect(screen.getByText("Presto")).toBeOnTheScreen();
  expect(screen.queryByText("Run")).toBeNull();
});

test("the sport's button says the sport in Italian, and its menu too", async () => {
  await render(<SportButton sports={SOME} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Corsa" }));
  expect(screen.getByLabelText("Sport")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Corsa" })).toBeChecked();
  await fireEvent.press(screen.getByRole("radio", { name: "Bici" }));
  expect(saveSport).toHaveBeenCalledWith("bike");
  expect(screen.getByRole("button", { name: "Sport, Bici" })).toBeOnTheScreen();
});

test("the titles of the three pages are Italian", () => {
  expect([t("Feed"), t("Draw"), t("Explore")]).toEqual(["Feed", "Disegna", "Esplora"]);
});

test("a drawing call that did not go says so in Italian", () => {
  expect(drawingProblem({ kind: "unreachable", url: "https://api.test" })).toBe(
    "Nessuna connessione. Riprova quando sei online.",
  );
  const gone = {
    kind: "api_error",
    retryAfterS: null,
    code: "http_error",
    message: "",
  };
  expect(drawingProblem(gone as never)).toBe(
    "Questa corsa non è più fra le tue attività.",
  );
});
