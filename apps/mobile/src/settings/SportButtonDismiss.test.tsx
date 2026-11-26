/**
 * The sport chosen in the panel is saved when iOS says the panel's Modal is
 * gone (TASK-490 part F): a sheet the new sport opens can then come up. The
 * Modal here only tells the test what it was given for `onDismiss`.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { loadSport, saveSport } from "./sport";
import { SAVE_AFTER_MS, SportButton } from "./SportButton";

// What the Modal was told to call when it has gone: the test says when.
const mockGone: { current: (() => void) | undefined } = { current: undefined };

jest.mock("react-native/Libraries/Modal/Modal", () => ({
  __esModule: true,
  default: ({
    visible,
    onDismiss,
    children,
  }: {
    visible?: boolean;
    onDismiss?: () => void;
    children?: unknown;
  }) => {
    mockGone.current = onDismiss;
    return visible === true ? children : null;
  },
}));
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");
jest.mock("./sport", () => {
  const actual = jest.requireActual<typeof import("./sport")>("./sport");
  return { ...actual, loadSport: jest.fn(), saveSport: jest.fn(actual.saveSport) };
});

beforeEach(() => {
  jest.mocked(loadSport).mockReturnValue("run");
  jest.mocked(saveSport).mockClear();
});

test("iOS saying the panel is gone saves the sport at once, and only once", async () => {
  await render(<SportButton />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Bike" }));
  expect(saveSport).not.toHaveBeenCalled();
  await act(async () => mockGone.current?.());
  expect(saveSport).toHaveBeenCalledWith("bike");
  await act(async () => {
    await new Promise((done) => setTimeout(done, SAVE_AFTER_MS + 50));
  });
  expect(saveSport).toHaveBeenCalledTimes(1);
});

test("closed without a choice, nothing is saved when it is gone", async () => {
  await render(<SportButton />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  await act(async () => mockGone.current?.());
  expect(saveSport).not.toHaveBeenCalled();
});
