import { GEAR_KINDS, type Gear } from "@shaperoute/shared-types";
import one from "@shaperoute/shared-types/fixtures/gear.json";

import {
  GEAR_LOOKS,
  gearSubtitle,
  gearTitle,
  hoursLabel,
  lookOf,
  pastLimit,
  totalsLabel,
} from "./gearKinds";

// The kinds of gear as the app shows them (TASK-486 part B, ADR-0393).

const SHOES = one as Gear;

test("every kind of the API has a look", () => {
  expect(Object.keys(GEAR_LOOKS).sort()).toEqual([...GEAR_KINDS].sort());
  expect(lookOf("kite")).toBe(GEAR_LOOKS.other);
});

test("the owner's name first, brand and model under it", () => {
  expect(gearTitle(SHOES)).toBe("The red ones");
  expect(gearSubtitle(SHOES)).toBe("Shoes · Nike Pegasus 41");
  const nameless = { ...SHOES, name: undefined };
  expect(gearTitle(nameless)).toBe("Nike Pegasus 41");
  expect(gearSubtitle(nameless)).toBe("Shoes");
});

test("what goes far says kilometres, what is worn says hours", () => {
  expect(totalsLabel(SHOES, "km")).toBe("412.3 km · 38 activities");
  const helmet = { ...SHOES, kind: "helmet" as const };
  expect(totalsLabel(helmet, "km")).toBe("41 h · 38 activities");
  expect(hoursLabel(2400)).toBe("40 min");
  expect(hoursLabel(5400)).toBe("1.5 h");
  expect(hoursLabel(7200)).toBe("2 h");
  expect(
    totalsLabel({ ...SHOES, totals: { ...SHOES.totals, activities: 1 } }, "km"),
  ).toBe("412.3 km · 1 activity");
});

test("past the limit only for what goes far", () => {
  expect(pastLimit(SHOES)).toBe(false);
  expect(pastLimit({ ...SHOES, limit_m: 400_000 })).toBe(true);
  expect(pastLimit({ ...SHOES, kind: "helmet", limit_m: 400_000 })).toBe(false);
  expect(pastLimit({ ...SHOES, limit_m: undefined })).toBe(false);
});
