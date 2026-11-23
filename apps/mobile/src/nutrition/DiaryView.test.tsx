import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { diaryDayLabel, DiaryView } from "./DiaryView";
import { loadDiaryMonth, loadOwnFoods, loadSettings } from "./nutritionStore";
import { forgetNutrition, writeTarget } from "./useNutrition";

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

/** «Add food» of a meal, a search, the first result named, its grams. */
async function addFood(meal: string, search: string, key: string, grams: string) {
  await fireEvent.press(screen.getByTestId(`meal-${meal}-add`));
  await fireEvent.changeText(screen.getByTestId("add-food-search"), search);
  await fireEvent.press(screen.getByTestId(`add-food-result-${key}`));
  await fireEvent.changeText(screen.getByTestId("add-food-grams-input"), grams);
}

test("a day says «Today», «Yesterday» or its date", () => {
  expect(diaryDayLabel(TODAY, TODAY)).toBe("Today");
  expect(diaryDayLabel("2026-11-22", TODAY)).toBe("Yesterday");
  expect(diaryDayLabel("2026-11-20", TODAY)).toBe("Fri 20 Nov 2026");
});

test("a day with nothing written has four empty meals and no number", async () => {
  await render(<DiaryView today={TODAY} />);
  expect(screen.getByTestId("diary-day")).toHaveTextContent("Today");
  for (const meal of ["Breakfast", "Lunch", "Dinner", "Snacks"]) {
    expect(screen.getByRole("header", { name: meal })).toBeOnTheScreen();
  }
  expect(screen.getByLabelText("Eaten, —")).toBeOnTheScreen();
  // The energy used and the balance come with the activities (part C1).
  expect(screen.getByLabelText("Used (est.), —")).toBeOnTheScreen();
  expect(screen.getByLabelText("Balance, —")).toBeOnTheScreen();
});

test("a food is found by name, its grams typed, its calories estimated", async () => {
  await render(<DiaryView today={TODAY} />);
  await addFood("lunch", "pasta cooked", PASTA, "180");
  expect(screen.getByRole("header", { name: "Pasta, cooked" })).toBeOnTheScreen();
  expect(screen.getByTestId("add-food-estimate")).toHaveTextContent("284 kcal");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));

  const lunch = within(screen.getByTestId("meal-lunch"));
  expect(lunch.getByLabelText("Pasta, cooked, 180 g, 284 kcal")).toBeOnTheScreen();
  expect(screen.getByTestId("meal-lunch-kcal")).toHaveTextContent("284 kcal");
  expect(screen.getByLabelText("Eaten, 284")).toBeOnTheScreen();
  // Kept on the phone, under the day.
  expect(loadDiaryMonth("2026-11")[TODAY].lunch).toEqual([
    { food: expect.objectContaining({ key: PASTA, kcalPer100g: 158 }), grams: 180 },
  ]);
});

test("grams that are not a portion's cannot be added", async () => {
  await render(<DiaryView today={TODAY} />);
  await addFood("lunch", "pasta cooked", PASTA, "0");
  expect(screen.getByTestId("add-food-estimate")).toHaveTextContent("—");
  expect(screen.getByTestId("add-food-confirm")).toBeDisabled();
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(loadDiaryMonth("2026-11")).toEqual({});
});

test("a portion touched changes its grams, or is removed", async () => {
  await render(<DiaryView today={TODAY} />);
  await addFood("lunch", "pasta cooked", PASTA, "180");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));

  await fireEvent.press(screen.getByTestId("meal-lunch-portion-0"));
  expect(screen.getByTestId("add-food-grams-input")).toHaveDisplayValue("180");
  await fireEvent.changeText(screen.getByTestId("add-food-grams-input"), "100");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(screen.getByLabelText("Eaten, 158")).toBeOnTheScreen();
  expect(loadDiaryMonth("2026-11")[TODAY].lunch[0].grams).toBe(100);

  await fireEvent.press(screen.getByTestId("meal-lunch-portion-0"));
  await fireEvent.press(screen.getByTestId("add-food-remove"));
  expect(screen.getByLabelText("Eaten, —")).toBeOnTheScreen();
  expect(loadDiaryMonth("2026-11")).toEqual({});
});

test("a food that is not there is written by the user", async () => {
  await render(<DiaryView today={TODAY} />);
  await fireEvent.press(screen.getByTestId("meal-snacks-add"));
  await fireEvent.changeText(screen.getByTestId("add-food-search"), "zzz granola");
  expect(screen.getByText("No food found.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("add-food-own"));

  // The name starts from what was looked for; MuW proposes no number.
  expect(screen.getByTestId("own-food-name")).toHaveDisplayValue("zzz granola");
  expect(screen.getByTestId("own-food-kcal")).toHaveDisplayValue("");
  expect(screen.getByTestId("own-food-save")).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("own-food-name"), "Granola");
  await fireEvent.changeText(screen.getByTestId("own-food-kcal"), "450");
  await fireEvent.press(screen.getByTestId("own-food-save"));
  expect(loadOwnFoods().foods).toEqual([
    expect.objectContaining({ key: "own-1", name: "Granola", kcalPer100g: 450 }),
  ]);

  await fireEvent.changeText(screen.getByTestId("add-food-grams-input"), "40");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(screen.getByLabelText("Granola, 40 g, 180 kcal")).toBeOnTheScreen();

  // Next time it is the first thing the search shows, marked as the user's.
  await fireEvent.press(screen.getByTestId("meal-dinner-add"));
  expect(screen.getByTestId("add-food-result-own-1")).toHaveTextContent(/My food/);
});

test("a food of the user's is rewritten or deleted from its grams", async () => {
  await render(<DiaryView today={TODAY} />);
  await fireEvent.press(screen.getByTestId("meal-snacks-add"));
  await fireEvent.press(screen.getByTestId("add-food-own"));
  await fireEvent.changeText(screen.getByTestId("own-food-name"), "Granola");
  await fireEvent.changeText(screen.getByTestId("own-food-kcal"), "450");
  await fireEvent.press(screen.getByTestId("own-food-save"));

  await fireEvent.press(screen.getByTestId("add-food-edit-own"));
  await fireEvent.changeText(screen.getByTestId("own-food-kcal"), "470");
  await fireEvent.press(screen.getByTestId("own-food-save"));
  expect(loadOwnFoods().foods[0].kcalPer100g).toBe(470);

  await fireEvent.press(screen.getByTestId("add-food-edit-own"));
  await fireEvent.press(screen.getByTestId("own-food-delete"));
  expect(loadOwnFoods().foods).toEqual([]);
  expect(screen.getByTestId("add-food-search")).toBeOnTheScreen();
});

test("the days before can be written, the days after today cannot", async () => {
  await render(<DiaryView today={TODAY} />);
  expect(screen.getByTestId("diary-next")).toBeDisabled();
  await fireEvent.press(screen.getByTestId("diary-previous"));
  expect(screen.getByTestId("diary-day")).toHaveTextContent("Yesterday");
  expect(screen.getByTestId("diary-next")).not.toBeDisabled();

  await addFood("dinner", "pasta cooked", PASTA, "100");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(Object.keys(loadDiaryMonth("2026-11"))).toEqual(["2026-11-22"]);

  await fireEvent.press(screen.getByTestId("diary-next"));
  expect(screen.getByTestId("diary-day")).toHaveTextContent("Today");
  expect(screen.getByLabelText("Eaten, —")).toBeOnTheScreen();
});

test("the target is the number the user writes, with what is left of it", async () => {
  await render(<DiaryView today={TODAY} />);
  // None until the user writes one: MuW proposes no target.
  expect(screen.getByText("Set my daily target")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("diary-target"));
  expect(screen.getByTestId("target-input")).toHaveDisplayValue("");
  expect(screen.getByTestId("target-save")).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("target-input"), "2000");
  await fireEvent.press(screen.getByTestId("target-save"));
  expect(loadSettings().target).toBe(2000);
  expect(screen.getByText("My daily target 2000 (set by you)")).toBeOnTheScreen();
  expect(screen.getByTestId("diary-left")).toHaveTextContent("Left 2000");

  await addFood("lunch", "pasta cooked", PASTA, "180");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(screen.getByTestId("diary-left")).toHaveTextContent("Left 1716");
});

test("the target can be taken away", async () => {
  await act(async () => {
    writeTarget(1800);
  });
  await render(<DiaryView today={TODAY} />);
  await fireEvent.press(screen.getByTestId("diary-target"));
  expect(screen.getByTestId("target-input")).toHaveDisplayValue("1800");
  await fireEvent.press(screen.getByTestId("target-remove"));
  expect(loadSettings().target).toBeNull();
  expect(screen.getByText("Set my daily target")).toBeOnTheScreen();
});

test("in Italian the foods are looked for and shown in Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<DiaryView today={TODAY} />);
  expect(screen.getByTestId("diary-day")).toHaveTextContent("Oggi");
  await addFood("lunch", "pasta cotta", PASTA, "180");
  expect(screen.getByRole("header", { name: "Pasta, cotta" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(screen.getByLabelText("Pasta, cotta, 180 g, 284 kcal")).toBeOnTheScreen();
  expect(screen.getByLabelText("Mangiate, 284")).toBeOnTheScreen();
});
