import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { loadDiaryMonth, loadPlan } from "./nutritionStore";
import { isEmptyPlan } from "./plan";
import { PlanView, weekdayName } from "./PlanView";
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

/** A Monday. */
const TODAY = "2026-11-23";
/** «Pasta, cooked» in USDA's table: 158 kcal in 100 g. */
const PASTA = "usda-169737";

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    forgetNutrition();
  });
  disk.files.clear();
});

async function addPasta(meal: string, grams: string) {
  await fireEvent.press(screen.getByTestId(`meal-${meal}-add`));
  await fireEvent.changeText(screen.getByTestId("add-food-search"), "pasta cooked");
  await fireEvent.press(screen.getByTestId(`add-food-result-${PASTA}`));
  await fireEvent.changeText(screen.getByTestId("add-food-grams-input"), grams);
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
}

test("the days of the week have the names the app already uses", () => {
  expect(weekdayName("mon")).toBe("Mon");
  expect(weekdayName("sun")).toBe("Sun");
});

test("the plan opens on today's day of the week, empty until the user writes it", async () => {
  await render(<PlanView today={TODAY} />);
  expect(screen.getByTestId("plan-day-mon")).toBeSelected();
  expect(screen.getByTestId("plan-day-tue")).not.toBeSelected();
  expect(screen.getByTestId("plan-kcal")).toHaveTextContent("—");
  // Nothing to copy from an empty day, and no plan proposed.
  expect(screen.queryByTestId("plan-copy")).toBeNull();
  expect(isEmptyPlan(loadPlan())).toBe(true);
  expect(
    screen.getByText("This is the plan you write. MuW never changes it."),
  ).toBeOnTheScreen();
});

test("a food written in a meal of a day is kept in the plan", async () => {
  await render(<PlanView today={TODAY} />);
  await addPasta("lunch", "180");
  const lunch = within(screen.getByTestId("meal-lunch"));
  expect(lunch.getByLabelText("Pasta, cooked, 180 g, 284 kcal")).toBeOnTheScreen();
  expect(screen.getByTestId("plan-kcal")).toHaveTextContent("284 kcal");
  expect(loadPlan().mon.lunch).toEqual([
    { food: expect.objectContaining({ key: PASTA }), grams: 180 },
  ]);
  // The plan is not the diary: no day is written by planning.
  expect(loadDiaryMonth("2026-11")).toEqual({});
});

test("each day of the week has its own meals", async () => {
  await render(<PlanView today={TODAY} />);
  await addPasta("lunch", "180");
  await fireEvent.press(screen.getByTestId("plan-day-wed"));
  expect(screen.getByTestId("plan-day-wed")).toBeSelected();
  expect(screen.getByTestId("plan-kcal")).toHaveTextContent("—");
  await addPasta("dinner", "100");
  expect(loadPlan().wed.dinner).toHaveLength(1);
  expect(loadPlan().wed.lunch).toEqual([]);
  expect(loadPlan().mon.dinner).toEqual([]);
});

test("a portion of the plan changes its grams, or is removed", async () => {
  await render(<PlanView today={TODAY} />);
  await addPasta("lunch", "180");
  await fireEvent.press(screen.getByTestId("meal-lunch-portion-0"));
  await fireEvent.changeText(screen.getByTestId("add-food-grams-input"), "100");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(loadPlan().mon.lunch[0].grams).toBe(100);

  await fireEvent.press(screen.getByTestId("meal-lunch-portion-0"));
  await fireEvent.press(screen.getByTestId("add-food-remove"));
  expect(isEmptyPlan(loadPlan())).toBe(true);
});

test("«Copy this day to…» writes a day over another", async () => {
  await render(<PlanView today={TODAY} />);
  await addPasta("lunch", "180");
  await fireEvent.press(screen.getByTestId("plan-copy"));
  // Every day but the one shown.
  expect(screen.queryByTestId("plan-copy-mon")).toBeNull();
  await fireEvent.press(screen.getByTestId("plan-copy-fri"));
  expect(loadPlan().fri).toEqual(loadPlan().mon);
  expect(loadPlan().tue.lunch).toEqual([]);

  await fireEvent.press(screen.getByTestId("plan-day-fri"));
  expect(screen.getByTestId("plan-kcal")).toHaveTextContent("284 kcal");
});

test("in Italian the days and the words are Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<PlanView today={TODAY} />);
  expect(screen.getByTestId("plan-day-mon")).toHaveTextContent("Lun");
  expect(
    screen.getByText("Questo è il piano che scrivi tu. MuW non lo cambia mai."),
  ).toBeOnTheScreen();
});
