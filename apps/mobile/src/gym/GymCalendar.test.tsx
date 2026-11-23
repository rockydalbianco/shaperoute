/**
 * The gym calendar and the guide in Draw (TASK-411 B, ADR-0341, the user's
 * «Mese con giorni segnati» and «3 passi + ultimo allenamento»): a month in
 * a grid from Monday with a dot on the days with a workout, «‹ ›», a day
 * lists its workouts and one with a post opens it; in Draw the three
 * steps, the last workout and this month's count, which opens the calendar;
 * an API without the calendar leaves the steps alone.
 */
import calendar from "@shaperoute/shared-types/fixtures/gym-calendar.json";
import levels from "@shaperoute/shared-types/fixtures/gym-levels.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";

import { ActivitiesContext, type ActivitiesDoor } from "../activities/activitiesDoor";
import { answers, apiError } from "../account/testing";
import { DrawingsContext, type DrawingsDoor } from "../social/drawingsDoor";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { GymCalendarSheet, monthGrid, monthSummary } from "./GymCalendar";
import { GymLevels } from "./GymLevels";
import {
  GUIDE_STEPS,
  GymDrawGuide,
  lastLine,
  monthLine,
  whenLabel,
} from "./GymDrawGuide";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const open = jest.fn();

function follows(signedIn = true): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: signedIn
        ? { status: "signedIn", session: session as Session }
        : { status: "signedOut" },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

async function shown(children: React.ReactNode, signedIn = true, total = 3) {
  const result = await render(
    <FollowsContext.Provider value={follows(signedIn)}>
      <ActivitiesContext.Provider value={{ total } as unknown as ActivitiesDoor}>
        <DrawingsContext.Provider value={{ open } as unknown as DrawingsDoor}>
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

beforeEach(() => open.mockReset());

test("a month in rows of a week from Monday", () => {
  // 1 November 2026 is a Sunday: six empty cells before it.
  const november = monthGrid("2026-11");
  expect(november[0]).toEqual([null, null, null, null, null, null, 1]);
  expect(november.at(-1)).toEqual([30, null, null, null, null, null, null]);
  expect(november.flat().filter((day) => day !== null)).toHaveLength(30);
  // February 2027 starts on a Monday and fills four weeks exactly.
  expect(monthGrid("2027-02")).toHaveLength(4);
  expect(
    monthGrid("2028-02")
      .flat()
      .filter((day) => day !== null),
  ).toHaveLength(29);
});

test("the words of the month and of the last workout", () => {
  expect(monthSummary(3, 10_500)).toBe("3 times · 2:55:00");
  expect(monthSummary(1, 3_300)).toBe("Workout · 55:00");
  expect(monthLine(1)).toBe("This month: 1 time");
  expect(monthLine(4)).toBe("This month: 4 times");
  const now = new Date(2026, 10, 7, 20, 0);
  expect(whenLabel(new Date(2026, 10, 7, 8).toISOString(), now)).toBe("Today");
  expect(whenLabel(new Date(2026, 10, 6, 23).toISOString(), now)).toBe("Yesterday");
  expect(whenLabel(new Date(2026, 10, 2, 18).toISOString(), now)).toBe(
    "Mon 2 Nov 2026",
  );
  expect(
    lastLine(
      {
        id: "a",
        started_at: new Date(2026, 10, 6, 18).toISOString(),
        duration_s: 3300,
        drawing_id: null,
      },
      now,
    ),
  ).toBe("Last workout: Yesterday · 55:00");
});

test("the calendar marks the days with a workout; a day lists them, a post opens", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: calendar }));
  const onClose = jest.fn();
  await shown(
    <GymCalendarSheet
      visible
      onClose={onClose}
      fetchFn={fetchFn as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  expect(asked(fetchFn)[0]).toMatch(
    /^http:\/\/api\/me\/gym-calendar\?tz=[^&]+&month=2026-11$/,
  );
  expect(screen.getByText("Gym calendar")).toBeOnTheScreen();
  expect(screen.getByText("Nov 2026")).toBeOnTheScreen();
  expect(screen.getByTestId("calendar-summary")).toHaveTextContent("3 times · 2:55:00");
  for (const day of [2, 5, 7]) {
    expect(screen.getByTestId(`calendar-dot-${day}`)).toBeOnTheScreen();
  }
  expect(screen.queryByTestId("calendar-dot-3")).toBeNull();
  expect(screen.getByTestId("calendar-day-5")).toHaveProp(
    "accessibilityLabel",
    "5 Nov 2026, Workout",
  );

  // A day without a workout lists nothing; the 5th its one, with its post.
  await fireEvent.press(screen.getByTestId("calendar-day-3"));
  expect(screen.queryByTestId("calendar-workout")).toBeNull();
  await fireEvent.press(screen.getByTestId("calendar-day-2"));
  const quiet = screen.getByTestId("calendar-workout");
  expect(within(quiet).getByText(/^🏋️ \d\d:\d\d · 55:00$/)).toBeOnTheScreen();
  await fireEvent.press(quiet);
  expect(open).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("calendar-day-5"));
  await fireEvent.press(screen.getByTestId("calendar-workout"));
  expect(onClose).toHaveBeenCalled();
  expect(open).toHaveBeenCalledWith({ id: calendar.days[1].workouts[0].drawing_id });
});

test("«‹» goes to the month before; «›» back, never past this one", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: calendar }));
  await shown(
    <GymCalendarSheet
      visible
      onClose={jest.fn()}
      fetchFn={fetchFn as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  await fireEvent.press(screen.getByTestId("calendar-before"));
  await act(async () => {});
  expect(asked(fetchFn)[1]).toMatch(/month=2026-10$/);
  expect(screen.getByText("Oct 2026")).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId("calendar-after"));
  await act(async () => {});
  expect(asked(fetchFn)[2]).toMatch(/month=2026-11$/);
});

test("an API without the calendar says why, and the grid is still there", async () => {
  const fetchFn = jest.fn(answers({ status: 404, body: apiError("http_error") }));
  await shown(
    <GymCalendarSheet
      visible
      onClose={jest.fn()}
      fetchFn={fetchFn as unknown as typeof fetch}
      month="2026-11"
    />,
  );
  expect(screen.getByTestId("calendar-day-1")).toBeOnTheScreen();
  expect(screen.queryByTestId("calendar-dot-5")).toBeNull();
  expect(screen.getByTestId("calendar-summary")).toHaveTextContent("");
});

test("in Draw: the month's tile with the last workout opens the calendar; the steps are gone once trained", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: calendar }));
  await shown(<GymDrawGuide fetchFn={fetchFn as unknown as typeof fetch} />);
  // A workout is saved already (TASK-411 F): «How it works» has done its job.
  expect(screen.queryByText("How it works")).toBeNull();
  expect(asked(fetchFn)[0]).toMatch(/^http:\/\/api\/me\/gym-calendar\?tz=[^&]+$/);
  expect(screen.getByTestId("gym-guide-last")).toHaveTextContent(
    /^Last workout: .+ · 1:00:00$/,
  );
  const month = screen.getByTestId("gym-guide-month");
  expect(month).toHaveTextContent(/^📅 Gym calendarThis month: 3 timesLast workout:/);
  await fireEvent.press(month);
  await act(async () => {});
  expect(screen.getByTestId("gym-calendar")).toBeOnTheScreen();
});

test("in Draw a workout just saved asks for the calendar again", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: calendar }));
  const { rerender } = await shown(
    <GymDrawGuide fetchFn={fetchFn as unknown as typeof fetch} />,
    true,
    3,
  );
  expect(fetchFn).toHaveBeenCalledTimes(1);
  await rerender(
    <FollowsContext.Provider value={follows()}>
      <ActivitiesContext.Provider value={{ total: 4 } as unknown as ActivitiesDoor}>
        <GymDrawGuide fetchFn={fetchFn as unknown as typeof fetch} />
      </ActivitiesContext.Provider>
    </FollowsContext.Provider>,
  );
  await act(async () => {});
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("before the first workout Draw shows the three steps", async () => {
  const fetchFn = jest.fn(
    answers({
      status: 200,
      body: { ...calendar, days: [], count: 0, duration_s: 0, last: null },
    }),
  );
  await shown(<GymDrawGuide fetchFn={fetchFn as unknown as typeof fetch} />);
  expect(screen.getByText("How it works")).toBeOnTheScreen();
  for (const step of GUIDE_STEPS) {
    expect(screen.getByText(step)).toBeOnTheScreen();
  }
  expect(screen.getByTestId("gym-guide-month")).toHaveTextContent(
    /This month: 0 times/,
  );
});

test("without the API's calendar, or signed out, Draw shows the steps alone", async () => {
  const missing = jest.fn(answers({ status: 404, body: apiError("http_error") }));
  await shown(<GymDrawGuide fetchFn={missing as unknown as typeof fetch} />);
  expect(screen.getByText("How it works")).toBeOnTheScreen();
  expect(screen.queryByTestId("gym-guide-month")).toBeNull();
  expect(screen.queryByTestId("gym-guide-last")).toBeNull();
  await screen.unmount();

  const unused = jest.fn(answers({ status: 200, body: calendar }));
  await shown(<GymDrawGuide fetchFn={unused as unknown as typeof fetch} />, false);
  expect(unused).not.toHaveBeenCalled();
  expect(screen.queryByTestId("gym-guide-month")).toBeNull();
});

test("one's own profile opens the calendar from the gym box; another's has no line", async () => {
  const fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      answers({ status: 200, body: calendar }) as unknown as typeof fetch,
    );
  try {
    const mine = await shown(<GymLevels levels={levels.gym_levels} own />);
    await fireEvent.press(mine.getByTestId("gym-calendar-open"));
    await act(async () => {});
    expect(mine.getByTestId("gym-calendar")).toBeOnTheScreen();
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/me\/gym-calendar\?tz=/);
    await mine.unmount();
    const theirs = await shown(<GymLevels levels={levels.gym_levels} />);
    expect(theirs.getByTestId("gym-levels")).toBeOnTheScreen();
    expect(theirs.queryByTestId("gym-calendar-open")).toBeNull();
  } finally {
    fetchSpy.mockRestore();
  }
});
