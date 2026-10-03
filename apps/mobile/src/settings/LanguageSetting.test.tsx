import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { t } from "../i18n";
import { loadLanguageChoice, saveLanguageChoice } from "../i18n/language";
import { useLanguage } from "../i18n/useLanguage";
import { LanguageSetting } from "./LanguageSetting";

jest.mock("../i18n/language", () => {
  const actual =
    jest.requireActual<typeof import("../i18n/language")>("../i18n/language");
  return {
    ...actual,
    loadLanguageChoice: jest.fn(() => "phone"),
    saveLanguageChoice: jest.fn(actual.saveLanguageChoice),
  };
});

/** A text elsewhere in the app, under the root that follows the language. */
function Elsewhere() {
  useLanguage();
  return <Text>{t("Log out")}</Text>;
}

afterEach(async () => {
  const { saveLanguageChoice: save } =
    jest.requireActual<typeof import("../i18n/language")>("../i18n/language");
  await act(async () => save("phone"));
  jest.mocked(saveLanguageChoice).mockClear();
  jest.mocked(loadLanguageChoice).mockReturnValue("phone");
});

test("the row says the language the app is in, and opens the choices", async () => {
  await render(<LanguageSetting />);
  const row = screen.getByRole("button", { name: "Language, English" });
  expect(row).toBeCollapsed();
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  await fireEvent.press(row);
  // The phone's language first, then the five, each in its own name.
  expect(
    screen.getAllByRole("radio").map((radio) => radio.props.accessibilityLabel),
  ).toEqual([
    "Phone language, English",
    "English",
    "Deutsch",
    "Italiano",
    "Español",
    "Français",
  ]);
  expect(screen.getByRole("radio", { name: "Phone language, English" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "English" })).not.toBeChecked();
});

test("a language chosen is kept, closes the choices and turns the app to it at once", async () => {
  await render(
    <>
      <Elsewhere />
      <LanguageSetting />
    </>,
  );
  expect(screen.getByText("Log out")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Language, English" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Italiano" }));
  expect(saveLanguageChoice).toHaveBeenCalledWith("it");
  expect(screen.queryAllByRole("radio")).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Lingua, Italiano" })).toBeOnTheScreen();
  expect(screen.getByText("Esci")).toBeOnTheScreen();
  expect(screen.queryByText("Log out")).toBeNull();
});

test("the choice kept on the phone is the one checked at the next opening", async () => {
  jest.mocked(loadLanguageChoice).mockReturnValue("de");
  await render(<LanguageSetting />);
  await fireEvent.press(screen.getByRole("button", { name: "Language, English" }));
  expect(screen.getByRole("radio", { name: "Deutsch" })).toBeChecked();
  expect(
    screen.getByRole("radio", { name: "Phone language, English" }),
  ).not.toBeChecked();
});

test("«Phone language» goes back to following the phone", async () => {
  jest.mocked(loadLanguageChoice).mockReturnValue("fr");
  await render(<LanguageSetting />);
  await fireEvent.press(screen.getByRole("button", { name: "Language, English" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Phone language, English" }));
  expect(saveLanguageChoice).toHaveBeenCalledWith("phone");
});
