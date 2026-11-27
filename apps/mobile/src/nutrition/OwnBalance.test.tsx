import fixture from "@shaperoute/shared-types/fixtures/activities.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import type { Activity } from "../api/activities";
import { saveLanguageChoice } from "../i18n/language";
import { FOOD_TABLE } from "./foodTable";
import { weekOf } from "./localDay";
import {
  NUTRITION_ENTRY_TEST_ID,
  OWN_BALANCE_TEST_ID,
  OwnBalance,
  weekLabel,
} from "./OwnBalance";
import { NO_MEALS, withPortion } from "./plan";
import { forgetNutrition, seeNotice, writeDay } from "./useNutrition";

// «Calorie balance» on one's own profile (TASK-489 part D).

// The page stands still, as with «Reduce Motion»: its numbers are there at
// once. What moves is tried in CountUp.test.tsx and Ring.test.tsx.
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

/** Thursday 26 November 2026, 18:00 on the phone. */
const NOW = new Date(2026, 10, 26, 18, 0);
/** A day at rest with no body data: one MET for 70 kg. */
const REST = 1764;
const REST_SO_FAR = 1323;
/** The run of the fixture, for 70 kg. */
const RUN = 280;
const STAR = fixture.activities[0] as unknown as Activity;
const MONDAY_RUN: Activity = {
  ...STAR,
  id: "run",
  started_at: new Date(2026, 10, 23, 7, 10).toISOString(),
};
/** The first food of the table, 100 g of it. */
const FOOD = FOOD_TABLE[0];
const KCAL = Math.round(FOOD.kcalPer100g);

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

async function eat(day: string, grams = 100) {
  await act(async () => {
    writeDay(day, withPortion(NO_MEALS, "lunch", { food: FOOD, grams }));
  });
}

async function show(fields: Partial<ActivitiesDoor> = { list: [MONDAY_RUN] }) {
  await render(
    <ActivitiesContext.Provider value={door(fields)}>
      <OwnBalance now={NOW} />
    </ActivitiesContext.Provider>,
  );
}

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    forgetNutrition();
  });
  disk.files.clear();
});

test("a week is «This week» or its two dates", () => {
  const week = weekOf("2026-11-18");
  expect(weekLabel(week, "2026-11-18")).toBe("This week");
  expect(weekLabel(week, "2026-11-26")).toBe("16 Nov – 22 Nov");
});

test("before the notice of «Nutrition» was read there is only the row to open it", async () => {
  const loadMore = jest.fn();
  await show({ list: [MONDAY_RUN], more: true, loadMore });
  expect(screen.queryByTestId(OWN_BALANCE_TEST_ID)).toBeNull();
  expect(
    screen.getByRole("button", {
      name: "Nutrition, Write what you eat and see your calorie balance.",
    }),
  ).toBeOnTheScreen();
  // No number, and no page of the activities is asked for it.
  expect(screen.queryByText("Calorie balance")).toBeNull();
  expect(loadMore).not.toHaveBeenCalled();
});

test("the row opens the page, which stays open when its notice is read", async () => {
  await show();
  await fireEvent.press(screen.getByTestId(NUTRITION_ENTRY_TEST_ID));
  expect(screen.getByTestId("nutrition-page")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("welcome-next"));
  expect(screen.getByTestId("nutrition-notice")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("nutrition-understood"));
  // The profile under it now has the card, and the page is still there.
  expect(screen.getByTestId("nutrition-page")).toBeOnTheScreen();
  expect(screen.getByTestId(OWN_BALANCE_TEST_ID)).toBeOnTheScreen();
  expect(screen.queryByTestId(NUTRITION_ENTRY_TEST_ID)).toBeNull();
  await fireEvent.press(screen.getByTestId("nutrition-close"));
  expect(screen.queryByTestId("nutrition-page")).toBeNull();
});

test("the card ends with «Open Nutrition», which opens the same page", async () => {
  await act(async () => {
    seeNotice();
  });
  await show();
  expect(screen.queryByTestId(NUTRITION_ENTRY_TEST_ID)).toBeNull();
  expect(screen.queryByTestId("nutrition-page")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Open Nutrition" }));
  expect(screen.getByTestId("nutrition-page")).toBeOnTheScreen();
  // The notice was read: the page starts on the day.
  expect(screen.queryByTestId("nutrition-notice")).toBeNull();
});

test("the week has a row a day, and says only its owner sees it", async () => {
  await act(async () => {
    seeNotice();
  });
  await eat("2026-11-23");
  await show();
  expect(screen.getByRole("header", { name: "Calorie balance" })).toBeOnTheScreen();
  expect(screen.getByText("Only you see this")).toBeOnTheScreen();
  expect(screen.getByTestId("balance-week")).toHaveTextContent("This week");
  // Monday: its food, its rest and its run.
  expect(
    screen.getByLabelText(
      `Mon 23, Eaten ${KCAL}, Used ${REST + RUN}, Balance −${REST + RUN - KCAL}, Deficit`,
    ),
  ).toBeOnTheScreen();
  // A day with nothing written, and a day to come: empty.
  expect(screen.getByLabelText("Wed 25, —")).toBeOnTheScreen();
  expect(screen.getByLabelText("Sun 29, —")).toBeOnTheScreen();
  expect(
    screen.getByText("Estimates only. MuW does not provide diets or medical advice."),
  ).toBeOnTheScreen();
});

test("today is «so far», and not in the total until it is over", async () => {
  await act(async () => {
    seeNotice();
  });
  await eat("2026-11-23");
  await eat("2026-11-26", 200);
  await show();
  const today = Math.round(FOOD.kcalPer100g * 2);
  expect(
    screen.getByLabelText(
      `Thu 26, so far, Eaten ${today}, Used ${REST_SO_FAR}, Balance −${REST_SO_FAR - today}, Deficit`,
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByLabelText(
      `Week total, Eaten ${KCAL}, Used ${REST + RUN}, Balance −${REST + RUN - KCAL}, Deficit`,
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByText("Today is not in the total until the day is over."),
  ).toBeOnTheScreen();
});

test("a week with nothing to add up has no total, and no word", async () => {
  await act(async () => {
    seeNotice();
  });
  await show();
  expect(screen.getByLabelText("Week total, —")).toBeOnTheScreen();
  expect(screen.queryByText("Deficit")).toBeNull();
  expect(screen.queryByText("Surplus")).toBeNull();
  expect(
    screen.queryByText("Today is not in the total until the day is over."),
  ).toBeNull();
});

test("the arrows go to the weeks before, never past this one", async () => {
  await act(async () => {
    seeNotice();
  });
  await eat("2026-11-21");
  await show();
  expect(screen.getByTestId("balance-next")).toBeDisabled();
  await fireEvent.press(screen.getByRole("button", { name: "Previous week" }));
  expect(screen.getByTestId("balance-week")).toHaveTextContent("16 Nov – 22 Nov");
  expect(
    screen.getByLabelText(
      `Sat 21, Eaten ${KCAL}, Used ${REST}, Balance −${REST - KCAL}, Deficit`,
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByLabelText(
      `Week total, Eaten ${KCAL}, Used ${REST}, Balance −${REST - KCAL}, Deficit`,
    ),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Next week" }));
  expect(screen.getByTestId("balance-week")).toHaveTextContent("This week");
});

test("a week older than the pages held asks for the next page, and has no total meanwhile", async () => {
  await act(async () => {
    seeNotice();
  });
  await eat("2026-11-23");
  const loadMore = jest.fn();
  await show({ list: [MONDAY_RUN], more: true, loadMore });
  expect(loadMore).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Mon 23, —")).toBeOnTheScreen();
  expect(screen.getByLabelText("Week total, —")).toBeOnTheScreen();
});

test("with nobody signed in the rest alone is counted", async () => {
  await act(async () => {
    seeNotice();
  });
  await eat("2026-11-23");
  await render(<OwnBalance now={NOW} />);
  expect(
    screen.getByLabelText(
      `Mon 23, Eaten ${KCAL}, Used ${REST}, Balance −${REST - KCAL}, Deficit`,
    ),
  ).toBeOnTheScreen();
});

test("in Italian the table is in Italian", async () => {
  await act(async () => {
    saveLanguageChoice("it");
    seeNotice();
  });
  await eat("2026-11-23");
  await eat("2026-11-26");
  await show();
  expect(
    screen.getByRole("header", { name: "Bilancio delle calorie" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Lo vedi solo tu")).toBeOnTheScreen();
  expect(screen.getByText("Totale della settimana")).toBeOnTheScreen();
  // The heads of the columns are not read one by one: each row says them.
  expect(
    screen.getByText("Consumate", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(screen.getByText(/finora/)).toBeOnTheScreen();
  expect(
    screen.getByText("Oggi non entra nel totale finché il giorno non è finito."),
  ).toBeOnTheScreen();
});
