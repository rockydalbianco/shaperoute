import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import type { Account } from "../account/useAccount";
import { saveLanguageChoice } from "../i18n/language";
import { useLanguage } from "../i18n/useLanguage";
import { type ProfilePage, ProfileScreen } from "../screens/ProfileScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const signedIn = session as Session;

function account(state: Account["state"]): Account {
  return {
    state,
    busy: null,
    problem: null,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
    editProfile: jest.fn(),
    changeEmail: jest.fn(),
    changePhone: jest.fn(),
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
  };
}

const pages: ProfilePage[] = [];
const onBack = jest.fn();

/** «Profile» as the layer keeps it: the page it is asked for is the page. */
function Profile({ of, first }: { of: Account; first: ProfilePage }) {
  useLanguage();
  const [page, setPage] = useState<ProfilePage>(first);
  return (
    <ProfileScreen
      account={of}
      page={page}
      onPage={(next) => {
        pages.push(next);
        setPage(next);
      }}
      hint={null}
      onBack={onBack}
    />
  );
}

async function showSettings() {
  await render(
    <Profile
      of={account({ status: "signedIn", session: signedIn })}
      first="settings"
    />,
  );
}

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
  pages.length = 0;
  onBack.mockClear();
});

test.each([
  ["Help", "help", "How Sgrava works"],
  ["Terms", "terms", "Terms of use"],
  ["Privacy", "privacy", "Privacy policy"],
] as const)("«%s» in «Settings» opens its page", async (row, page, title) => {
  await showSettings();
  expect(screen.getByRole("header", { name: "Settings" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: row }));
  expect(pages).toEqual([page]);
  // The row's name over the page, then the text's own.
  expect(screen.getByRole("header", { name: row })).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
  // «Settings» is under it: not seen, not read, not pressed.
  expect(screen.queryByText("ACCOUNT")).toBeNull();
  expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
  expect(screen.getAllByRole("button")).toHaveLength(1);
});

test("only the two legal texts say they are drafts", async () => {
  await showSettings();
  await fireEvent.press(screen.getByRole("button", { name: "Help" }));
  expect(screen.queryByText("Draft — not final yet.")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  await fireEvent.press(screen.getByRole("button", { name: "Privacy" }));
  expect(screen.getByText("Draft — not final yet.")).toBeOnTheScreen();
});

test("«←» on a text goes back to «Settings», as it was left", async () => {
  await showSettings();
  // A row left open in «Settings» is still open at the way back.
  await fireEvent.press(screen.getByRole("button", { name: "Language, English" }));
  expect(screen.getByRole("radio", { name: "Deutsch" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Terms" }));
  expect(screen.queryByRole("radio", { name: "Deutsch" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(pages).toEqual(["terms", "settings"]);
  expect(onBack).not.toHaveBeenCalled();
  expect(screen.getByRole("header", { name: "Settings" })).toBeOnTheScreen();
  expect(screen.queryByRole("header", { name: "Terms of use" })).toBeNull();
  expect(screen.getByRole("radio", { name: "Deutsch" })).toBeOnTheScreen();
  // And «←» there goes on to «Profile», as before.
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(pages).toEqual(["terms", "settings", "account"]);
});

test("in Italian the row, the title and the text are in Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  await showSettings();
  await fireEvent.press(screen.getByRole("button", { name: "Aiuto" }));
  expect(screen.getByRole("header", { name: "Aiuto" })).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Come funziona Sgrava" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Indietro" })).toBeOnTheScreen();
});

test("out of the account on a text, who comes back in finds «Profile»", async () => {
  await render(
    <Profile of={account({ status: "signedOut", notice: "ended" })} first="privacy" />,
  );
  expect(pages).toEqual(["account"]);
  expect(screen.queryByRole("header", { name: "Privacy policy" })).toBeNull();
});
