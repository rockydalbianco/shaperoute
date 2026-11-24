import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Gear, Session } from "@shaperoute/shared-types";
import { act, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { openTarget } from "../notifications/openTarget";
import { tapTarget } from "../notifications/notificationTap";
import { FollowsContext } from "../social/followsDoor";
import { askedGear, closeGearItem, openGearItem } from "./gearDoor";
import { GearFromBellHost } from "./GearFromBell";

// The bell's «… reached the limit you set.» opens the item (TASK-486 part
// G, ADR-0393, the user's choice 5): to retire it or change its limit.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const SHOES = (list.gear as Gear[])[0] as Gear;

afterEach(async () => {
  await act(() => closeGearItem());
});

async function show(fetchFn: jest.Mock, on = true) {
  const sessionEnded = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded,
        },
        openProfile: () => {},
      }}
    >
      <GearFromBellHost api={{ fetchFn, key: null }} on={on} />
    </FollowsContext.Provider>,
  );
  return sessionEnded;
}

test("the bell's line asks the app for the item", () => {
  const target = tapTarget({ kind: "gear_limit", gear_id: SHOES.id });
  expect(target).toEqual({ kind: "gear", id: SHOES.id });
  const openGear = jest.fn();
  openTarget(target!, {
    openDrawing: jest.fn(),
    openProfile: jest.fn(),
    openPlay: jest.fn(),
    openChallenge: jest.fn(),
    openGear,
  });
  expect(openGear).toHaveBeenCalledWith(SHOES.id);
});

test("nothing asked, nothing shown and nothing fetched", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn);
  expect(screen.queryByText("The red ones")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("the item asked opens in its editor, as it is now", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn);
  await act(() => openGearItem(SHOES.id));
  await waitFor(() => expect(fetchFn).toHaveBeenCalled());
  expect(await screen.findByDisplayValue("The red ones")).toBeOnTheScreen();
  expect(String(fetchFn.mock.calls[0][0])).toBe("http://api/me/gear");
});

test("off, the item is not asked for", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn, false);
  await act(() => openGearItem(SHOES.id));
  expect(fetchFn).not.toHaveBeenCalled();
});

test("an item deleted since opens nothing, and the request goes", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: [] } });
  await show(fetchFn);
  await act(() => openGearItem(SHOES.id));
  await waitFor(() => expect(askedGear()).toBeNull());
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(screen.queryByDisplayValue("The red ones")).toBeNull();
});

test("an ended session is told", async () => {
  const fetchFn: jest.Mock = answers({
    status: 401,
    body: apiError("session_expired"),
  });
  const sessionEnded = await show(fetchFn);
  await act(() => openGearItem(SHOES.id));
  await waitFor(() => expect(sessionEnded).toHaveBeenCalledWith(session.token));
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(askedGear()).toBeNull();
});
