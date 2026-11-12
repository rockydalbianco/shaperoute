/** «Send in MuW» (TASK-468 part B1): several people, at most as the API takes. */
import { MOST_PEOPLE, toggled } from "./SendLiveSheet";

test("a tap chooses, a second one leaves, never more than the API takes", () => {
  expect(toggled([], "a")).toEqual(["a"]);
  expect(toggled(["a", "b"], "a")).toEqual(["b"]);
  const full = Array.from({ length: MOST_PEOPLE }, (_, i) => String(i));
  expect(toggled(full, "x")).toEqual(full);
  expect(MOST_PEOPLE).toBe(20);
});
