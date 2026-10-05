import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import type { Account } from "../account/useAccount";
import { saveLanguageChoice } from "../i18n/language";
import { useLanguage } from "../i18n/useLanguage";
import { SettingsPage } from "./SettingsPage";

const signedIn = session as Session;

/** The page under a root that follows the language, as in the app (TASK-210). */
function AsInTheApp(props: ComponentProps<typeof SettingsPage>) {
  useLanguage();
  return <SettingsPage {...props} />;
}

/** What «Settings» asks «Profile» to open (TASK-184). */
const onAbout = jest.fn();

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
  onAbout.mockClear();
});

async function show(over: Partial<Account> = {}) {
  const account: Account = {
    state: { status: "signedIn", session: signedIn },
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
    ...over,
  };
  await render(<AsInTheApp user={signedIn.user} account={account} onAbout={onAbout} />);
  return account;
}

test("the account, by name and email", async () => {
  await show();
  expect(screen.getByText("ACCOUNT")).toBeOnTheScreen();
  expect(screen.getByText("Runner_42")).toBeOnTheScreen();
  expect(screen.getByText("runner@example.com")).toBeOnTheScreen();
});

test("the settings to come are named, say «Soon» and take no tap", async () => {
  await show();
  for (const name of ["Units", "Email notifications", "Push notifications"]) {
    expect(screen.getByLabelText(`${name}, coming soon`)).toBeOnTheScreen();
  }
  // Three settings to come: the units and the two notifications (TASK-185).
  // Every sport is ready («Sport», TASK-189: the bike since TASK-190,
  // paddling since TASK-191).
  expect(screen.getAllByText("Soon")).toHaveLength(3);
  // The picture (TASK-178), the email and the phone number (TASK-183), the
  // language (TASK-210), the three texts of «ABOUT» (TASK-184) and the ways
  // out are buttons.
  expect(screen.getAllByRole("button")).toHaveLength(9);
  expect(screen.getByRole("button", { name: "Profile picture" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Change email" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Phone number, Add" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Language, English" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Log out" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Delete account" })).toBeOnTheScreen();
});

test("«Help», «Terms» and «Privacy» are rows that open their page (TASK-184)", async () => {
  await show();
  expect(screen.getByText("ABOUT")).toBeOnTheScreen();
  for (const name of ["Help", "Terms", "Privacy"]) {
    expect(screen.queryByLabelText(`${name}, coming soon`)).toBeNull();
  }
  await fireEvent.press(screen.getByRole("button", { name: "Help" }));
  await fireEvent.press(screen.getByRole("button", { name: "Terms" }));
  await fireEvent.press(screen.getByRole("button", { name: "Privacy" }));
  expect(onAbout.mock.calls).toEqual([["help"], ["terms"], ["privacy"]]);
});

test("«Change email» and «Phone number» ask the account (TASK-183)", async () => {
  const account = await show({
    changeEmail: jest.fn(async () => null),
    changePhone: jest.fn(async () => null),
  });
  await fireEvent.press(screen.getByRole("button", { name: "Change email" }));
  await fireEvent.changeText(screen.getByLabelText("new email"), "new@example.com");
  await fireEvent.changeText(screen.getByLabelText("password"), "the password");
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(account.changeEmail).toHaveBeenCalledWith({
    email: "new@example.com",
    password: "the password",
  });
  await fireEvent.press(screen.getByRole("button", { name: "Phone number, Add" }));
  await fireEvent.changeText(screen.getByLabelText("phone number"), "+39 333 123 4567");
  await fireEvent.press(screen.getByRole("button", { name: "Save" }));
  expect(account.changePhone).toHaveBeenCalledWith({ phone: "+393331234567" });
});

test("«Sport» has «Run» chosen, «Bike» and «Paddle» to choose", async () => {
  await show();
  expect(screen.getByText("SPORT")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Run" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Bike" })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: "Paddle" })).not.toBeChecked();
});

test("«Log out» logs out at once", async () => {
  const account = await show();
  await fireEvent.press(screen.getByRole("button", { name: "Log out" }));
  expect(account.signOut).toHaveBeenCalledTimes(1);
});

test("«Delete account» asks first; «Keep my account» goes back", async () => {
  const account = await show();
  await fireEvent.press(screen.getByRole("button", { name: "Delete account" }));
  expect(screen.getByText(/^Delete your account\?/)).toBeOnTheScreen();
  expect(account.deleteAccount).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Keep my account" }));
  expect(screen.queryByText(/^Delete your account\?/)).toBeNull();
  expect(account.clearProblem).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByRole("button", { name: "Delete account" }));
  await fireEvent.press(screen.getByRole("button", { name: "Delete my account" }));
  expect(account.deleteAccount).toHaveBeenCalledTimes(1);
});

test("while deleting, nothing else can be pressed, and a failure is said", async () => {
  await show({ busy: "delete", problem: "The API did not answer." });
  expect(screen.getByRole("button", { name: "Log out" })).toBeDisabled();
  expect(screen.getByText("The API did not answer.")).toBeOnTheScreen();
});

test("«Language» is among the preferences and turns the whole page at once (TASK-210)", async () => {
  await show();
  expect(screen.getByText("PREFERENCES")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Language, English" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Deutsch" }));
  expect(screen.getByText("PRÄFERENZEN")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Sprache, Deutsch" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Abmelden" })).toBeOnTheScreen();
  expect(screen.getByLabelText("Einheiten, bald verfügbar")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Hilfe" })).toBeOnTheScreen();
  expect(screen.queryByText("Log out")).toBeNull();
  // The account's own words are not translated.
  expect(screen.getByText("Runner_42")).toBeOnTheScreen();
});
