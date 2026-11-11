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
import { PAGES_PER_ASK, SkiDaysPage, skiDaysOf } from "./SkiDaysPage";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// «Days», the second page of the ski mode (TASK-429 part A): the account's
// own days of skiing from the posts of its profile, a touch that opens one,
// «Show more», and the page without an account.

const run = (page as DrawingsPage).drawings[0] as Drawing;
const OWN = (session as Session).user.public_id as string;

function day(id: string, place: string | null, startedAt: string): Drawing {
  return {
    ...run,
    id,
    place,
    started_at: startedAt,
    activity: "skiing",
    distance_m: 34200,
    duration_s: 20880,
  };
}

const sella = day("d1", "Selva", "2026-12-14T08:30:00");
const badia = day("d2", null, "2026-12-08T09:00:00");

function ok(drawings: Drawing[], next: string | null): AccountOutcome<DrawingsPage> {
  return { kind: "ok", value: { drawings, next, total: drawings.length } };
}

function wrap(
  children: ReactNode,
  pageOf: DrawingsDoor["pageOf"],
  open = jest.fn(),
  signedIn = true,
) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: {
          state: signedIn
            ? { status: "signedIn", session: session as Session }
            : { status: "signedOut", notice: null },
          sessionEnded: jest.fn(),
        },
        openProfile: jest.fn(),
      }}
    >
      <DoorWith pageOf={pageOf} open={open}>
        {children}
      </DoorWith>
    </FollowsContext.Provider>
  );
}

/** The app's door with a test's pages and «open». */
function DoorWith({
  children,
  pageOf,
  open,
}: {
  children: ReactNode;
  pageOf: DrawingsDoor["pageOf"];
  open: DrawingsDoor["open"];
}) {
  const door = useDrawingsDoor();
  return (
    <DrawingsContext.Provider value={{ ...door, pageOf, open }}>
      {children}
    </DrawingsContext.Provider>
  );
}

async function settle() {
  await act(async () => {});
}

test("only the days of skiing count, in their order", () => {
  expect(
    skiDaysOf([run, sella, { ...run, id: "x", activity: "cycling" }, badia]),
  ).toEqual([sella, badia]);
});

test("lists the own days of skiing, with the day, the town, the km and the time", async () => {
  const pageOf = jest.fn(async () => ok([sella, run, badia], null));
  await render(wrap(<SkiDaysPage onLogIn={jest.fn()} />, pageOf));
  await settle();
  expect(pageOf).toHaveBeenCalledWith(OWN, null);
  expect(screen.getByRole("header", { name: "Days" })).toBeOnTheScreen();
  expect(screen.getByText("Your days")).toBeOnTheScreen();
  expect(screen.getByText("Mon 14 Dec 2026 · Selva")).toBeOnTheScreen();
  expect(screen.getByText("Tue 8 Dec 2026")).toBeOnTheScreen();
  expect(screen.getAllByText("34.2 km · 5 h 48 min")).toHaveLength(2);
  // The run of the fixture is not a day on the snow.
  expect(screen.queryByTestId(`ski-day-${run.id}`)).toBeNull();
});

test("a touch opens the day's own page, and «Back» comes back (part C)", async () => {
  const open = jest.fn();
  await render(
    wrap(<SkiDaysPage onLogIn={jest.fn()} />, async () => ok([sella], null), open),
  );
  await settle();
  await fireEvent.press(screen.getByTestId("ski-day-d1"));
  expect(screen.getByTestId("ski-day-page")).toBeOnTheScreen();
  expect(open).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("ski-day-back"));
  expect(screen.queryByTestId("ski-day-page")).toBeNull();
});

test("pages without a day are passed over, up to PAGES_PER_ASK a time", async () => {
  const pageOf = jest
    .fn()
    .mockResolvedValueOnce(ok([run], "c1"))
    .mockResolvedValueOnce(ok([sella], "c2"))
    .mockResolvedValueOnce(ok([badia], null));
  await render(wrap(<SkiDaysPage onLogIn={jest.fn()} />, pageOf));
  await settle();
  expect(pageOf).toHaveBeenNthCalledWith(2, OWN, "c1");
  expect(screen.getByTestId("ski-day-d1")).toBeOnTheScreen();
  expect(screen.queryByTestId("ski-day-d2")).toBeNull();
  await fireEvent.press(screen.getByTestId("ski-days-more"));
  await settle();
  expect(pageOf).toHaveBeenLastCalledWith(OWN, "c2");
  expect(screen.getByTestId("ski-day-d2")).toBeOnTheScreen();
  expect(screen.queryByTestId("ski-days-more")).toBeNull();
});

test("stops after PAGES_PER_ASK pages with no day, and offers more", async () => {
  const pageOf = jest.fn(async () => ok([run], "c"));
  await render(wrap(<SkiDaysPage onLogIn={jest.fn()} />, pageOf));
  await settle();
  expect(pageOf).toHaveBeenCalledTimes(PAGES_PER_ASK);
  expect(screen.getByTestId("ski-days-more")).toBeOnTheScreen();
});

test("no days at all: the line that says so", async () => {
  await render(wrap(<SkiDaysPage onLogIn={jest.fn()} />, async () => ok([run], null)));
  await settle();
  expect(screen.getByText("No days on the snow yet.")).toBeOnTheScreen();
});

test("without an account: «Log in», and nothing asked", async () => {
  const pageOf = jest.fn(async () => ok([sella], null));
  const onLogIn = jest.fn();
  await render(wrap(<SkiDaysPage onLogIn={onLogIn} />, pageOf, jest.fn(), false));
  await settle();
  expect(pageOf).not.toHaveBeenCalled();
  expect(screen.getByText("Log in to see your days.")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("ski-days-log-in"));
  expect(onLogIn).toHaveBeenCalledTimes(1);
});
