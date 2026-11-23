import resorts from "@shaperoute/shared-types/fixtures/ski-resorts.json";
import { act, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import { FollowsContext } from "../social/followsDoor";
import { SearchScreen } from "./SearchScreen";
import { SEARCH_DELAY_MS } from "./useDrawingSearch";

// The search of the app as always has no «Ski» tab since TASK-429 part A
// (ADR-0357): the ski resorts (TASK-406 part C) are a page of the ski mode,
// tested in `../skimode/SkiResortsPage.test.tsx`.

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
let fetchSpy: jest.SpiedFunction<typeof fetch>;

beforeEach(() => {
  jest.useFakeTimers();
  fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      async () => new Response(JSON.stringify(resorts), { status: 200 }),
    );
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

test("the search has its four tabs and no «Ski»", async () => {
  await open();
  await pause();
  for (const tab of ["all", "drawings", "people", "routes"]) {
    expect(screen.getByTestId(`search-tab-${tab}`)).toBeOnTheScreen();
  }
  expect(screen.queryByTestId("search-tab-ski")).toBeNull();
});

test("the search asks nothing of the ski resorts, nor where the phone is", async () => {
  await open();
  await pause();
  const asked = fetchSpy.mock.calls.map(([input]) => String(input).replace(API, ""));
  expect(asked.filter((path) => path.startsWith("/ski-resorts"))).toEqual([]);
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});
