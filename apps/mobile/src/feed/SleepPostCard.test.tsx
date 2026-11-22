import noStages from "@shaperoute/shared-types/fixtures/sleep-summary-no-stages.json";
import summary from "@shaperoute/shared-types/fixtures/sleep-summary.json";
import { render, screen } from "@testing-library/react-native";

import { sleepPostsOn } from "../health/sleepModules";
import { SleepPostCard } from "./SleepPostCard";

// The post of a night in the Feed (TASK-467 part E). Behind `sleepPostsOn`,
// off in every build until part C: turned on here to test what it hides.

jest.mock("../health/sleepModules", () => ({
  ...jest.requireActual("../health/sleepModules"),
  sleepPostsOn: jest.fn(() => true),
}));

const on = jest.mocked(sleepPostsOn);
const NOTE =
  "Worked out by MuW from Apple Health data. It can differ from the score in the Health app.";

beforeEach(() => {
  on.mockReturnValue(true);
});

test("the Feed says the night: MuW's score, its word, the hours and the stages", async () => {
  await render(<SleepPostCard sleep={summary} />);
  expect(screen.getByLabelText("Sleep score, 82 · Very good, 7 h 32 min")).toBeTruthy();
  expect(screen.getByText("82 · Very good")).toBeTruthy();
  expect(screen.getByText("7 h 32 min")).toBeTruthy();
  for (const stage of [
    "Awake: 18 min",
    "REM: 1 h 36 min",
    "Light: 4 h 28 min",
    "Deep: 1 h 12 min",
  ]) {
    expect(screen.getByLabelText(stage)).toBeTruthy();
  }
  // In a list no line of whose score it is, and never called Apple's.
  expect(screen.queryByText(NOTE)).toBeNull();
  expect(screen.queryByText(/Apple/)).toBeNull();
  // The night is a day: no hour, and the day itself is the post's.
  expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
  expect(screen.queryByText(/2026-09-21/)).toBeNull();
});

test("the page of the post also says whose score it is", async () => {
  await render(<SleepPostCard sleep={summary} detail />);
  expect(screen.getByText(NOTE)).toBeTruthy();
});

test("a night no watch told the stages of has none", async () => {
  await render(<SleepPostCard sleep={noStages} />);
  expect(screen.getByText("64 · Good")).toBeTruthy();
  expect(screen.getByText("6 h 35 min")).toBeTruthy();
  expect(screen.queryByText("Deep")).toBeNull();
});

test("an API that says an untold `stages` with a null is the same", async () => {
  await render(<SleepPostCard sleep={{ ...noStages, stages: null }} />);
  expect(screen.getByText("64 · Good")).toBeTruthy();
});

test.each([null, undefined, {}, { ...summary, score: 140 }, "82"])(
  "what is not a night shows nothing: %j",
  async (sleep) => {
    await render(<SleepPostCard sleep={sleep} />);
    expect(screen.toJSON()).toBeNull();
  },
);

test("while the sleep is off nothing shows", async () => {
  on.mockReturnValue(false);
  await render(<SleepPostCard sleep={summary} detail />);
  expect(screen.toJSON()).toBeNull();
});
