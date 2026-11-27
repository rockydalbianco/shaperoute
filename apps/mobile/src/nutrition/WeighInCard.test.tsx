import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { appBody, saveBody } from "../body/bodyProfile";
import {
  appWeighIns,
  forgetWeighIns,
  saveWeighIns,
  NO_WEIGH_INS,
} from "../body/weighIns";
import { saveLanguageChoice } from "../i18n/language";
import { saveUnitsChoice } from "../units/units";
import { WeighInCard } from "./WeighInCard";

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

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    saveUnitsChoice("phone");
    forgetWeighIns();
  });
  disk.files.clear();
});

test("before the first weigh-in the card asks for one, and saving keeps it and the body's weight", async () => {
  saveBody({ sex: "male", weightKg: 82, heightCm: 178, birthYear: 1990 });
  await render(<WeighInCard today={TODAY} />);
  expect(screen.getByRole("header", { name: "Time to weigh in" })).toBeOnTheScreen();
  expect(screen.getByText("Your first weigh-in starts the chart.")).toBeOnTheScreen();
  expect(screen.getByTestId("weigh-in-save")).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("weigh-in-input"), "79,6");
  await fireEvent.press(screen.getByTestId("weigh-in-save"));
  expect(appWeighIns().entries).toEqual([{ day: TODAY, kg: 79.6 }]);
  expect(appBody().weightKg).toBe(79.6);
  expect(
    screen.getByText("Saved. Your weight in Settings is now 79.6 kg."),
  ).toBeOnTheScreen();
  // Without MuW's estimate in use, no «Recalculate».
  expect(screen.queryByTestId("weigh-in-recalculate")).toBeNull();
  await fireEvent.press(screen.getByTestId("weigh-in-done"));
  // Not due again for two weeks.
  expect(screen.queryByTestId("weigh-in-card")).toBeNull();
});

test("the card says when the last weigh-in was, and only shows when it is due", async () => {
  saveWeighIns({ ...NO_WEIGH_INS, entries: [{ day: "2026-11-13", kg: 80.1 }] });
  await render(<WeighInCard today={TODAY} />);
  expect(screen.getByText("Last time: 13 Nov, 80.1 kg")).toBeOnTheScreen();
  await act(async () => {
    saveWeighIns({ ...NO_WEIGH_INS, entries: [{ day: "2026-11-20", kg: 80.1 }] });
  });
  expect(screen.queryByTestId("weigh-in-card")).toBeNull();
});

test("«Not now» hides the card", async () => {
  await render(<WeighInCard today={TODAY} />);
  await fireEvent.press(screen.getByTestId("weigh-in-not-now"));
  expect(screen.queryByTestId("weigh-in-card")).toBeNull();
  expect(appWeighIns().notNow).toBe(TODAY);
});

test("a weight the body does not take says the limits, in pounds with miles", async () => {
  saveUnitsChoice("mi");
  await render(<WeighInCard today={TODAY} />);
  expect(screen.getByText("lb")).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId("weigh-in-input"), "20");
  expect(screen.getByTestId("weigh-in-wrong")).toHaveTextContent(
    "Write a weight between 66.1 lb and 661.4 lb.",
  );
  await fireEvent.changeText(screen.getByTestId("weigh-in-input"), "176");
  await fireEvent.press(screen.getByTestId("weigh-in-save"));
  expect(appWeighIns().entries[0].kg).toBeCloseTo(79.83, 2);
});

test("«Recalculate» is offered when the diary asks for it", async () => {
  const recalculate = jest.fn();
  await render(<WeighInCard today={TODAY} onRecalculate={recalculate} />);
  await fireEvent.changeText(screen.getByTestId("weigh-in-input"), "80");
  await fireEvent.press(screen.getByTestId("weigh-in-save"));
  await fireEvent.press(screen.getByTestId("weigh-in-recalculate"));
  expect(recalculate).toHaveBeenCalledTimes(1);
});

test("in Italian", async () => {
  saveLanguageChoice("it");
  await render(<WeighInCard today={TODAY} />);
  expect(screen.getByRole("header", { name: "È ora di pesarti" })).toBeOnTheScreen();
});
