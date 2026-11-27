import { fireEvent, render, screen } from "@testing-library/react-native";

import { TakeoffsButton } from "./TakeoffsButton";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
  getLastKnownPositionAsync: jest.fn(async () => null),
}));
jest.mock("react-native-webview");

test("off, nothing shows", async () => {
  await render(<TakeoffsButton on={false} />);
  expect(screen.queryByTestId("takeoffs-button")).toBeNull();
});

test("on, «Takeoffs» opens the map", async () => {
  await render(<TakeoffsButton on />);
  expect(screen.queryByTestId("takeoffs-map")).toBeNull();
  await fireEvent.press(screen.getByTestId("takeoffs-button"));
  expect(screen.getByTestId("takeoffs-map")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("takeoffs-close"));
  expect(screen.queryByTestId("takeoffs-map")).toBeNull();
});
