import fixture from "@shaperoute/shared-types/fixtures/activities.json";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import type { Activity } from "../api/activities";
import { saveLanguageChoice } from "../i18n/language";
import { color } from "../theme/tokens";
import { diaryDayLabel, DiaryView } from "./DiaryView";
import type { Food } from "./foods";
import { FOOD_TABLE } from "./foodTable";
import { macrosOf } from "./intake";
import { loadDiaryMonth, loadOwnFoods, loadSettings } from "./nutritionStore";
import { NO_MEALS, withPortion } from "./plan";
import {
  forgetNutrition,
  writeDay,
  writePlanDay,
  writeRest,
  writeTarget,
} from "./useNutrition";
import { stripHeights } from "./WeekStrip";

// The page stands still, as with «Reduce Motion»: its numbers are there at
// once. What moves is tried in CountUp.test.tsx and Ring.test.tsx.
jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: () => true }));

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
  // No balance for a day with nothing eaten written: not a deficit of a day.
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

test("«Eaten as planned» writes the day as the plan has it", async () => {
  // A Monday planned, written from the plan's own view of the store.
  await act(async () => {
    writePlanDay(
      "mon",
      withPortion(NO_MEALS, "lunch", {
        food: FOOD_TABLE.find((food) => food.key === PASTA)!,
        grams: 180,
      }),
    );
  });
  await render(<DiaryView today={TODAY} />);
  await fireEvent.press(screen.getByRole("button", { name: "Eaten as planned" }));
  expect(screen.getByLabelText("Pasta, cooked, 180 g, 284 kcal")).toBeOnTheScreen();
  expect(screen.getByLabelText("Eaten, 284")).toBeOnTheScreen();
  expect(loadDiaryMonth("2026-11")[TODAY].lunch).toHaveLength(1);
  // Written once: it is not offered over what the day already has.
  expect(screen.queryByTestId("diary-as-planned")).toBeNull();
});

test("«Eaten as planned» is not there without a plan for that day of the week", async () => {
  await act(async () => {
    writePlanDay(
      "tue",
      withPortion(NO_MEALS, "lunch", {
        food: FOOD_TABLE.find((food) => food.key === PASTA)!,
        grams: 180,
      }),
    );
  });
  await render(<DiaryView today={TODAY} />);
  expect(screen.queryByTestId("diary-as-planned")).toBeNull();
});

test("«Eaten as planned» never takes away what was written by hand", async () => {
  await act(async () => {
    writePlanDay(
      "mon",
      withPortion(NO_MEALS, "lunch", {
        food: FOOD_TABLE.find((food) => food.key === PASTA)!,
        grams: 180,
      }),
    );
  });
  await render(<DiaryView today={TODAY} />);
  await addFood("breakfast", "pasta cooked", PASTA, "50");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  expect(screen.queryByTestId("diary-as-planned")).toBeNull();
});

// What the body used, and the balance (part C1).

/** 18:00 of TODAY on the phone: three quarters of the day gone. */
const EVENING = new Date(2026, 10, 23, 18, 0);
/** A day at rest with no body data: one MET for 70 kg. */
const REST = 1764;
const REST_SO_FAR = 1323;
/** The run of the fixture, 4007 m in 19 minutes, for 70 kg. */
const RUN = 280;
const STAR = fixture.activities[0] as unknown as Activity;
const MORNING_RUN: Activity = {
  ...STAR,
  id: "run",
  started_at: new Date(2026, 10, 23, 7, 10).toISOString(),
};

/** The private list as «Profile» hands it to the app. */
function door(fields: Partial<ActivitiesDoor>): ActivitiesDoor {
  return {
    status: "ready",
    list: [],
    more: false,
    loadingMore: false,
    problem: null,
    loadMore: () => {},
    ...fields,
  } as unknown as ActivitiesDoor;
}

async function showDiary(fields: Partial<ActivitiesDoor>, now: Date = EVENING) {
  await render(
    <ActivitiesContext.Provider value={door(fields)}>
      <DiaryView today={TODAY} now={now} />
    </ActivitiesContext.Provider>,
  );
}

test("«Used (est.)» is the rest so far and the activities of the day", async () => {
  await showDiary({ list: [MORNING_RUN] });
  expect(screen.getByLabelText(`Used (est.), ${REST_SO_FAR + RUN}`)).toBeOnTheScreen();
  expect(
    screen.getByText("Today the energy at rest is counted up to now."),
  ).toBeOnTheScreen();
  // Nothing eaten written yet: no balance.
  expect(screen.getByLabelText("Balance, —")).toBeOnTheScreen();
});

test("a day that is over counts its whole rest, and does not say «so far»", async () => {
  await showDiary({ list: [MORNING_RUN] });
  await fireEvent.press(screen.getByTestId("diary-previous"));
  expect(screen.getByLabelText(`Used (est.), ${REST}`)).toBeOnTheScreen();
  expect(screen.queryByTestId("diary-so-far")).toBeNull();
});

test("«Balance» is eaten less used, with its sign and its word", async () => {
  await showDiary({ list: [MORNING_RUN] });
  await addFood("lunch", "pasta cooked", PASTA, "180");
  await fireEvent.press(screen.getByTestId("add-food-confirm"));
  const balance = REST_SO_FAR + RUN - 284;
  expect(screen.getByLabelText(`Balance, −${balance}, Deficit`)).toBeOnTheScreen();

  // More eaten than used: a surplus, with its plus.
  await act(async () => {
    writeRest(1);
  });
  expect(
    screen.getByLabelText(`Balance, +${284 - 1 - RUN}, Surplus`),
  ).toBeOnTheScreen();
});

test("with nobody signed in only the rest is counted, and the sheet says why", async () => {
  await render(<DiaryView today={TODAY} now={EVENING} />);
  expect(screen.getByLabelText(`Used (est.), ${REST_SO_FAR}`)).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("diary-used"));
  expect(screen.getByRole("header", { name: "Energy you use" })).toBeOnTheScreen();
  expect(screen.getByText("Log in to count your activities.")).toBeOnTheScreen();
  expect(screen.getByTestId("energy-used")).toHaveTextContent(`${REST_SO_FAR} kcal`);
});

test("a list that did not come leaves the rest alone, and the sheet says so", async () => {
  await showDiary({ status: "failed" });
  expect(screen.getByLabelText(`Used (est.), ${REST_SO_FAR}`)).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("diary-used"));
  expect(
    screen.getByText(
      "Your activities could not be loaded. Only the energy at rest is counted.",
    ),
  ).toBeOnTheScreen();
});

test("while the activities of the day are on their way, nothing is said of it", async () => {
  await showDiary({ status: "loading" });
  expect(screen.getByLabelText("Used (est.), —")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("diary-used"));
  expect(screen.getByText("Loading…")).toBeOnTheScreen();
});

test("a day older than the pages held asks for the next page", async () => {
  const loadMore = jest.fn();
  await showDiary({ list: [MORNING_RUN], more: true, loadMore });
  // Today is not covered either: nothing here began before it.
  expect(loadMore).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Used (est.), —")).toBeOnTheScreen();
});

test("a page that did not come is not asked for again by itself", async () => {
  const loadMore = jest.fn();
  await showDiary({ list: [MORNING_RUN], more: true, problem: "No network", loadMore });
  expect(loadMore).not.toHaveBeenCalled();
  expect(screen.getByLabelText(`Used (est.), ${REST_SO_FAR}`)).toBeOnTheScreen();
});

test("«Energy you use» lists the rest and each activity with its calories", async () => {
  await showDiary({ list: [MORNING_RUN] });
  await fireEvent.press(screen.getByTestId("diary-used"));
  expect(screen.getByLabelText(`At rest, ${REST_SO_FAR} kcal`)).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Activities" })).toBeOnTheScreen();
  expect(screen.getByLabelText(`Run · 4.01 km, 07:10, ${RUN} kcal`)).toBeOnTheScreen();
  expect(screen.getByTestId("energy-used")).toHaveTextContent(
    `${REST_SO_FAR + RUN} kcal`,
  );
  // «Close» is the way out: the sheet has no other number to save.
  expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
});

test("a day without activities says so", async () => {
  await showDiary({ list: [] });
  await fireEvent.press(screen.getByTestId("diary-used"));
  expect(screen.getByText("No activities on this day.")).toBeOnTheScreen();
});

test("the rest is written by the user, and the estimate comes back", async () => {
  await showDiary({ list: [MORNING_RUN] });
  await fireEvent.press(screen.getByTestId("diary-used"));
  await fireEvent.press(screen.getByTestId("energy-rest"));
  expect(screen.getByRole("header", { name: "Energy at rest" })).toBeOnTheScreen();
  expect(screen.getByTestId("energy-edit-estimate")).toHaveTextContent(
    `MuW's estimate: ${REST} kcal`,
  );
  // The field starts empty: MuW's number is not the user's.
  expect(screen.getByTestId("energy-edit-input")).toHaveProp("value", "");
  expect(screen.queryByTestId("energy-edit-estimate-back")).toBeNull();
  expect(screen.getByTestId("energy-edit-save")).toBeDisabled();

  await fireEvent.changeText(screen.getByTestId("energy-edit-input"), "2000");
  await fireEvent.press(screen.getByTestId("energy-edit-save"));
  expect(loadSettings().edits.restKcalPerDay).toBe(2000);
  expect(screen.getByLabelText("At rest (set by you), 1500 kcal")).toBeOnTheScreen();
  expect(screen.getByLabelText(`Used (est.), ${1500 + RUN}`)).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId("energy-rest"));
  expect(screen.getByTestId("energy-edit-input")).toHaveProp("value", "2000");
  // The estimate is still in sight beside the user's number.
  expect(screen.getByTestId("energy-edit-estimate")).toHaveTextContent(
    `MuW's estimate: ${REST} kcal`,
  );
  await fireEvent.press(screen.getByTestId("energy-edit-estimate-back"));
  expect(loadSettings().edits.restKcalPerDay).toBeNull();
  expect(screen.getByLabelText(`At rest, ${REST_SO_FAR} kcal`)).toBeOnTheScreen();
});

test("the calories of an activity are written by the user, and say «edited»", async () => {
  await showDiary({ list: [MORNING_RUN] });
  await fireEvent.press(screen.getByTestId("diary-used"));
  await fireEvent.press(screen.getByTestId("energy-activity-run"));
  expect(
    screen.getByRole("header", { name: "Calories of this activity" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Run · 4.01 km · 07:10")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Your number stays on this phone. Your post and Apple Health keep theirs.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByTestId("energy-edit-estimate")).toHaveTextContent(
    `MuW's estimate: ${RUN} kcal`,
  );

  await fireEvent.changeText(screen.getByTestId("energy-edit-input"), "350");
  await fireEvent.press(screen.getByTestId("energy-edit-save"));
  expect(loadSettings().edits.activities).toEqual({ run: 350 });
  expect(
    screen.getByLabelText("Run · 4.01 km, 07:10, 350 kcal, edited"),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText(`Used (est.), ${REST_SO_FAR + 350}`)).toBeOnTheScreen();

  await fireEvent.press(screen.getByTestId("energy-activity-run"));
  await fireEvent.press(screen.getByTestId("energy-edit-estimate-back"));
  expect(loadSettings().edits.activities).toEqual({});
  expect(screen.getByLabelText(`Run · 4.01 km, 07:10, ${RUN} kcal`)).toBeOnTheScreen();
});

test("a number the field does not take cannot be saved, and «Cancel» keeps what was", async () => {
  await showDiary({ list: [MORNING_RUN] });
  await fireEvent.press(screen.getByTestId("diary-used"));
  await fireEvent.press(screen.getByTestId("energy-rest"));
  await fireEvent.changeText(screen.getByTestId("energy-edit-input"), "0");
  expect(screen.getByTestId("energy-edit-save")).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("energy-edit-input"), "1800");
  await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
  expect(loadSettings().edits.restKcalPerDay).toBeNull();
  expect(screen.getByLabelText(`At rest, ${REST_SO_FAR} kcal`)).toBeOnTheScreen();
});

test("the balance of a day written before follows the diary of that day", async () => {
  await act(async () => {
    writeDay(
      "2026-11-22",
      withPortion(NO_MEALS, "dinner", { food: FOOD_TABLE[0], grams: 100 }),
    );
  });
  await showDiary({ list: [MORNING_RUN] });
  await fireEvent.press(screen.getByTestId("diary-previous"));
  const eaten = Math.round(FOOD_TABLE[0].kcalPer100g);
  expect(screen.getByLabelText(`Balance, −${REST - eaten}, Deficit`)).toBeOnTheScreen();
});

test("in Italian the energy is said in Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  await showDiary({ list: [MORNING_RUN] });
  expect(
    screen.getByText("Oggi l'energia a riposo è contata fino a adesso."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("diary-used"));
  expect(screen.getByRole("header", { name: "Energia che consumi" })).toBeOnTheScreen();
  expect(screen.getByLabelText(`A riposo, ${REST_SO_FAR} kcal`)).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("energy-rest"));
  expect(screen.getByRole("header", { name: "Energia a riposo" })).toBeOnTheScreen();
  expect(screen.getByTestId("energy-edit-estimate")).toHaveTextContent(
    `Stima di MuW: ${REST} kcal`,
  );
});

// The page since part H: rings, protein, carbs and fat, the week.

/** A food of the user's, written with its calories alone. */
const SOUP: Food = {
  key: "own-1",
  name: "Soup",
  kcalPer100g: 50,
  proteinPer100g: null,
  carbsPer100g: null,
  fatPer100g: null,
  source: "own",
};
const PASTA_FOOD = FOOD_TABLE.find((food) => food.key === PASTA) as Food;

test("the two numbers are also two rings, a picture beside them", async () => {
  await render(<DiaryView today={TODAY} />);
  const rings = screen.getByTestId("diary-rings");
  expect(
    within(rings).getByTestId("diary-ring-eaten", { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(
    within(rings).getByTestId("diary-ring-used", { includeHiddenElements: true }),
  ).toBeTruthy();
  // The numbers are still said in words.
  expect(screen.getByLabelText("Eaten, —")).toBeOnTheScreen();
  // Which ring is which: a dot of its colour before each label, green for
  // what was eaten and the calories' red for what was used.
  expect(
    screen.getByTestId("diary-dot-eaten", { includeHiddenElements: true }),
  ).toHaveStyle({ backgroundColor: color.food });
  expect(
    screen.getByTestId("diary-dot-used", { includeHiddenElements: true }),
  ).toHaveStyle({ backgroundColor: color.energy });
});

test("an empty day has no card of protein, carbs and fat", async () => {
  await render(<DiaryView today={TODAY} />);
  expect(screen.queryByTestId("diary-macros")).toBeNull();
});

test("the day's protein, carbs and fat are grams and a share of the energy", async () => {
  await act(async () => {
    writeDay(TODAY, withPortion(NO_MEALS, "lunch", { food: PASTA_FOOD, grams: 180 }));
  });
  await render(<DiaryView today={TODAY} />);
  expect(
    screen.getByRole("header", { name: "Protein, carbs and fat (est.)" }),
  ).toBeOnTheScreen();
  const macros = macrosOf(loadDiaryMonth("2026-11")[TODAY]);
  expect(macros).not.toBeNull();
  for (const [id, name, grams] of [
    ["protein", "Protein", macros?.proteinG],
    ["carbs", "Carbs", macros?.carbsG],
    ["fat", "Fat", macros?.fatG],
  ] as const) {
    expect(screen.getByTestId(`diary-macro-${id}`).props.accessibilityLabel).toMatch(
      new RegExp(`^${name}, ${grams} g · \\d+% of the energy$`),
    );
  }
  // Every food had its numbers: nothing was left out.
  expect(screen.queryByTestId("diary-macros-partial")).toBeNull();
  // No target and no word of judgement on the card.
  const card = within(screen.getByTestId("diary-macros"));
  expect(card.queryByText(/target|too|enough|goal/i)).toBeNull();
});

test("a food with its calories alone is left out, and the card says so", async () => {
  await act(async () => {
    writeDay(
      TODAY,
      withPortion(
        withPortion(NO_MEALS, "lunch", { food: PASTA_FOOD, grams: 180 }),
        "dinner",
        { food: SOUP, grams: 300 },
      ),
    );
  });
  await render(<DiaryView today={TODAY} />);
  expect(screen.getByTestId("diary-macros-partial")).toHaveTextContent(
    "Counted only for the foods that have these numbers.",
  );
});

test("a day of foods with calories alone has no three numbers to show", async () => {
  await act(async () => {
    writeDay(TODAY, withPortion(NO_MEALS, "dinner", { food: SOUP, grams: 300 }));
  });
  await render(<DiaryView today={TODAY} />);
  expect(screen.getByTestId("diary-macros-none")).toHaveTextContent(
    "No protein, carbs or fat to count for this day.",
  );
  expect(screen.queryByTestId("diary-macro-protein")).toBeNull();
});

test("the tallest column of the week is its largest number", () => {
  expect(
    stripHeights([
      { day: "2026-11-23", eaten: 1000, used: 2000 },
      { day: "2026-11-24", eaten: null, used: 1500 },
      { day: "2026-11-25", eaten: null, used: null },
    ]),
  ).toEqual([
    { eaten: 0.5, used: 1 },
    { eaten: 0, used: 0.75 },
    { eaten: 0, used: 0 },
  ]);
  expect(stripHeights([{ day: "2026-11-23", eaten: null, used: null }])).toEqual([
    { eaten: 0, used: 0 },
  ]);
});

test("the week under the diary has a day to a button, none after today", async () => {
  await render(<DiaryView today={TODAY} now={EVENING} />);
  const week = within(screen.getByTestId("diary-week"));
  expect(week.getByRole("header", { name: "This week" })).toBeOnTheScreen();
  // Monday 23 is today: it is the one chosen, and Tuesday cannot be opened.
  expect(screen.getByTestId(`diary-week-${TODAY}`)).toBeSelected();
  expect(screen.getByTestId("diary-week-2026-11-24")).toBeDisabled();
  expect(screen.getByTestId("diary-week-2026-11-29")).toBeDisabled();
  expect(week.getAllByRole("button")).toHaveLength(7);
});

test("a day touched in the week takes the diary there", async () => {
  await act(async () => {
    writeDay(
      "2026-11-18",
      withPortion(NO_MEALS, "lunch", { food: PASTA_FOOD, grams: 100 }),
    );
  });
  await render(<DiaryView today={TODAY} now={EVENING} />);
  // Back a day: Sunday, in the week before.
  await fireEvent.press(screen.getByTestId("diary-previous"));
  expect(
    within(screen.getByTestId("diary-week")).getByRole("header", {
      name: "16 Nov – 22 Nov",
    }),
  ).toBeOnTheScreen();
  // With nobody signed in a whole day past is its rest alone.
  expect(
    screen.getByLabelText(`Wed 18, Eaten 158, Used (est.) ${REST}`),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("diary-week-2026-11-18"));
  expect(screen.getByTestId("diary-day")).toHaveTextContent("Wed 18 Nov 2026");
  expect(screen.getByLabelText("Eaten, 158")).toBeOnTheScreen();
  expect(screen.getByTestId("diary-week-2026-11-18")).toBeSelected();
});

test("the day and the week under it ask for a missing page once, not twice", async () => {
  const loadMore = jest.fn();
  await showDiary({ list: [MORNING_RUN], more: true, loadMore });
  expect(loadMore).toHaveBeenCalledTimes(1);
});

test("in Italian the new card is in Italian", async () => {
  await act(async () => {
    saveLanguageChoice("it");
    writeDay(TODAY, withPortion(NO_MEALS, "lunch", { food: PASTA_FOOD, grams: 180 }));
  });
  await render(<DiaryView today={TODAY} />);
  expect(
    screen.getByRole("header", { name: "Proteine, carboidrati e grassi (stima)" }),
  ).toBeOnTheScreen();
  expect(screen.getByTestId("diary-macro-protein").props.accessibilityLabel).toMatch(
    /^Proteine, \d+ g · \d+% dell'energia$/,
  );
});
