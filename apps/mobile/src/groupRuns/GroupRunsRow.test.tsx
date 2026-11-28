/**
 * The row «Group runs» of the Feed (TASK-309 part B2, docs/EVENTI.md §5,
 * the user's choices of 2026-11-26): the cards with the shape's line, day
 * and time in the phone's time, the km and who goes; the yellow on one's
 * own; nothing without any, from an API of before or without an account;
 * the point rounded, and none without the permission.
 */
import type { GroupRun, LatLon, Session } from "@shaperoute/shared-types";
import row from "@shaperoute/shared-types/fixtures/group-runs.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, StyleSheet, Text } from "react-native";

import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { color } from "../theme/tokens";
import { askedGroupRun, closeGroupRunPage } from "./groupRunDoor";
import { GroupRunsRow, useGroupRuns, whenLabel } from "./GroupRunsRow";

const RUNS = row.group_runs as unknown as GroupRun[];
const [FIRST, SECOND] = RUNS as [GroupRun, GroupRun];

function answering(status: number, body: unknown) {
  return jest.fn(async () => Response.json(body, { status })) as jest.Mock;
}

const NOT_FOUND = {
  error: {
    code: "http_error",
    message: "Not Found",
    suggested_distance_m: null,
    reason: null,
  },
};

function Row({
  active,
  fetchFn,
  point,
}: {
  active: boolean;
  fetchFn: typeof fetch;
  point: () => Promise<LatLon | null>;
}) {
  const shown = useGroupRuns(active, { fetchFn, key: null, point });
  return (
    <>
      <Pressable onPress={shown.refresh} accessibilityRole="button">
        <Text>Pull</Text>
      </Pressable>
      <GroupRunsRow runs={shown.runs} />
    </>
  );
}

async function shown(
  fetchFn: jest.Mock,
  {
    active = true,
    signedIn = true,
    point = async () => [46.06789, 11.12345] as LatLon,
  }: {
    active?: boolean;
    signedIn?: boolean;
    point?: () => Promise<LatLon | null>;
  } = {},
) {
  const follows = {
    apiUrl: "http://api",
    account: {
      state: signedIn
        ? { status: "signedIn", session: session as Session }
        : { status: "signedOut" },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
  await render(
    <FollowsContext.Provider value={follows}>
      <Row active={active} fetchFn={fetchFn as unknown as typeof fetch} point={point} />
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

afterEach(closeGroupRunPage);

test("each card: the line, the title, day and time · km, who goes; a touch opens it", async () => {
  const fetchFn = answering(200, row);
  await shown(fetchFn);
  expect(screen.getByText("Group runs")).toBeOnTheScreen();
  // The point goes rounded to about a kilometre (the user's choice 4).
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/group-runs?lat=46.07&lon=11.12");
  const card = screen.getByTestId(`group-runs-card-${FIRST.id}`);
  expect(card).toHaveTextContent(FIRST.title, { exact: false });
  // Day and time in the phone's time, without the year; the km below.
  expect(card).toHaveTextContent(whenLabel(FIRST.starts_at), { exact: false });
  expect(card).toHaveTextContent("5.0 km", { exact: false });
  expect(screen.getByTestId(`group-runs-going-${FIRST.id}`)).toHaveTextContent(
    "2 going",
  );
  await fireEvent.press(card);
  expect(askedGroupRun()).toEqual({ id: FIRST.id });
});

test("one's own and those one goes to: the yellow edge and «You're going»", async () => {
  const mine = { ...SECOND, i_am_going: true, going: 3 };
  await shown(answering(200, { group_runs: [FIRST, mine] }));
  const edge = (id: string) =>
    StyleSheet.flatten(screen.getByTestId(`group-runs-card-${id}`).props.style)
      .borderColor;
  expect(screen.getByTestId(`group-runs-going-${mine.id}`)).toHaveTextContent(
    "You're going · 3",
  );
  expect(edge(mine.id)).toBe(color.accent);
  expect(edge(FIRST.id)).not.toBe(color.accent);
});

test("an outing with no route: the card without the line", async () => {
  const bare = { ...FIRST, preview: [] };
  await shown(answering(200, { group_runs: [bare] }));
  expect(screen.getByTestId(`group-runs-card-${bare.id}`)).toHaveTextContent(
    bare.title,
    { exact: false },
  );
});

test("none, an API of before or a strange answer: no row", async () => {
  await shown(answering(200, { group_runs: [] }));
  expect(screen.queryByTestId("group-runs-row")).toBeNull();
  await shown(answering(404, NOT_FOUND));
  expect(screen.queryByTestId("group-runs-row")).toBeNull();
  await shown(answering(200, { group_runs: [{}] }));
  expect(screen.queryByTestId("group-runs-row")).toBeNull();
});

test("without the permission, no point: the API gives them from everywhere", async () => {
  const fetchFn = answering(200, row);
  await shown(fetchFn, { point: async () => null });
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/group-runs");
  expect(screen.getByTestId("group-runs-row")).toBeOnTheScreen();
});

test("not asked off the screen nor without an account; the pull asks again", async () => {
  let fetchFn = answering(200, row);
  await shown(fetchFn, { active: false });
  expect(fetchFn).not.toHaveBeenCalled();

  fetchFn = answering(200, row);
  await shown(fetchFn, { signedIn: false });
  expect(fetchFn).not.toHaveBeenCalled();
  expect(screen.queryByTestId("group-runs-row")).toBeNull();

  fetchFn = answering(200, row);
  await shown(fetchFn);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Pull" }));
  await act(async () => {});
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("the day and the time in the phone's time, no year", () => {
  const at = new Date(2026, 10, 27, 14, 5);
  expect(whenLabel(at.toISOString(), "en")).toBe(
    `${at.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" })} · 14:05`,
  );
  expect(whenLabel(at.toISOString(), "en")).not.toContain("2026");
  expect(whenLabel("tomorrow")).toBe("");
});

test("the faces show the members' pictures", async () => {
  const [ada] = FIRST.faces;
  const pictured = { ...FIRST, faces: [{ ...ada!, photo: "/9j/abc" }] };
  await shown(answering(200, { group_runs: [pictured] }));
  expect(screen.getByTestId("avatar-photo").props.source).toEqual({
    uri: "data:image/jpeg;base64,/9j/abc",
  });
});
