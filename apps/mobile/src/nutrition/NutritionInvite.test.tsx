import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import {
  INVITE_TIMES,
  NUTRITION_AFTER_TEST_ID,
  NUTRITION_INVITE_TEST_ID,
  NutritionInvite,
} from "./NutritionInvite";
import { loadSettings } from "./nutritionStore";
import { forgetNutrition, seeNotice } from "./useNutrition";

// «Nutrition» at the end of an activity (TASK-489 part I).

// The page stands still, as with «Reduce Motion».
jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: () => true }));

jest.mock("./nutritionOn", () => ({ NUTRITION_ON: true }));

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

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    forgetNutrition();
  });
  disk.files.clear();
});

test("who never opened «Nutrition» is invited, with no promise of a diet", async () => {
  await render(<NutritionInvite />);
  const invite = screen.getByTestId(NUTRITION_INVITE_TEST_ID);
  expect(invite).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Count what you eat too" }),
  ).toBeOnTheScreen();
  // The diet is the user's own, and the numbers are estimates.
  expect(screen.getByText(/Write your own diet/)).toBeOnTheScreen();
  expect(screen.getByText(/MuW estimates the calories/)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Open Nutrition" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Not now" })).toBeOnTheScreen();
});

test("each showing is counted, and after three the invitation is gone", async () => {
  for (let time = 1; time <= INVITE_TIMES; time += 1) {
    const view = await render(<NutritionInvite />);
    expect(screen.getByTestId(NUTRITION_INVITE_TEST_ID)).toBeOnTheScreen();
    expect(loadSettings().invite.seen).toBe(time);
    await view.unmount();
  }
  await render(<NutritionInvite />);
  expect(screen.queryByTestId(NUTRITION_INVITE_TEST_ID)).toBeNull();
  expect(loadSettings().invite.seen).toBe(INVITE_TIMES);
});

test("«Not now» takes the invitation away for good", async () => {
  const view = await render(<NutritionInvite />);
  await fireEvent.press(screen.getByTestId("nutrition-invite-not-now"));
  expect(screen.queryByTestId(NUTRITION_INVITE_TEST_ID)).toBeNull();
  expect(loadSettings().invite.off).toBe(true);
  await view.unmount();
  await render(<NutritionInvite />);
  expect(screen.queryByTestId(NUTRITION_INVITE_TEST_ID)).toBeNull();
});

test("«Open Nutrition» opens the page with its notice", async () => {
  await render(<NutritionInvite />);
  expect(screen.queryByTestId("nutrition-page")).toBeNull();
  await fireEvent.press(screen.getByTestId("nutrition-invite-open"));
  expect(screen.getByTestId("nutrition-page")).toBeOnTheScreen();
  expect(screen.getByTestId("nutrition-notice")).toBeOnTheScreen();
  // The notice read: under the page the invitation is the way to the diary.
  await fireEvent.press(screen.getByTestId("nutrition-understood"));
  expect(screen.getByTestId("nutrition-page")).toBeOnTheScreen();
  expect(screen.queryByTestId(NUTRITION_INVITE_TEST_ID)).toBeNull();
  expect(screen.getByTestId(NUTRITION_AFTER_TEST_ID)).toBeOnTheScreen();
});

test("who uses «Nutrition» has the way to the diary, and is not counted", async () => {
  await act(async () => {
    seeNotice();
  });
  await render(<NutritionInvite kcal={279.6} />);
  expect(screen.queryByTestId(NUTRITION_INVITE_TEST_ID)).toBeNull();
  expect(screen.getByText("This activity: 280 kcal (est.)")).toBeOnTheScreen();
  expect(loadSettings().invite.seen).toBe(0);
  await fireEvent.press(screen.getByRole("button", { name: "Add what you ate" }));
  expect(screen.getByTestId("nutrition-page")).toBeOnTheScreen();
  expect(screen.getByTestId("nutrition-diary")).toBeOnTheScreen();
});

test("with no calories known the line is the section's name", async () => {
  await act(async () => {
    seeNotice();
  });
  await render(<NutritionInvite />);
  expect(screen.getByTestId(NUTRITION_AFTER_TEST_ID)).toHaveTextContent(/^Nutrition/);
  expect(screen.queryByText(/kcal/)).toBeNull();
});

test("in Italian the invitation is in Italian", async () => {
  await act(async () => {
    saveLanguageChoice("it");
  });
  await render(<NutritionInvite />);
  expect(
    screen.getByRole("header", { name: "Conta anche quello che mangi" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Non ora" })).toBeOnTheScreen();
});
