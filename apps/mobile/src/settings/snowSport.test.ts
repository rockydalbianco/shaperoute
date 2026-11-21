/**
 * A day on the snow (TASK-375, ADR-0319): «Ski» and «Cross-country ski» are
 * recorded without a shape and saved as "skiing" and "xc_skiing". «Ski» is
 * in the store builds since part D4; «Cross-country ski» stays out. «Ski
 * touring» 🏔️ is too, saved as "ski_touring", since TASK-415 part B.
 */
import { RECORD_ACTIVITIES, RUN_ACTIVITIES } from "@shaperoute/shared-types";

import { freeRunActivity } from "../navigation/freeSport";
import { withoutRouteIcon } from "../screens/RunNoRouteButton";
import {
  activityOf,
  ALL_SPORTS,
  canChoose,
  isRecordOnly,
  runActivityOf,
  shownSports,
  type Sport,
  type SportOption,
  withoutRouteLabel,
} from "./sport";

const EVERY: Sport[] = ALL_SPORTS.map((option) => option.id);

test("«Ski» ⛷️, «Cross-country ski» 🎿, «Ski touring» 🏔️ and «Paragliding» 🪂 are recorded without a shape", () => {
  const snow = ALL_SPORTS.filter((option) => option.recordOnly === true);
  expect(snow.map(({ id, emoji, name }) => [id, emoji, name])).toEqual([
    ["ski", "⛷️", "Ski"],
    ["xc_ski", "🎿", "Cross-country ski"],
    ["skimo", "🏔️", "Ski touring"],
    // A day of mountaineering, since TASK-463 part B («Soon» for now).
    ["alpinism", "🧗", "Mountaineering"],
    // A flight, since TASK-305 part R2.
    ["paragliding", "🪂", "Paragliding"],
  ]);
  expect(isRecordOnly("ski")).toBe(true);
  expect(isRecordOnly("xc_ski")).toBe(true);
  expect(isRecordOnly("skimo")).toBe(true);
  expect(isRecordOnly("paragliding")).toBe(true);
  expect(isRecordOnly("alpinism")).toBe(true);
  const recorded = ["ski", "xc_ski", "skimo", "alpinism", "paragliding"];
  for (const sport of EVERY.filter((id) => !recorded.includes(id))) {
    expect(isRecordOnly(sport)).toBe(false);
  }
});

test("«Ski» (D4) and «Cross-country ski» are on, in the store builds too", () => {
  expect(canChoose("ski")).toBe(true);
  expect(canChoose("xc_ski")).toBe(true);
  const store = shownSports(ALL_SPORTS, true).map((option) => option.id);
  expect(store).toContain("ski");
  expect(store).toContain("xc_ski");
  // Not ready, it would say «Soon» and be left out of the store builds.
  const notReady: SportOption[] = ALL_SPORTS.map((option) =>
    option.id === "xc_ski" ? { ...option, ready: false } : option,
  );
  expect(canChoose("xc_ski", notReady)).toBe(false);
  expect(shownSports(notReady, true).map((option) => option.id)).not.toContain(
    "xc_ski",
  );
});

test("a day on the snow is saved as its own activity, the others as their route", () => {
  expect(runActivityOf("ski")).toBe("skiing");
  expect(runActivityOf("xc_ski")).toBe("xc_skiing");
  expect(runActivityOf("skimo")).toBe("ski_touring");
  // The gym is saved as a workout, without a route (TASK-385 B).
  expect(runActivityOf("gym")).toBe("gym");
  for (const sport of EVERY.filter((id) => !isRecordOnly(id) && id !== "gym")) {
    expect(runActivityOf(sport)).toBe(activityOf(sport));
  }
  expect(runActivityOf("walk")).toBe("walking");
  // Every one is an activity the API saves, and the snow is apart.
  for (const sport of EVERY) {
    expect(RUN_ACTIVITIES).toContain(runActivityOf(sport));
  }
  // Ski touring too, since TASK-415 part B; a flight since TASK-305 R2; a
  // day of mountaineering since TASK-463 B, in the menu after ski touring.
  expect(
    EVERY.filter((id) => isRecordOnly(id))
      .map(runActivityOf)
      .sort(),
  ).toEqual([...RECORD_ACTIVITIES].sort());
  // No route is ever asked for the snow: «Draw» asks a run, never shown.
  expect(activityOf("ski")).toBe("running");
});

test("«Draw» says «Record your day», with the sport's sign", () => {
  expect(withoutRouteLabel("ski")).toBe("Record your day");
  expect(withoutRouteLabel("xc_ski")).toBe("Record your day");
  expect(withoutRouteIcon("ski")).toBe("⛷️");
  expect(withoutRouteIcon("xc_ski")).toBe("🎿");
  expect(withoutRouteLabel("skimo")).toBe("Record your day");
  expect(withoutRouteIcon("skimo")).toBe("🏔️");
  expect(withoutRouteLabel("alpinism")).toBe("Record your day");
  expect(withoutRouteIcon("alpinism")).toBe("🧗");
});

test("until part C, downhill shows a ride's speeds and across country a pace", () => {
  expect(freeRunActivity("skiing")).toBe("cycling");
  expect(freeRunActivity("xc_skiing")).toBeUndefined();
  expect(freeRunActivity("running")).toBeUndefined();
  expect(freeRunActivity("paddling")).toBe("paddling");
  expect(freeRunActivity("walking")).toBe("walking");
});
