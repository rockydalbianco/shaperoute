import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Gear, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { FollowsContext } from "../social/followsDoor";
import { PostGear } from "./PostGear";

// The gear of a post (TASK-486 part E, ADR-0393, the user's choice 6): a
// small line an item in the post's detail, which opens the item.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const [SHOES, HELMET] = list.gear as Gear[];
const ME = session.user.public_id;
const ANNA = { public_id: "p-anna", username: "anna" };

async function show(
  fetchFn: jest.Mock,
  {
    on = true,
    author = ANNA,
    apiUrl = "http://api",
  }: { on?: boolean; author?: typeof ANNA; apiUrl?: string | null } = {},
) {
  const sessionEnded = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl,
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded,
        },
        openProfile: () => {},
      }}
    >
      <PostGear
        drawingId="d-1"
        author={author}
        fetchFn={fetchFn}
        apiKey={null}
        on={on}
      />
    </FollowsContext.Provider>,
  );
  return sessionEnded;
}

test("off, nothing is asked and nothing shown", async () => {
  const fetchFn: jest.Mock = answers();
  await show(fetchFn, { on: false });
  expect(screen.queryByTestId("post-gear")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("without an API nothing is asked", async () => {
  const fetchFn: jest.Mock = answers();
  await show(fetchFn, { apiUrl: null });
  expect(fetchFn).not.toHaveBeenCalled();
});

test("a post without gear, or an API without it, shows nothing", async () => {
  const empty: jest.Mock = answers({ status: 200, body: { gear: [] } });
  await show(empty);
  expect(empty).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("post-gear")).toBeNull();
});

test("an API of before shows nothing", async () => {
  const old: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  await show(old);
  expect(old).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("post-gear")).toBeNull();
});

test("one line an item: its emoji, its name and its measure", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn);
  expect(await screen.findByTestId("post-gear")).toBeOnTheScreen();
  expect(String(fetchFn.mock.calls[0][0])).toBe("http://api/drawings/d-1/gear");
  expect(screen.getByText("👟 The red ones · 412.3 km")).toBeOnTheScreen();
  // A helmet is worn: its hours.
  expect(screen.getByText("⛑️ Petzl · 2 h")).toBeOnTheScreen();
  expect(screen.getByLabelText("Shoes, The red ones, 412.3 km")).toBeOnTheScreen();
});

test("a touch opens the item, which the others can report", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: [SHOES] } });
  await show(fetchFn);
  await fireEvent.press(await screen.findByTestId(`post-gear-${SHOES.id}`));
  expect(await screen.findByTestId("gear-sheet")).toBeOnTheScreen();
  expect(screen.getByTestId("report-menu")).toBeOnTheScreen();
});

test("on one's own post the item has no «…»", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: [HELMET] } });
  await show(fetchFn, { author: { public_id: ME, username: "me" } });
  await fireEvent.press(await screen.findByTestId(`post-gear-${HELMET.id}`));
  expect(await screen.findByTestId("gear-sheet")).toBeOnTheScreen();
  expect(screen.queryByTestId("report-menu")).toBeNull();
});

test("an ended session is told", async () => {
  const fetchFn: jest.Mock = answers({
    status: 401,
    body: apiError("session_expired"),
  });
  const sessionEnded = await show(fetchFn);
  await waitFor(() => expect(sessionEnded).toHaveBeenCalledWith(session.token));
});
