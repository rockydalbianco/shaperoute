import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { PushPermission } from "../notifications/pushDevice";
import { appMorning, type MorningNotifier, NO_MORNING, saveMorning } from "./morning";
import { MorningStretchSetting, stepped } from "./MorningStretchSetting";

jest.mock("expo-notifications");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The phone's documents folder, in memory, as in units.test.ts.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

/** A phone that answers `permission` and keeps what is scheduled. */
function phoneThat(permission: PushPermission) {
  const scheduled = new Set<string>(["muw-plan-day-2026-11-13"]);
  const notifier: MorningNotifier = {
    scheduled: async () => [...scheduled],
    schedule: async (notice) => {
      scheduled.add(notice.id);
    },
    cancel: async (id) => {
      scheduled.delete(id);
    },
  };
  return { scheduled, notifier, ask: jest.fn(async () => permission) };
}

async function openPage(permission: PushPermission = "granted") {
  const phone = phoneThat(permission);
  await render(<MorningStretchSetting ask={phone.ask} notifier={phone.notifier} />);
  await fireEvent.press(screen.getByRole("button", { name: /^Morning stretch, / }));
  return phone;
}

/** Lets the notifications follow the setting. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((done) => setTimeout(done, 0));
  });
}

beforeEach(async () => {
  await act(async () => saveMorning(NO_MORNING));
});

test("the row says «Off» at first, and the page why the time is set here", async () => {
  await render(<MorningStretchSetting />);
  expect(
    screen.getByRole("button", { name: "Morning stretch, Off" }),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Morning stretch, Off" }));
  expect(screen.getByRole("header", { name: "Morning stretch" })).toBeOnTheScreen();
  expect(
    screen.getByText(
      "MuW can't read your phone's alarm. Set here the time it rings: 5 minutes later a reminder opens your Morning routine.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole("switch", { name: "Morning stretch" })).not.toBeChecked();
  // 7:00, Monday to Friday, 5 minutes.
  expect(screen.getByLabelText("Hour, 7")).toBeOnTheScreen();
  expect(screen.getByLabelText("Minutes, 00")).toBeOnTheScreen();
  expect(screen.getByRole("checkbox", { name: "Fri" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Sat" })).not.toBeChecked();
  expect(screen.getByRole("radio", { name: "5 min" })).toBeChecked();
});

test("turning it on asks the phone, then sets a notification for each day", async () => {
  const phone = await openPage("granted");
  await fireEvent.press(screen.getByRole("switch", { name: "Morning stretch" }));
  await settle();
  expect(phone.ask).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("switch", { name: "Morning stretch" })).toBeChecked();
  expect(appMorning().on).toBe(true);
  expect([...phone.scheduled].sort()).toEqual([
    "morning-stretch-1",
    "morning-stretch-2",
    "morning-stretch-3",
    "morning-stretch-4",
    "morning-stretch-5",
    "muw-plan-day-2026-11-13",
  ]);
  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  expect(
    screen.getByRole("button", { name: "Morning stretch, 7:00 · 5 min" }),
  ).toBeOnTheScreen();
});

test("a phone that refuses notifications leaves it off and says where to allow them", async () => {
  const phone = await openPage("denied");
  await fireEvent.press(screen.getByRole("switch", { name: "Morning stretch" }));
  await settle();
  expect(screen.getByRole("switch", { name: "Morning stretch" })).not.toBeChecked();
  expect(appMorning().on).toBe(false);
  expect(
    screen.getByText(
      "Notifications are off for MuW on this phone. Allow them in Settings to turn this on.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Open Settings" })).toBeOnTheScreen();
  expect([...phone.scheduled]).toEqual(["muw-plan-day-2026-11-13"]);
});

test("turning it off takes its notifications back, and no other", async () => {
  const phone = await openPage("granted");
  await fireEvent.press(screen.getByRole("switch", { name: "Morning stretch" }));
  await settle();
  await fireEvent.press(screen.getByRole("switch", { name: "Morning stretch" }));
  await settle();
  // Turning off never asks.
  expect(phone.ask).toHaveBeenCalledTimes(1);
  expect(appMorning().on).toBe(false);
  expect([...phone.scheduled]).toEqual(["muw-plan-day-2026-11-13"]);
});

test("the time moves by an hour and by five minutes, round the clock", async () => {
  await openPage();
  await fireEvent.press(screen.getByRole("button", { name: "Hour −" }));
  await fireEvent.press(screen.getByRole("button", { name: "Minutes −" }));
  expect(appMorning()).toMatchObject({ hour: 6, minute: 55 });
  expect(screen.getByLabelText("Hour, 6")).toBeOnTheScreen();
  expect(screen.getByLabelText("Minutes, 55")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Minutes +" }));
  await fireEvent.press(screen.getByRole("button", { name: "Minutes +" }));
  expect(appMorning()).toMatchObject({ hour: 6, minute: 5 });
  expect(stepped(58, 5)).toBe(0);
  expect(stepped(58, -5)).toBe(55);
  expect(stepped(2, -5)).toBe(0);
  expect(stepped(0, -5)).toBe(55);
});

test("days are added and taken away, but never the last one", async () => {
  await openPage();
  await fireEvent.press(screen.getByRole("checkbox", { name: "Sat" }));
  expect(appMorning().days).toEqual([1, 2, 3, 4, 5, 6]);
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
    await fireEvent.press(screen.getByRole("checkbox", { name: day }));
  }
  expect(appMorning().days).toEqual([6]);
  await fireEvent.press(screen.getByRole("checkbox", { name: "Sat" }));
  expect(appMorning().days).toEqual([6]);
  expect(screen.getByRole("checkbox", { name: "Sat" })).toBeChecked();
});

test("the length is 3, 5 or 10 minutes, and the notifications say it", async () => {
  const phone = await openPage("granted");
  await fireEvent.press(screen.getByRole("switch", { name: "Morning stretch" }));
  await settle();
  await fireEvent.press(screen.getByRole("radio", { name: "10 min" }));
  await settle();
  expect(appMorning().minutes).toBe(10);
  expect(screen.getByRole("radio", { name: "10 min" })).toBeChecked();
  expect(phone.scheduled.size).toBe(6);
});
