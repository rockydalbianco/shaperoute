/**
 * The calendar of every sport (TASK-462, ADR-0372, the user's choices of
 * 2026-11-11): the icons of the sports in the month, a day's activities with
 * time, km, pace and calories, the filter by sport, the bars of the twelve
 * months that open their month, the records under them; the week of the
 * profile that opens it; an API without it leaves the profile alone.
 */
import calendar from "@shaperoute/shared-types/fixtures/activity-calendar.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type {
  ActivityCalendar,
  CalendarActivity,
  PersonalBest,
  Session,
} from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { DrawingsContext, type DrawingsDoor } from "../social/drawingsDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { ActivitiesContext, type ActivitiesDoor } from "./activitiesDoor";
import { ActivityCalendarSheet, opensRun } from "./ActivityCalendar";
import {
  activityLine,
  activityTitle,
  barHeights,
  dayIcons,
  totalsLine,
  weekOf,
} from "./calendarText";
import { WeekStrip } from "./WeekStrip";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const example = calendar as ActivityCalendar;
const openRun = jest.fn();
const openDrawing = jest.fn();

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: session as Session },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

async function shown(children: React.ReactNode) {
  const result = await render(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider
        value={{ open: openRun, total: 4 } as unknown as ActivitiesDoor}
      >
        <DrawingsContext.Provider
          value={{ open: openDrawing } as unknown as DrawingsDoor}
        >
          {children}
        </DrawingsContext.Provider>
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
  return result;
}

function asked(fetchFn: jest.Mock): string[] {
  return fetchFn.mock.calls.map((call) => String(call[0]));
}

function one(changes: Partial<CalendarActivity>): CalendarActivity {
  return { ...example.days[0].activities[0], ...changes };
}

beforeEach(() => {
  openRun.mockReset();
  openDrawing.mockReset();
});

test("the words of a day, an activity and a month", () => {
  const [run] = example.days[0].activities;
  const [swim, gym] = example.days[1].activities;
  expect(dayIcons([run])).toBe("🏃‍♂️");
  expect(dayIcons([run, run])).toBe("🏃‍♂️");
  expect(dayIcons([run, swim, gym])).toMatch(/\+$/);
  expect(activityTitle(run)).toBe("Trento · Heart");
  expect(activityTitle(gym)).toBe("Gym");
  // The time on the phone's clock, then km, time, pace and calories.
  expect(activityLine(run)).toMatch(
    /^\d\d:\d\d · 5\.20 km · 27:41 · 5:19 \/km · 389 kcal$/,
  );
  // The gym has no metres: its time only; a swim without calories none.
  expect(activityLine(gym)).toMatch(/^\d\d:\d\d · 55:00 · 310 kcal$/);
  expect(activityLine(swim)).not.toMatch(/kcal/);
  expect(totalsLine(4, 19_100, 22_661)).toBe("4 activities · 19.10 km · 6:17:41");
  expect(totalsLine(1, 0, 3300)).toBe("1 activity · 55:00");
});

test("a pool swim opens no map; every other activity does", () => {
  expect(opensRun(one({ activity: "swimming", tracked: false }))).toBe(false);
  expect(opensRun(one({ activity: "swimming", tracked: true }))).toBe(true);
  expect(opensRun(one({ activity: "gym", tracked: false }))).toBe(true);
});

test("the bars are the months' time over the longest", () => {
  const heights = barHeights(example.trend);
  expect(heights).toHaveLength(12);
  expect(Math.max(...heights)).toBe(1);
  expect(
    barHeights([{ month: "2026-01", count: 0, distance_m: 0, duration_s: 0 }]),
  ).toEqual([0]);
});

test("the week from Monday, across two months", () => {
  // Sunday 1 November 2026: its week began on Monday 26 October.
  const week = weekOf(new Date(2026, 10, 1, 9));
  expect(week.map((day) => day.getDate())).toEqual([26, 27, 28, 29, 30, 31, 1]);
  expect(week[0].getDay()).toBe(1);
});

test("the month shows each day's sports; a day lists them and one opens its run", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: calendar }));
  const onClose = jest.fn();
  await shown(
    <ActivityCalendarSheet
      visible
      onClose={onClose}
      fetchFn={fetchFn as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  expect(asked(fetchFn)[0]).toMatch(
    /^http:\/\/api\/me\/activity-calendar\?tz=[^&]+&month=2026-11$/,
  );
  expect(screen.getByTestId("calendar-summary")).toHaveTextContent(
    "4 activities · 19.10 km · 6:17:41",
  );
  expect(screen.getByTestId("calendar-icons-1")).toHaveTextContent("🏃‍♂️");
  expect(screen.getByTestId("calendar-icons-5")).toHaveTextContent("🏊🏋️");
  expect(screen.queryByTestId("calendar-icons-2")).toBeNull();

  await act(async () => fireEvent.press(screen.getByTestId("calendar-day-5")));
  const rows = screen.getAllByTestId("calendar-activity");
  expect(rows).toHaveLength(2);
  expect(within(rows[1]).getByText(/55:00 · 310 kcal/)).toBeTruthy();
  // The pool swim opens nothing.
  await act(async () => fireEvent.press(rows[0]));
  expect(openRun).not.toHaveBeenCalled();

  await act(async () => fireEvent.press(screen.getByTestId("calendar-day-1")));
  await act(async () => fireEvent.press(screen.getByTestId("calendar-activity")));
  expect(onClose).toHaveBeenCalled();
  expect(openRun).toHaveBeenCalledWith(
    expect.objectContaining({ id: "ab00000000000101" }),
  );
});

test("a sport filters the month; a bar opens its month", async () => {
  const hiking = {
    ...example,
    sport: "hiking",
    count: 1,
    distance_m: 12_400,
    duration_s: 15_600,
    days: [example.days[2]],
  };
  const october = { ...hiking, month: "2026-10", days: [], count: 0 };
  const fetchFn = jest.fn(
    answers(
      { status: 200, body: calendar },
      { status: 200, body: hiking },
      { status: 200, body: october },
    ),
  );
  await shown(
    <ActivityCalendarSheet
      visible
      onClose={() => {}}
      fetchFn={fetchFn as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  await act(async () => fireEvent.press(screen.getByTestId("calendar-sport-hiking")));
  expect(asked(fetchFn)[1]).toMatch(/month=2026-11&sport=hiking$/);
  expect(screen.queryByTestId("calendar-icons-1")).toBeNull();
  expect(screen.getByTestId("calendar-icons-8")).toBeTruthy();

  await act(async () => fireEvent.press(screen.getByTestId("calendar-bar-2026-10")));
  expect(asked(fetchFn)[2]).toMatch(/month=2026-10&sport=hiking$/);
  expect(screen.getByTestId("calendar-trend")).toBeTruthy();
});

test("it opens on a sport when asked (the flights, TASK-305 R5b); else on all, as before", async () => {
  const flights = { ...example, sport: "paragliding", count: 0, days: [] };
  const onFlights = jest.fn(answers({ status: 200, body: flights }));
  await shown(
    <ActivityCalendarSheet
      visible
      onClose={() => {}}
      fetchFn={onFlights as unknown as typeof fetch}
      month="2026-11"
      sport="paragliding"
    />,
  );
  expect(asked(onFlights)).toHaveLength(1);
  expect(asked(onFlights)[0]).toMatch(/month=2026-11&sport=paragliding$/);

  const onAll = jest.fn(answers({ status: 200, body: calendar }));
  await shown(
    <ActivityCalendarSheet
      visible
      onClose={() => {}}
      fetchFn={onAll as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  expect(asked(onAll)).toHaveLength(1);
  expect(asked(onAll)[0]).not.toMatch(/sport=/);
});

test("the records of the sport chosen are under the bars, and open their run", async () => {
  const bests: PersonalBest[] = [
    {
      sport: "running",
      distance: "5k",
      distance_m: 5000,
      seconds: 1565,
      started_at: "2026-11-01T07:12:00Z",
      drawing: null,
      key: "ab00000000000101",
    },
    {
      sport: "cycling",
      distance: "40k",
      distance_m: 40_000,
      seconds: 4200,
      started_at: "2026-10-04T07:12:00Z",
      drawing: null,
      key: "ab00000000000099",
    },
  ];
  const fetchFn = jest.fn(
    answers({ status: 200, body: calendar }, { status: 200, body: calendar }),
  );
  const onClose = jest.fn();
  await shown(
    <ActivityCalendarSheet
      visible
      onClose={onClose}
      bests={bests}
      fetchFn={fetchFn as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  // All the sports' records without a filter; the run's alone with it.
  expect(screen.getByText("5K")).toBeTruthy();
  expect(screen.getByText("40 km")).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByTestId("calendar-sport-running")));
  expect(screen.queryByText("40 km")).toBeNull();
  // A record opens its run once the calendar is closed.
  await act(async () => fireEvent.press(screen.getByLabelText(/^5K, 26:05/)));
  expect(onClose).toHaveBeenCalled();
  expect(openRun).toHaveBeenCalledWith({ id: "ab00000000000101" });
});

test("an API without the calendar says so in the sheet", async () => {
  const fetchFn = jest.fn(answers({ status: 404, body: apiError("http_error") }));
  await shown(
    <ActivityCalendarSheet
      visible
      onClose={() => {}}
      fetchFn={fetchFn as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  expect(screen.queryByTestId("calendar-trend")).toBeNull();
  expect(screen.getByTestId("calendar-summary")).toHaveTextContent("");
});

test("the week of the profile: its sports, its totals, and it opens the calendar", async () => {
  // Sunday 8 November 2026: the week of 2–8 November, one month.
  const fetchFn = jest.fn(
    answers({ status: 200, body: calendar }, { status: 200, body: calendar }),
  );
  await shown(
    <WeekStrip
      fetchFn={fetchFn as unknown as typeof fetch}
      today={new Date(2026, 10, 8, 20)}
    />,
  );
  expect(asked(fetchFn)).toHaveLength(1);
  expect(screen.getByTestId("week-day-3")).toHaveTextContent(/Thu🏊🏋️/);
  expect(screen.getByTestId("week-day-6")).toHaveTextContent(/Sun⛰️/);
  expect(screen.getByTestId("week-summary")).toHaveTextContent(
    "This week: 3 activities · 13.90 km · 5:50:00",
  );
  await act(async () => fireEvent.press(screen.getByTestId("week-strip")));
  expect(screen.getByTestId("activity-calendar")).toBeTruthy();
});

test("a week across two months asks both; no calendar on the API, no strip", async () => {
  const fetchFn = jest.fn(
    answers(
      { status: 404, body: apiError("http_error") },
      { status: 404, body: apiError("http_error") },
    ),
  );
  await shown(
    <WeekStrip
      fetchFn={fetchFn as unknown as typeof fetch}
      today={new Date(2026, 10, 1, 9)}
    />,
  );
  expect(asked(fetchFn).map((url) => url.replace(/.*month=/, ""))).toEqual([
    "2026-10",
    "2026-11",
  ]);
  expect(screen.queryByTestId("week-strip")).toBeNull();
});
