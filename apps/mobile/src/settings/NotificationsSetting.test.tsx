import session from "@shaperoute/shared-types/fixtures/session.json";
import type { NotificationsRequest, User } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import { saveLanguageChoice } from "../i18n/language";
import { NotificationsSetting } from "./NotificationsSetting";

const off = session.user as User;
const NOTE =
  "MuW does not send notifications yet. Your choice is kept for when it does.";
const NO_ENDPOINT = "Notifications are not available on this API yet.";

type Change = (request: NotificationsRequest) => Promise<string | null>;

/**
 * The switches under an account that keeps what the API kept, as
 * `useAccount` does: `answer` is the API, null for «kept».
 */
function AsInTheApp({ user, change }: { user: User; change: jest.Mock }) {
  const [now, setNow] = useState(user);
  const changeNotifications: Change = async (request) => {
    const failed: string | null = await change(request);
    if (failed === null) {
      const before = now.notifications ?? { email: false, push: false };
      setNow({ ...now, notifications: { ...before, ...request } });
    }
    return failed;
  };
  return <NotificationsSetting user={now} account={{ changeNotifications }} />;
}

async function show(user: User = off, change: jest.Mock = jest.fn(async () => null)) {
  await render(<AsInTheApp user={user} change={change} />);
  return change;
}

function email() {
  return screen.getByRole("switch", { name: "Email notifications" });
}

function push() {
  return screen.getByRole("switch", { name: "Push notifications" });
}

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("two switches, both off, and the note that nothing is sent yet", async () => {
  await show();
  expect(screen.getAllByRole("switch")).toHaveLength(2);
  expect(email()).not.toBeChecked();
  expect(push()).not.toBeChecked();
  expect(screen.getByText(NOTE)).toBeOnTheScreen();
  // Nothing says «Soon» any more, and nothing went wrong.
  expect(screen.queryByText("Soon")).toBeNull();
  expect(screen.queryByText(NO_ENDPOINT)).toBeNull();
});

test("an account from an API without switches shows both off", async () => {
  const { notifications: _notifications, ...before } = off;
  await show(before);
  expect(email()).not.toBeChecked();
  expect(push()).not.toBeChecked();
});

test("the switches show what the account keeps", async () => {
  await show({ ...off, notifications: { email: true, push: false } });
  expect(email()).toBeChecked();
  expect(push()).not.toBeChecked();
});

test("a tap sends only that switch, and it stays where it was put", async () => {
  const change = await show();
  await fireEvent.press(push());
  expect(change).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenLastCalledWith({ push: true });
  expect(push()).toBeChecked();
  expect(email()).not.toBeChecked();
  await fireEvent.press(email());
  expect(change).toHaveBeenLastCalledWith({ email: true });
  expect(email()).toBeChecked();
  // Off again, one at a time.
  await fireEvent.press(push());
  expect(change).toHaveBeenLastCalledWith({ push: false });
  expect(push()).not.toBeChecked();
  expect(email()).toBeChecked();
  expect(change).toHaveBeenCalledTimes(3);
});

test("the switch turns at once, before the API answers", async () => {
  let answer: (problem: string | null) => void = () => {};
  await show(
    off,
    jest.fn(() => new Promise<string | null>((r) => (answer = r))),
  );
  await fireEvent.press(email());
  expect(email()).toBeChecked();
  expect(email()).toBeBusy();
  expect(push()).not.toBeBusy();
  await act(async () => answer(null));
  expect(email()).toBeChecked();
  expect(email()).not.toBeBusy();
});

test("what the API refuses is said, and the switch goes back", async () => {
  let answer: (problem: string | null) => void = () => {};
  await show(
    off,
    jest.fn(() => new Promise<string | null>((r) => (answer = r))),
  );
  await fireEvent.press(push());
  expect(push()).toBeChecked();
  await act(async () => answer(NO_ENDPOINT));
  expect(push()).not.toBeChecked();
  expect(screen.getByText(NO_ENDPOINT)).toBeOnTheScreen();
  // The note stays: it is not the problem.
  expect(screen.getByText(NOTE)).toBeOnTheScreen();
});

test("the next try takes the problem away", async () => {
  const change = jest
    .fn<Promise<string | null>, [NotificationsRequest]>()
    .mockResolvedValueOnce(NO_ENDPOINT)
    .mockResolvedValue(null);
  await show(off, change);
  await fireEvent.press(email());
  expect(screen.getByText(NO_ENDPOINT)).toBeOnTheScreen();
  await fireEvent.press(email());
  expect(screen.queryByText(NO_ENDPOINT)).toBeNull();
  expect(email()).toBeChecked();
});

test("while one answer is on its way, a second tap sends nothing", async () => {
  let answer: (problem: string | null) => void = () => {};
  const change = await show(
    off,
    jest.fn(() => new Promise<string | null>((r) => (answer = r))),
  );
  await fireEvent.press(email());
  await fireEvent.press(email());
  await fireEvent.press(push());
  expect(change).toHaveBeenCalledTimes(1);
  expect(push()).not.toBeChecked();
  await act(async () => answer(null));
  // Free again.
  await fireEvent.press(push());
  expect(change).toHaveBeenCalledTimes(2);
  expect(change).toHaveBeenLastCalledWith({ push: true });
});

test("the rows and the note follow the app's language", async () => {
  await act(async () => saveLanguageChoice("it"));
  await show();
  expect(screen.getByRole("switch", { name: "Notifiche email" })).toBeOnTheScreen();
  expect(screen.getByRole("switch", { name: "Notifiche push" })).toBeOnTheScreen();
  expect(screen.queryByText(NOTE)).toBeNull();
});
