import { dayLabel } from "../activities/activityText";
import { agoLabel, commentsLabel } from "./commentText";

const NOW = Date.parse("2026-10-03T12:00:00Z");

test("how long ago a comment was written", () => {
  const ago = (iso: string) => agoLabel(iso, NOW);
  expect(ago("2026-10-03T11:59:30Z")).toBe("just now");
  // A phone a little behind the API: never a time to come.
  expect(ago("2026-10-03T12:00:20Z")).toBe("just now");
  expect(ago("2026-10-03T11:55:00Z")).toBe("5 min ago");
  expect(ago("2026-10-03T09:00:00Z")).toBe("3 h ago");
  expect(ago("2026-10-01T11:00:00Z")).toBe("2 d ago");
  expect(ago("2026-09-20T07:13:20Z")).toBe(dayLabel("2026-09-20T07:13:20Z"));
  expect(ago("yesterday")).toBe("");
});

test("the button under a drawing says how many", () => {
  expect(commentsLabel(0)).toBe("Write a comment");
  expect(commentsLabel(1)).toBe("1 comment");
  expect(commentsLabel(12)).toBe("12 comments");
});
