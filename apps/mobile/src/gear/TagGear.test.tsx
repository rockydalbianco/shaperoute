import item from "@shaperoute/shared-types/fixtures/gear.json";
import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import type { Gear } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { TagGear } from "./TagGear";

// The item of gear a tagged item is (TASK-486 part F, ADR-0393): a small
// line in the sheet of its dot, which opens the item.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const HELMET = (list.gear as Gear[])[1] as Gear;
const ANNA = { public_id: "p-anna", username: "anna" };
const TOKEN = "the-token";

async function show(
  fetchFn: jest.Mock,
  { on = true, owner = ANNA }: { on?: boolean; owner?: typeof ANNA | null } = {},
) {
  const sessionEnded = jest.fn();
  await render(
    <TagGear
      gearId={item.id}
      owner={owner}
      apiUrl="http://api"
      token={TOKEN}
      onSessionEnded={sessionEnded}
      fetchFn={fetchFn}
      apiKey={null}
      on={on}
    />,
  );
  return sessionEnded;
}

test("off, nothing is asked and nothing shown", async () => {
  const fetchFn: jest.Mock = answers();
  await show(fetchFn, { on: false });
  expect(screen.queryByTestId("tag-gear")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("an item one does not see, or an API without gear, shows nothing", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  await show(fetchFn);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("tag-gear")).toBeNull();
});

test("one line: its emoji, its name and its measure", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: item });
  await show(fetchFn);
  expect(await screen.findByTestId("tag-gear")).toBeOnTheScreen();
  expect(String(fetchFn.mock.calls[0][0])).toBe(`http://api/gear/${item.id}`);
  expect(screen.getByText("👟 The red ones · 412.3 km")).toBeOnTheScreen();
  expect(screen.getByLabelText("Shoes, The red ones, 412.3 km")).toBeOnTheScreen();
});

test("a worn item tells its hours", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: HELMET });
  await show(fetchFn);
  expect(await screen.findByText("⛑️ Petzl · 2 h")).toBeOnTheScreen();
});

test("a touch opens the item, which the others can report", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: item });
  await show(fetchFn);
  await fireEvent.press(await screen.findByTestId("tag-gear-line"));
  expect(await screen.findByTestId("gear-sheet")).toBeOnTheScreen();
  expect(screen.getByTestId("report-menu")).toBeOnTheScreen();
});

test("one's own item has no «…»", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: item });
  await show(fetchFn, { owner: null });
  await fireEvent.press(await screen.findByTestId("tag-gear-line"));
  expect(await screen.findByTestId("gear-sheet")).toBeOnTheScreen();
  expect(screen.queryByTestId("report-menu")).toBeNull();
});

test("an ended session is told", async () => {
  const fetchFn: jest.Mock = answers({
    status: 401,
    body: apiError("session_expired"),
  });
  const sessionEnded = await show(fetchFn);
  await waitFor(() => expect(sessionEnded).toHaveBeenCalledWith(TOKEN));
});
