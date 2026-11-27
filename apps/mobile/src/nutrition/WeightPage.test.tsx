import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { appBody, saveBody } from "../body/bodyProfile";
import {
  appWeighIns,
  forgetWeighIns,
  NO_WEIGH_INS,
  saveWeighIns,
} from "../body/weighIns";
import { saveLanguageChoice } from "../i18n/language";
import { WeightPage } from "./WeightPage";

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

const TODAY = "2026-11-27";
const NOW = new Date(2026, 10, 27, 12);
const ADULT = {
  sex: "female",
  weightKg: 79.6,
  heightCm: 175,
  birthYear: 1990,
} as const;
const TWELVE_WEEKS = [
  { day: "2026-09-04", kg: 82.4 },
  { day: "2026-09-18", kg: 81.9 },
  { day: "2026-10-02", kg: 81.6 },
  { day: "2026-10-16", kg: 80.8 },
  { day: "2026-10-30", kg: 80.5 },
  { day: "2026-11-13", kg: 80.1 },
  { day: "2026-11-27", kg: 79.6 },
];

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    forgetWeighIns();
  });
  disk.files.clear();
});

function page() {
  return render(<WeightPage visible today={TODAY} now={NOW} onClose={() => {}} />);
}

/** The chart is a picture, hidden from screen readers. */
const HIDDEN = { includeHiddenElements: true } as const;

/** The chart draws once it knows its width. */
async function measureChart() {
  await fireEvent(screen.getByTestId("weight-chart", HIDDEN), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 120 } },
  });
}

test("with no weigh-in the page says so and offers to add one", async () => {
  await page();
  expect(screen.getByTestId("weight-none")).toHaveTextContent("No weigh-ins yet");
  await fireEvent.press(screen.getByTestId("weight-add"));
  await fireEvent.changeText(screen.getByTestId("weigh-in-form-input"), "80");
  await fireEvent.press(screen.getByTestId("weigh-in-form-save"));
  expect(appWeighIns().entries).toEqual([{ day: TODAY, kg: 80 }]);
  expect(screen.getByTestId("weight-one")).toHaveTextContent(
    "One weigh-in so far: the line starts with the next.",
  );
});

test("the weight, its change in kilograms, as a change and as a percent", async () => {
  saveWeighIns({ ...NO_WEIGH_INS, entries: TWELVE_WEEKS });
  await page();
  expect(screen.getByTestId("weight-big")).toHaveTextContent("79.6 kg");
  expect(screen.getByTestId("weight-sub")).toHaveTextContent("−2.8 kg in 12 weeks");
  await measureChart();
  expect(screen.getAllByTestId("weight-chart-dot", HIDDEN)).toHaveLength(7);
  expect(screen.getAllByTestId("weight-chart-piece", HIDDEN)).toHaveLength(6);
  await fireEvent.press(screen.getByTestId("weight-mode-change"));
  expect(screen.getByTestId("weight-big")).toHaveTextContent("−2.8 kg");
  expect(screen.getByTestId("weight-sub")).toHaveTextContent(
    "Since your first weigh-in, 4 Sep",
  );
  await fireEvent.press(screen.getByTestId("weight-mode-percent"));
  expect(screen.getByTestId("weight-big")).toHaveTextContent("−3.4 %");
  expect(screen.getByTestId("weight-sub")).toHaveTextContent(
    "Of your starting weight, in 12 weeks",
  );
});

test("the chart shows weeks, months or all the weigh-ins", async () => {
  saveWeighIns({
    ...NO_WEIGH_INS,
    entries: [
      { day: "2025-01-10", kg: 85 },
      { day: "2026-06-05", kg: 83 },
      ...TWELVE_WEEKS,
    ],
  });
  await page();
  await measureChart();
  expect(screen.getAllByTestId("weight-chart-dot", HIDDEN)).toHaveLength(8);
  await fireEvent.press(screen.getByTestId("weight-range-weeks"));
  await measureChart();
  expect(screen.getAllByTestId("weight-chart-dot", HIDDEN)).toHaveLength(7);
  await fireEvent.press(screen.getByTestId("weight-range-all"));
  await measureChart();
  expect(screen.getAllByTestId("weight-chart-dot", HIDDEN)).toHaveLength(9);
  // A day of another year says its year.
  expect(screen.getByTestId("weight-entry-2025-01-10")).toHaveTextContent(
    /Fri 10 Jan 2025/,
  );
});

test("the statistics and the balance of the same weeks", async () => {
  saveWeighIns({ ...NO_WEIGH_INS, entries: TWELVE_WEEKS });
  await page();
  expect(screen.getByLabelText("Start, 82.4 kg")).toBeOnTheScreen();
  expect(screen.getByLabelText("Today, 79.6 kg")).toBeOnTheScreen();
  expect(screen.getByLabelText("Highest, 82.4 kg")).toBeOnTheScreen();
  expect(screen.getByLabelText("Lowest, 79.6 kg")).toBeOnTheScreen();
  expect(screen.getByLabelText("Per week, −0.2 kg")).toBeOnTheScreen();
  expect(screen.getByLabelText("Weigh-ins, 7 since 4 Sep")).toBeOnTheScreen();
  expect(screen.getByTestId("weight-balance")).toHaveTextContent(/^Same 12 weeks/);
  expect(screen.getByTestId("weight-balance")).toHaveTextContent(/· Weight −2\.8 kg$/);
});

test("a weigh-in can be changed, and taken away without changing the body", async () => {
  saveBody(ADULT);
  saveWeighIns({ ...NO_WEIGH_INS, entries: TWELVE_WEEKS });
  await page();
  await fireEvent.press(screen.getByTestId(`weight-entry-${TODAY}`));
  await fireEvent.changeText(screen.getByTestId("weigh-in-form-input"), "79.4");
  await fireEvent.press(screen.getByTestId("weigh-in-form-save"));
  expect(appBody().weightKg).toBe(79.4);
  await fireEvent.press(screen.getByTestId(`weight-entry-${TODAY}`));
  await fireEvent.press(screen.getByTestId("weigh-in-form-delete"));
  expect(screen.getByText("Delete this weigh-in?")).toBeOnTheScreen();
  expect(screen.getByText("Your weight in Settings stays 79.4 kg.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("weigh-in-form-delete-yes"));
  expect(appWeighIns().entries).toHaveLength(6);
  expect(appBody().weightKg).toBe(79.4);
});

test("a goal needs the height and the year of birth", async () => {
  saveBody({ ...ADULT, heightCm: null });
  await page();
  await fireEvent.press(screen.getByTestId("weight-open-goal"));
  expect(screen.getByTestId("weight-goal-data")).toHaveTextContent(
    "To set a goal weight, add your height and year of birth in Settings.",
  );
  expect(screen.queryByTestId("weight-goal-input")).toBeNull();
});

test("no weight goal under 18, even for who turns 18 this year", async () => {
  saveBody({ ...ADULT, birthYear: 2008 });
  await render(<WeightPage visible today={TODAY} now={NOW} onClose={() => {}} />);
  await fireEvent.press(screen.getByTestId("weight-open-goal"));
  expect(screen.getByTestId("weight-goal-under18")).toBeOnTheScreen();
});

test("the goal is never under a body mass index of 18.5; milestones go on the way", async () => {
  saveBody(ADULT);
  saveWeighIns({ ...NO_WEIGH_INS, entries: TWELVE_WEEKS });
  await page();
  await fireEvent.press(screen.getByTestId("weight-open-goal"));
  expect(screen.getByText("Lowest goal for your height: 56.7 kg")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId("weight-goal-input"), "55");
  expect(screen.getByTestId("weight-goal-low")).toBeOnTheScreen();
  expect(screen.getByTestId("weight-goal-save")).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("weight-goal-input"), "76");
  await fireEvent.press(screen.getByTestId("weight-goal-save"));
  expect(appWeighIns().goal).toEqual({ kg: 76, fromKg: 79.6 });
  await fireEvent.changeText(screen.getByTestId("weight-milestone-input"), "81");
  expect(screen.getByTestId("weight-milestone-wrong")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId("weight-milestone-input"), "78");
  await fireEvent.press(screen.getByTestId("weight-milestone-save"));
  expect(appWeighIns().milestones).toEqual([78]);
  await fireEvent.press(screen.getByTestId("weight-every-4"));
  expect(appWeighIns().every).toBe(4);
  await fireEvent.press(screen.getByTestId("weight-goal-remove"));
  expect(appWeighIns().goal).toBeNull();
});
