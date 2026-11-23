/**
 * «Plan a live» (TASK-468 part B2b1): tomorrow at 9:00 first; the day and
 * the time move within what the API takes; the request it sends.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import {
  firstStart,
  LATEST_DAYS,
  movedDay,
  movedTime,
  PlanLiveSheet,
} from "./PlanLiveSheet";

// The sheet's own edges: the window's, which jest does not have.
jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    },
  };
});

const NOW = new Date(2026, 10, 18, 14, 30);

test("first tomorrow at 9:00; the day and the time move within limits", () => {
  const first = firstStart(NOW);
  expect([first.getDate(), first.getHours(), first.getMinutes()]).toEqual([19, 9, 0]);
  expect(movedDay(first, 1, NOW).getDate()).toBe(20);
  // Not before now, not past the last day the API takes.
  expect(movedDay(first, -2, NOW)).toBe(first);
  expect(movedDay(first, LATEST_DAYS + 1, NOW)).toBe(first);
  expect(movedTime(first, 1, NOW).getMinutes()).toBe(15);
  // Never into another day.
  const late = new Date(2026, 10, 19, 23, 50);
  expect(movedTime(late, 1, NOW)).toBe(late);
});

test("«Plan» sends the sport, the name, the time, who can follow and the heart", async () => {
  const fetchFn = jest.fn(async (_url: string, _init?: RequestInit) =>
    Response.json({ id: "p", state: "planned" }, { status: 201 }),
  );
  const onPlanned = jest.fn();
  const onClose = jest.fn();
  const state: AccountState = { status: "signedIn", session: session as Session };
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: { state, sessionEnded: () => {} },
        openProfile: () => {},
      }}
    >
      <PlanLiveSheet
        api={{
          baseUrl: "http://api",
          token: "t",
          fetchFn: fetchFn as unknown as typeof fetch,
          key: null,
        }}
        onClose={onClose}
        onPlanned={onPlanned}
        now={() => NOW}
      />
    </FollowsContext.Provider>,
  );
  const plan = screen.getByTestId("plan-live-plan");
  expect(plan.props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(
    screen.getByTestId("plan-live-title"),
    "  Milano Marathon ",
  );
  await fireEvent.press(screen.getByTestId("plan-live-everyone"));
  await fireEvent(screen.getByTestId("plan-live-heart"), "valueChange", true);
  await fireEvent.press(screen.getByTestId("plan-live-plan"));
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/planned-lives");
  const body = JSON.parse(String(init?.body));
  expect(body).toEqual({
    activity: "running",
    title: "Milano Marathon",
    starts_at: firstStart(NOW).toISOString(),
    audience_feed: "everyone",
    heart_visible: true,
  });
  expect(onPlanned).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
});
