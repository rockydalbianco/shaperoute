/** The start of a planned live with a recording (TASK-468 part B2b1). */
import page from "@shaperoute/shared-types/fixtures/lives-page.json";
import type { LiveItem, LivesPage } from "@shaperoute/shared-types";
import { Alert, type AlertButton } from "react-native";

import { askToStart, plannedNow } from "./usePlannedStart";

const [, planned] = (page as LivesPage).lives as LiveItem[];

afterEach(() => jest.restoreAllMocks());

test("only one's own planned live within its hours", () => {
  expect(plannedNow([planned])).toBeNull();
  const now = { ...planned, can_start: true };
  expect(plannedNow([planned, now])).toBe(now);
});

test("«Start live “…”?» says who can follow, and a no starts nothing", () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const onStart = jest.fn();
  askToStart({ ...planned, can_start: true }, onStart);
  const [title, message, buttons] = alert.mock.calls[0];
  expect(title).toBe('Start live "Milano Marathon"?');
  expect(message).toBe("Everyone can follow you now.");
  const choices = buttons as AlertButton[];
  expect(choices.map((b) => b.text)).toEqual(["Not this time", "Start live"]);
  expect(choices[0].onPress).toBeUndefined();
  choices[1].onPress?.();
  expect(onStart).toHaveBeenCalled();
  askToStart({ ...planned, audience_feed: "followers" }, onStart);
  expect(alert.mock.calls[1][1]).toBe("Your followers can follow you now.");
});
