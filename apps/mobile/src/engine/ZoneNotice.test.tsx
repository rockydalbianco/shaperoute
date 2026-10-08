import { act, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { ZoneNotice } from "./ZoneNotice";

jest.mock("expo-file-system", () => jest.requireActual("./memoryFiles"));

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("while the first maps download, the line says how much", async () => {
  await render(<ZoneNotice bytes={19_400_000} />);
  expect(
    screen.getByText(
      "Downloading the maps of your area (19 MB) so routes work without signal.",
    ),
  ).toBeOnTheScreen();
});

test("no download, no line", async () => {
  await render(<ZoneNotice bytes={null} />);
  expect(screen.toJSON()).toBeNull();
});

test("the line is in the app's language", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<ZoneNotice bytes={10_000_000} />);
  expect(
    screen.getByText(
      "Sto scaricando le mappe della tua zona (10 MB) perché i percorsi funzionino anche senza segnale.",
    ),
  ).toBeOnTheScreen();
});
