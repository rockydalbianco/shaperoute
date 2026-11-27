import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { BodyProfile } from "../body/bodyProfile";
import { useBody } from "../body/useBody";
import { saveLanguageChoice } from "../i18n/language";
import { loadSettings } from "./nutritionStore";
import { NutritionWelcome } from "./NutritionWelcome";
import { forgetNutrition, seeNotice, writePurpose, writeRest } from "./useNutrition";

// The door of «Nutrition» (TASK-489 part J).

// The page stands still, as with «Reduce Motion».
jest.mock("../ui/useReduceMotion", () => ({ useReduceMotion: () => true }));

jest.mock("../body/useBody", () => ({ useBody: jest.fn() }));

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
const body = jest.mocked(useBody);

const NOBODY: BodyProfile = {
  sex: null,
  weightKg: null,
  heightCm: null,
  birthYear: null,
};
/** 90 kg, 1.75 m, 40 years in 2026: a body mass index of 29.4, and
 * 1798.75 kcal a day at rest by Mifflin-St Jeor. */
const MAN: BodyProfile = { sex: "male", weightKg: 90, heightCm: 175, birthYear: 1986 };
/** Monday 23 November 2026, 18:00 on the phone. */
const NOW = new Date(2026, 10, 23, 18, 0);

beforeEach(() => {
  body.mockReturnValue(NOBODY);
});

afterEach(async () => {
  await act(async () => {
    saveLanguageChoice("phone");
    forgetNutrition();
  });
  disk.files.clear();
});

async function show(onDone = jest.fn()) {
  await render(<NutritionWelcome onDone={onDone} now={NOW} />);
  return onDone;
}

/** To the last step: the rules read, the question answered or skipped. */
async function toStart(purpose?: "track" | "lose" | "gain" | "plan") {
  await fireEvent.press(screen.getByTestId("welcome-next"));
  await fireEvent.press(screen.getByTestId("nutrition-understood"));
  if (purpose === undefined) {
    await fireEvent.press(screen.getByTestId("welcome-skip"));
  } else {
    await fireEvent.press(screen.getByTestId(`welcome-why-${purpose}`));
    await fireEvent.press(screen.getByTestId("welcome-why-next"));
  }
}

test("the first step says what it does, with a picture said to be an example", async () => {
  await show();
  expect(screen.getByText("Example")).toBeOnTheScreen();
  for (const line of ["Write your plan", "Log what you eat", "See your balance"]) {
    expect(screen.getByText(line)).toBeOnTheScreen();
  }
  // Nothing is asked and nothing is kept yet.
  expect(loadSettings().noticeSeen).toBe(false);
});

test("the rules come second, and «I understand» is kept at once", async () => {
  await show();
  await fireEvent.press(screen.getByTestId("welcome-next"));
  expect(screen.getByRole("header", { name: "Before you start" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "I understand" }));
  expect(loadSettings().noticeSeen).toBe(true);
  expect(
    screen.getByRole("header", { name: "What brings you here?" }),
  ).toBeOnTheScreen();
});

test("the question can be skipped, and then nothing is kept of it", async () => {
  await show();
  await toStart();
  expect(loadSettings().purpose).toBeNull();
  expect(screen.getByTestId("welcome-start")).toBeOnTheScreen();
});

test("an answer is kept; «Next» waits for one", async () => {
  await show();
  await fireEvent.press(screen.getByTestId("welcome-next"));
  await fireEvent.press(screen.getByTestId("nutrition-understood"));
  expect(screen.getByTestId("welcome-why-next")).toBeDisabled();
  await fireEvent.press(screen.getByRole("radio", { name: "Lose weight" }));
  expect(screen.getByRole("radio", { name: "Lose weight" })).toBeChecked();
  await fireEvent.press(screen.getByTestId("welcome-why-next"));
  expect(loadSettings().purpose).toBe("lose");
});

test("the user's own number comes first, and «Start» keeps it", async () => {
  const onDone = await show();
  await toStart();
  expect(
    screen.getByText("Best: write your own number, or your dietitian's."),
  ).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByTestId("welcome-target"), "1850");
  await fireEvent.press(screen.getByTestId("welcome-start-button"));
  expect(loadSettings().target).toBe(1850);
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("«Start» with nothing written keeps no target", async () => {
  const onDone = await show();
  await toStart();
  await fireEvent.press(screen.getByTestId("welcome-start-button"));
  expect(loadSettings().target).toBeNull();
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("MuW's estimate is closed until asked for", async () => {
  body.mockReturnValue(MAN);
  await show();
  await toStart("track");
  expect(screen.queryByTestId("estimate-number")).toBeNull();
  expect(screen.queryByText(/MuW's estimate:/)).toBeNull();
  expect(
    screen.getByRole("button", { name: "See MuW's estimate (demo)" }),
  ).toBeOnTheScreen();
});

test("a usual day is the rest of the body with nobody signed in", async () => {
  body.mockReturnValue(MAN);
  await show();
  await toStart("track");
  // 1798.75 a day at rest, to the nearest ten.
  expect(screen.getByTestId("welcome-used")).toHaveTextContent(
    "You use about 1800 kcal a day (est.)",
  );
});

test("opened, the estimate says what it is and who it is not for", async () => {
  body.mockReturnValue(MAN);
  await show();
  await toStart("track");
  await fireEvent.press(screen.getByTestId("estimate-open"));
  expect(
    screen.getByRole("header", { name: "MuW's estimate: 1800 kcal a day" }),
  ).toBeOnTheScreen();
  expect(screen.getByText(/MuW is not made by health professionals/)).toBeOnTheScreen();
  expect(screen.getByText(/only a demonstration/)).toBeOnTheScreen();
  expect(screen.getByText(/pregnant or breastfeeding/)).toBeOnTheScreen();
  // Not written unless the user takes it.
  expect(screen.getByTestId("welcome-target")).toHaveDisplayValue("");
  await fireEvent.press(screen.getByRole("button", { name: "Use this number" }));
  expect(screen.getByTestId("welcome-target")).toHaveDisplayValue("1800");
  await fireEvent.press(screen.getByTestId("welcome-start-button"));
  expect(loadSettings().target).toBe(1800);
});

test("«I'll write my own» closes the estimate and writes nothing", async () => {
  body.mockReturnValue(MAN);
  await show();
  await toStart("track");
  await fireEvent.press(screen.getByTestId("estimate-open"));
  await fireEvent.press(screen.getByRole("button", { name: "I'll write my own" }));
  expect(screen.queryByTestId("estimate-number")).toBeNull();
  expect(screen.getByTestId("welcome-target")).toHaveDisplayValue("");
});

test("to lose weight the estimate is 600 less, for who the sources name", async () => {
  body.mockReturnValue(MAN);
  // The user's own number for a day at rest: 2800.
  await act(async () => {
    writeRest(2800);
  });
  await show();
  await toStart("lose");
  await fireEvent.press(screen.getByTestId("estimate-open"));
  expect(
    screen.getByRole("header", { name: "MuW's estimate: 2200 kcal a day" }),
  ).toBeOnTheScreen();
});

test("to lose weight below the sources' numbers MuW proposes nothing", async () => {
  body.mockReturnValue(MAN);
  await show();
  // 1800 − 600 is under 1,900: no number.
  await toStart("lose");
  await fireEvent.press(screen.getByTestId("estimate-open"));
  expect(screen.getByTestId("estimate-none")).toHaveTextContent(
    "From your data MuW suggests no number for this. Talk to your doctor or a dietitian.",
  );
  expect(screen.queryByText(/kcal a day$/)).toBeNull();
});

test("to gain weight MuW proposes nothing", async () => {
  body.mockReturnValue(MAN);
  await show();
  await toStart("gain");
  await fireEvent.press(screen.getByTestId("estimate-open"));
  expect(screen.getByTestId("estimate-none")).toHaveTextContent(/suggests no number/);
});

test("under 18 MuW proposes no number, whatever the purpose", async () => {
  body.mockReturnValue({ ...MAN, birthYear: 2010 });
  await show();
  await toStart("track");
  await fireEvent.press(screen.getByTestId("estimate-open"));
  expect(screen.getByTestId("estimate-none")).toHaveTextContent(
    "MuW suggests no calorie number to people under 18.",
  );
});

test("without the body data MuW says what it needs, and proposes nothing", async () => {
  await show();
  await toStart("track");
  await fireEvent.press(screen.getByTestId("estimate-open"));
  expect(screen.getByTestId("estimate-none")).toHaveTextContent(
    /MuW needs your weight, height, year of birth and sex/,
  );
});

test("beside a dietitian's plan there is no estimate to open", async () => {
  body.mockReturnValue(MAN);
  await show();
  await toStart("plan");
  expect(screen.queryByTestId("estimate-open")).toBeNull();
  expect(screen.getByTestId("welcome-target")).toBeOnTheScreen();
});

test("a second look goes past the rules, with the answer of before", async () => {
  await act(async () => {
    seeNotice();
    writePurpose("gain");
  });
  await show();
  await fireEvent.press(screen.getByTestId("welcome-next"));
  expect(screen.queryByTestId("nutrition-notice")).toBeNull();
  expect(screen.getByRole("radio", { name: "Gain weight" })).toBeChecked();
});

test("in Italian the door is in Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  await show();
  expect(screen.getByText("Scrivi il tuo piano")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Avanti" }));
  await fireEvent.press(screen.getByRole("button", { name: "Ho capito" }));
  expect(screen.getByRole("header", { name: "Perché sei qui?" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Salta" }));
  expect(screen.getByRole("button", { name: "Inizia" })).toBeOnTheScreen();
});
