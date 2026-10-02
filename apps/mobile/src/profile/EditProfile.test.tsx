import session from "@shaperoute/shared-types/fixtures/session.json";
import type { User } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { EditProfile } from "./EditProfile";

const user: User = { ...(session.user as User), bio: "Hearts." };

async function show(
  editProfile: jest.Mock = jest.fn(async () => null),
  shown: User = user,
) {
  const onDone = jest.fn();
  await render(<EditProfile user={shown} account={{ editProfile }} onDone={onDone} />);
  return { editProfile, onDone };
}

async function type(field: "username" | "bio", text: string) {
  await fireEvent.changeText(screen.getByLabelText(field), text);
}

async function save() {
  await fireEvent.press(screen.getByRole("button", { name: /^Sav/ }));
}

test("the fields start from the account as it is", async () => {
  await show();
  expect(screen.getByLabelText("username")).toHaveDisplayValue("Runner_42");
  expect(screen.getByLabelText("bio")).toHaveDisplayValue("Hearts.");
  expect(screen.getByText("7/160")).toBeOnTheScreen();
});

test("an account from an API without bios starts with an empty one", async () => {
  const { bio: _bio, ...before } = user;
  await show(undefined, before);
  expect(screen.getByLabelText("bio")).toHaveDisplayValue("");
  expect(screen.getByText("0/160")).toBeOnTheScreen();
});

test("saving sends only what changed, then goes back", async () => {
  const { editProfile, onDone } = await show();
  await type("bio", "Hearts on Sundays.\nTrento.");
  await save();
  expect(editProfile).toHaveBeenCalledWith({ bio: "Hearts on Sundays.\nTrento." });
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("nothing changed: back without asking", async () => {
  const { editProfile, onDone } = await show();
  await type("username", " Runner_42 ");
  await save();
  expect(editProfile).not.toHaveBeenCalled();
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("a username out of the rule is said, and nothing is sent", async () => {
  const { editProfile, onDone } = await show();
  await type("username", "a b");
  await save();
  expect(
    screen.getByText("A username is 3 to 20 letters, digits, _ or . (no spaces)."),
  ).toBeOnTheScreen();
  expect(editProfile).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
});

test("a bio too long turns its count red and is not sent", async () => {
  const { editProfile } = await show();
  await type("bio", "a".repeat(161));
  expect(screen.getByText("161/160")).toBeOnTheScreen();
  await save();
  expect(screen.getByText("A bio is at most 160 characters.")).toBeOnTheScreen();
  expect(editProfile).not.toHaveBeenCalled();
});

test("what the API refuses is said under «Save», and the fields keep what was written", async () => {
  const editProfile = jest.fn(async () => "This username is taken. Try another one.");
  const { onDone } = await show(editProfile);
  await type("username", "other_runner");
  await save();
  expect(
    screen.getByText("This username is taken. Try another one."),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("username")).toHaveDisplayValue("other_runner");
  expect(onDone).not.toHaveBeenCalled();
  // A new try starts without the old problem.
  editProfile.mockResolvedValueOnce(null as never);
  await type("username", "Ada_runs");
  await save();
  expect(screen.queryByText(/is taken/)).toBeNull();
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("while saving, «Save» waits and a second tap sends nothing", async () => {
  let answer: (problem: string | null) => void = () => {};
  const editProfile = jest.fn(
    () =>
      new Promise<string | null>((resolve) => {
        answer = resolve;
      }),
  );
  const { onDone } = await show(editProfile);
  await type("bio", "Stars.");
  await save();
  const button = screen.getByRole("button", { name: "Saving…" });
  expect(button).toBeDisabled();
  await save();
  expect(editProfile).toHaveBeenCalledTimes(1);
  await act(async () => answer(null));
  expect(onDone).toHaveBeenCalledTimes(1);
});
