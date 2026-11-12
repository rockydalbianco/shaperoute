import page from "@shaperoute/shared-types/fixtures/drawings.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Drawing, DrawingsPage, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountOutcome } from "../api/accounts";
import {
  DrawingsContext,
  type DrawingsDoor,
  useDrawingsDoor,
} from "../social/drawingsDoor";
import { FollowsContext } from "../social/followsDoor";
import { keepSkiDay, openedSkiDay } from "./openedSkiDay";
import { SkiDaysPage } from "./SkiDaysPage";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// «Map» on a day of skiing (TASK-470 D, defect 10): the map takes the whole
// screen, and the tab bar's pages, «Days» with them, go. «←» from the map
// once found the list of the days, not the day; now the day is kept.

const run = (page as DrawingsPage).drawings[0] as Drawing;
const sella: Drawing = {
  ...run,
  id: "d1",
  place: "Selva",
  started_at: "2026-12-14T08:30:00",
  activity: "skiing",
  distance_m: 34200,
  duration_s: 20880,
};

function ok(drawings: Drawing[]): AccountOutcome<DrawingsPage> {
  return { kind: "ok", value: { drawings, next: null, total: drawings.length } };
}

function DoorWith({
  children,
  open,
}: {
  children: ReactNode;
  open: DrawingsDoor["open"];
}) {
  const door = useDrawingsDoor();
  return (
    <DrawingsContext.Provider
      value={{ ...door, pageOf: async () => ok([sella]), open }}
    >
      {children}
    </DrawingsContext.Provider>
  );
}

function Days({ open }: { open: DrawingsDoor["open"] }) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded: jest.fn(),
        },
        openProfile: jest.fn(),
      }}
    >
      <DoorWith open={open}>
        <SkiDaysPage onLogIn={jest.fn()} />
      </DoorWith>
    </FollowsContext.Provider>
  );
}

async function settle() {
  await act(async () => {});
}

beforeEach(() => {
  keepSkiDay(null);
});

test("«Map» on a day: back from the map, «Days» built again finds the day, not the list", async () => {
  const open = jest.fn();
  const view = await render(<Days open={open} />);
  await settle();
  await fireEvent.press(screen.getByTestId("ski-day-d1"));
  await fireEvent.press(screen.getByTestId("ski-day-map"));
  expect(open).toHaveBeenCalledWith(sella);

  // The map takes the whole screen: the pages go…
  await view.unmount();
  // …and come back with «←» from the map.
  await render(<Days open={open} />);
  await settle();
  expect(screen.getByTestId("ski-day-page")).toBeOnTheScreen();
});

test("the day's own «←» lets it go: built again, «Days» is the list", async () => {
  const view = await render(<Days open={jest.fn()} />);
  await settle();
  await fireEvent.press(screen.getByTestId("ski-day-d1"));
  await fireEvent.press(screen.getByTestId("ski-day-back"));
  expect(openedSkiDay()).toBeNull();

  await view.unmount();
  await render(<Days open={jest.fn()} />);
  await settle();
  expect(screen.queryByTestId("ski-day-page")).toBeNull();
  expect(screen.getByTestId("ski-day-d1")).toBeOnTheScreen();
});
