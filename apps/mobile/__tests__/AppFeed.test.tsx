/**
 * A drawing of «Feed» opened on the map (TASK-188, ADR-0151): its route as
 * a route of "Explore", with the heart and Start, and the way back to
 * «Feed». The pages are in AppPages.test.tsx; the rest of the app in
 * App.test.tsx.
 */
import detail from "@shaperoute/shared-types/fixtures/recommended-route.json";
import list from "@shaperoute/shared-types/fixtures/recommended-routes.json";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Location from "expo-location";

import App from "../App";
import { SAMPLE_FEED } from "../src/feed/sampleFeed";

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
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const { injectJavaScript } =
  jest.requireMock<typeof import("../__mocks__/react-native-webview")>(
    "react-native-webview",
  );
const API = "http://192.168.1.23:8000";

// The second drawing of the feed, and its route in the catalogue.
const POST = SAMPLE_FEED[1];
const ROUTE = { ...detail, id: POST.id, route_m: POST.route_m };

let fetchSpy: jest.SpiedFunction<typeof fetch>;
/** What the API has under the id of the post. */
let underItsId: () => Response;

/** What the app asked the API, but for the shape game's catalog, which it
 * asks as it opens to know whether to show «Play» (TASK-296), and the
 * contest, which «Feed» asks to know whether to show its card (TASK-299). */
function asked(): string[] {
  return (
    fetchSpy.mock.calls
      .map(([url]) => String(url).replace(API, ""))
      // MuW Style (TASK-384) is read with «Feed», as the contest is.
      .filter(
        (path) =>
          path !== "/game/catalog" &&
          path !== "/contests/current" &&
          !path.startsWith("/style") &&
          !path.startsWith("/muw-routes"),
      )
  );
}

async function onFeed() {
  await render(<App />);
  await screen.findByText("Starting from your position.");
  await fireEvent(screen.getByTestId("map"), "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));
}

beforeEach(() => {
  injectJavaScript.mockClear();
  underItsId = () => Response.json(ROUTE);
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 46.067, longitude: 11.1215 },
  } as Location.LocationObject);
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url === `${API}/recommended-routes/${POST.id}`) {
      return underItsId();
    }
    if (url.startsWith(`${API}/recommended-routes/`)) {
      return Response.json(detail);
    }
    if (url.startsWith(`${API}/recommended-routes`)) {
      return Response.json(list);
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
});

test("back from a route of «Explore», «Explore» is the page", async () => {
  await onFeed();
  await fireEvent.press(screen.getByRole("tab", { name: "Explore" }));
  await fireEvent.press(await screen.findByText("Star · 5.1 km"));
  await fireEvent.press(await screen.findByText("Back to the list"));
  expect(
    screen.getByRole("tab", { name: "Explore", selected: true }),
  ).toBeOnTheScreen();
});

test("«Feed» shows no made-up drawing to open", async () => {
  await onFeed();
  expect(screen.queryByText(POST.title)).toBeNull();
  expect(screen.queryByTestId("feed-post")).toBeNull();
  expect(screen.getByTestId("feed-log-in")).toBeOnTheScreen();
});

test("a drawing found by the search at the top of «Explore» is fetched as «Feed» fetches it; back is «Explore»", async () => {
  // The most liked drawing is the first featured one (TASK-367 part B).
  const found = [...SAMPLE_FEED].sort((a, b) => b.score - a.score)[0];
  // Under its id there is another route by now, and none like it nearby:
  // it says so, and that other route does not open.
  const answer = fetchSpy.getMockImplementation()!;
  fetchSpy.mockImplementation(async (input, init) =>
    String(input) === `${API}/recommended-routes/${found.id}`
      ? Response.json({ ...detail, id: found.id, shape: "circle", route_m: 4727 })
      : answer(input, init),
  );
  await onFeed();
  await fireEvent.press(screen.getByRole("tab", { name: "Explore" }));
  await fireEvent.press(await screen.findByTestId("explore-search"));
  await fireEvent.press(await screen.findByTestId(`featured-${found.id}`));

  expect(
    await screen.findByText("The route could not load. Try again."),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Start")).toBeNull();
  const [lat, lon] = found.line[0];
  expect(asked()).toEqual(
    expect.arrayContaining([
      `/recommended-routes/${found.id}`,
      `/recommended-routes?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&radius_m=5000`,
    ]),
  );
  // Back where the search was.
  await fireEvent.press(screen.getByText("Back to the list"));
  expect(
    screen.getByRole("tab", { name: "Explore", selected: true }),
  ).toBeOnTheScreen();
});
