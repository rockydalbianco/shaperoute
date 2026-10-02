import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Account } from "../account/useAccount";
import { SettingsPage } from "./SettingsPage";

const signedIn = session as Session;

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
    clearProblem: jest.fn(),
    sessionEnded: jest.fn(),
    ...over,
  };
  await render(<SettingsPage user={signedIn.user} account={account} />);
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
  for (const name of [
    "Change email",
    "Phone number",
    "Units",
    "Email notifications",
    "Push notifications",
    "Help",
    "Terms",
    "Privacy",
  ]) {
    expect(screen.getByLabelText(`${name}, coming soon`)).toBeOnTheScreen();
  }
  // Eight settings to come, and the sport to come («Sport», TASK-189; the
  // bike is ready since TASK-190).
  expect(screen.getAllByText("Soon")).toHaveLength(9);
  // Only the picture (TASK-178) and the ways out are buttons.
  expect(screen.getAllByRole("button")).toHaveLength(3);
  expect(screen.getByRole("button", { name: "Profile picture" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Log out" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Delete account" })).toBeOnTheScreen();
});

test("«Sport» has «Run» chosen, «Bike» to choose, «Paddle» to come", async () => {
  await show();
  expect(screen.getByText("SPORT")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Run" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Bike" })).not.toBeChecked();
  expect(screen.getByLabelText("Paddle, coming soon")).toBeOnTheScreen();
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
