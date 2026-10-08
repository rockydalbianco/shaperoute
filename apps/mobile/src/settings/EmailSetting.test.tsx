import session from "@shaperoute/shared-types/fixtures/session.json";
import type { User } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { EmailSetting } from "./EmailSetting";

const user = session.user as User;

async function show(changeEmail: jest.Mock = jest.fn(async () => null)) {
  await render(<EmailSetting user={user} account={{ changeEmail }} />);
  return changeEmail;
}

async function open() {
  await fireEvent.press(screen.getByRole("button", { name: "Change email" }));
}

async function write(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText("new email"), email);
  await fireEvent.changeText(screen.getByLabelText("password"), password);
}

async function save() {
  await fireEvent.press(screen.getByRole("button", { name: /^Sav/ }));
}

test("the row is closed until tapped, then asks the new email and the password", async () => {
  await show();
  expect(screen.queryByLabelText("new email")).toBeNull();
  await open();
  expect(screen.getByLabelText("new email")).toHaveDisplayValue("");
  expect(screen.getByLabelText("password")).toHaveProp("secureTextEntry", true);
  expect(screen.getByRole("button", { name: "Change email" })).toBeExpanded();
});

test("saving sends the new email with the password, then closes", async () => {
  const changeEmail = await show();
  await open();
  await write(" new@example.com ", "correct horse battery");
  await save();
  expect(changeEmail).toHaveBeenCalledWith({
    email: "new@example.com",
    password: "correct horse battery",
  });
  expect(screen.queryByLabelText("new email")).toBeNull();
  // Opened again, nothing of before is left in it: not the password.
  await open();
  expect(screen.getByLabelText("new email")).toHaveDisplayValue("");
  expect(screen.getByLabelText("password")).toHaveDisplayValue("");
});

test("a mistake is said before anything is sent", async () => {
  const changeEmail = await show();
  await open();
  await write("not an email", "correct horse battery");
  await save();
  expect(
    screen.getByText("Enter an email address, like name@example.com."),
  ).toBeOnTheScreen();
  await write("runner@example.com", "correct horse battery");
  await save();
  expect(
    screen.getByText("This is already the email of your account."),
  ).toBeOnTheScreen();
  await write("new@example.com", "");
  await save();
  expect(screen.getByText("Enter your password.")).toBeOnTheScreen();
  expect(changeEmail).not.toHaveBeenCalled();
});

test("what the API refuses is said, and the fields keep what was written", async () => {
  await show(jest.fn(async () => "Wrong password."));
  await open();
  await write("new@example.com", "not the password");
  await save();
  expect(screen.getByText("Wrong password.")).toBeOnTheScreen();
  expect(screen.getByLabelText("new email")).toHaveDisplayValue("new@example.com");
  expect(screen.getByLabelText("password")).toHaveDisplayValue("not the password");
});

test("while saving, a second tap sends nothing more", async () => {
  let answer: (problem: string | null) => void = () => {};
  const changeEmail = await show(
    jest.fn(() => new Promise<string | null>((resolve) => (answer = resolve))),
  );
  await open();
  await write("new@example.com", "correct horse battery");
  await save();
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await save();
  expect(changeEmail).toHaveBeenCalledTimes(1);
  await act(async () => answer(null));
  expect(screen.queryByLabelText("new email")).toBeNull();
});

test("closing the row forgets what was written", async () => {
  await show();
  await open();
  await write("new@example.com", "correct horse battery");
  await open();
  expect(screen.queryByLabelText("new email")).toBeNull();
  await open();
  expect(screen.getByLabelText("password")).toHaveDisplayValue("");
});
