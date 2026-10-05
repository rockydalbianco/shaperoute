import { act, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { AboutPage } from "./AboutPage";
import { EN } from "./content/en";
import { IT } from "./content/it";

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("«Help» shows its name and every section under its heading", async () => {
  await render(<AboutPage id="help" />);
  const headers = screen.getAllByRole("header").map((header) => header.props.children);
  expect(headers).toEqual([
    "How Sgrava works",
    ...EN.help.sections.map((section) => section.heading),
  ]);
  expect(screen.getByText(/^Sgrava draws real routes/)).toBeOnTheScreen();
  // A list of points: each on its own line, the dot not read.
  expect(screen.getByText(/^Tap «Draw route»/)).toBeOnTheScreen();
});

test("«Help» is not a draft: no notice, no day", async () => {
  await render(<AboutPage id="help" />);
  expect(screen.queryByText("Draft — not final yet.")).toBeNull();
  expect(screen.queryByText(/^Last updated/)).toBeNull();
});

test.each(["terms", "privacy"] as const)(
  "«%s» says it is a draft before anything else, with its day",
  async (id) => {
    await render(<AboutPage id={id} />);
    expect(screen.getByText("Draft — not final yet.")).toBeOnTheScreen();
    expect(screen.getByText("Last updated: 5 October 2026")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: EN[id].title })).toBeOnTheScreen();
    // What the user still has to fill stands out, as it is written.
    expect(screen.getAllByText("[name]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("[contact email]").length).toBeGreaterThan(0);
  },
);

test("with the app in Italian the text and the notice are in Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  await render(<AboutPage id="privacy" />);
  expect(
    screen.getByRole("header", { name: "Informativa sulla privacy" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: IT.privacy.sections[0].heading }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Bozza — non ancora definitiva.")).toBeOnTheScreen();
  expect(screen.getByText("Ultimo aggiornamento: 5 ottobre 2026")).toBeOnTheScreen();
  expect(screen.queryByText("Privacy policy")).toBeNull();
});

test("with the app in German the text is in English, the notice in German", async () => {
  await act(async () => saveLanguageChoice("de"));
  await render(<AboutPage id="terms" />);
  const title = screen.getByRole("header", { name: "Terms of use" });
  expect(title).toBeOnTheScreen();
  // VoiceOver is told the text is English, not German.
  expect(title.props.accessibilityLanguage).toBe("en-US");
  expect(screen.getByText("Entwurf – noch nicht endgültig.")).toBeOnTheScreen();
  expect(screen.getByText("Zuletzt aktualisiert: 5 October 2026")).toBeOnTheScreen();
});

test("the page turns with the language while it is open", async () => {
  await render(<AboutPage id="help" />);
  expect(screen.getByRole("header", { name: "How Sgrava works" })).toBeOnTheScreen();
  await act(async () => saveLanguageChoice("it"));
  expect(
    screen.getByRole("header", { name: "Come funziona Sgrava" }),
  ).toBeOnTheScreen();
});
