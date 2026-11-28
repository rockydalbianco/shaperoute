import type { CalendarActivity } from "@shaperoute/shared-types";

import { todayCategory } from "./today";
import { weekFrom } from "./useStretchWeek";

/** 2026-11-27 is a Friday; the week began on Monday the 23rd. */
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute);

function activity(
  sport: string,
  began: Date,
  minutes: number,
  id = `${sport}-${began.getTime()}`,
): CalendarActivity {
  return {
    id,
    activity: sport,
    started_at: began.toISOString(),
    distance_m: 0,
    duration_s: minutes * 60,
    kcal: null,
    tracked: false,
    shape: null,
    word: null,
    title: null,
    place: null,
  } as CalendarActivity;
}

describe("the week of stretching", () => {
  it("is empty with nothing done", () => {
    expect(weekFrom([], at(27, 12))).toEqual({
      days: [false, false, false, false, false, false, false],
      sessions: 0,
      minutes: 0,
      last: null,
    });
  });

  it("ticks the days with a stretching session and adds up their minutes", () => {
    const week = weekFrom(
      [
        activity("stretching", at(23, 7), 5),
        activity("stretching", at(25, 21), 10),
        activity("stretching", at(25, 22), 3),
        // A run is not a session, and last Sunday is another week.
        activity("running", at(24, 18), 40),
        activity("stretching", at(22, 9), 20),
      ],
      at(27, 12),
    );
    expect(week.days).toEqual([true, false, true, false, false, false, false]);
    expect(week.sessions).toBe(3);
    expect(week.minutes).toBe(18);
  });

  it("rounds the minutes of the week together, not session by session", () => {
    const short = (began: Date): CalendarActivity => ({
      ...activity("stretching", began, 0),
      duration_s: 100,
    });
    expect(
      weekFrom([short(at(23, 7)), short(at(24, 7)), short(at(25, 7))], at(27, 12)),
    ).toMatchObject({ sessions: 3, minutes: 5 });
  });

  it("says what ended last, of any sport, and never something still to end", () => {
    const now = at(27, 12);
    const week = weekFrom(
      [
        activity("running", at(27, 9), 45),
        activity("gym", at(26, 18), 60),
        activity("stretching", at(27, 7), 5),
        // Began before now and ends after it: not done yet.
        activity("cycling", at(27, 11, 30), 90),
      ],
      now,
    );
    expect(week.last).toEqual({ sport: "running", endedAt: at(27, 9, 45).getTime() });
    // It is what «Today» proposes the «After» of, within three hours.
    expect(todayCategory(now, week.last)).toBe("running_after");
    expect(todayCategory(at(27, 15), week.last)).toBe("desk");
  });

  it("leaves out an activity whose time is not one", () => {
    const broken = { ...activity("stretching", at(25, 7), 5), started_at: "soon" };
    expect(weekFrom([broken], at(27, 12)).sessions).toBe(0);
  });
});
