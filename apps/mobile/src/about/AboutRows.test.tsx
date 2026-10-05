import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { useLanguage } from "../i18n/useLanguage";
import { aboutName, AboutRows } from "./AboutRows";

/** The rows under a root that follows the language, as in the app. */
function AsInTheApp({ onOpen }: { onOpen: (id: string) => void }) {
  useLanguage();
  return <AboutRows onOpen={onOpen} />;
}

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("three rows, each a button that opens its own text", async () => {
  const onOpen = jest.fn();
  await render(<AsInTheApp onOpen={onOpen} />);
  expect(screen.getAllByRole("button")).toHaveLength(3);
  await fireEvent.press(screen.getByRole("button", { name: "Help" }));
  await fireEvent.press(screen.getByRole("button", { name: "Terms" }));
  await fireEvent.press(screen.getByRole("button", { name: "Privacy" }));
  expect(onOpen.mock.calls).toEqual([["help"], ["terms"], ["privacy"]]);
});

test("the rows are in the app's language", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<AsInTheApp onOpen={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Aiuto" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Termini" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Privacy" })).toBeOnTheScreen();
});

test("each text has the name of its row", () => {
  expect(aboutName("help")).toBe("Help");
  expect(aboutName("terms")).toBe("Terms");
  expect(aboutName("privacy")).toBe("Privacy");
});
