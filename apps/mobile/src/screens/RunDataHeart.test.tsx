import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { setRunPage } from "../navigation/runPage";
import { emptyTrack } from "../navigation/trackRecorder";
import { clearRun } from "../navigation/trackStore";
import { RunCard } from "./RunDashboard";

/**
 * The heart rate on «Data» too (TASK-424 part C1, the user's choice of
 * 2026-11-08): «Data» has every number of the run, «Map» keeps its three
 * and the heart line under them.
 */

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => []),
}));
jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(() => Promise.resolve(0.6)),
  setBrightnessAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
// The watch, as the 1.1 has it: a heart rate measured.
let mockHeart: number | null = 142;
jest.mock("../watch/useWatch", () => ({
  useWatch: () => mockHeart,
}));

beforeEach(() => {
  clearRun();
  setRunPage("map");
});

test("Data shows the watch's heart rate among its numbers", async () => {
  mockHeart = 142;
  await render(<RunCard track={emptyTrack()} live onStop={() => {}} />);
  await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
  const numbers = within(screen.getByTestId("data-page")).getByTestId("data-numbers");
  expect(within(numbers).getByTestId("watch-heart")).toHaveTextContent(/♥ 142 bpm/);
});

test("without a watch Data has no heart line", async () => {
  mockHeart = null;
  await render(<RunCard track={emptyTrack()} live onStop={() => {}} />);
  await fireEvent.press(screen.getByRole("tab", { name: "Data" }));
  const page = screen.getByTestId("data-page");
  expect(within(page).queryByTestId("watch-heart")).toBeNull();
});
