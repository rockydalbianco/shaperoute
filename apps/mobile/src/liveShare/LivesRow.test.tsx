/**
 * The «Live» row of the Feed (TASK-468 part B2a): the cards' lines, the live
 * opened from a card going on, «Remind me» on a planned one of somebody
 * else, nothing without lives.
 */
import page from "@shaperoute/shared-types/fixtures/lives-page.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { LiveItem, LivesPage, Session } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import { distanceLabel } from "../units/format";
import { isGoing, liveLine, LivesRow } from "./LivesRow";

jest.mock("./LiveViewScreen", () => ({
  LiveViewScreen: ({ shareId, name }: { shareId: string; name: string }) => {
    const { Text } = jest.requireActual("react-native");
    return <Text>{`watching ${name} ${shareId}`}</Text>;
  },
}));

const API = "http://api";
const SIGNED_IN: AccountState = { status: "signedIn", session: session as Session };
const [going, planned] = (page as LivesPage).lives as LiveItem[];
const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function server(lives: LiveItem[]) {
  return jest.fn(async (url: string, _init?: RequestInit) => {
    if (url.startsWith(`${API}/lives`)) {
      return Response.json({ lives, next: null });
    }
    return new Response(null, { status: 204 });
  });
}

async function show(fetchFn: ReturnType<typeof server>): Promise<void> {
  await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <FollowsContext.Provider
        value={{
          apiUrl: API,
          account: { state: SIGNED_IN, sessionEnded: () => {} },
          openProfile: () => {},
        }}
      >
        <LivesRow fetchFn={fetchFn as unknown as typeof fetch} apiKey={null} />
      </FollowsContext.Provider>
    </SafeAreaProvider>,
  );
  await act(async () => {});
}

test("the lines: LIVE with its distance; planned with its day, time and title", () => {
  expect(isGoing(going)).toBe(true);
  expect(liveLine(going)).toBe(`LIVE · Bike · ${distanceLabel(3200)}`);
  expect(isGoing(planned)).toBe(false);
  expect(liveLine(planned, "en-GB")).toMatch(
    /^Live · Sun \d\d:\d\d · Milano Marathon$/,
  );
  const finished = { ...going, state: "finished" as const, duration_s: 600 };
  expect(liveLine(finished)).toBe(`Finished · ${distanceLabel(3200)} · 10:00`);
});

test("a card going on opens the live; a planned one offers «Remind me»", async () => {
  const fetchFn = server([going, planned]);
  await show(fetchFn);
  expect(screen.getByTestId("lives-row")).toBeTruthy();
  await fireEvent.press(screen.getByTestId(`lives-card-${going.id}`));
  expect(screen.getByText(`watching bob ${going.share_id}`)).toBeTruthy();
  const remind = screen.getByTestId(`lives-remind-${planned.id}`);
  expect(remind.props.accessibilityState.selected).toBe(true);
  await fireEvent.press(remind);
  const asked = fetchFn.mock.calls.find(([, init]) => init?.method === "DELETE");
  expect(asked?.[0]).toBe(`${API}/planned-lives/${planned.planned_live_id}/reminder`);
  expect(
    screen.getByTestId(`lives-remind-${planned.id}`).props.accessibilityState.selected,
  ).toBe(false);
});

test("nothing without lives", async () => {
  await show(server([]));
  expect(screen.queryByTestId("lives-row")).toBeNull();
});
