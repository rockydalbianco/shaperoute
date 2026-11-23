/**
 * A member's drawing in «Feed» (TASK-118, ADR-0227): signed in, the page
 * shows the drawings the API gives, a tap opens the page of one (TASK-410),
 * and «Back» comes back to «Feed». An API without a feed leaves
 * the examples, without a word. The page alone is in
 * src/screens/FeedScreenPosts.test.tsx; the example drawings in
 * AppFeed.test.tsx.
 */
import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { apiError, type MemorySecureStore } from "../src/account/testing";
import { SAMPLE_FEED } from "../src/feed/sampleFeed";
import { forgetFeed } from "../src/feed/useFeed";

// Every test renders the whole app, and the first one loads it cold.
jest.setTimeout(20_000);

jest.mock("react-native-webview");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: "192.168.1.23:8081" } },
}));
jest.mock("expo-file-system");
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
jest.mock("expo-secure-store", () =>
  jest
    .requireActual<typeof import("../src/account/testing")>("../src/account/testing")
    .memorySecureStore(),
);

const store = jest.requireMock<MemorySecureStore>("expo-secure-store");
const API = "http://192.168.1.23:8000";
const SESSION_KEY = "shaperoute.session";
const [STAR] = feed.posts;

let fetchSpy: jest.SpiedFunction<typeof fetch>;

type Answers = Record<string, () => Response>;

/** The fake API, by method and path; anything else is a 404. */
function api(answers: Answers) {
  fetchSpy.mockImplementation(async (input, init) => {
    const path = String(input).replace(API, "");
    const answer = answers[`${init?.method ?? "GET"} ${path}`];
    return answer !== undefined
      ? answer()
      : Response.json(apiError("http_error", path), { status: 404 });
  });
}

function asked(path: string): number {
  return fetchSpy.mock.calls.filter(([input]) => String(input) === `${API}${path}`)
    .length;
}

const ACCOUNT: Answers = {
  "GET /me": () => Response.json(session.user),
  "GET /me/favorites": () => Response.json({ favorites: [] }),
  "GET /me/activities": () => Response.json({ activities: [], next: null, total: 0 }),
};
// The «All» tab: never with the phone's position (TASK-362).
const FEED = "/feed?filter=all";

async function onFeed() {
  store.kept.set(SESSION_KEY, JSON.stringify(session));
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));
}

beforeEach(() => {
  store.kept.clear();
  forgetFeed();
  jest
    .mocked(Location.watchPositionAsync)
    .mockResolvedValue({ remove: jest.fn() } as Location.LocationSubscription);
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 46.067, longitude: 11.1215 },
  } as Location.LocationObject);
  fetchSpy = jest.spyOn(globalThis, "fetch");
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("a member's drawing opens its page from «Feed», and «Back» comes back to «Feed»", async () => {
  api({
    ...ACCOUNT,
    [`GET ${FEED}`]: () => Response.json(feed),
  });
  await onFeed();
  // The drawings the members published, asked from where the phone is.
  expect(await screen.findByText("Ada_runs")).toBeOnTheScreen();
  // Its numbers in boxes, as on its page (TASK-410 part F).
  expect(screen.getAllByTestId("feed-summary")[0]).toHaveTextContent(
    /4\.00 km.*19:00.*4:45 \/km.*280 kcal/,
  );
  expect(screen.queryByText(SAMPLE_FEED[0].user)).toBeNull();
  expect(asked(FEED)).toBe(1);

  await fireEvent.press(screen.getByText(String(STAR.title)));
  // The page of the post (TASK-410): its summary from the feed's own
  // fields, nothing more asked of the API.
  const page = await screen.findByTestId("post-page");
  expect(page).toBeOnTheScreen();
  expect(screen.getByTestId("post-summary")).toBeOnTheScreen();
  expect(within(page).getByTestId("post-like")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Back" }));
  // «Feed» again, as it was; not asked again.
  expect(screen.queryByTestId("post-page")).toBeNull();
  expect(screen.getByRole("tab", { name: "Feed", selected: true })).toBeOnTheScreen();
  expect(screen.getByText("Ada_runs")).toBeOnTheScreen();
  expect(asked(FEED)).toBe(1);
});

test("an API that does not answer offers to ask again, in place of the examples", async () => {
  api(ACCOUNT);
  await onFeed();
  expect(await screen.findByText("Couldn't load the Feed.")).toBeOnTheScreen();
  expect(screen.getByText("Try again")).toBeOnTheScreen();
  expect(screen.queryByText(SAMPLE_FEED[0].user)).toBeNull();
  expect(asked(FEED)).toBe(1);
});
