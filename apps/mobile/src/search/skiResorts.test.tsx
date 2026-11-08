import resorts from "@shaperoute/shared-types/fixtures/ski-resorts.json";
import weather from "@shaperoute/shared-types/fixtures/ski-resort-weather.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import { FollowsContext } from "../social/followsDoor";
import { SearchScreen } from "./SearchScreen";
import { SEARCH_DELAY_MS } from "./useDrawingSearch";

// TASK-406 part C: the tab «Ski» has the ski resorts, near or by name, and
// a resort touched opens its page over the search, without an account.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 46.381234, longitude: 11.523456 },
  })),
}));
// The documents of the phone, in memory: the recent searches.
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

const API = "http://api";
const [FIRST] = resorts.resorts;
let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  jest.useFakeTimers();
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const path = String(input).replace(API, "");
    const body = path.startsWith("/ski-resorts/") ? weather : resorts;
    return new Response(JSON.stringify(body), { status: 200 });
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
  jest.useRealTimers();
});

async function pause() {
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DELAY_MS);
  });
}

async function open() {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: {
          state: { status: "signedOut", notice: null },
          sessionEnded: () => {},
        },
        openProfile: () => {},
      }}
    >
      <SearchScreen visible onClose={jest.fn()} onOpenExample={jest.fn()} />
    </FollowsContext.Provider>,
  );
}

/** The paths asked of the API, with no host. */
function asked(): string[] {
  return fetchSpy.mock.calls.map(([input]) => String(input).replace(API, ""));
}

test("«Ski» shows the resorts near the phone, and asks nothing before it opens", async () => {
  await open();
  await pause();
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(asked().filter((path) => path.startsWith("/ski-resorts"))).toEqual([]);
  await fireEvent.press(screen.getByTestId("search-tab-ski"));
  await pause();
  expect(screen.getByText("Near you")).toBeOnTheScreen();
  expect(asked()).toContain("/ski-resorts?lat=46.38&lon=11.52");
  expect(screen.getByTestId(`resort-${FIRST.id}`)).toBeOnTheScreen();
});

test("a name typed in «Ski» finds the resorts by name", async () => {
  await open();
  await fireEvent.press(screen.getByTestId("search-tab-ski"));
  await fireEvent.changeText(screen.getByTestId("search-field"), "Alpe");
  await pause();
  expect(asked()).toContain("/ski-resorts?q=Alpe");
  expect(screen.getByText("Ski resorts")).toBeOnTheScreen();
});

test("a resort opens its page with its weather; «Back» shows «Ski» again", async () => {
  await open();
  await fireEvent.press(screen.getByTestId("search-tab-ski"));
  await pause();
  await fireEvent.press(screen.getByTestId(`resort-${FIRST.id}`));
  expect(screen.getByTestId("resort-page")).toBeOnTheScreen();
  expect(await screen.findByTestId("weather-top")).toBeOnTheScreen();
  expect(asked()).toContain(`/ski-resorts/${FIRST.id}/weather`);
  await fireEvent.press(screen.getByTestId("resort-back"));
  expect(screen.queryByTestId("resort-page")).toBeNull();
  expect(screen.getByTestId(`resort-${FIRST.id}`)).toBeOnTheScreen();
});
