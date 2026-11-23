import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import type { Gear } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { boughtLabel } from "./GearSheet";
import { ProfileGear } from "./ProfileGear";

// «Gear» on a profile (TASK-486 part D, ADR-0393): the items in use, then
// «Retired»; a touch opens the item, which the others can report.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const [SHOES, HELMET] = list.gear as Gear[];
const NOTED: Gear = { ...SHOES, note: "Bought in Milan, ran Rome in them" };
const OWNER = { public_id: "p-1", username: "anna" };

async function show(
  fetchFn: jest.Mock,
  { on = true, owner = OWNER }: { on?: boolean; owner?: typeof OWNER | null } = {},
) {
  const onSessionEnded = jest.fn();
  await render(
    <ProfileGear
      apiUrl="http://api"
      token="the-token"
      publicId="p-1"
      owner={owner}
      onSessionEnded={onSessionEnded}
      fetchFn={fetchFn}
      apiKey={null}
      on={on}
    />,
  );
  return onSessionEnded;
}

test("off, nothing is asked and nothing shown", async () => {
  const fetchFn: jest.Mock = answers();
  await show(fetchFn, { on: false });
  expect(screen.queryByTestId("profile-gear")).toBeNull();
  expect(fetchFn).not.toHaveBeenCalled();
});

test("no items shows nothing", async () => {
  const empty: jest.Mock = answers({ status: 200, body: { gear: [] } });
  await show(empty);
  expect(empty).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("profile-gear")).toBeNull();
});

test("an API without gear, or a profile kept apart, shows nothing", async () => {
  const old: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  await show(old);
  expect(old).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("profile-gear")).toBeNull();
});

test("the items in use come first, then the retired ones", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn);
  expect(await screen.findByTestId("profile-gear")).toBeOnTheScreen();
  expect(String(fetchFn.mock.calls[0][0])).toBe("http://api/users/p-1/gear");
  const words = screen.getAllByText(/The red ones|Retired|Petzl/).map((node) => {
    const text = node.props.children;
    return Array.isArray(text) ? text.join("") : String(text);
  });
  expect(words).toEqual(["The red ones", "Retired", "Petzl"]);
  expect(screen.getByText("412.3 km · 38 activities")).toBeOnTheScreen();
});

test("a touch opens the item, which the others can report", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: [NOTED] } });
  await show(fetchFn);
  await fireEvent.press(await screen.findByTestId(`profile-gear-${SHOES.id}`));
  expect(await screen.findByTestId("gear-sheet")).toBeOnTheScreen();
  expect(screen.getByTestId("gear-sheet-photo")).toBeOnTheScreen();
  // The row and the sheet both say it.
  expect(screen.getAllByText("Shoes · Nike Pegasus 41")).toHaveLength(2);
  expect(screen.getByText(boughtLabel("2025-03-01"))).toBeOnTheScreen();
  expect(screen.getByText("Bought in Milan, ran Rome in them")).toBeOnTheScreen();
  expect(screen.getByTestId("report-menu")).toBeOnTheScreen();
});

test("on one's own profile the item has no «…»", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: [HELMET] } });
  await show(fetchFn, { owner: null });
  await fireEvent.press(await screen.findByTestId(`profile-gear-${HELMET.id}`));
  expect(await screen.findByTestId("gear-sheet")).toBeOnTheScreen();
  expect(screen.queryByTestId("gear-sheet-photo")).toBeNull();
  expect(screen.queryByTestId("report-menu")).toBeNull();
});

test("an ended session is told", async () => {
  const fetchFn: jest.Mock = answers({
    status: 401,
    body: apiError("session_expired"),
  });
  const onSessionEnded = await show(fetchFn);
  await waitFor(() => expect(onSessionEnded).toHaveBeenCalledWith("the-token"));
});

test("the month an item was bought, in words", () => {
  expect(boughtLabel("2025-03-01")).toMatch(/2025/);
  expect(boughtLabel("someday")).toBe("someday");
});
