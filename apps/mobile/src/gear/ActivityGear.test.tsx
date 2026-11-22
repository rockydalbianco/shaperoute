import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Gear, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { FollowsContext } from "../social/followsDoor";
import { ActivityGear } from "./ActivityGear";
import { keepGearFor, loadGearOutbox } from "./gearOut";

// «Gear» in the «…» of a saved activity (TASK-486 part C, ADR-0393): the
// items on it and those in use, the whole list put back at «Done».

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// The phone's documents folder, in memory.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const URL = "http://api";
const KEY = "a1b2c3d4e5f60718";
const [SHOES, HELMET] = list.gear as Gear[];
const BIKE: Gear = { ...SHOES, id: "bike", kind: "bike", name: "Canyon" };
const OWNER = (session as Session).user.id;

async function show(fetchFn: jest.Mock, on = true) {
  const onClosed = jest.fn();
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: null,
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded: jest.fn(),
        },
        openProfile: () => {},
      }}
    >
      <ActivityGear
        activityKey={KEY}
        onClosed={onClosed}
        api={{ baseUrl: URL, fetchFn, key: null }}
        on={on}
      />
    </FollowsContext.Provider>,
  );
  return onClosed;
}

test("off, or without items, there is no «Gear» in the «…»", async () => {
  const off: jest.Mock = answers();
  await show(off, false);
  expect(screen.queryByTestId("activity-gear")).toBeNull();
  expect(off).not.toHaveBeenCalled();
});

test("the items on it and in use are offered, a retired one only if on it", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { gear: [SHOES, BIKE, HELMET] } },
    { status: 200, body: { gear: [HELMET] } },
    { status: 200, body: { gear: [HELMET, BIKE] } },
  );
  const onClosed = await show(fetchFn);
  await fireEvent.press(await screen.findByTestId("activity-gear"));
  expect(await screen.findByText("👟 The red ones")).toBeOnTheScreen();
  expect(String(fetchFn.mock.calls[1][0])).toBe(`http://api/me/activities/${KEY}/gear`);
  expect(screen.getByTestId(`gear-chip-${HELMET.id}`)).toBeSelected();
  expect(screen.getByTestId(`gear-chip-${SHOES.id}`)).not.toBeSelected();
  await fireEvent.press(screen.getByText("🚲 Canyon"));
  await fireEvent.press(screen.getByText("Done"));
  await waitFor(() => expect(onClosed).toHaveBeenCalled());
  const [url, init] = fetchFn.mock.calls[2] as [string, RequestInit];
  expect(url).toBe(`http://api/me/activities/${KEY}/gear`);
  expect(init.method).toBe("PUT");
  expect(JSON.parse(String(init.body))).toEqual({ gear_ids: [HELMET.id, "bike"] });
});

test("a list left by the end of the activity does not undo a change here", async () => {
  keepGearFor(OWNER, KEY, [SHOES.id]);
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { gear: [SHOES] } },
    { status: 200, body: { gear: [] } },
    { status: 200, body: { gear: [] } },
  );
  const onClosed = await show(fetchFn);
  await fireEvent.press(await screen.findByTestId("activity-gear"));
  await fireEvent.press(await screen.findByText("Done"));
  await waitFor(() => expect(onClosed).toHaveBeenCalled());
  expect(loadGearOutbox()).toEqual([]);
});

test("an activity not on the API yet says so", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { gear: [SHOES] } },
    { status: 404, body: apiError("http_error") },
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByTestId("activity-gear"));
  expect(
    await screen.findByText(
      "This activity is still on its way. Try again in a moment.",
    ),
  ).toBeOnTheScreen();
});

test("a list the API will not take keeps the sheet open, and says so", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { gear: [SHOES] } },
    { status: 200, body: { gear: [] } },
    new Error("offline"),
  );
  const onClosed = await show(fetchFn);
  await fireEvent.press(await screen.findByTestId("activity-gear"));
  await fireEvent.press(await screen.findByText("👟 The red ones"));
  await fireEvent.press(screen.getByText("Done"));
  expect(
    await screen.findByText("No connection. Try again when you are online."),
  ).toBeOnTheScreen();
  expect(onClosed).not.toHaveBeenCalled();
});
