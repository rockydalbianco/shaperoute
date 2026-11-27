import box from "@shaperoute/shared-types/fixtures/flying-sites.json";
import detail from "@shaperoute/shared-types/fixtures/flying-site.json";
import history from "@shaperoute/shared-types/fixtures/flying-site-history.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { answers } from "../account/testing";
import { FollowsContext } from "../social/followsDoor";
import { noticeText, TakeoffsMap, tooWide } from "./TakeoffsMap";

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
  getLastKnownPositionAsync: jest.fn(async () => null),
}));
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const DOOR = {
  apiUrl: "http://api",
  account: {
    state: { status: "signedOut" as const, notice: null },
    sessionEnded: () => {},
  },
  openProfile: () => {},
};
const SMALL = { south: 45.95, west: 10.95, north: 46.05, east: 11.05, zoom: 11 };

function show(fetchFn: jest.Mock) {
  return render(
    <FollowsContext.Provider value={DOOR}>
      <TakeoffsMap visible onClose={jest.fn()} fetchFn={fetchFn} />
    </FollowsContext.Provider>,
  );
}

async function tell(message: unknown) {
  await fireEvent(screen.getByTestId("takeoffs-map").children[0] as never, "message", {
    nativeEvent: { data: JSON.stringify(message) },
  });
}

function sitesSent(): string[] {
  return injectJavaScript.mock.calls
    .map(([script]: [string]) => script)
    .filter((script: string) => script.includes("window.takeoffs.setSites("));
}

beforeEach(() => injectJavaScript.mockClear());

test("a box wider than the server reads asks to zoom in", () => {
  expect(tooWide({ south: 40, west: 5, north: 46, east: 9 })).toBe(true);
  expect(tooWide({ south: 41, west: 5, north: 46, east: 10 })).toBe(false);
  expect(noticeText("zoom")).toBe("Zoom in to see the takeoffs.");
  expect(noticeText("more")).toBe("Zoom in to see all the takeoffs.");
  expect(noticeText(null)).toBeNull();
});

test("the box the map shows is asked, and its sites go to the map", async () => {
  const fetchFn = answers({ status: 200, body: box });
  await show(fetchFn);
  expect(screen.getByText("Takeoffs")).toBeTruthy();
  expect(screen.getByText("Missing a takeoff? Add it on OpenStreetMap.")).toBeTruthy();
  await tell({ type: "ready" });
  await tell({ type: "box", ...SMALL });
  expect(fetchFn.mock.calls[0][0]).toBe(
    "http://api/flying-sites?south=45.9500&west=10.9500&north=46.0500&east=11.0500",
  );
  expect(sitesSent()).toHaveLength(1);
  expect(sitesSent()[0]).toContain('"name":"Monte Prova"');
  expect(screen.queryByTestId("takeoffs-notice")).toBeNull();
});

test("too wide: nothing asked, the map emptied, «zoom in»", async () => {
  const fetchFn = answers();
  await show(fetchFn);
  await tell({ type: "box", south: 40, west: 4, north: 47, east: 12, zoom: 5 });
  expect(fetchFn).not.toHaveBeenCalled();
  expect(screen.getByText("Zoom in to see the takeoffs.")).toBeTruthy();
  expect(sitesSent()[0]).toContain('"features":[]');
});

test("a box with more sites than one answer asks to zoom in for all", async () => {
  await show(answers({ status: 200, body: { ...box, more: true } }));
  await tell({ type: "box", ...SMALL });
  expect(screen.getByText("Zoom in to see all the takeoffs.")).toBeTruthy();
});

test("a tap on a site opens its card", async () => {
  const fetchFn = answers(
    { status: 200, body: box },
    { status: 200, body: detail },
    { status: 200, body: history },
  );
  await show(fetchFn);
  await tell({ type: "ready" });
  await tell({ type: "box", ...SMALL });
  await tell({ type: "site", id: 101 });
  expect(await screen.findByText("Monte Prova")).toBeTruthy();
  expect(screen.queryByTestId("takeoffs-missing")).toBeNull();
  expect(
    injectJavaScript.mock.calls.some(([s]: [string]) =>
      s.includes("window.takeoffs.select(101)"),
    ),
  ).toBe(true);
});
