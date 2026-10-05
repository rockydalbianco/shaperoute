import session from "@shaperoute/shared-types/fixtures/session.json";
import type { User } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { PhoneSetting } from "./PhoneSetting";

const PHONE = "+393331234567";
const without = session.user as User;
const withNumber: User = { ...without, phone: PHONE };
const NOTE =
  "Only you see your number. Friends who already have it will be able to find you on Sgrava.";

async function show(
  user: User = without,
  changePhone: jest.Mock = jest.fn(async () => null),
) {
  await render(<PhoneSetting user={user} account={{ changePhone }} />);
  return changePhone;
}

async function open(value: string) {
  await fireEvent.press(screen.getByRole("button", { name: `Phone number, ${value}` }));
}

async function write(phone: string) {
  await fireEvent.changeText(screen.getByLabelText("phone number"), phone);
}

async function save() {
  await fireEvent.press(screen.getByRole("button", { name: /^Sav/ }));
}

test("without a number the row says «Add», and opens saying what it is for", async () => {
  await show();
  expect(screen.getByText("Add")).toBeOnTheScreen();
  expect(screen.queryByLabelText("phone number")).toBeNull();
  await open("Add");
  expect(screen.getByLabelText("phone number")).toHaveDisplayValue("");
  expect(screen.getByText(NOTE)).toBeOnTheScreen();
  // Nothing to remove yet.
  expect(screen.queryByRole("button", { name: "Remove number" })).toBeNull();
});

test("an account from an API without numbers shows as one without", async () => {
  const { phone: _phone, ...before } = withNumber;
  await show(before);
  expect(screen.getByRole("button", { name: "Phone number, Add" })).toBeOnTheScreen();
});

test("a number is sent as the API keeps it, then the row closes", async () => {
  const changePhone = await show();
  await open("Add");
  await write("0039 333 123-4567");
  await save();
  expect(changePhone).toHaveBeenCalledWith({ phone: PHONE });
  expect(screen.queryByLabelText("phone number")).toBeNull();
});

test("with a number the row shows it, and the form starts from it", async () => {
  await show(withNumber);
  expect(screen.getByText(PHONE)).toBeOnTheScreen();
  await open(PHONE);
  expect(screen.getByLabelText("phone number")).toHaveDisplayValue(PHONE);
  expect(screen.getByRole("button", { name: "Remove number" })).toBeOnTheScreen();
});

test("the same number again asks nothing", async () => {
  const changePhone = await show(withNumber);
  await open(PHONE);
  await write("+39 333 123 4567");
  await save();
  expect(changePhone).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("phone number")).toBeNull();
});

test("«Remove number» takes it away, and so does saving an empty field", async () => {
  const changePhone = await show(withNumber);
  await open(PHONE);
  await fireEvent.press(screen.getByRole("button", { name: "Remove number" }));
  expect(changePhone).toHaveBeenLastCalledWith({ phone: null });
  await open(PHONE);
  await write("");
  await save();
  expect(changePhone).toHaveBeenCalledTimes(2);
  expect(changePhone).toHaveBeenLastCalledWith({ phone: null });
});

test("a number without its country code is said, and nothing is sent", async () => {
  const changePhone = await show();
  await open("Add");
  await write("333 123 4567");
  await save();
  expect(
    screen.getByText("Write the number with its country code, like +39 333 123 4567."),
  ).toBeOnTheScreen();
  expect(changePhone).not.toHaveBeenCalled();
  expect(screen.getByLabelText("phone number")).toHaveDisplayValue("333 123 4567");
});

test("what the API refuses is said, and the form stays open", async () => {
  await show(
    without,
    jest.fn(async () => "The phone number is not available on this API yet."),
  );
  await open("Add");
  await write(PHONE);
  await save();
  expect(
    screen.getByText("The phone number is not available on this API yet."),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("phone number")).toHaveDisplayValue(PHONE);
});

test("while saving, a second tap sends nothing more", async () => {
  let answer: (problem: string | null) => void = () => {};
  const changePhone = await show(
    without,
    jest.fn(() => new Promise<string | null>((resolve) => (answer = resolve))),
  );
  await open("Add");
  await write(PHONE);
  await save();
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await save();
  expect(changePhone).toHaveBeenCalledTimes(1);
  await act(async () => answer(null));
  expect(screen.queryByLabelText("phone number")).toBeNull();
});
