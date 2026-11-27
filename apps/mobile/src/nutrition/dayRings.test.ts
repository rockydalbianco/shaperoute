import { ringShares } from "./dayRings";

// The scale of the two rings of a day (TASK-489 part H).

test("the larger of the two goes all the way round", () => {
  expect(ringShares(1500, 2000, null)).toEqual({ eaten: 0.75, used: 1, target: null });
  expect(ringShares(2400, 1800, null)).toEqual({ eaten: 1, used: 0.75, target: null });
});

test("a target larger than both is the whole ring, with its mark at the end", () => {
  expect(ringShares(1000, 1500, 2000)).toEqual({ eaten: 0.5, used: 0.75, target: 1 });
});

test("a target passed has its mark where it was", () => {
  expect(ringShares(2500, 2000, 2000)).toEqual({ eaten: 1, used: 0.8, target: 0.8 });
});

test("a day with nothing written, or still being read, has empty rings", () => {
  expect(ringShares(null, null, null)).toEqual({ eaten: 0, used: 0, target: null });
  expect(ringShares(null, 1764, null)).toEqual({ eaten: 0, used: 1, target: null });
  expect(ringShares(300, null, null)).toEqual({ eaten: 1, used: 0, target: null });
  expect(ringShares(0, 0, 0)).toEqual({ eaten: 0, used: 0, target: null });
});
