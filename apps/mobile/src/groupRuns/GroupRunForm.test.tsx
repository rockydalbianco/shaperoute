/**
 * «New group run» (TASK-309 part B): the route with a title, the day and
 * the time with the phone's offset, «Where exactly», notes and who can see
 * it; the API's words when it refuses; the same form changes one published.
 */
import detail from "@shaperoute/shared-types/fixtures/group-run.json";
import favorite from "@shaperoute/shared-types/fixtures/favorite-request.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { GroupRunDetail, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AccountState } from "../account/useAccount";
import type { Keepable } from "../favorites/favoriteRoute";
import { FollowsContext } from "../social/followsDoor";
import { firstStart, withOffset } from "./dayTime";
import { GroupRunForm, SAFETY } from "./GroupRunForm";

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

const NOW = new Date(2026, 10, 21, 18, 7);
const ROUTE: Keepable = {
  id: "route-1",
  request: favorite as Keepable["request"],
};
const RUN = detail as unknown as GroupRunDetail;

function fetchAnswering(status: number, body: unknown) {
  return jest.fn(async (_url: string, _init?: RequestInit) =>
    Response.json(body, { status }),
  );
}

async function shown(
  mode: Parameters<typeof GroupRunForm>[0]["mode"],
  fetchFn: jest.Mock,
  onDone = jest.fn(),
) {
  const state: AccountState = { status: "signedIn", session: session as Session };
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: "http://api",
        account: { state, sessionEnded: () => {} },
        openProfile: () => {},
      }}
    >
      <GroupRunForm
        mode={mode}
        onClose={() => {}}
        onDone={onDone}
        now={() => NOW}
        fetchFn={fetchFn as unknown as typeof fetch}
        apiKey={null}
      />
    </FollowsContext.Provider>,
  );
  return onDone;
}

test("«Publish» sends the route whole with when, where and who sees it", async () => {
  const fetchFn = fetchAnswering(201, detail);
  const onDone = await shown({ kind: "new", route: ROUTE }, fetchFn);
  expect(screen.getByText(SAFETY)).toBeTruthy();
  await fireEvent.changeText(
    screen.getByTestId("group-run-title"),
    "  Star at the MUSE ",
  );
  await fireEvent.changeText(
    screen.getByTestId("group-run-meeting"),
    " MUSE entrance ",
  );
  await fireEvent.press(screen.getByTestId("group-run-followers"));
  await fireEvent.press(screen.getByTestId("group-run-time-more"));
  await fireEvent.press(screen.getByTestId("group-run-publish"));
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/group-runs");
  expect(init?.method).toBe("POST");
  const at = new Date(firstStart(NOW).getTime() + 15 * 60_000);
  expect(JSON.parse(String(init?.body))).toEqual({
    ...favorite,
    title: "Star at the MUSE",
    starts_at: withOffset(at),
    meeting_note: "MUSE entrance",
    description: null,
    visibility: "followers",
  });
  expect(onDone).toHaveBeenCalledWith(detail);
});

test("a refusal shows the API's own words and keeps the form", async () => {
  const fetchFn = fetchAnswering(422, {
    error: {
      code: "invalid_request",
      message: "You can have 10 upcoming group runs at most.",
      suggested_distance_m: null,
      reason: null,
    },
  });
  const onDone = await shown({ kind: "new", route: ROUTE }, fetchFn);
  await fireEvent.press(screen.getByTestId("group-run-publish"));
  expect(
    await screen.findByText("You can have 10 upcoming group runs at most."),
  ).toBeTruthy();
  expect(onDone).not.toHaveBeenCalled();
});

test("without a title nothing goes", async () => {
  const fetchFn = fetchAnswering(201, detail);
  await shown({ kind: "new", route: ROUTE }, fetchFn);
  await fireEvent.changeText(screen.getByTestId("group-run-title"), "   ");
  const publish = screen.getByTestId("group-run-publish");
  expect(publish.props.accessibilityState.disabled).toBe(true);
});

test("changing one sends the four fields, and who sees it stays", async () => {
  const fetchFn = fetchAnswering(200, detail);
  await shown({ kind: "change", run: RUN }, fetchFn);
  expect(screen.queryByTestId("group-run-followers")).toBeNull();
  expect(screen.getByTestId("group-run-title").props.value).toBe(RUN.title);
  await fireEvent.changeText(screen.getByTestId("group-run-notes"), "");
  await fireEvent.press(screen.getByTestId("group-run-publish"));
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/group-runs/${RUN.id}`);
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(String(init?.body))).toEqual({
    title: RUN.title,
    starts_at: withOffset(new Date(RUN.starts_at)),
    meeting_note: RUN.meeting_note,
    description: null,
  });
});
