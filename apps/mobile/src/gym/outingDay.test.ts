import {
  beyondDraw,
  doneLine,
  drawDistanceM,
  outingAmount,
  outingTitle,
} from "./outingDay";

// TASK-461 B and C (ADR-0371): a day out says its sport and how much, and
// «Draw» draws it up to its sport's longest («Draw disegna al massimo 30 km»).

test("a day out says its sport and how much", () => {
  expect(outingTitle({ sport: "bike", kind: "long", distance_m: 45_000 })).toBe(
    "Long ride · 45 km",
  );
  expect(
    outingTitle({ sport: "swim", kind: "intervals", reps: 8, rep_m: 100, pool: true }),
  ).toBe("Swim sets · 8 × 100 m");
  expect(outingTitle({ sport: "bike", kind: "intervals", reps: 5, rep_s: 180 })).toBe(
    "Bike intervals · 5 × 3:00",
  );
  expect(
    outingTitle({ sport: "walk", kind: "brisk", duration_s: 2700, climb_m: 150 }),
  ).toBe("Brisk walk uphill · 45 min");
  expect(
    outingTitle({ sport: "hike", kind: "climb", climb_m: 600, distance_m: 12_000 }),
  ).toBe("Climb outing · 600 m");
  expect(outingAmount({ sport: "swim", kind: "long", distance_m: 800 })).toBe("800 m");
  expect(outingAmount({ sport: "walk", kind: "easy", distance_m: 6500 })).toBe(
    "6.5 km",
  );
});

test("beyond what «Draw» draws, the day is recorded freely; within, drawn", () => {
  const long = { sport: "bike", kind: "long", distance_m: 45_000 } as const;
  expect(beyondDraw(long)).toBe(true);
  expect(drawDistanceM(long)).toBe(30_000);
  const ride = { sport: "bike", kind: "easy", distance_m: 20_000 } as const;
  expect(beyondDraw(ride)).toBe(false);
  expect(drawDistanceM(ride)).toBe(20_000);
  expect(drawDistanceM({ sport: "swim", kind: "long", distance_m: 4000 })).toBe(3000);
  expect(
    drawDistanceM({ sport: "bike", kind: "intervals", reps: 5, rep_s: 180 }),
  ).toBeNull();
});

test("an activity of the sport marks the day done", () => {
  expect(doneLine({ sport: "bike", kind: "long", distance_m: 45_000 })).toBe(
    "A ride today marks the day done, even a shorter one.",
  );
  expect(doneLine({ sport: "hike", kind: "climb", climb_m: 600 })).toBe(
    "A hike today marks the day done, even with less climb.",
  );
});
