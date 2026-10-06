import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { saveLanguageChoice } from "../i18n/language";
import { OpenSettings } from "./OpenSettings";

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("«Open Settings» opens the app's page of the phone's settings (TASK-259)", async () => {
  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  await render(<OpenSettings />);
  await fireEvent.press(screen.getByRole("button", { name: "Open Settings" }));
  expect(openSettings).toHaveBeenCalledTimes(1);
  openSettings.mockRestore();
});

test("in the app's language", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<OpenSettings />);
  expect(screen.getByText("Apri Impostazioni")).toBeOnTheScreen();
});
