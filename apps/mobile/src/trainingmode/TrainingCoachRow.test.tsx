/**
 * The Coach's line on «Today» (TASK-490 part C): what it says for each
 * state of the Coach, and that it opens the Coach's page and comes back.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Tip } from "../coach/rules";
import type { CoachState } from "../coach/useCoach";
import { coachLine, CoachRowView, TrainingCoachRow } from "./TrainingCoachRow";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

let mockState: CoachState = { kind: "signedOut" };
jest.mock("../coach/useCoach", () => ({
  useCoach: () => ({ state: mockState, apply: jest.fn(), putOff: jest.fn() }),
}));

jest.mock("../coach/CoachPage", () => ({
  CoachPage: ({ onBack }: { onBack: () => void }) => {
    const { Pressable, Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return (
      <Pressable onPress={onBack} testID="coach-back">
        <Text>Coach page</Text>
      </Pressable>
    );
  },
}));

const BENCH: Tip = {
  rule: "P1",
  group: 2,
  exercise: "bench_press",
  values: { kg: 62.5, old: 60, min: 8 },
  change: { plan: "p", exercise: "bench_press", deltaKg: 2.5 },
};

const SLOW: Tip = { rule: "C2", group: 3, values: { pct: 55 } };

describe("coachLine", () => {
  test("without an account, no line", () => {
    expect(coachLine({ kind: "signedOut" }, "en")).toBeNull();
  });

  test("the first tip's title when there are tips", () => {
    expect(coachLine({ kind: "ready", tips: [BENCH, SLOW], empty: false }, "en")).toBe(
      "Bench press: 62.5 kg",
    );
  });

  test.each<CoachState>([
    { kind: "loading" },
    { kind: "unreachable" },
    { kind: "ready", tips: [], empty: true },
    { kind: "ready", tips: [], empty: false },
  ])("what the Coach reads otherwise (%o)", (state) => {
    expect(coachLine(state, "en")).toBe("Based on your last 4 weeks");
  });
});

test("the line says «Coach» and what it found, and opens", async () => {
  const onOpen = jest.fn();
  await render(<CoachRowView line="Next run: slow and long" onOpen={onOpen} />);
  const row = screen.getByRole("button", {
    name: "Coach. Next run: slow and long",
  });
  expect(screen.getByText("Coach")).toBeOnTheScreen();
  await fireEvent.press(row);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("without an account, «Today» has no Coach line", async () => {
  mockState = { kind: "signedOut" };
  await render(<TrainingCoachRow />);
  expect(screen.queryByTestId("training-coach")).toBeNull();
});

test("with an account, the line opens the Coach's page and «‹» comes back", async () => {
  mockState = { kind: "ready", tips: [SLOW], empty: false };
  await render(<TrainingCoachRow />);
  expect(screen.getByText("Next run: slow and long")).toBeOnTheScreen();
  expect(screen.queryByText("Coach page")).toBeNull();
  await fireEvent.press(screen.getByTestId("training-coach"));
  expect(screen.getByText("Coach page")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("coach-back"));
  expect(screen.queryByText("Coach page")).toBeNull();
});
