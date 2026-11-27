import { CATEGORIES } from "./categories";
import { category, defaultChoice } from "./compose";
import { AFTER_SPORT_MS, STRETCH_SPORT, todayCategory } from "./today";

/** A moment on the phone's clock: 2026-11-27 is a Friday. */
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 10, day, hour, minute);

describe("what «Today» proposes", () => {
  it("is the «After» of a sport done in the last three hours, whatever the hour", () => {
    const now = at(27, 7, 30);
    const ended = (ago: number) => ({ sport: "running", endedAt: now.getTime() - ago });
    expect(todayCategory(now, ended(10 * 60 * 1000))).toBe("running.after");
    expect(todayCategory(now, ended(AFTER_SPORT_MS))).toBe("running.after");
    // Longer ago, the hour decides; so it does for a time still to come.
    expect(todayCategory(now, ended(AFTER_SPORT_MS + 1))).toBe("morning");
    expect(todayCategory(now, ended(-60 * 1000))).toBe("morning");
    expect(
      todayCategory(at(27, 22), { sport: "gym", endedAt: at(27, 20).getTime() }),
    ).toBe("gym.after");
  });

  it("knows the app's sports by their names: a gravel ride is cycling, a tour is ski touring", () => {
    const now = at(27, 15);
    const after = (sport: string) =>
      todayCategory(now, { sport, endedAt: now.getTime() - 1000 });
    expect(after("gravel_biking")).toBe("cycling.after");
    expect(after("mountain_biking")).toBe("cycling.after");
    expect(after("ski_touring")).toBe("skiTouring.after");
    expect(after("swimming")).toBe("swimming.after");
    // A sport with no stretches of its own: the hour decides.
    expect(after("paragliding")).toBe("desk");
    expect(after("walking")).toBe("desk");
    expect(after("stretching")).toBe("desk");
  });

  it("names only categories there are", () => {
    const keys = new Set(CATEGORIES.map((c) => c.key));
    for (const sport of Object.values(STRETCH_SPORT)) {
      expect(keys.has(`${sport}.after`)).toBe(true);
    }
    for (const key of ["morning", "bedtime", "desk", "fullBody"]) {
      expect(keys.has(key)).toBe(true);
      // Each of them comes in five minutes, gentle, with a mat.
      expect(defaultChoice(category(key))).toEqual({
        minutes: 5,
        level: "gentle",
        where: "any",
      });
    }
  });

  it("is «Morning» before 10, «Bedtime» from 9 in the evening", () => {
    expect(todayCategory(at(27, 6))).toBe("morning");
    expect(todayCategory(at(27, 9, 59))).toBe("morning");
    expect(todayCategory(at(27, 0, 30))).toBe("morning");
    expect(todayCategory(at(27, 21))).toBe("bedtime");
    expect(todayCategory(at(27, 23, 59))).toBe("bedtime");
    // On a Sunday as on a Friday.
    expect(todayCategory(at(29, 8))).toBe("morning");
    expect(todayCategory(at(29, 22))).toBe("bedtime");
  });

  it("is «Desk break» on a working day between 10 and 18, «Full body» otherwise", () => {
    expect(todayCategory(at(27, 10))).toBe("desk");
    expect(todayCategory(at(27, 17, 59))).toBe("desk");
    expect(todayCategory(at(27, 18))).toBe("fullBody");
    expect(todayCategory(at(27, 20, 59))).toBe("fullBody");
    // Monday is one, Saturday and Sunday are not.
    expect(todayCategory(at(23, 12))).toBe("desk");
    expect(todayCategory(at(28, 12))).toBe("fullBody");
    expect(todayCategory(at(29, 12))).toBe("fullBody");
    expect(todayCategory(at(27, 12), null)).toBe("desk");
  });
});
