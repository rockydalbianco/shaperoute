import { fireEvent, render, screen } from "@testing-library/react-native";
import { TargetSheet } from "./TargetSheet";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// MuW's estimate is tried in EstimateBox.test.tsx: here it is a button that
// gives 1800, as «Use this number» does.
jest.mock("./EstimateBox", () => {
  const { Pressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    EstimateBox: ({ onUse }: { onUse: (kcal: number) => void }) => (
      <Pressable onPress={() => onUse(1800)} testID="estimate-use">
        <Text>Use this number</Text>
      </Pressable>
    ),
  };
});
jest.mock("./useUsualUse", () => ({ useUsualUse: () => null }));

async function show(target: number | null = null) {
  const onTarget = jest.fn();
  await render(
    <TargetSheet visible target={target} onTarget={onTarget} onClose={() => {}} />,
  );
  return onTarget;
}

test("the estimate saved untouched is said to be the estimate", async () => {
  const onTarget = await show();
  await fireEvent.press(screen.getByTestId("estimate-use"));
  expect(screen.getByTestId("target-input")).toHaveDisplayValue("1800");
  await fireEvent.press(screen.getByTestId("target-save"));
  expect(onTarget).toHaveBeenCalledWith(1800, true);
});

test("the estimate changed by hand, or a number written, is the user's", async () => {
  const onTarget = await show();
  await fireEvent.press(screen.getByTestId("estimate-use"));
  await fireEvent.changeText(screen.getByTestId("target-input"), "1750");
  await fireEvent.press(screen.getByTestId("target-save"));
  expect(onTarget).toHaveBeenLastCalledWith(1750, false);
});

test("a target taken away is no estimate", async () => {
  const onTarget = await show(1900);
  await fireEvent.press(screen.getByTestId("target-remove"));
  expect(onTarget).toHaveBeenCalledWith(null, false);
});
