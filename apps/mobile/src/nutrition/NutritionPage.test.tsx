import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { NutritionPage } from "./NutritionPage";
import { loadSettings } from "./nutritionStore";
import { forgetNutrition } from "./useNutrition";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The phone's documents folder, in memory, as in nutritionStore.test.ts.
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
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

const disk = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const NO_DIETS =
  "MuW does not provide diets, meal plans or medical advice. The plan here is the one you write: your own, or the one your dietitian gave you.";

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    forgetNutrition();
  });
  disk.files.clear();
});

test("the first time, the page is «Before you start» and nothing else", async () => {
  await render(<NutritionPage today="2026-11-23" />);
  expect(screen.getByRole("header", { name: "Nutrition" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Before you start" })).toBeOnTheScreen();
  expect(screen.getByText(NO_DIETS)).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Every number is an estimate, from food composition tables and from formulas for the energy you use.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(
      "If you have a medical condition, are pregnant or have a history of eating disorders, talk to a doctor or a dietitian before counting calories.",
    ),
  ).toBeOnTheScreen();
  // Nothing can be written before the notice is read.
  expect(screen.queryByTestId("nutrition-diary")).toBeNull();
});

test("«I understand» opens the diary and is remembered", async () => {
  const first = await render(<NutritionPage today="2026-11-23" />);
  await fireEvent.press(screen.getByRole("button", { name: "I understand" }));
  expect(screen.getByTestId("nutrition-diary")).toBeOnTheScreen();
  expect(screen.queryByText(NO_DIETS)).toBeNull();
  expect(loadSettings().noticeSeen).toBe(true);

  // The app opened again: the diary at once.
  await first.unmount();
  await act(async () => forgetNutrition());
  await render(<NutritionPage today="2026-11-23" />);
  expect(screen.getByTestId("nutrition-diary")).toBeOnTheScreen();
  expect(screen.queryByTestId("nutrition-notice")).toBeNull();
});

test("the diary always says that the numbers are estimates and MuW gives no diets", async () => {
  await render(<NutritionPage today="2026-11-23" />);
  await fireEvent.press(screen.getByTestId("nutrition-understood"));
  expect(
    screen.getByText("Estimates only. MuW does not provide diets or medical advice."),
  ).toBeOnTheScreen();
});

test("without a day given, the diary opens on the phone's today", async () => {
  await render(<NutritionPage />);
  await fireEvent.press(screen.getByTestId("nutrition-understood"));
  expect(screen.getByTestId("diary-day")).toHaveTextContent("Today");
});

test("the notice is in the language of the app", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<NutritionPage today="2026-11-23" />);
  expect(screen.getByRole("header", { name: "Alimentazione" })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Prima di iniziare" })).toBeOnTheScreen();
  expect(
    screen.getByText(
      "MuW non fornisce diete, piani alimentari né consigli medici. Il piano qui è quello che scrivi tu: il tuo, o quello che ti ha dato il tuo dietista.",
    ),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Ho capito" }));
  expect(
    screen.getByText("Solo stime. MuW non fornisce diete né consigli medici."),
  ).toBeOnTheScreen();
});
