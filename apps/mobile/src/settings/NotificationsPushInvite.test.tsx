import session from "@shaperoute/shared-types/fixtures/session.json";
import type { NotificationsRequest, User } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import { saveLanguageChoice } from "../i18n/language";
import { NotificationsSetting } from "./NotificationsSetting";

// «Push notifications» was off and nothing asked to turn it on (TASK-508):
// while it is off a line under the switches says so, and a tap on it does
// what the switch does. The text is the user's choice of 2026-11-24.

jest.mock("expo-notifications");

type Phone = typeof import("../../__mocks__/expo-notifications");
const phone = jest.requireMock<Phone>("expo-notifications");

const off = session.user as User;
const INVITE = "Push notifications are off. Tap to turn them on.";
const REFUSED =
  "Notifications are off for MuW on this phone. Allow them in Settings to turn this on.";

type Change = (request: NotificationsRequest) => Promise<string | null>;

/** The switches under an account that keeps what the API kept. */
function AsInTheApp({ user, change }: { user: User; change: jest.Mock }) {
  const [now, setNow] = useState(user);
  const changeNotifications: Change = async (request) => {
    const failed: string | null = await change(request);
    if (failed === null) {
      const before = now.notifications ?? { email: false, push: false, away: true };
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

function push() {
  return screen.getByRole("switch", { name: "Push notifications" });
}

beforeEach(() => phone.resetPhone());

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("off: a line under the switches says so, and it is a button", async () => {
  await show();
  expect(push()).not.toBeChecked();
  expect(screen.getByRole("button", { name: INVITE })).toBeOnTheScreen();
});

test("on: no line", async () => {
  await show({ ...off, notifications: { email: false, push: true, away: true } });
  expect(push()).toBeChecked();
  expect(screen.queryByText(INVITE)).toBeNull();
});

test("a tap on the line does what the switch does: the phone is asked, the choice kept, the line gone", async () => {
  const change = await show();
  await fireEvent.press(screen.getByTestId("push-invite"));
  expect(phone.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenCalledTimes(1);
  expect(change).toHaveBeenLastCalledWith({ push: true });
  expect(push()).toBeChecked();
  expect(screen.queryByText(INVITE)).toBeNull();
});

test("turned off again by its switch, the line is back", async () => {
  await show();
  await fireEvent.press(screen.getByTestId("push-invite"));
  expect(screen.queryByText(INVITE)).toBeNull();
  await fireEvent.press(push());
  expect(push()).not.toBeChecked();
  expect(screen.getByText(INVITE)).toBeOnTheScreen();
});

test("the phone refusing: the reason and «Open Settings» take the line's place", async () => {
  phone.phone.answer = "denied";
  const change = await show();
  await fireEvent.press(screen.getByTestId("push-invite"));
  expect(change).not.toHaveBeenCalled();
  expect(push()).not.toBeChecked();
  expect(screen.getByText(REFUSED)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Open Settings" })).toBeOnTheScreen();
  expect(screen.queryByText(INVITE)).toBeNull();
});

test("the API refusing: the reason is said and the line waits behind it", async () => {
  const change = jest.fn(async () => "No connection. Try again.");
  await show(off, change);
  await fireEvent.press(screen.getByTestId("push-invite"));
  expect(push()).not.toBeChecked();
  expect(screen.getByText("No connection. Try again.")).toBeOnTheScreen();
  expect(screen.queryByText(INVITE)).toBeNull();
});

test.each([
  ["it", "Le notifiche push sono spente. Tocca per accenderle."],
  ["de", "Push-Benachrichtigungen sind aus. Tippe, um sie einzuschalten."],
  ["fr", "Les notifications push sont désactivées. Touche pour les activer."],
  ["es", "Las notificaciones push están desactivadas. Toca para activarlas."],
] as const)("in «%s» the line is in it", async (language, text) => {
  await act(async () => saveLanguageChoice(language));
  await show();
  expect(screen.getByText(text)).toBeOnTheScreen();
});
