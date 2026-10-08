import { fireEvent, render, screen } from "@testing-library/react-native";
import { reloadAsync } from "expo-updates";
import { StyleSheet } from "react-native";

import { saveToneChoice } from "../theme/tone";
import { color, paletteOf, routeCasingOf } from "../theme/tokens";
import { ToneSetting } from "./ToneSetting";

jest.mock("expo-updates", () => ({ reloadAsync: jest.fn(() => Promise.resolve()) }));

jest.mock("../theme/tone", () => {
  const actual = jest.requireActual<typeof import("../theme/tone")>("../theme/tone");
  return { ...actual, saveToneChoice: jest.fn(() => true) };
});

afterEach(() => {
  jest.mocked(saveToneChoice).mockReset().mockReturnValue(true);
  jest.mocked(reloadAsync).mockReset().mockResolvedValue(undefined);
});

function previewBackground(): unknown {
  return StyleSheet.flatten(screen.getByTestId("tone-preview").props.style)
    .backgroundColor;
}

async function openTone() {
  await render(<ToneSetting />);
  await fireEvent.press(screen.getByRole("button", { name: "Tone, Dark" }));
}

test("the row says the tone the app is in, and opens the choices", async () => {
  await render(<ToneSetting />);
  const row = screen.getByRole("button", { name: "Tone, Dark" });
  expect(row).toBeCollapsed();
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  await fireEvent.press(row);
  expect(row).toBeExpanded();
  expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Light" })).not.toBeChecked();
  // Five brightness steps, the darkest chosen: the app as it always was.
  expect(
    screen
      .getAllByRole("radio")
      .filter((radio) => radio.props.accessibilityLabel.startsWith("Brightness")),
  ).toHaveLength(5);
  expect(screen.getByRole("radio", { name: "Brightness 1 of 5" })).toBeChecked();
  expect(screen.getByText("Darker")).toBeOnTheScreen();
  expect(screen.getByText("Brighter")).toBeOnTheScreen();
  // Nothing changed yet: nothing to apply.
  expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  expect(previewBackground()).toBe(color.background);
});

test("the preview shows the tone and the step tried, the app stays as it is", async () => {
  await openTone();
  await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
  expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
  // Light starts at its brightest, white.
  expect(screen.getByRole("radio", { name: "Brightness 5 of 5" })).toBeChecked();
  expect(previewBackground()).toBe("#FFFFFF");
  await fireEvent.press(screen.getByRole("radio", { name: "Brightness 2 of 5" }));
  expect(previewBackground()).toBe(
    paletteOf({ tone: "light", dark: 0, light: 1 }).background,
  );
  // Back to dark finds dark's own step, the darkest.
  await fireEvent.press(screen.getByRole("radio", { name: "Dark" }));
  expect(screen.getByRole("radio", { name: "Brightness 1 of 5" })).toBeChecked();
  expect(previewBackground()).toBe(color.background);
  expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  expect(saveToneChoice).not.toHaveBeenCalled();
  // The row still says the tone applied.
  expect(screen.getByRole("button", { name: "Tone, Dark" })).toBeOnTheScreen();
});

test("on the light tone the preview's route has its dark edge", async () => {
  await openTone();
  const route = () =>
    screen
      .getAllByTestId("tone-preview-route")
      .map((piece) => StyleSheet.flatten(piece.props.style));
  expect(route()).toHaveLength(2);
  for (const piece of route()) {
    expect(piece.backgroundColor).toBe(color.accent);
    expect(piece.borderColor).toBeUndefined();
  }
  await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
  for (const piece of route()) {
    expect(piece.backgroundColor).toBe(color.accent);
    expect(piece.borderColor).toBe(routeCasingOf("light")?.color);
  }
});

test("«Apply» keeps the choice and opens the app again", async () => {
  await openTone();
  await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Brightness 4 of 5" }));
  expect(screen.getByText("MuW opens again in the new tone.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Apply" }));
  expect(saveToneChoice).toHaveBeenCalledWith({ tone: "light", dark: 0, light: 3 });
  expect(reloadAsync).toHaveBeenCalledTimes(1);
});

test("a step of the dark tone is applied too", async () => {
  await openTone();
  await fireEvent.press(screen.getByRole("radio", { name: "Brightness 3 of 5" }));
  await fireEvent.press(screen.getByRole("button", { name: "Apply" }));
  expect(saveToneChoice).toHaveBeenCalledWith({ tone: "dark", dark: 2, light: 4 });
});

test("closed without «Apply», the tone tried is forgotten", async () => {
  await openTone();
  await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
  const row = screen.getByRole("button", { name: "Tone, Dark" });
  await fireEvent.press(row);
  await fireEvent.press(row);
  expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
  expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  expect(saveToneChoice).not.toHaveBeenCalled();
});

test("a phone that does not keep the choice says so, and the app stays open", async () => {
  jest.mocked(saveToneChoice).mockReturnValue(false);
  await openTone();
  await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
  await fireEvent.press(screen.getByRole("button", { name: "Apply" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "The phone did not keep the tone. Try again.",
  );
  expect(reloadAsync).not.toHaveBeenCalled();
});

test("an app that cannot open again asks to be closed and opened", async () => {
  jest.mocked(reloadAsync).mockRejectedValue(new Error("not supported"));
  await openTone();
  await fireEvent.press(screen.getByRole("radio", { name: "Light" }));
  await fireEvent.press(screen.getByRole("button", { name: "Apply" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Close MuW and open it again to see the new tone.",
  );
});
