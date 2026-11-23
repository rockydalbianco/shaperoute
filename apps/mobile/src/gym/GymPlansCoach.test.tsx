/**
 * «Coach» in «My plans» (TASK-491 part C, ADR-0399): a row at the top of
 * the list opens the Coach's page, and its «‹» goes back to the list.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";

import { GymPlansSheet } from "./GymPlans";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

jest.mock("./plans", () => ({
  ...jest.requireActual("./plans"),
  useGymPlans: () => ({ owner: 7, plans: [], keep: jest.fn(), drop: jest.fn() }),
}));

jest.mock("../coach/CoachPage", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    CoachPage: ({ onBack }: { onBack: () => void }) => (
      <Pressable onPress={onBack} testID="coach-back">
        <Text>Coach page</Text>
      </Pressable>
    ),
  };
});

test("«Coach» opens its page over the list, and «‹» comes back", async () => {
  await render(<GymPlansSheet visible onClose={() => {}} />);
  expect(screen.getByText("Based on your last 4 weeks")).toBeOnTheScreen();
  expect(screen.queryByText("Coach page")).toBeNull();

  await fireEvent.press(screen.getByTestId("gym-plans-coach"));
  expect(screen.getByText("Coach page")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-plans")).toBeNull();

  await fireEvent.press(screen.getByTestId("coach-back"));
  expect(screen.getByTestId("gym-plans")).toBeOnTheScreen();
  expect(screen.getByTestId("gym-plan-new")).toBeOnTheScreen();
});
