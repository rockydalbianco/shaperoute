import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveBody } from "../body/bodyProfile";
import {
  appWeighIns,
  forgetWeighIns,
  NO_WEIGH_INS,
  saveWeighIns,
} from "../body/weighIns";
import { saveLanguageChoice } from "../i18n/language";
import { Celebration } from "./Celebration";
import { FOOD_TABLE } from "./foodTable";
import { NO_MEALS, withPortion } from "./plan";
import { forgetNutrition, writeDay } from "./useNutrition";
import { addDays } from "./localDay";

jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: () => true }));

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The phone's documents folder, in memory, as in DiaryView.test.tsx.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get name(): string {
      return this.uri.slice(this.uri.lastIndexOf("/") + 1);
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
  class Directory {
    uri: string;
    constructor(directory: { uri: string }) {
      this.uri = directory.uri;
    }
    list(): File[] {
      return [...files.keys()]
        .filter((uri) => uri.startsWith(this.uri))
        .map((uri) => new File({ uri: this.uri }, uri.slice(this.uri.length)));
    }
  }
  return { File, Directory, Paths: { document: { uri: "file:///documents/" } }, files };
});

const disk = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const YEAR = 2026;
const ADULT = { sex: "female", weightKg: 80, heightCm: 175, birthYear: 1990 } as const;
const FIVE = [
  { day: "2026-09-04", kg: 80 },
  { day: "2026-09-18", kg: 79 },
  { day: "2026-10-02", kg: 78.5 },
  { day: "2026-10-16", kg: 77.9 },
  { day: "2026-10-30", kg: 77.5 },
];

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    forgetWeighIns();
    forgetNutrition();
  });
  disk.files.clear();
});

test("nothing to celebrate, no card", async () => {
  await render(<Celebration year={YEAR} />);
  expect(screen.queryByTestId("celebration")).toBeNull();
});

test("the milestone the user wrote, then the weigh-ins kept, one at a time", async () => {
  saveBody(ADULT);
  saveWeighIns({
    ...NO_WEIGH_INS,
    entries: FIVE,
    goal: { kg: 76, fromKg: 80 },
    milestones: [78],
  });
  await render(<Celebration year={YEAR} />);
  expect(screen.getByRole("header", { name: "You reached 78 kg" })).toBeOnTheScreen();
  expect(screen.getByText("A milestone you set yourself.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("celebration-done"));
  expect(screen.getByRole("header", { name: "5 weigh-ins" })).toBeOnTheScreen();
  expect(screen.getByText("You kept at it.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("celebration-done"));
  expect(screen.queryByTestId("celebration")).toBeNull();
  expect(appWeighIns().celebrated).toEqual(["milestone:78.0", "weighIns:5"]);
});

test("under the threshold for the height, no congratulation on the weight", async () => {
  saveBody({ ...ADULT, heightCm: 190 });
  saveWeighIns({
    ...NO_WEIGH_INS,
    entries: [{ day: "2026-11-27", kg: 64 }],
    goal: { kg: 66, fromKg: 70 },
    milestones: [68],
  });
  await render(<Celebration year={YEAR} />);
  expect(screen.queryByTestId("celebration")).toBeNull();
});

test("thirty days of diary", async () => {
  const pasta = FOOD_TABLE.find((food) => food.key === "usda-169737");
  if (pasta === undefined) {
    throw new Error("no pasta in the table");
  }
  const eaten = withPortion(NO_MEALS, "lunch", { food: pasta, grams: 150 });
  await act(async () => {
    for (let index = 0; index < 30; index += 1) {
      writeDay(addDays("2026-10-01", index), eaten);
    }
  });
  await render(<Celebration year={YEAR} />);
  expect(
    screen.getByRole("header", { name: "30 days in your diary" }),
  ).toBeOnTheScreen();
});

test("in Italian", async () => {
  saveLanguageChoice("it");
  saveWeighIns({ ...NO_WEIGH_INS, entries: FIVE });
  await render(<Celebration year={YEAR} />);
  expect(screen.getByRole("header", { name: "5 pesate" })).toBeOnTheScreen();
  expect(screen.getByText("Hai tenuto il passo.")).toBeOnTheScreen();
});
